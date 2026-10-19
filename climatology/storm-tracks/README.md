# Storm tracks near a location

Run the storm map of the Sisal Mangrove Monitor for any location: the tracks of the tropical storms and hurricanes that came within a radius, coloured by strength.

## What the analysis shows

A map with the tracks of all storms that came within a chosen radius of your location (the dashed circle). Each
6-hourly step of a track is coloured by the wind at its start, from light (tropical depression) over tropical storm,
category 1 to 2 and category 3 to 4 to dark purple (category 5). The parts of a track where the storm was not
tropical (extratropical, a low) are thin, grey and dashed. The name and year of each storm are written at its
strongest point on the map. So you see where the storms that reach your site come from, and how strong they were on the way.

## What is in this folder

| File | What it is |
|---|---|
| `storm_tracks.py` | The script. Settings at the top, no other changes needed. |
| `hurdat.py` | Reads HURDAT2 and selects the storms near the location. The same file is in the event-counts package; do not change it here only. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib). |
| `example_data/hurdat2_atlantic.txt` | The HURDAT2 Atlantic storm tracks (NOAA National Hurricane Center, 1851 to 2024). The settings in the script run on it. |
| `map_data/world_map.json` | Coastlines and country borders of the world (Natural Earth 50m, public domain, rounded to 0.01 degree). Not data of your analysis: it is the map under the tracks. |

## Input format

A HURDAT2 text file from the US National Hurricane Center (https://www.nhc.noaa.gov/data/hurdat/): the Atlantic
file, or the North-East Pacific file for the Pacific coast of Mexico and Central America. HURDAT2 has no other
oceans. The file is not edited: you give your location and the storms that count in the settings.

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Download the HURDAT2 file of your ocean and put it in `example_data/` (or give its path in the settings).
3. Open `storm_tracks.py` and change the SETTINGS: the file, the name, latitude and longitude of your location (west
   is negative), the radius in km, the minimum wind in knots (34 = tropical storm, 64 = hurricane), the years and the size of the map.
4. Run `python storm_tracks.py` and read the list of storms it prints.
5. Open the map and the CSV files in the `output` folder. Check the warnings before you use the result.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| The years ... reach outside the file | The HURDAT2 file does not cover the years you asked for. Download a newer file. Storms outside the file are not shown. |
| No storm in the file came within 1500 km | The location is outside the ocean of the file (or in an ocean HURDAT2 does not cover). Use the right file. |
| No storm came within N km with at least M kt | The map has no tracks. Use a larger radius or a lower minimum wind. Points where a storm had become extratropical do not count, so places far from the tropics find nothing. |
| N storms: the map will be crowded | Use a smaller radius, a higher minimum wind, fewer years, or set LABEL_STORMS to False. |
| The location is close to the date line | Tracks that cross 180 degrees longitude are not drawn correctly; the map does not wrap around. |
| N track points have no wind speed | HURDAT2 has no wind there (-99). The steps that start at those points are drawn thin, grey and dashed. |
| N track lines could not be read | Lines that are not HURDAT2. They are ignored. |

The script stops (with a message) when a file does not exist, the location or radius is impossible, the years lie
completely outside the file, or the file is not a HURDAT2 file.

## How the method works

The storm selection is the one of the website. The 6-hourly track points are interpolated to hourly points (a fast
storm can cross the circle between two points), the great-circle distance to the location is calculated, and a
storm counts when in at least one hour it is within the radius, has status TS, HU or SS and a wind of at least the
minimum. The full track of each of these storms is drawn, also the part outside the circle, cut off at the edge of
the map. Colours: wind from 0 kt (depression), 34 (tropical storm), 64 (cat. 1 to 2), 96 (cat. 3 to 4) and 137 kt (cat. 5).
Longitude is squeezed with the cosine of the latitude of your location, so distances look right.

## Notes

- With the default settings the 17 storms are the same as the storms counted on the website (see the event-counts
  package). The website's map shows the 11 storms it studies in detail: 9 of them are in the selection; Mitch (1998) and Stan (2005)
  are studied but did not reach tropical storm strength near Sisal, so this script does not draw them.
  The track points of the 9 storms are the same as on the website (wind difference 0 kt); the website shows the part of the track that fits its map, this script the full track.
- The map is a still picture, without the zoom and hover of the website.
- `storm_track_points.csv` holds the 6-hourly points that are drawn, so you can make your own figure.
- HURDAT2 is public data of the US National Hurricane Center; coastlines are from Natural Earth (public domain).
