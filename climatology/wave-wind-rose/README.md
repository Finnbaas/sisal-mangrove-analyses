# Wave and wind rose

Run the wave direction rose of the Sisal Mangrove Monitor on your own data: where the waves or the wind come from, on all days and on rough days.

## What the analysis shows

The compass is divided into 8 sectors of 45 degrees (N, NE, E, SE, S, SW, W, NW), N at the top and clockwise. Every
day is counted in the sector its direction falls in (N is everything from 337.5 to 22.5 degrees). The rose has two
wedges per sector: a wide pale wedge with the share of ALL days, and a narrow dark wedge with the share of the days
on which a second column is above a threshold, for example the days with waves higher than 2 m. Each wedge set adds
up to 100%, so you can see whether rough days come from other directions than normal days.

## What is in this folder

| File | What it is |
|---|---|
| `wave_wind_rose.py` | The script. Settings at the top, no other changes needed. |
| `load_data.py` | Reads and checks the input CSV. The same file is in every package; do not change it here only. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib). |
| `example_data/sisal_waves.csv` | Our Sisal wave direction and daily maximum wave height (ERA5, 1979 to 2025). The settings in the script run on it. |

## Input format

One CSV file with a `date` column (YYYY-MM-DD), a column with the direction in degrees and a column with the values
for the threshold. Any column names; you give them in the settings. The direction is the direction it comes FROM:
0 or 360 is north, 90 east, 180 south, 270 west. Days may be missing.

| date | wave_direction_deg | wave_height_max_m |
|---|---|---|
| 2024-10-07 | 62.4 | 1.8 |
| 2024-10-08 | 85.1 | 3.4 |
| 2024-10-09 | 91.7 | 2.6 |

At least about 10 years of daily data is needed for stable shares. The threshold column can be anything: wave
height, wind speed, rainfall.

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Put your data in a CSV file in the format above.
3. Open `wave_wind_rose.py` and change the SETTINGS: the CSV path, the direction column, the threshold column, the
   threshold and its unit, and the names used in the chart.
4. Run `python wave_wind_rose.py` and read the data checks and the table it prints.
5. Open the rose and the CSV in the `output` folder. Check the warnings before you use the result.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| N values are outside 0 to 360 degrees | The direction column holds something that is not a direction in degrees (for example a code or a fill value like 999). Those values are treated as missing. |
| N days have a direction but no value in the threshold column | These days are left out of both wedges, so that the two wedges describe the same days. |
| Only X years of days with both values | Fewer than 10 years. The shares are uncertain. |
| No day is above the threshold | The threshold is higher than every value (the message gives the highest). Lower it; only the wide wedge is drawn. |
| Only N days are above the threshold | Fewer than 30 rough days: the shares of the narrow wedge can change a lot with one more storm. |
| Every day is above the threshold | The two wedges are the same. Raise the threshold. |
| N missing days (longest gap X days) | Days without a value in one of the columns. They are not filled in or guessed. |
| The years ... reach outside the data | Your YEARS setting is wider than the data. Only the days that exist are used. |
| N values are not numbers / Dates occur more than once | Text in a numeric column (treated as missing), or a date that occurs twice (the first row is used). |

The script stops (with a message) when the date column is missing, a column from the settings is not in the CSV
(the message then says "columns from VARIABLES", it means the two columns of the settings), the file does not
exist, or YEARS lies completely outside the data.

## How the method works

Direction `d` in degrees goes to sector `((d + 22.5) mod 360) // 45`, so sector 0 is N (centred on 0 degrees), 1 is NE,
and so on. Only days on which both columns have a value are used. The rough days are the days on which the
threshold column is strictly above the threshold. For each wedge set the number of days per sector is divided by
the total number of days in that set. The wedges are 36 degrees (all days) and 18 degrees (rough days) wide, as on
the website. The length of a wedge is its percentage.

## Notes

- With the default settings the number of days (17167 and 739) and the percentage of every sector are exactly the same as on the website.
- The rose shows frequency of direction, not size: it does not say how high the waves were, only from where rough days come.
- The colour is the wave colour of the website; change `ROSE_COLOR` in the script for other variables.

Data of the example: ERA5 (Copernicus Climate Change Service / ECMWF), sea grid cell near Sisal, Yucatán, Mexico.
