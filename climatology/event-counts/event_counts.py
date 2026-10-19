"""
event_counts.py - How many events per month and per year (when do storms, floods, heat waves, ... come?).

WHAT IT DOES
    Counts events in a list: per calendar month (January to December, all years together) and per year.
    Years in the record without any event count as zero. Two bar charts, and a short text with the total,
    the first and last month and the peak month(s).

WHAT IT READS
    A CSV file with one row per event and the columns "name" and "date" (YYYY-MM-DD), see README.md.
    Storm lists for any location can be made with make_events_from_hurdat2.py.

WHAT IT SAVES (in OUTPUT_FOLDER)
    event_counts.png          the two charts
    counts_per_month.csv      the numbers of the month chart
    counts_per_year.csv       the numbers of the year chart

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python event_counts.py
    This is the method of the "When storms come" charts of the Sisal Mangrove Monitor website.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # draw to a file, no window needed
import matplotlib.pyplot as plt
import matplotlib.ticker


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- Your events -------------------------------------------------------------------------
# Path of the CSV file. A relative path starts from the folder of this script.
INPUT_CSV = "example_data/sisal_storms.csv"
EVENT_NAME = "storms"                       # what the events are, used in the texts of the chart ("storms", "floods", ...)
PLACE_NAME = "Sisal"                        # the place, used in the title

# --- The record --------------------------------------------------------------------------
# The first and last year in which events could have been recorded, for example (1950, 2024). This is needed
# to count years without events as zero. Events outside it are left out. None = from the first to the last
# year that has an event (then empty years at the start or end are not counted).
RECORD_YEARS = (1950, 2024)

MIN_YEARS = 10                              # warn when the record is shorter than this
MIN_EVENTS = 10                             # warn when there are fewer events than this

# --- Output ------------------------------------------------------------------------------
OUTPUT_FOLDER = "output"                    # relative to the folder of this script


# =============================================================================================
# Colours of the chart (the colours of the website)
# =============================================================================================

BAR_COLOR = "#D93A2B"
TEXT_COLOR = "#3A4640"
MUTED_COLOR = "#6E7C71"
GRID_COLOR = "#DCE6D8"
AXIS_COLOR = "#9AA69C"
MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
               "October", "November", "December"]

HERE = Path(__file__).resolve().parent


# =============================================================================================
# Messages
# =============================================================================================

def stop(message):
    """Stops the script with a clear message (no crash with a long error text)."""
    print("\nSTOPPED: " + message)
    sys.exit(1)


def warn(message):
    """Prints a warning and remembers it for the summary at the end."""
    print("WARNING: " + message)
    warnings_list.append(message)


warnings_list = []                          # all warnings, counted again at the end


def full_path(text):
    """A path from the settings: relative paths start from the folder of this script."""
    path = Path(text)
    return path if path.is_absolute() else HERE / path


# =============================================================================================
# Reading and checking the events
# =============================================================================================

def read_events():
    """Reads the CSV and returns the events as a table with the columns name and date (a date, no time)."""
    path = full_path(INPUT_CSV)
    if not path.exists():
        stop(f"The input file does not exist: {path}\nCheck INPUT_CSV in the settings.")
    df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]
    if "date" not in df.columns:
        stop(f"The CSV has no 'date' column. Columns found: {list(df.columns)}\n"
             "Rename your date column to 'date' (format YYYY-MM-DD).")
    has_names = "name" in df.columns
    if not has_names:
        df["name"] = ""                                         # a name is nice to have, not needed for counting
        warn("The CSV has no 'name' column; the events are counted without names (and two events on the same date are both counted).")
    if df.empty:
        stop("The CSV has no events.")

    dates = pd.to_datetime(df["date"], errors="coerce")
    bad = int(dates.isna().sum())
    if bad == len(df):
        stop("None of the values in the 'date' column could be read as a date. Use the format YYYY-MM-DD.")
    if bad:
        warn(f"{bad} events have a date that could not be read; these events are not counted.")
    events = pd.DataFrame({"name": df["name"].astype(str).str.strip(), "date": dates.dt.normalize()})
    events = events[dates.notna()]

    twice = int(events.duplicated(["name", "date"]).sum()) if has_names else 0
    if twice:
        warn(f"{twice} events occur more than once (same name and date); each is counted once.")
        events = events.drop_duplicates(["name", "date"])
    return events.sort_values("date").reset_index(drop=True)


def check_record(events):
    """Applies RECORD_YEARS: returns the events inside it and the first and last year of the record."""
    first, last = int(events["date"].dt.year.min()), int(events["date"].dt.year.max())
    if RECORD_YEARS is None:
        warn("RECORD_YEARS is None: the record runs from the first to the last year with an event. Years without "
             "events before the first or after the last event are not counted as zero; set RECORD_YEARS if you know the record.")
        y0, y1 = first, last
    else:
        if len(RECORD_YEARS) != 2 or RECORD_YEARS[0] > RECORD_YEARS[1]:
            stop("RECORD_YEARS must be None or two years like (1950, 2024).")
        y0, y1 = RECORD_YEARS
        outside = events[(events["date"].dt.year < y0) | (events["date"].dt.year > y1)]
        if len(outside) == len(events):
            stop(f"All events ({first} to {last}) are outside the record ({y0} to {y1}). Check RECORD_YEARS.")
        if len(outside):
            warn(f"{len(outside)} events are outside the record years {y0} to {y1} and are left out "
                 f"(for example {outside['date'].iloc[0].date()}).")
            events = events.drop(outside.index)
    n_years = y1 - y0 + 1
    if n_years < MIN_YEARS:
        warn(f"The record is only {n_years} years (less than {MIN_YEARS}). The counts are uncertain.")
    if len(events) < MIN_EVENTS:
        warn(f"Only {len(events)} events (less than {MIN_EVENTS}). The pattern per month and per year is uncertain.")
    return events, y0, y1


# =============================================================================================
# The method
# =============================================================================================

def count_events(events, y0, y1):
    """Events per calendar month (all years together) and per year (every year of the record, also with zero)."""
    per_month = events["date"].dt.month.value_counts().reindex(range(1, 13), fill_value=0)
    per_year = events["date"].dt.year.value_counts().reindex(range(y0, y1 + 1), fill_value=0)
    return per_month, per_year


def summary(per_month):
    """The first and last month with events, and the peak month(s) (the summary of the website)."""
    used = [m for m in range(1, 13) if per_month[m]]
    peaks = [m for m in used if per_month[m] == per_month.max()]
    return used[0], used[-1], peaks


# =============================================================================================
# The chart
# =============================================================================================

def style(ax):
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(integer=True, nbins=5))
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS_COLOR)
    ax.tick_params(labelsize=8, colors=MUTED_COLOR, length=3)
    ax.set_ylabel(f"Number of {EVENT_NAME}", fontsize=8, color=TEXT_COLOR)


def draw_chart(per_month, per_year, text, path):
    """Two bar charts: per month (J to D) and per year."""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8.5, 6.4), gridspec_kw={"height_ratios": [1, 1]})
    fig.subplots_adjust(left=0.1, right=0.97, top=0.82, bottom=0.12, hspace=0.5)

    ax1.bar(range(1, 13), per_month.values, width=0.7, color=BAR_COLOR, zorder=3)
    ax1.set_xticks(range(1, 13))
    ax1.set_xticklabels(MONTHS)
    ax1.set_title("Per month (all years together)", fontsize=9, loc="left", color=TEXT_COLOR, fontweight="bold")
    style(ax1)

    ax2.bar(per_year.index, per_year.values, width=0.75, color=BAR_COLOR, zorder=3)
    ax2.set_title("Per year", fontsize=9, loc="left", color=TEXT_COLOR, fontweight="bold")
    ax2.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(integer=True, nbins=8))
    ax2.set_xlim(per_year.index[0] - 1, per_year.index[-1] + 1)
    style(ax2)

    fig.text(0.1, 0.955, f"When {EVENT_NAME} come: {PLACE_NAME}", fontsize=12, fontweight="bold", color=TEXT_COLOR, va="center")
    fig.text(0.1, 0.895, text, fontsize=8.5, color=TEXT_COLOR, va="center")
    fig.text(0.1, 0.03, "Every year of the record is shown; a year without events has no bar.",
             fontsize=7, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    events = read_events()
    events, y0, y1 = check_record(events)
    print(f"Read {len(events)} events, {events['date'].min().date()} to {events['date'].max().date()}; "
          f"record {y0} to {y1}.")

    per_month, per_year = count_events(events, y0, y1)
    first, last, peaks = summary(per_month)
    peak_text = " and ".join(MONTH_NAMES[m - 1] for m in peaks)
    text = (f"{len(events)} {EVENT_NAME} in {y1 - y0 + 1} years ({y0} to {y1}), from {MONTH_NAMES[first - 1]} to "
            f"{MONTH_NAMES[last - 1]}; most in {peak_text} ({int(per_month.max())}).")

    out = full_path(OUTPUT_FOLDER)
    out.mkdir(parents=True, exist_ok=True)
    month_path, year_path = out / "counts_per_month.csv", out / "counts_per_year.csv"
    pd.DataFrame({"month": range(1, 13), "month_name": MONTH_NAMES, "events": per_month.values}).to_csv(month_path, index=False)
    pd.DataFrame({"year": per_year.index, "events": per_year.values}).to_csv(year_path, index=False)
    png_path = out / "event_counts.png"
    draw_chart(per_month, per_year, text, png_path)

    print("\n" + text)
    print("per month (J..D):", " ".join(str(int(n)) for n in per_month))
    print(f"mean per year: {len(events) / (y1 - y0 + 1):.2f}; years without events: {int((per_year == 0).sum())} of {len(per_year)}")
    print(f"\nSaved {png_path}\nSaved {month_path}\nSaved {year_path}")
    print(f"Done with {len(warnings_list)} warning(s)." + ("" if not warnings_list else " See README.md, 'What the warnings mean'."))


if __name__ == "__main__":
    main()
