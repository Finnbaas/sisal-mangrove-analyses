"""
long_term_trend.py - Long-term trend of the annual means of one or more daily variables.

WHAT IT DOES
    Calculates the mean of each year (only years with at least 90% of the days), fits a straight line
    through the annual means (linear regression) and reports the trend per decade with its 95% range
    (plus or minus) and the p-value. The trend line is drawn in the chart ONLY when p is below 0.05.
    One panel per variable.

WHAT IT READS
    A CSV file with a "date" column (YYYY-MM-DD) and one numeric column per variable (see README.md).

WHAT IT SAVES (in OUTPUT_FOLDER)
    long_term_trend.png   the chart
    annual_means.csv      the annual means behind the chart (one row per year)
    trends.csv            per variable: trend, 95% range, p-value, years used, trend line drawn or not

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python long_term_trend.py
    This is the method of the "Change since 1950" chart of the Sisal Mangrove Monitor website.
"""

import math

import numpy as np
import pandas as pd
from scipy import stats
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

# Which columns to use, with a display name and a unit for the chart:
#     "column name in your CSV": ("Display name", "unit")
# The trend is given in "unit per decade". Leave the dictionary empty ({}) to use ALL numeric columns,
# with the column name as the name and no unit. A column that is not listed here is not used.
VARIABLES = {
    "air_temperature_max_c":     ("Air temperature (daily max)", "°C"),
    "air_temperature_min_c":     ("Air temperature (daily min)", "°C"),
    "precipitation_mm":          ("Rainfall (mean per day)", "mm/day"),
    "wind_speed_ms":             ("Wind speed", "m/s"),
    "wave_height_mean_m":        ("Wave height (daily mean)", "m"),
    "sea_surface_temperature_c": ("Sea surface temperature", "°C"),
    "salinity_surface_psu":      ("Surface salinity", "PSU"),
}

# --- The period --------------------------------------------------------------------------
# None = the whole record of each variable (this is what the website does).
# Or a range of years, for example (1991, 2020) = from 1 Jan 1991 to 31 Dec 2020.
YEARS = None

# --- The trend ---------------------------------------------------------------------------
MIN_DAY_SHARE = 0.9               # a year counts only when at least this share of its days has a value (the website: 0.9)
P_LIMIT = 0.05                    # the trend line is drawn only when p is below this (the website: 0.05)
TREND_YEARS = 10                  # the trend is given per this many years (10 = per decade)
MIN_YEARS = 10                    # warn when a variable has fewer complete years than this
DECIMALS = 4                      # decimals in the CSV files

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

def annual_means(s):
    """The mean of each calendar year, only for years with enough days (the annual() of the website:
    at least 329 of 365 days = 90%). Returns a series with the year as index, and the years left out."""
    needed = math.ceil(MIN_DAY_SHARE * 365)                # 90% of 365 days = 329 days
    g = s.resample("YE")
    means, counts = g.mean(), g.count()
    left_out = [int(y) for y in means.index.year[((counts < needed) & (counts > 0)).values]]
    a = means[counts >= needed]
    a.index = a.index.year
    return a, left_out


def trend(annual):
    """Linear trend of the annual means (the trend() of the website): the slope and its 95% range
    (1.96 times the standard error) per TREND_YEARS years, the p-value, and the value of the trend line
    in the first and the last year."""
    r = stats.linregress(annual.index, annual.values)
    y0, y1 = int(annual.index[0]), int(annual.index[-1])
    return {"slope": float(r.slope) * TREND_YEARS, "ci95": 1.96 * float(r.stderr) * TREND_YEARS,
            "p": float(r.pvalue), "years": (y0, y1), "fit": [float(r.intercept + r.slope * y) for y in (y0, y1)]}


def one_variable(col, series):
    """The annual means and the trend of one variable (the trend is None when there are too few years)."""
    annual, left_out = annual_means(series)
    if left_out:
        warn(f"'{col}': {len(left_out)} year(s) have fewer than {MIN_DAY_SHARE:.0%} of their days and are left "
             f"out: {', '.join(str(y) for y in left_out[:6])}" + (', ...' if len(left_out) > 6 else '') + '.')
    if len(annual) < 3:
        warn(f"'{col}': only {len(annual)} complete year(s); a trend needs at least 3, so no trend is calculated.")
        return annual, None
    if len(annual) < MIN_YEARS:
        warn(f"'{col}': only {len(annual)} complete years (less than {MIN_YEARS}). The trend is very uncertain.")
    return annual, trend(annual)


# =============================================================================================
# Text of the trend
# =============================================================================================

def number_text(value, ci):
    """A number with as many decimals as the size of its 95% range asks for (not more)."""
    d = 2 if ci == 0 else min(4, max(1, 1 - math.floor(math.log10(ci))))
    return f"{value:.{d}f}"


def trend_text(t, unit):
    """For example '+0.21 ± 0.05 °C/decade, p < 0.001'."""
    per = "decade" if TREND_YEARS == 10 else f"{TREND_YEARS} years"
    p = "p < 0.001" if t["p"] < 0.001 else f"p = {t['p']:.3f}"
    slope = number_text(t["slope"], t["ci95"])
    sign = "+" if t["slope"] >= 0 else "−"
    return f"{sign}{slope.lstrip('-')} ± {number_text(t['ci95'], t['ci95'])} {unit}/{per}, {p}"


