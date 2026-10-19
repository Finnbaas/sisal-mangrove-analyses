"""
make_events_from_hurdat2.py - Makes the events CSV of event_counts.py from HURDAT2 storm tracks.

WHAT IT DOES
    Finds the tropical storms and hurricanes that came within a radius of any location, and writes one row per
    storm (name, date, ...). The date is the first hour the storm was inside the circle. The 6-hourly track
    points are first interpolated to hourly points, because a fast storm can cross the circle between two
    6-hourly points. A storm counts when, in at least one hour inside the circle, it was a tropical or
    subtropical system (status TS, HU or SS) with a wind of at least MIN_WIND_KT knots.

WHAT IT READS
    A HURDAT2 text file from the US National Hurricane Center (https://www.nhc.noaa.gov/data/hurdat/):
    the Atlantic file or the North-East Pacific file. The example file is in example_data/.

WHAT IT SAVES (in OUTPUT_FOLDER)
    events.csv   one row per storm: name, date, hurdat_id, closest_km, max_wind_kt_inside, category
                 (the first two columns are the input of event_counts.py)

HOW TO USE
    1. Change the SETTINGS below. 2. Run:  python make_events_from_hurdat2.py
    This is the storm selection of the Sisal Mangrove Monitor website (100 km around Sisal, at least tropical
    storm strength).
"""

from pathlib import Path

import pandas as pd

from hurdat import (read_hurdat, hourly_tracks, storm_hours_near, category, check_site,
                    stop, warn)


# =============================================================================================
# SETTINGS - change these
# =============================================================================================

# --- The storm tracks --------------------------------------------------------------------
# Path of the HURDAT2 file. A relative path starts from the folder of this script.
HURDAT2_FILE = "example_data/hurdat2_atlantic.txt"

# --- Your location and the storms that count ---------------------------------------------
SITE_NAME = "Sisal"               # only used in the messages
SITE_LAT = 21.165                 # latitude in degrees, north is positive
SITE_LON = -90.03                 # longitude in degrees, west is negative
RADIUS_KM = 100                   # a storm counts when it comes this close to the location
MIN_WIND_KT = 34                  # minimum wind in knots: 34 = tropical storm, 64 = hurricane, 83 = category 2, ...
STATUSES = ["TS", "HU", "SS"]     # HURDAT2 statuses that count: TS tropical storm, HU hurricane, SS subtropical storm
                                  # (add "TD" for tropical depressions, with MIN_WIND_KT = 0)

# --- The years ---------------------------------------------------------------------------
# None = all years in the file. Or first and last year, for example (1950, 2025).
YEARS = (1950, 2024)    # the example file ends in 2024

# --- Output ------------------------------------------------------------------------------
OUTPUT_FOLDER = "output"          # relative to the folder of this script
OUTPUT_NAME = "events.csv"

HERE = Path(__file__).resolve().parent


# =============================================================================================
# Run
# =============================================================================================

def main():
    check_site(SITE_LAT, SITE_LON, RADIUS_KM)
    if YEARS and (len(YEARS) != 2 or YEARS[0] > YEARS[1]):
        stop("YEARS must be None or two years like (1950, 2025).")

    path = Path(HURDAT2_FILE)
    path = path if path.is_absolute() else HERE / path
    if not path.exists():
        stop(f"The HURDAT2 file does not exist: {path}\nDownload it from https://www.nhc.noaa.gov/data/hurdat/ "
             "and check HURDAT2_FILE in the settings.")

    all_tracks = read_hurdat(path)
    first, last = int(all_tracks["time"].dt.year.min()), int(all_tracks["time"].dt.year.max())
    print(f"Read {all_tracks['id'].nunique()} storms, {first} to {last}.")
    tracks = all_tracks
    if YEARS:
        if YEARS[1] < first or YEARS[0] > last:
            stop(f"The years {YEARS[0]} to {YEARS[1]} are outside the file ({first} to {last}).")
        if YEARS[0] < first or YEARS[1] > last:
            warn(f"The years {YEARS[0]} to {YEARS[1]} reach outside the file ({first} to {last}). "
                 "Storms outside the file are not counted, so the record is shorter than you asked for.")
        tracks = all_tracks[all_tracks["time"].dt.year.between(YEARS[0], YEARS[1])]
    n_years = (min(YEARS[1], last) - max(YEARS[0], first) + 1) if YEARS else (last - first + 1)
    if n_years < 10:
        warn(f"Only {n_years} years. The counts per month and per year will be very uncertain.")
    h = hourly_tracks(tracks, SITE_LAT, SITE_LON)
    closest = h["km"].min()
    if closest > 1500:
        warn(f"No storm in the file came within 1500 km of {SITE_NAME} (closest: {closest:.0f} km). The Atlantic file covers "
             "the Atlantic, Caribbean and Gulf of Mexico; the North-East Pacific file the Pacific coast of Mexico and "
             "Central America. For other oceans, HURDAT2 does not have tracks.")

    near = storm_hours_near(h, RADIUS_KM, STATUSES, MIN_WIND_KT)
    names = tracks.drop_duplicates("id").set_index("id")["name"]
    rows = []
    for storm_id, hours in near.groupby("id"):
        name = names[storm_id].title()
        time = hours["time"].min()                                     # the first hour inside the circle
        rows.append({"name": name if name != "Unnamed" else f"Unnamed {storm_id}", "date": time.strftime("%Y-%m-%d"),
                     "hurdat_id": storm_id, "closest_km": round(float(h[h["id"] == storm_id]["km"].min())),
                     "max_wind_kt_inside": int(hours["wind_kt"].max()),
                     "category": category(hours["wind_kt"].max()), "_time": time})
    if not rows:
        warn(f"No storm came within {RADIUS_KM} km of {SITE_NAME} with at least {MIN_WIND_KT} kt "
             f"(closest any storm track came: {closest:.0f} km). The CSV will be empty; try a larger RADIUS_KM or a lower MIN_WIND_KT. "
             "Track points where the storm had become extratropical (status EX) or a low are not counted.")
    events = pd.DataFrame(rows, columns=["name", "date", "hurdat_id", "closest_km", "max_wind_kt_inside", "category", "_time"])
    events = events.sort_values("_time").drop(columns="_time")

    out = Path(OUTPUT_FOLDER)
    out = out if out.is_absolute() else HERE / out
    out.mkdir(parents=True, exist_ok=True)
    csv_path = out / OUTPUT_NAME
    events.to_csv(csv_path, index=False)

    print(f"\n{len(events)} storms within {RADIUS_KM} km of {SITE_NAME} ({SITE_LAT}, {SITE_LON}), at least {MIN_WIND_KT} kt:")
    if len(events):
        print(events.to_string(index=False))
    print(f"\nSaved {csv_path}")


if __name__ == "__main__":
    main()
