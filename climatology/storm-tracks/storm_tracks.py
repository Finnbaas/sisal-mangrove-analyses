"""
storm_tracks.py - Map of the storm tracks within a radius of any location, coloured by strength.

WHAT IT DOES
    Finds the tropical storms and hurricanes that came within a radius of a location (the same selection as
    make_events_from_hurdat2.py of the event-counts package) and draws their tracks on a map. Every 6-hourly
    step of a track is coloured by the wind at its start, from light (weak) to dark (strong). The parts of a track
    where the storm was not tropical (extratropical, a low, a wave) are thin, grey and dashed. The location is
    marked with a dashed circle of the radius.

WHAT IT READS
    A HURDAT2 text file from the US National Hurricane Center (https://www.nhc.noaa.gov/data/hurdat/): the Atlantic
    file or the North-East Pacific file. The example file is in example_data/. And the coastlines and country
    borders in map_data/world_map.json (Natural Earth, for the whole world).

WHAT IT SAVES (in OUTPUT_FOLDER)
    storm_tracks.png          the map
    storm_tracks.csv          one row per storm: name, date, hurdat_id, closest_km, max_wind_kt_inside, category
    storm_track_points.csv    the 6-hourly track points of these storms (position, wind, status)

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python storm_tracks.py
    This is the storm map of the Sisal Mangrove Monitor website (100 km around Sisal, at least tropical storm
    strength).
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")                       # draw to a file, no window needed
import matplotlib.pyplot as plt
import matplotlib.ticker
from matplotlib.collections import LineCollection
from matplotlib.lines import Line2D
from matplotlib.patches import Ellipse, PathPatch
from matplotlib.path import Path as MplPath

from hurdat import (read_hurdat, hourly_tracks, storm_hours_near, category, check_site, stop, warn)


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- The storm tracks --------------------------------------------------------------------
# Path of the HURDAT2 file. A relative path starts from the folder of this script.
HURDAT2_FILE = "example_data/hurdat2_atlantic.txt"

# --- Your location and the storms that count ---------------------------------------------
SITE_NAME = "Sisal"               # name of the location on the map
SITE_LAT = 21.165                 # latitude in degrees, north is positive
SITE_LON = -90.03                 # longitude in degrees, west is negative
RADIUS_KM = 100                   # a storm counts when it comes this close to the location (the dashed circle)
MIN_WIND_KT = 34                  # minimum wind in knots: 34 = tropical storm, 64 = hurricane, 83 = category 2, ...
STATUSES = ["TS", "HU", "SS"]     # HURDAT2 statuses that count: TS tropical storm, HU hurricane, SS subtropical storm
                                  # (add "TD" for tropical depressions, with MIN_WIND_KT = 0)

# --- The years ---------------------------------------------------------------------------
# None = all years in the file. Or first and last year, for example (1950, 2024).
YEARS = (1950, 2024)              # the example file ends in 2024

# --- The map -----------------------------------------------------------------------------
MAP_HALF_KM = 700                 # the map is a square: this many km from the location to each edge
LABEL_STORMS = True               # write the name and year of each storm at its strongest point on the map

# --- Output ------------------------------------------------------------------------------
OUTPUT_FOLDER = "output"          # relative to the folder of this script
MAP_DATA = "map_data/world_map.json"


# =============================================================================================
# Colours of the map (the colours of the website)
# =============================================================================================

SEA, LAND, LAND_EDGE = "#CFE0E8", "#DADCD2", "#A7AFA3"
CIRCLE_COLOR = "#0B5E73"
NON_TROPICAL = "#8E989D"
TEXT_COLOR = "#3A4640"
MUTED_COLOR = "#6E7C71"
# The five strength steps of a track: from this wind (kt) on, its colour and its name in the legend.
STEPS = [(0, "#7FA6BF", "Tropical depression"), (34, "#3E8FB0", "Tropical storm"), (64, "#E3B53B", "Cat. 1–2"),
         (96, "#D5462B", "Cat. 3–4"), (137, "#5E1E7A", "Cat. 5")]
TROPICAL = ["HU", "TS", "TD", "SS", "SD"]       # HURDAT2 statuses that are drawn as tropical

HERE = Path(__file__).resolve().parent
KM_PER_DEGREE = 111.2


def full_path(text):
    """A path from the settings: relative paths start from the folder of this script."""
    path = Path(text)
    return path if path.is_absolute() else HERE / path


def step_of(kt):
    """The number of the strength step (0 to 4) of a wind in knots."""
    step = 0
    for i, (limit, _, _) in enumerate(STEPS):
        if kt >= limit:
            step = i
    return step


# =============================================================================================
# The map
# =============================================================================================

def read_map_data():
    """The coastlines (land polygons) and country borders of the world."""
    path = full_path(MAP_DATA)
    if not path.exists():
        stop(f"The map file does not exist: {path}\nIt is part of this package (map_data/world_map.json); check MAP_DATA.")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def draw_land(ax, world, extent):
    """The land polygons that reach into the map, and the country borders (dashed)."""
    x0, x1, y0, y1 = extent
    patches = []
    for polygon in world["land"]:
        outer = np.array(polygon[0])
        if outer[:, 0].max() < x0 or outer[:, 0].min() > x1 or outer[:, 1].max() < y0 or outer[:, 1].min() > y1:
            continue                                                  # this island is not on the map
        vertices, codes = [], []
        for ring in polygon:                                          # the outer ring and the holes (lakes)
            ring = np.array(ring)
            vertices.extend(ring)
            codes.extend([MplPath.MOVETO] + [MplPath.LINETO] * (len(ring) - 2) + [MplPath.CLOSEPOLY])
        patches.append(PathPatch(MplPath(vertices, codes), facecolor=LAND, edgecolor=LAND_EDGE, linewidth=0.8, zorder=1))
    for patch in patches:
        ax.add_patch(patch)
    lines = [l for l in world["borders"] if max(c[0] for c in l) >= x0 and min(c[0] for c in l) <= x1
             and max(c[1] for c in l) >= y0 and min(c[1] for c in l) <= y1]
    ax.add_collection(LineCollection(lines, colors=LAND_EDGE, linewidths=0.8, linestyles=(0, (3, 3)), zorder=2))


def draw_tracks(ax, points, extent):
    """The tracks: every 6-hourly step coloured by the wind at its start, or thin, grey and dashed when not tropical.
    Returns the names to write on the map."""
    x0, x1, y0, y1 = extent
    solid, dashed, labels = [[] for _ in STEPS], [], []
    for storm_id, track in points.groupby("id"):
        track = track.sort_values("time")
        lon, lat, wind, status = track["lon"].values, track["lat"].values, track["wind_kt"].values, track["status"].values
        for i in range(len(track) - 1):
            segment = [(lon[i], lat[i]), (lon[i + 1], lat[i + 1])]
            if status[i] in TROPICAL and not np.isnan(wind[i]):
                solid[step_of(wind[i])].append(segment)
            else:
                dashed.append(segment)
        inside = (lon >= x0) & (lon <= x1) & (lat >= y0) & (lat <= y1) & ~np.isnan(wind)
        if inside.any():
            best = np.where(inside)[0][np.argmax(wind[inside])]       # the strongest point on the map
            labels.append((lon[best], lat[best], f"{track['name'].iloc[0].title()} {track['time'].dt.year.iloc[0]}"))
    ax.add_collection(LineCollection(dashed, colors=NON_TROPICAL, linewidths=0.8, linestyles=(0, (2, 3)), zorder=3))
    for i, (_, color, _) in enumerate(STEPS):
        ax.add_collection(LineCollection(solid[i], colors=color, linewidths=1.9, capstyle="round", zorder=4 + i * 0.1))
    return labels


def degrees_text(value, positive, negative):
    """A degree label like 21°N or 90°W."""
    return f"{abs(value):g}°{positive if value >= 0 else negative}"


def draw_map(points, events, world, path, years_text):
    """Draws the map with the tracks, the location with its circle, and the legend; saves it as a PNG."""
    lat_half = MAP_HALF_KM / KM_PER_DEGREE
    lon_half = lat_half / math.cos(math.radians(SITE_LAT))           # a square map in km
    extent = (SITE_LON - lon_half, SITE_LON + lon_half, SITE_LAT - lat_half, SITE_LAT + lat_half)

    fig = plt.figure(figsize=(7.4, 8.3))
    ax = fig.add_axes([0.1, 0.17, 0.85, 0.73])
    ax.set_facecolor(SEA)
    ax.set_xlim(extent[0], extent[1])
    ax.set_ylim(extent[2], extent[3])
    ax.set_aspect(1 / math.cos(math.radians(SITE_LAT)))               # degrees of longitude are shorter away from the equator
    draw_land(ax, world, extent)
    labels = draw_tracks(ax, points, extent) if len(points) else []
    if LABEL_STORMS:
        for lon, lat, text in labels:
            right = lon > extent[1] - 0.22 * (extent[1] - extent[0])       # near an edge: write the name inward
            top = lat > extent[3] - 0.05 * (extent[3] - extent[2])
            ax.annotate(text, (lon, lat), textcoords="offset points", xytext=(-4 if right else 4, -9 if top else 4),
                        ha="right" if right else "left", fontsize=6.5, color=TEXT_COLOR, zorder=8, clip_on=True)

    # the location with the dashed circle of the radius
    ax.add_patch(Ellipse((SITE_LON, SITE_LAT), 2 * RADIUS_KM / (KM_PER_DEGREE * math.cos(math.radians(SITE_LAT))),
                         2 * RADIUS_KM / KM_PER_DEGREE, fill=False, edgecolor=CIRCLE_COLOR, linewidth=1.5,
                         linestyle=(0, (5, 4)), zorder=7))
    ax.plot([SITE_LON], [SITE_LAT], "o", color=TEXT_COLOR, markersize=5, zorder=9)
    ax.annotate(SITE_NAME, (SITE_LON, SITE_LAT), textcoords="offset points", xytext=(7, -12), fontsize=9,
                fontweight="bold", color=TEXT_COLOR, zorder=9)

    ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=5))
    ax.yaxis.set_major_locator(matplotlib.ticker.MaxNLocator(nbins=6))
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: degrees_text(v, "E", "W")))
    ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: degrees_text(v, "N", "S")))
    ax.tick_params(labelsize=7, colors=MUTED_COLOR, length=3)
    for side in ax.spines.values():
        side.set_color("#9AA69C")

    fig.text(0.1, 0.955, f"Storm tracks near {SITE_NAME}", fontsize=12, fontweight="bold", color=TEXT_COLOR, va="center")
    fig.text(0.1, 0.925, f"{len(events)} storms within {RADIUS_KM} km, wind of at least {MIN_WIND_KT} kt, {years_text}",
             fontsize=8.5, color=TEXT_COLOR, va="center")
    handles = [Line2D([0], [0], color=color, linewidth=2.4) for _, color, _ in STEPS]
    names = [name for _, _, name in STEPS]
    handles += [Line2D([0], [0], color=NON_TROPICAL, linewidth=1, linestyle=(0, (2, 3))),
                Line2D([0], [0], color=CIRCLE_COLOR, linewidth=1.5, linestyle=(0, (5, 4)))]
    names += ["Not tropical", f"{RADIUS_KM} km circle"]
    fig.legend(handles, names, loc="lower left", bbox_to_anchor=(0.08, 0.055), ncol=4, frameon=False, fontsize=7.5)
    fig.text(0.1, 0.025, "HURDAT2 best track (NOAA National Hurricane Center); coastlines: Natural Earth. "
                         "Each 6-hourly step is coloured by the wind at its start.", fontsize=6.5, color=MUTED_COLOR, va="center")
    fig.savefig(path, dpi=150, facecolor="white")
    plt.close(fig)


# =============================================================================================
# Run
# =============================================================================================

def main():
    check_site(SITE_LAT, SITE_LON, RADIUS_KM)
    if YEARS and (len(YEARS) != 2 or YEARS[0] > YEARS[1]):
        stop("YEARS must be None or two years like (1950, 2024).")
    if MAP_HALF_KM <= 0:
        stop("MAP_HALF_KM must be larger than 0.")

    path = full_path(HURDAT2_FILE)
    if not path.exists():
        stop(f"The HURDAT2 file does not exist: {path}\nDownload it from https://www.nhc.noaa.gov/data/hurdat/ "
             "and check HURDAT2_FILE in the settings.")
    world = read_map_data()

    all_tracks = read_hurdat(path)
    first, last = int(all_tracks["time"].dt.year.min()), int(all_tracks["time"].dt.year.max())
    print(f"Read {all_tracks['id'].nunique()} storms, {first} to {last}.")
    tracks = all_tracks
    if YEARS:
        if YEARS[1] < first or YEARS[0] > last:
            stop(f"The years {YEARS[0]} to {YEARS[1]} are outside the file ({first} to {last}).")
        if YEARS[0] < first or YEARS[1] > last:
            warn(f"The years {YEARS[0]} to {YEARS[1]} reach outside the file ({first} to {last}). "
                 "Storms outside the file are not shown.")
        tracks = all_tracks[all_tracks["time"].dt.year.between(YEARS[0], YEARS[1])]
    years_text = f"{max(YEARS[0], first) if YEARS else first} to {min(YEARS[1], last) if YEARS else last}"
    if abs(SITE_LON) > 170:
        warn("The location is close to the date line (180°). Tracks that cross it are drawn wrongly: the map does not "
             "wrap around.")

    h = hourly_tracks(tracks, SITE_LAT, SITE_LON)
    closest = h["km"].min()
    if closest > 1500:
        warn(f"No storm in the file came within 1500 km of {SITE_NAME} (closest: {closest:.0f} km). The Atlantic file covers "
             "the Atlantic, Caribbean and Gulf of Mexico; the North-East Pacific file the Pacific coast of Mexico and "
             "Central America. For other oceans, HURDAT2 does not have tracks.")
    near = storm_hours_near(h, RADIUS_KM, STATUSES, MIN_WIND_KT)
    ids = list(near["id"].unique())

    names = tracks.drop_duplicates("id").set_index("id")["name"]
    rows = []
    for storm_id in ids:
        hours = near[near["id"] == storm_id]
        time = hours["time"].min()                                     # the first hour inside the circle
        name = names[storm_id].title()
        rows.append({"name": name if name != "Unnamed" else f"Unnamed {storm_id}", "date": time.strftime("%Y-%m-%d"),
                     "hurdat_id": storm_id, "closest_km": round(float(h[h["id"] == storm_id]["km"].min())),
                     "max_wind_kt_inside": int(hours["wind_kt"].max()), "category": category(hours["wind_kt"].max()),
                     "_time": time})
    events = pd.DataFrame(rows, columns=["name", "date", "hurdat_id", "closest_km", "max_wind_kt_inside", "category", "_time"])
    events = events.sort_values("_time").drop(columns="_time")
    points = tracks[tracks["id"].isin(ids)].sort_values(["id", "time"])

    if not ids:
        warn(f"No storm came within {RADIUS_KM} km of {SITE_NAME} with at least {MIN_WIND_KT} kt "
             f"(closest any storm track came: {closest:.0f} km). The map shows no tracks; try a larger RADIUS_KM or a lower "
             "MIN_WIND_KT. Track points where the storm had become extratropical are not counted.")
    elif len(ids) > 40:
        warn(f"{len(ids)} storms: the map will be crowded. Use a smaller RADIUS_KM, a higher MIN_WIND_KT or fewer YEARS, "
             "or set LABEL_STORMS to False.")
    unknown = int(points["wind_kt"].isna().sum())
    if unknown:
        warn(f"{unknown} track points of these storms have no wind speed in HURDAT2; the steps that start there are drawn "
             "thin, grey and dashed.")

    out = full_path(OUTPUT_FOLDER)
    out.mkdir(parents=True, exist_ok=True)
    events_path, points_path, png_path = out / "storm_tracks.csv", out / "storm_track_points.csv", out / "storm_tracks.png"
    events.to_csv(events_path, index=False)
    points[["id", "name", "time", "status", "lat", "lon", "wind_kt"]].to_csv(points_path, index=False)
    draw_map(points, events, world, png_path, years_text)

    print(f"\n{len(events)} storms within {RADIUS_KM} km of {SITE_NAME} ({SITE_LAT}, {SITE_LON}), at least {MIN_WIND_KT} kt:")
    if len(events):
        print(events.to_string(index=False))
    print(f"\nSaved {png_path}\nSaved {events_path}\nSaved {points_path}")


if __name__ == "__main__":
    main()