# =============================================================================================
# The chart
# =============================================================================================

def draw_panel(ax, annual, t, color, name, unit):
    """One panel: the annual means (dots with a line) and, only when p is low enough, the trend line."""
    ax.set_title(name, fontsize=9, color=TEXT_COLOR, loc="left", fontweight="bold")
    ax.set_ylabel(unit, fontsize=8, color=TEXT_COLOR)
    ax.plot(annual.index, annual.values, color=color, linewidth=1.2, marker="o", markersize=2.8, zorder=3)
    if t is not None and t["p"] < P_LIMIT:
        ax.plot(t["years"], t["fit"], color=TEXT_COLOR, linewidth=1.8, linestyle="--", zorder=4)
    if t is None:
        note = "Too few years for a trend"
    elif t["p"] < P_LIMIT:
        note = trend_text(t, unit)
    else:
        note = f"No significant trend ({trend_text(t, unit)})"
    ax.text(0.99, 0.97, note, transform=ax.transAxes, ha="right", va="top", fontsize=7, color=TEXT_COLOR,
            bbox=dict(boxstyle="round,pad=0.25", facecolor="white", edgecolor="none", alpha=0.85), zorder=5)
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=5))
    ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=6, integer=True))   # whole years only
    ax.margins(x=0.03, y=0.18)
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.8, zorder=0)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(AXIS_COLOR)
    ax.tick_params(labelsize=8, colors=MUTED_COLOR, length=3)


def draw_chart(annuals, trends, path):
    """Draws all panels in one picture (two columns) and saves it as a PNG."""
    n = len(annuals)
    cols = 1 if n == 1 else 2
    rows = (n + cols - 1) // cols
    height = 2.3 * rows + 1.5
    fig, axes = plt.subplots(rows, cols, figsize=(4.6 * cols + 0.6, height), squeeze=False)
    flat = axes.flatten()
    for i, col in enumerate(annuals):
        name, unit = VARIABLES.get(col, (col, ""))
        draw_panel(flat[i], annuals[col], trends[col], VARIABLE_COLORS[i % len(VARIABLE_COLORS)], name, unit)
    for ax in flat[n:]:
        ax.set_visible(False)                                  # an unused place in the grid

    fig.subplots_adjust(left=0.09, right=0.97, top=1 - 0.95 / height, bottom=0.75 / height, hspace=0.55, wspace=0.28)
    fig.text(0.09, 1 - 0.3 / height, "Long-term trend of the annual means", fontsize=12, fontweight="bold",
             color=TEXT_COLOR, va="center")
    period = "the whole record of each variable" if not YEARS else f"{YEARS[0]} to {YEARS[1]}"
    fig.text(0.09, 0.3 / height,
             f"Dots: annual mean (years with at least {MIN_DAY_SHARE:.0%} of the days). Dashed line: linear trend, drawn only when "
             f"p < {P_LIMIT}.\nTrend ± 95% range (1.96 × standard error). Period: {period}.",
             fontsize=7, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    if not (0 < MIN_DAY_SHARE <= 1) or not (0 < P_LIMIT < 1) or TREND_YEARS < 1:
        stop("MIN_DAY_SHARE must be between 0 and 1 (for example 0.9), P_LIMIT between 0 and 1 (0.05) and TREND_YEARS at least 1.")
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
    annuals, trends = {}, {}
    for col in table.columns:
        if check_record(col, table[col], 0) is None:           # the number of complete years is checked below
            continue
        annuals[col], trends[col] = one_variable(col, table[col])
        if len(annuals[col]) == 0:
            warn(f"'{col}': no year has enough days; this variable is skipped.")
            del annuals[col], trends[col]
    if not annuals:
        stop("No variable has any complete year.")

    out = full_path(OUTPUT_FOLDER)
    out.mkdir(parents=True, exist_ok=True)

    means = pd.DataFrame({col: a for col, a in annuals.items()})      # one row per year, a gap where a variable has no year
    means.index.name = "year"
    means_path = out / "annual_means.csv"
    means.round(DECIMALS).to_csv(means_path)

    rows = []
    for col, t in trends.items():
        a = annuals[col]
        if t is None:
            rows.append({"variable": col, "years_used": len(a)})
            continue
        rows.append({"variable": col, "first_year": t["years"][0], "last_year": t["years"][1], "years_used": len(a),
                     "trend_per_" + ("decade" if TREND_YEARS == 10 else f"{TREND_YEARS}_years"): t["slope"],
                     "ci95": t["ci95"], "p_value": t["p"], "trend_line_drawn": "yes" if t["p"] < P_LIMIT else "no"})
    trends_path = out / "trends.csv"
    pd.DataFrame(rows).round(DECIMALS).to_csv(trends_path, index=False)

    png_path = out / "long_term_trend.png"
    draw_chart(annuals, trends, png_path)

    print("\nTrends:")
    for col, t in trends.items():
        name, unit = VARIABLES.get(col, (col, ""))
        print(f"  {name}: " + ("no trend (too few years)" if t is None else trend_text(t, unit)))
    print(f"\nSaved {png_path}\nSaved {means_path}\nSaved {trends_path}")
    print(f"Done with {len(warnings_list)} warning(s)." + ("" if not warnings_list else " See README.md, 'What the warnings mean'."))


if __name__ == "__main__":
    main()
