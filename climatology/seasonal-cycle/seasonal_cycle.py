"""
seasonal_cycle.py - The seasonal cycle (a typical year) of one or more daily variables.

WHAT IT DOES
    For every calendar month it calculates the mean of all daily values of the record and the band from
    the 10th to the 90th percentile of those daily values. Rainfall (or any other amount per day) is
    drawn as the mean monthly total, as bars without a band. One panel per variable.

WHAT IT READS
    A CSV file with a "date" column (YYYY-MM-DD) and one numeric column per variable (see README.md).

WHAT IT SAVES (in OUTPUT_FOLDER)
    seasonal_cycle.png   the chart
    seasonal_cycle.csv   the numbers behind the chart (12 months)

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python seasonal_cycle.py
    This is the method of the "A typical year" chart of the Sisal Mangrove Monitor website.
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # draw to a file, no window needed
import matplotlib.pyplot as plt
import matplotlib.ticker

from load_data import read_data, check_record, full_path, stop, warn, warnings_list


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- Your data ---------------------------------------------------------------------------
# Path of the CSV file. A relative path starts from the folder of this script.
INPUT_CSV = "example_data/sisal_daily.csv"

# Which columns to use, with a display name, a unit and how to combine the days of a month:
#     "column name in your CSV": ("Display name", "unit", "how")
# how = "mean"   the mean of the daily values, with a band from the 10th to the 90th percentile
#                (temperature, wind, waves, salinity, ...)
#       "total"  the mean monthly total, drawn as bars without a band (rainfall, evaporation, ...)
# Leave the dictionary empty ({}) to use ALL numeric columns as "mean" with the column name as the name.
# A column that is not listed here is not used.
VARIABLES = {
    "air_temperature_max_c":     ("Air temperature (daily max)", "°C", "mean"),
    "air_temperature_min_c":     ("Air temperature (daily min)", "°C", "mean"),
    "precipitation_mm":          ("Rainfall", "mm/month", "total"),
    "wind_speed_ms":             ("Wind speed", "m/s", "mean"),
    "wave_height_mean_m":        ("Wave height (daily mean)", "m", "mean"),
    "sea_surface_temperature_c": ("Sea surface temperature", "°C", "mean"),
    "salinity_surface_psu":      ("Surface salinity", "PSU", "mean"),
}

# --- The period --------------------------------------------------------------------------
# None = the whole record of each variable (this is what the website does).
# Or a range of years, for example (1991, 2020) = from 1 Jan 1991 to 31 Dec 2020.
YEARS = None

# --- The band ----------------------------------------------------------------------------
PERCENTILES = (10, 90)            # lower and upper edge of the band (the website uses 10 and 90)
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
MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
MONTH_NUMBERS = np.arange(1, 13)


# =============================================================================================
# The method
# =============================================================================================

def monthly_band(s):
    """Mean, lower and upper percentile of the daily values in each calendar month
    (the monthly_band of the website, with the percentiles as a setting)."""
    s = s.dropna()
    g = s.groupby(s.index.month)
    return g.mean(), g.quantile(PERCENTILES[0] / 100), g.quantile(PERCENTILES[1] / 100)


def monthly_total_mean(s):
    """The monthly totals of every month of the record, then the mean of the January totals, the
    February totals, and so on (the rainfall calculation of the website)."""
    s = s[s.first_valid_index():s.last_valid_index()]
    totals = s.resample("MS").sum(min_count=1)             # a month with no values at all stays empty
    incomplete = int((s.isna().resample("MS").sum() > 0).sum())
    if incomplete:
        warn(f"'{s.name}': {incomplete} of {len(totals)} months have missing days. Their total is the sum "
             "of the days that exist, so it is too low; the mean monthly total is a little low too.")
    return totals.groupby(totals.index.month).mean()


def one_variable(col, series):
    """The numbers of one variable: a table with the 12 months and the columns mean (and low, high)."""
    how = VARIABLES.get(col, (col, "", "mean"))[2]
    result = pd.DataFrame(index=MONTH_NUMBERS)
    if how == "total":
        result["mean"] = monthly_total_mean(series)
    else:
        mean, low, high = monthly_band(series)
        result["mean"], result["low"], result["high"] = mean, low, high
    empty = [int(m) for m in MONTH_NUMBERS if pd.isna(result.loc[m, "mean"])]
    if empty:
        warn(f"'{col}': no values in month(s) {empty}; these months are left empty in the chart.")
    return result


# =============================================================================================
# The chart
# =============================================================================================

def draw_panel(ax, result, color, name, unit, how, record):
    """One panel: the line with its band (or the bars) over the 12 months."""
    ax.set_title(f"{name}  ({record})", fontsize=9, color=TEXT_COLOR, loc="left", fontweight="bold")
    ax.set_ylabel(unit, fontsize=8, color=TEXT_COLOR)
    if how == "total":
        ax.bar(MONTH_NUMBERS, result["mean"], width=0.7, color=color, zorder=3)
    else:
        ax.fill_between(MONTH_NUMBERS, result["low"], result["high"], color=color, alpha=0.22, linewidth=0, zorder=2)
        ax.plot(MONTH_NUMBERS, result["mean"], color=color, linewidth=2, marker="o", markersize=3.5, zorder=4)
    ax.set_xlim(0.4, 12.6)
    ax.set_xticks(MONTH_NUMBERS)
    ax.set_xticklabels(MONTHS)
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=5))
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
        name, unit, how = VARIABLES.get(col, (col, "", "mean"))
        draw_panel(flat[i], results[col], VARIABLE_COLORS[i % len(VARIABLE_COLORS)], name, unit, how, records[col])
    for ax in flat[n:]:
        ax.set_visible(False)                                  # an unused place in the grid

    fig.subplots_adjust(left=0.09, right=0.97, top=1 - 0.95 / height, bottom=0.75 / height, hspace=0.65, wspace=0.28)
    fig.text(0.09, 1 - 0.3 / height, "A typical year: seasonal cycle", fontsize=12, fontweight="bold",
             color=TEXT_COLOR, va="center")
    period = "the whole record of each variable" if not YEARS else f"{YEARS[0]} to {YEARS[1]}"
    fig.text(0.09, 0.3 / height,
             f"Line: mean of the daily values in each calendar month. Band: {PERCENTILES[0]}th to {PERCENTILES[1]}th percentile "
             f"of those daily values.\nBars: mean monthly total. Period: {period}.",
             fontsize=7, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    if not (0 <= PERCENTILES[0] < PERCENTILES[1] <= 100):
        stop("PERCENTILES must be two numbers like (10, 90), the first one smaller.")
    if YEARS and (len(YEARS) != 2 or YEARS[0] > YEARS[1]):
        stop("YEARS must be None or two years like (1991, 2020).")
    for col, setting in VARIABLES.items():
        if len(setting) != 3 or setting[2] not in ("mean", "total"):
            stop(f"VARIABLES['{col}'] must be ('Display name', 'unit', 'mean' or 'total').")

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

    wide = pd.DataFrame({"month": MONTH_NUMBERS})
    for col, result in results.items():
        wide[f"{col}_mean"] = result["mean"].values
        if "low" in result:
            wide[f"{col}_p{PERCENTILES[0]}"] = result["low"].values
            wide[f"{col}_p{PERCENTILES[1]}"] = result["high"].values
    csv_path = out / "seasonal_cycle.csv"
    wide.round(DECIMALS).to_csv(csv_path, index=False)

    png_path = out / "seasonal_cycle.png"
    draw_chart(results, records, png_path)

    print(f"\nSaved {png_path}\nSaved {csv_path}")
    print(f"Done with {len(warnings_list)} warning(s)." + ("" if not warnings_list else " See README.md, 'What the warnings mean'."))


if __name__ == "__main__":
    main()
