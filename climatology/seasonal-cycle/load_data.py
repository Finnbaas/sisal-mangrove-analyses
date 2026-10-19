"""
load_data.py - Reading and checking the daily input CSV. Shared by the daily analysis packages.

WHAT IT DOES
    Reads a CSV with a "date" column and one numeric column per variable, puts it on a complete daily
    index (missing days stay empty, nothing is filled in) and prints clear data checks and warnings.

WHAT IT READS
    The CSV file named by the main script (see the README of the package for the input format).

WHO USES IT
    The main script of each package imports it. This file is the SAME in every package (each package
    must work on its own). Do not change it in one package only: run check_shared.py in the main folder
    of the repository, it reports if the copies differ.
"""

import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent     # the folder of the package
warnings_list = []                         # all warnings, printed again at the end


def stop(message):
    """Stops the script with a clear message (no crash with a long error text)."""
    print("\nSTOPPED: " + message)
    sys.exit(1)


def warn(message):
    """Prints a warning and remembers it for the summary at the end."""
    print("WARNING: " + message)
    warnings_list.append(message)


def full_path(text):
    """A path from the settings: relative paths start from the folder of the package."""
    path = Path(text)
    return path if path.is_absolute() else HERE / path


def read_data(input_csv, variables):
    """Reads the CSV and returns a table with a complete daily index (missing days are empty) and one
    column per variable. `variables` is a dictionary whose keys are column names; an empty dictionary
    means: use all numeric columns."""
    path = full_path(input_csv)
    if not path.exists():
        stop(f"The input file does not exist: {path}\nCheck INPUT_CSV in the settings.")
    df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]

    if "date" not in df.columns:
        stop(f"The CSV has no 'date' column. Columns found: {list(df.columns)}\n"
             "Rename your date column to 'date' (format YYYY-MM-DD).")

    # dates
    dates = pd.to_datetime(df["date"], errors="coerce")
    bad = int(dates.isna().sum())
    if bad == len(df):
        stop("None of the values in the 'date' column could be read as a date. Use the format YYYY-MM-DD.")
    if bad:
        warn(f"{bad} rows have a date that could not be read; these rows are ignored.")
    df = df[dates.notna()].copy()
    df.index = dates[dates.notna()].dt.normalize()
    if df.index.has_duplicates:
        n = int(df.index.duplicated().sum())
        warn(f"{n} dates occur more than once; only the first row of each date is used.")
        df = df[~df.index.duplicated()]
    df = df.sort_index()

    # which columns are variables
    if variables:
        missing = [c for c in variables if c not in df.columns]
        if missing:
            stop(f"These columns from VARIABLES are not in the CSV: {missing}\nColumns found: {list(df.columns)}")
        columns = list(variables)
    else:
        columns = [c for c in df.columns if c != "date"]

    table = pd.DataFrame(index=pd.date_range(df.index.min(), df.index.max(), freq="D"))
    for col in columns:
        numbers = pd.to_numeric(df[col], errors="coerce")
        n_text = int((numbers.isna() & df[col].notna()).sum())
        if numbers.notna().sum() == 0:
            if variables:
                stop(f"Column '{col}' has no numeric values.")
            print(f"Column '{col}' has no numeric values and is skipped.")
            continue
        if n_text:
            warn(f"Column '{col}': {n_text} values are not numbers and are treated as missing.")
        table[col] = numbers.reindex(table.index)
    if table.shape[1] == 0:
        stop("No numeric columns found in the CSV.")
    return table


def longest_gap(is_missing):
    """Length of the longest run of missing days."""
    longest = run = 0
    for m in is_missing:
        run = run + 1 if m else 0
        longest = max(longest, run)
    return longest


def check_record(col, series, min_years):
    """Prints the data checks of one variable (record, missing days, longest gap) and warns when the
    record is shorter than min_years. Returns the values without the missing days, or None when the
    variable has no values at all."""
    valid = series.dropna()
    if valid.empty:
        warn(f"'{col}': no values at all; this variable is skipped.")
        return None
    record = series[valid.index[0]:valid.index[-1]]
    n_missing = int(record.isna().sum())
    text = (f"{len(record)} days from {record.index[0].date()} to {record.index[-1].date()}, "
            f"{n_missing} missing days")
    if n_missing:
        text += (f" (longest gap {longest_gap(record.isna().values)} days). Missing days are not filled in: "
                 "they are left out of the calculation")
    print(f"  {col}: {text}")
    years = len(valid) / 365.25
    if years < min_years:
        warn(f"'{col}': only {years:.1f} years of data (less than {min_years}). "
             "The result is uncertain; use it as a rough picture only.")
    return valid
