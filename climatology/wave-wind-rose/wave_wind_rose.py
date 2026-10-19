"""
wave_wind_rose.py - Wave and wind rose: where does the wind or the waves come from, on all days and on rough days.

WHAT IT DOES
    Divides the compass in 8 sectors of 45 degrees (N, NE, E, ...). Every day is counted in the sector its
    direction falls in. The rose shows, for each sector, the share of ALL days (a wide pale wedge) and the
    share of the days on which a second column is ABOVE a threshold (a narrow dark wedge), for example the
    days with waves higher than 2 m. The shares of each wedge set add up to 100%.

WHAT IT READS
    A CSV file with a "date" column (YYYY-MM-DD), a column with the direction in degrees (0 to 360, the
    direction it comes FROM, 0 = north, 90 = east) and a column with the values for the threshold
    (see README.md).

WHAT IT SAVES (in OUTPUT_FOLDER)
    wave_wind_rose.png   the rose
    wave_wind_rose.csv   the numbers behind it (days and percentage per sector)

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python wave_wind_rose.py
    This is the method of the "Wave direction" rose of the Sisal Mangrove Monitor website.
"""

import math

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # draw to a file, no window needed
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

from load_data import read_data, check_record, full_path, stop, warn, warnings_list


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- Your data ---------------------------------------------------------------------------
# Path of the CSV file. A relative path starts from the folder of this script.
INPUT_CSV = "example_data/sisal_waves.csv"

DIRECTION_COLUMN = "wave_direction_deg"      # the column with the direction in degrees (0 to 360, coming FROM)
DIRECTION_NAME = "Wave direction"            # name used in the chart

# --- The rough days ----------------------------------------------------------------------
# The narrow wedge counts only the days on which THRESHOLD_COLUMN is above THRESHOLD.
THRESHOLD_COLUMN = "wave_height_max_m"       # the column that decides which days count
THRESHOLD_NAME = "wave height (daily max)"   # name used in the chart
THRESHOLD = 2                                # the threshold, in the unit of that column
THRESHOLD_UNIT = "m"                         # unit, only used in the text of the chart

# --- The period --------------------------------------------------------------------------
# None = all days of the record (this is what the website does).
# Or a range of years, for example (1991, 2020) = from 1 Jan 1991 to 31 Dec 2020.
YEARS = None

MIN_YEARS = 10                    # warn when there is less data than this
MIN_ROUGH_DAYS = 30               # warn when fewer days than this are above the threshold
DECIMALS = 1                      # decimals of the percentages in the CSV

# --- Output ------------------------------------------------------------------------------
OUTPUT_FOLDER = "output"          # relative to the folder of this script


# =============================================================================================
# Colours of the chart (the wave colour of the website)
# =============================================================================================

ROSE_COLOR = "#2A9A35"
TEXT_COLOR = "#3A4640"
MUTED_COLOR = "#6E7C71"
GRID_COLOR = "#DCE6D8"
AXIS_COLOR = "#9AA69C"

SECTORS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]     # 8 sectors of 45 degrees; N is centred on 0 degrees
ALL_WIDTH, ROUGH_WIDTH = 36, 18                            # width of the two wedges in degrees (as on the website)


# =============================================================================================
# The method
# =============================================================================================

