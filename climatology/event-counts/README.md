# Events per month and year

Run the "When storms come" charts of the Sisal Mangrove Monitor on your own events: how many events per month and per year. An optional helper makes the list of storms for any location from HURDAT2 storm tracks.

## What the analysis shows

Two bar charts of a list of events (storms, floods, heat waves, ...). The first counts the events per calendar month,
all years together (J to D), so you see the season. The second counts them per year over the whole record, with
years without any event as zero, so you see how often and how regularly they come. A line of text gives the total,
the first and last month with events and the peak month(s).

## What is in this folder

| File | What it is |
|---|---|
| `event_counts.py` | The script that counts the events and draws the charts. Settings at the top. |
| `make_events_from_hurdat2.py` | Optional helper: makes the events CSV from HURDAT2 storm tracks for any location, radius and strength. |
| `hurdat.py` | Reads HURDAT2 and selects the storms near the location, used by the helper. The same file is in the storm-tracks package; do not change it here only. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib). |
| `example_data/sisal_storms.csv` | The 17 storms within 100 km of Sisal, 1950 to 2024 (made by the helper). The settings in `event_counts.py` run on it. |
| `example_data/hurdat2_atlantic.txt` | The HURDAT2 Atlantic storm tracks (NOAA National Hurricane Center, 1851 to 2024), input of the helper. |

## Input format

`event_counts.py` reads one CSV file with one row per event and the columns `name` and `date` (YYYY-MM-DD). Any
other columns are ignored. The name is only used to find events that are in the list twice.

| name | date |
|---|---|
| Hilda | 1955-09-17 |
| Inez | 1966-10-07 |
| Milton | 2024-10-07 |

You also tell the script the record years (the first and last year in which events could have been recorded). This
is needed: without it the script cannot know that a year without events was really a year without events, and not a
year before your record began.

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Get your events as a CSV in the format above, or make a storm list for your location (see below).
3. Open `event_counts.py` and change the SETTINGS: the CSV path, what the events are called, the place and the record years.
4. Run `python event_counts.py` and read the checks it prints.
5. Open the chart and the two CSV files in the `output` folder. Check the warnings before you use the result.

### Making a storm list for your location

1. Download the HURDAT2 text file of your ocean from https://www.nhc.noaa.gov/data/hurdat/ (Atlantic, or North-East
   Pacific for the Pacific coast of Mexico and Central America). HURDAT2 has no other oceans.
2. Open `make_events_from_hurdat2.py` and change the SETTINGS: the file, the name, latitude and longitude of your
   location (west is negative), the radius in km, the minimum wind in knots (34 = tropical storm, 64 = hurricane,
   83 = category 2) and the years.
3. Run `python make_events_from_hurdat2.py`. It prints the storms and saves `output/events.csv`.
4. Point `INPUT_CSV` in `event_counts.py` to that file (for example `output/events.csv`) and set `RECORD_YEARS`
   to the same years.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| The CSV has no 'name' column | The events are counted without names, and two events on the same date are both counted. |
| N events have a date that could not be read | Wrong date format. Use YYYY-MM-DD. These events are not counted. |
| N events occur more than once | Same name and same date twice in the list; each is counted once. |
| N events are outside the record years | They are left out of the counts. Widen RECORD_YEARS if the record really is longer. |
| RECORD_YEARS is None | The record runs from the first to the last event. Empty years at the start and end are not counted as zero. |
| The record is only X years / Only N events | Less than 10 years or 10 events: the pattern per month and per year is uncertain. |
| (helper) The years reach outside the file | The HURDAT2 file does not cover the years you asked for. Download a newer file. |
| (helper) No storm came within ... | The location is outside the ocean of the file, or the radius or minimum wind is too strict. The CSV is empty. |

The scripts stop (with a message) when a file does not exist, the CSV has no `date` column, the events are all
outside the record, or the HURDAT2 file cannot be read.

## How the method works

**Counting.** The month of an event is the month of its date. Per month the events of all years are added; per year
every year of the record gets its count, zero when there is none.

**Storm selection (helper).** The 6-hourly track points are interpolated to hourly points (a fast storm can cross the
circle between two points). A storm counts when, in at least one hour, it is within the radius of the location, has
status TS, HU or SS (tropical storm, hurricane, subtropical storm) and a wind of at least the minimum. Its date is the
first hour inside the circle. Distances are great-circle distances to the location. The columns of the CSV also give
the closest distance of the whole track, the strongest wind inside the circle and the strength class.

## Notes

- With the default settings the 17 storms, their months and years, the counts per month and the counts per year are
  exactly the same as on the website (largest difference 0).
- The example file ends in 2024, so the record is 1950 to 2024. The website's "1950 to 2025" has no 2025 track data in this file.
- The website marks the storms it studies in detail in a different colour; that is not in this package.
- Track points with an unknown wind in HURDAT2 (-99) are filled in from the points around them, like the other hourly values.
- Storms that had become extratropical (status EX) before reaching the circle are not counted; for locations far
  from the tropics (for example the Netherlands) the helper therefore finds no storms.
- HURDAT2 is public data of the US National Hurricane Center.
