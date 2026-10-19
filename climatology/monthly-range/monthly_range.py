"""
monthly_range.py - Monthly range band and running mean of one or more daily variables.

WHAT IT DOES
    For every month of the record it takes the lowest and the highest daily value (the band), and it
    calculates the 365-day running mean (a smooth line that shows slow changes and not the seasons).
    One panel per variable, time on the horizontal axis.

WHAT IT READS
    A CSV file with a "date" column (YYYY-MM-DD) and one numeric column per variable (see README.md).

WHAT IT SAVES (in OUTPUT_FOLDER)
    monthly_range.png   the chart
    monthly_range.csv   the numbers behind the chart (one row per month)

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python monthly_range.py
    This is the method of the "In detail" chart (monthly range and running mean) of the Sisal Mangrove
    Monitor website.
"""

import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # draw to a file, no window needed
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker

from load_data import read_data, check_record, full_path, stop, warn, warnings_list


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- Your data ---------------------------------------------------------------------------
# Path of the CSV file. A relative path starts from the folder of this script.
INPUT_CSV = "example_data/sisal_daily.csv"

# Which columns to use, with a display name and a unit for the chart:
#     "column name in your CSV": ("Display name", "unit")
# Leave the dictionary empty ({}) to use ALL numeric columns, with the column name as the name and no unit.
# A column that is not listed here is not used.
VARIABLES = {
    "air_temperature_max_c":     ("Air temperature (daily max)", "°C"),
    "air_temperature_min_c":     ("Air temperature (daily min)", "°C"),
    "precipitation_mm":          ("Rainfall (per day)", "mm/day"),
    "wind_speed_ms":             ("Wind speed", "m/s"),
    "wave_height_mean_m":        ("Wave height (daily mean)", "m"),
    "sea_surface_temperature_c": ("Sea surface temperature", "°C"),
    "salinity_surface_psu":      ("Surface salinity", "PSU"),
}

# --- The period --------------------------------------------------------------------------
# None = the whole record of each variable (this is what the website does).
# Or a range of years, for example (1991, 2020) = from 1 Jan 1991 to 31 Dec 2020.
YEARS = None

# --- The running mean --------------------------------------------------------------------
RUNNING_DAYS = 365                # the running mean covers this many days, centred on the day (the website: 365)
MIN_RUNNING_DAYS = 300            # ... and needs at least this many days with a value (the website: 300)
MIN_YEARS = 10                    # warn when a variable has less data than this
DECIMALS = 3                      # decimals in the CSV

# --- Output ------------------------------------------------------------------------------
OUTPUT_FOLDER = "output"          # relative to the folder of this script


# =============================================================================================
# Colours of the chart (the colours of the website)
# =============================================================================================

VARIABLE_COLORS = ["#8A5CB8", "#1F77B4", "#2A9A35", "#E06D0A", "#D62728", "#A0522D", "#234A8C"]
TEXT_COLOR = "#3A4640"
MUTED_COLOR = "#6E7C71"
GRID_COLOR = "#DCE6D8"
AXIS_COLOR = "#9AA69C"


# =============================================================================================
# The method
# =============================================================================================

def monthly_range_and_running_mean(s):
    """For every month of the record: the lowest and the highest daily value, and the running mean on
    the 15th of the month (the detail_daily() of the website). Returns a table with one row per month,
    indexed by the 15th of the month."""
    s = s[s.first_valid_index():s.last_valid_index()]             # only the record of this variable
    month = s.resample("MS")
    low, high = month.min(), month.max()
    running = s.rolling(RUNNING_DAYS, center=True, min_periods=MIN_RUNNING_DAYS).mean()
    middle = low.index + pd.Timedelta(days=14)                    # the 15th of each month
    return pd.DataFrame({"lowest": low.values, "highest": high.values,
                         "running_mean": running.reindex(middle).values}, index=middle)


def one_variable(col, series):
    """The numbers of one variable, with warnings for what is missing."""
    record_days = len(series[series.first_valid_index():series.last_valid_index()])
    if record_days < RUNNING_DAYS:
        warn(f"'{col}': the record ({record_days} days) is shorter than the running mean ({RUNNING_DAYS} days); "
             "there is no running mean, only the band.")
    result = monthly_range_and_running_mean(series)
    no_band = int(result["lowest"].isna().sum())
    if no_band:
        warn(f"'{col}': {no_band} of {len(result)} months have no values at all; they are left empty in the chart.")
    running = result["running_mean"]
    if record_days >= RUNNING_DAYS and running.notna().any():
        # an empty running mean at the very start and end of the record is normal (the window reaches outside the data)
        inside = running[running.first_valid_index():running.last_valid_index()]
        gaps = int(inside.isna().sum())
        if gaps:
            warn(f"'{col}': the running mean is empty in {gaps} month(s) in the middle of the record, because fewer than "
                 f"{MIN_RUNNING_DAYS} of the {RUNNING_DAYS} days around them have a value (a gap in the data).")
        edge = int(running.isna().sum()) - gaps
        if edge:
            print(f"      (the running mean starts and ends {edge} month(s) inside the record: "
                  f"the window needs {MIN_RUNNING_DAYS} days with a value)")
    return result


# =============================================================================================
# The chart
# =============================================================================================