def sector_of(direction):
    """The sector number of each direction in degrees: 0 = N (from 337.5 to 22.5), 1 = NE, 2 = E, ...
    (the sector calculation of the website)."""
    return (((direction + 22.5) % 360) // 45).astype(int)


def shares(sector):
    """For each of the 8 sectors: the number of days and the percentage of all days."""
    counts = sector.value_counts().reindex(range(8), fill_value=0)
    percent = counts / counts.sum() * 100 if counts.sum() else counts * 0.0
    return counts, percent


# =============================================================================================
# The chart
# =============================================================================================

def draw_rose(all_percent, rough_percent, n_all, n_rough, record, path):
    """Draws the rose: N at the top, clockwise; a wide pale wedge (all days) and a narrow dark wedge (rough days)."""
    angles = np.radians(np.arange(8) * 45)
    fig = plt.figure(figsize=(6.2, 7.0))
    ax = fig.add_axes([0.14, 0.17, 0.72, 0.64], projection="polar")
    ax.set_theta_zero_location("N")
    ax.set_theta_direction(-1)                                   # clockwise
    top = max(float(all_percent.max()), float(rough_percent.max()) if n_rough else 0.0)
    step = 10 if top > 30 else 5 if top > 12 else 2 if top > 5 else 1
    rmax = math.ceil(top * 1.08 / step) * step
    ax.bar(angles, all_percent.values, width=np.radians(ALL_WIDTH), color=ROSE_COLOR, alpha=0.28, linewidth=0, zorder=2)
    if n_rough:
        ax.bar(angles, rough_percent.values, width=np.radians(ROUGH_WIDTH), color=ROSE_COLOR, linewidth=0, zorder=3)
    ax.set_ylim(0, rmax)
    ax.set_yticks(np.arange(step, rmax + 0.1, step))
    ax.set_yticklabels([f"{v:g}%" for v in np.arange(step, rmax + 0.1, step)], fontsize=7, color=MUTED_COLOR)
    ax.set_rlabel_position(22.5)
    ax.set_xticks(angles)
    ax.set_xticklabels(SECTORS, fontsize=10, color=TEXT_COLOR, fontweight="bold")
    ax.grid(color=GRID_COLOR, linewidth=0.8)
    ax.spines["polar"].set_color(AXIS_COLOR)

    fig.text(0.08, 0.96, f"{DIRECTION_NAME}: rose", fontsize=12, fontweight="bold", color=TEXT_COLOR, va="center")
    handles = [Patch(facecolor=ROSE_COLOR, alpha=0.28, label=f"All {n_all} days")]
    if n_rough:
        handles.append(Patch(facecolor=ROSE_COLOR, label=f"{n_rough} days with {THRESHOLD_NAME} above {THRESHOLD:g} {THRESHOLD_UNIT}".rstrip()))
    else:
        handles.append(Patch(facecolor="white", edgecolor=AXIS_COLOR, label=f"No days with {THRESHOLD_NAME} above {THRESHOLD:g} {THRESHOLD_UNIT}".rstrip()))
    fig.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.06, 0.945), frameon=False, fontsize=8)
    fig.text(0.08, 0.07,
             f"Direction the {DIRECTION_NAME.lower()} comes from, in 8 sectors of 45°; N at the top, clockwise.\n"
             f"Each wedge set shows the share of its own days per sector (together 100%).\n"
             f"Record: {record}.",
             fontsize=7, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    if DIRECTION_COLUMN == THRESHOLD_COLUMN:
        stop("DIRECTION_COLUMN and THRESHOLD_COLUMN must be two different columns.")
    if YEARS and (len(YEARS) != 2 or YEARS[0] > YEARS[1]):
        stop("YEARS must be None or two years like (1991, 2020).")

    table = read_data(INPUT_CSV, {DIRECTION_COLUMN: None, THRESHOLD_COLUMN: None})
    print(f"Read {table.shape[1]} columns, {table.index[0].date()} to {table.index[-1].date()}.")
    if YEARS:
        if YEARS[1] < table.index[0].year or YEARS[0] > table.index[-1].year:
            stop(f"The years {YEARS[0]} to {YEARS[1]} are outside the data "
                 f"({table.index[0].date()} to {table.index[-1].date()}).")
        if YEARS[0] < table.index[0].year or YEARS[1] > table.index[-1].year:
            warn(f"The years {YEARS[0]} to {YEARS[1]} reach outside the data "
                 f"({table.index[0].date()} to {table.index[-1].date()}); only the days that exist are used.")
        table = table[(table.index.year >= YEARS[0]) & (table.index.year <= YEARS[1])]

    print("\nData checks:")
    for col in (DIRECTION_COLUMN, THRESHOLD_COLUMN):
        check_record(col, table[col], 0)                         # prints the record and the gaps; the years are checked below

    # directions must be degrees from 0 to 360; anything else is not used
    direction = table[DIRECTION_COLUMN]
    outside = int(((direction < 0) | (direction > 360)).sum())
    if outside:
        warn(f"'{DIRECTION_COLUMN}': {outside} values are outside 0 to 360 degrees and are treated as missing. "
             "Check that the column holds a direction in degrees.")
        direction = direction.where((direction >= 0) & (direction <= 360))

    # only the days on which both columns have a value
    days = pd.DataFrame({"direction": direction, "value": table[THRESHOLD_COLUMN]}).dropna()
    if days.empty:
        stop("No day has a value in both columns.")
    n_one = int(direction.notna().sum() - len(days))
    if n_one:
        warn(f"{n_one} days have a direction but no '{THRESHOLD_COLUMN}'; these days are left out of both wedges.")
    years = len(days) / 365.25
    if years < MIN_YEARS:
        warn(f"Only {years:.1f} years of days with both values (less than {MIN_YEARS}). The shares are uncertain.")

    sector = sector_of(days["direction"])
    rough = sector[days["value"] > THRESHOLD]
    all_counts, all_percent = shares(sector)
    rough_counts, rough_percent = shares(rough)
    if len(rough) == 0:
        warn(f"No day has '{THRESHOLD_COLUMN}' above {THRESHOLD:g} (the highest value is {days['value'].max():g}). "
             "Lower THRESHOLD; the chart shows only the wide wedge.")
    elif len(rough) < MIN_ROUGH_DAYS:
        warn(f"Only {len(rough)} days are above the threshold (less than {MIN_ROUGH_DAYS}). "
             "The shares of the narrow wedge are uncertain.")
    elif len(rough) == len(days):
        warn("Every day is above the threshold, so the two wedges are the same. Raise THRESHOLD.")

    out = full_path(OUTPUT_FOLDER)
    out.mkdir(parents=True, exist_ok=True)
    result = pd.DataFrame({"sector": SECTORS, "all_days": all_counts.values,
                           "all_days_percent": all_percent.values, "above_threshold_days": rough_counts.values,
                           "above_threshold_percent": rough_percent.values})
    csv_path = out / "wave_wind_rose.csv"
    result.round(DECIMALS).to_csv(csv_path, index=False)

    record = f"{days.index[0].date()} to {days.index[-1].date()}"
    png_path = out / "wave_wind_rose.png"
    draw_rose(all_percent, rough_percent, len(days), len(rough), record, png_path)

    print(f"\n{len(days)} days, {len(rough)} above the threshold ({THRESHOLD:g} {THRESHOLD_UNIT}). Percentage per sector:")
    print("  sector   all days %   above threshold %")
    for i, name in enumerate(SECTORS):
        print(f"  {name:6s}   {all_percent[i]:9.1f}   {rough_percent[i]:15.1f}")
    print(f"\nSaved {png_path}\nSaved {csv_path}")
    print(f"Done with {len(warnings_list)} warning(s)." + ("" if not warnings_list else " See README.md, 'What the warnings mean'."))


if __name__ == "__main__":
    main()
