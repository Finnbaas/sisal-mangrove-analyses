"""
hurdat.py - Reading HURDAT2 storm tracks and selecting the storms near a location. Shared by the storm packages.

WHAT IT DOES
    Reads a HURDAT2 text file, interpolates the 6-hourly track points to hourly points, calculates the
    distance to a location, and selects the storms that came within a radius with at least a minimum wind.

WHAT IT READS
    A HURDAT2 text file from the US National Hurricane Center (https://www.nhc.noaa.gov/data/hurdat/).

WHO USES IT
    make_events_from_hurdat2.py (event-counts) and storm_tracks.py (storm-tracks) import it. This file is the SAME
    in every package that has it (each package must work on its own). Do not change it in one package only: run
    check_shared.py in the main folder of the repository, it reports if the copies differ.
"""

import sys

import numpy as np
import pandas as pd

EARTH_RADIUS_KM = 6371
CATEGORIES = [(137, "Cat 5"), (113, "Cat 4"), (96, "Cat 3"), (83, "Cat 2"), (64, "Cat 1"), (34, "TS"), (0, "TD")]

try:
    sys.stdout.reconfigure(errors="replace")      # a character the console cannot show becomes a question mark
except (AttributeError, ValueError):
    pass


def stop(message):
    """Stops the script with a clear message (no crash with a long error text)."""
    print("\nSTOPPED: " + message)
    sys.exit(1)


def warn(message):
    """Prints a warning."""
    print("WARNING: " + message)


def check_site(lat, lon, radius_km):
    """Stops with a message when the location or the radius cannot be right."""
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        stop("SITE_LAT must be between -90 and 90 and SITE_LON between -180 and 180 (west is negative).")
    if radius_km <= 0:
        stop("RADIUS_KM must be larger than 0.")


def read_hurdat(path):
    """HURDAT2: one row per 6-hourly track point. A header line (for example 'AL142024, MILTON, 33,') gives
    the id and the name of a storm, the lines below it are its track points."""
    rows, storm_id, name, bad = [], None, None, 0
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            p = [x.strip() for x in line.split(",")]
            if p[0][:2].isalpha():                              # header line
                storm_id, name = p[0], p[1]
                continue
            if len(p) < 7:
                continue
            try:
                lat = float(p[4][:-1]) * (1 if p[4][-1] == "N" else -1)
                lon = float(p[5][:-1]) * (-1 if p[5][-1] == "W" else 1)
                wind = int(p[6])
                time = pd.Timestamp(p[0] + p[1])
            except (ValueError, IndexError):
                bad += 1
                continue
            rows.append((storm_id, name, time, p[3], lat, lon, wind if wind >= 0 else np.nan))   # -99 = unknown wind
    if bad:
        warn(f"{bad} track lines could not be read and are ignored.")
    if not rows:
        stop(f"No HURDAT2 track points found in {path}. Is this the HURDAT2 text file from nhc.noaa.gov/data/hurdat/?")
    return pd.DataFrame(rows, columns=["id", "name", "time", "status", "lat", "lon", "wind_kt"])


def hourly_tracks(tracks, site_lat, site_lon):
    """Hourly interpolation of the tracks (a fast storm can cross the circle between two 6-hourly points),
    with the great-circle distance to the location in km."""
    def hourly(g):
        g = g.drop_duplicates("time").set_index("time")
        idx = pd.date_range(g.index[0], g.index[-1], freq="h")
        num = g[["lat", "lon", "wind_kt"]].reindex(g.index.union(idx)).interpolate("time").reindex(idx)
        num["status"] = g["status"].reindex(idx, method="ffill")
        return num

    h = pd.concat({k: hourly(g) for k, g in tracks.groupby("id")}, names=["id", "time"]).reset_index()
    la1, lo1 = np.radians(site_lat), np.radians(site_lon)
    la2, lo2 = np.radians(h["lat"]), np.radians(h["lon"])
    h["km"] = EARTH_RADIUS_KM * 2 * np.arcsin(np.sqrt(np.sin((la2 - la1) / 2) ** 2
                                                       + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2))
    return h


def storm_hours_near(h, radius_km, statuses, min_wind_kt):
    """The hourly points inside the circle that count: status in `statuses` and a wind of at least min_wind_kt.
    A storm counts when it has at least one such hour."""
    return h[(h["km"] <= radius_km) & h["status"].isin(statuses) & (h["wind_kt"] >= min_wind_kt)]


def category(kt):
    """Strength class of a wind in knots: TD, TS, Cat 1 to Cat 5."""
    for limit, name in CATEGORIES:
        if kt >= limit:
            return name
    return "TD"