def draw_panel(ax, result, color, name, unit, record):
    """One panel: the band from the lowest to the highest day of each month, and the running mean."""
    ax.set_title(f"{name}  ({record})", fontsize=9, color=TEXT_COLOR, loc="left", fontweight="bold")
    ax.set_ylabel(unit, fontsize=8, color=TEXT_COLOR)
    x = mdates.date2num(result.index.to_pydatetime())
    ax.fill_between(x, result["lowest"], result["highest"], color=color, alpha=0.22, linewidth=0, zorder=2)
    ax.plot(x, result["running_mean"], color=color, linewidth=2, solid_joinstyle="round", zorder=4)   # gaps are not drawn
    ax.xaxis_date()
    ax.xaxis.set_major_locator(mdates.AutoDateLocator(minticks=4, maxticks=8))
    short = (result.index[-1] - result.index[0]).days < 3 * 365         # a short record needs the month in the labels
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y" if short else "%Y"))
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=5))
    ax.margins(x=0.01, y=0.08)
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS_COLOR)
    ax.tick_params(labelsize=8, colors=MUTED_COLOR, length=3)


def draw_chart(results, records, path):
    """Draws all panels in one picture (two columns) and saves it as a PNG."""
    n = len(results)
    cols = 1 if n == 1 else 2
    rows = (n + cols - 1) // cols
    height = 2.3 * rows + 1.5
    fig, axes = plt.subplots(rows, cols, figsize=(4.6 * cols + 0.6, height), squeeze=False)
    flat = axes.flatten()
    for i, col in enumerate(results):
        name, unit = VARIABLES.get(col, (col, ""))
        draw_panel(flat[i], results[col], VARIABLE_COLORS[i % len(VARIABLE_COLORS)], name, unit, records[col])
    for ax in flat[n:]:
        ax.set_visible(False)                                  # an unused place in the grid

    fig.subplots_adjust(left=0.09, right=0.97, top=1 - 0.95 / height, bottom=0.75 / height, hspace=0.6, wspace=0.28)
    fig.text(0.09, 1 - 0.3 / height, "Monthly range and running mean", fontsize=12, fontweight="bold",
             color=TEXT_COLOR, va="center")
    period = "the whole record of each variable" if not YEARS else f"{YEARS[0]} to {YEARS[1]}"
    fig.text(0.09, 0.3 / height,
             f"Band: lowest to highest daily value in each month. Line: {RUNNING_DAYS}-day running mean (at least "
             f"{MIN_RUNNING_DAYS} days with a value).\nPeriod: {period}.",
             fontsize=7, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    if RUNNING_DAYS < 2 or not (1 <= MIN_RUNNING_DAYS <= RUNNING_DAYS):
        stop("RUNNING_DAYS must be at least 2 (for example 365) and MIN_RUNNING_DAYS between 1 and RUNNING_DAYS (for example 300).")
    if YEARS and (len(YEARS) != 2 or YEARS[0] > YEARS[1]):
        stop("YEARS must be None or two years like (1991, 2020).")

    table = read_data(INPUT_CSV, VARIABLES)
    print(f"Read {table.shape[1]} variable(s), {table.index[0].date()} to {table.index[-1].date()}.")
    if YEARS:
        if YEARS[1] < table.index[0].year or YEARS[0] > table.index[-1].year:
            stop(f"The years {YEARS[0]} to {YEARS[1]} are outside the data "
                 f"({table.index[0].date()} to {table.index[-1].date()}).")
        if YEARS[0] < table.index[0].year or YEARS[1] > table.index[-1].year:
            warn(f"The years {YEARS[0]} to {YEARS[1]} reach outside the data "
                 f"({table.index[0].date()} to {table.index[-1].date()}); only the days that exist are used.")
        table = table[(table.index.year >= YEARS[0]) & (table.index.year <= YEARS[1])]

    print("\nData checks:")
    results, records = {}, {}
    for col in table.columns:
        valid = check_record(col, table[col], MIN_YEARS)
        if valid is None:
            continue
        results[col] = one_variable(col, table[col])
        first, last = valid.index[0].year, valid.index[-1].year
        records[col] = str(first) if first == last else f"{first}–{last}"
    if not results:
        stop("No variable has any data.")

    out = full_path(OUTPUT_FOLDER)
    out.mkdir(parents=True, exist_ok=True)

    wide = pd.DataFrame(index=pd.date_range(min(r.index[0] for r in results.values()).replace(day=1),
                                            max(r.index[-1] for r in results.values()).replace(day=1), freq="MS") + pd.Timedelta(days=14))
    for col, result in results.items():
        wide[f"{col}_lowest"] = result["lowest"]
        wide[f"{col}_highest"] = result["highest"]
        wide[f"{col}_running_mean"] = result["running_mean"]
    wide.insert(0, "month", wide.index.strftime("%Y-%m"))
    csv_path = out / "monthly_range.csv"
    wide.round(DECIMALS).to_csv(csv_path, index=False)

    png_path = out / "monthly_range.png"
    draw_chart(results, records, png_path)

    print(f"\nSaved {png_path}\nSaved {csv_path}")
    print(f"Done with {len(warnings_list)} warning(s)." + ("" if not warnings_list else " See README.md, 'What the warnings mean'."))


if __name__ == "__main__":
    main()
