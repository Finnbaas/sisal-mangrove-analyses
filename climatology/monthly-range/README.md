# Monthly range and running mean

Run the "in detail" chart of the Sisal Mangrove Monitor on your own data: how far the daily values range in each month, and the slow changes underneath in a 365-day running mean.

## What the analysis shows

For each variable the chart shows time on the horizontal axis. The band runs, for every month of the record,
from the lowest to the highest daily value of that month, so it shows the extremes. The line is the 365-day
running mean: the mean of the year of days around each date, so the seasons average out and only slow changes
remain (a warm decade, a dry spell of years). One panel per variable.

## What is in this folder

| File | What it is |
|---|---|
| `monthly_range.py` | The script. Settings at the top, no other changes needed. |
| `load_data.py` | Reads and checks the input CSV. The same file is in every package; do not change it here only. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib). |
| `example_data/sisal_daily.csv` | Our Sisal data in the input format (ERA5-Land, ERA5 and HYCOM). The settings in the script run on it. |

## Input format

One CSV file with a `date` column (YYYY-MM-DD) and one numeric column per variable. Any column names, any
number of columns. Days may be missing, and variables may start and end in different years.

| date | air_temperature_max_c | precipitation_mm | wind_speed_ms |
|---|---|---|---|
| 2024-10-07 | 31.2 | 5.8 | 11.6 |
| 2024-10-08 | 30.4 | 41.9 | 15.9 |
| 2024-10-09 | 31.0 | 0.6 | 10.2 |

At least about 10 years of daily data per variable is needed for a useful picture (a record shorter than one
year has no running mean at all).

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Put your data in a CSV file in the format above.
3. Open `monthly_range.py` and change the SETTINGS: the CSV path and the columns with their names and units.
4. Run `python monthly_range.py` and read the data checks it prints.
5. Open the chart and the CSV in the `output` folder. Check the warnings before you use the result.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| Only X years of data | The variable has fewer than 10 years. The picture is only a rough one. |
| N missing days (longest gap X days) | Days without a value. They are not filled in or guessed: they are left out of the band and the running mean. |
| N of M months have no values at all | A gap of a month or longer. These months are empty in the chart. |
| The running mean is empty in N months in the middle of the record | Fewer than 300 of the 365 days around those months have a value, so there is no running mean there. Fill the gap with real data, or accept the break in the line. |
| The record is shorter than the running mean | Less than 365 days: only the band is drawn. |
| The years ... reach outside the data | Your YEARS setting is wider than the data. Only the days that exist are used. |
| N values are not numbers | Text in a numeric column. These values are treated as missing. |
| Dates occur more than once | Only the first row of each date is used. |

The script stops (with a message) when the date column is missing, a listed column is not in the CSV, the file
does not exist, or YEARS lies completely outside the data.

The running mean always starts and ends about 8 months inside the record: its window needs 300 days with a value,
so at the very start and end it is empty. This is normal; the script prints it as a note, not as a warning.

## How the method works

For every month of the record the lowest and the highest daily value are taken. The running mean is the mean of
the 365 days around each day (centred), calculated only when at least 300 of those days have a value; the chart
shows its value on the 15th of each month. RUNNING_DAYS and MIN_RUNNING_DAYS in the settings change the window; the
website uses 365 and 300. The band shows single days, so it is wide and noisy for variables like rainfall; the
running mean is the part to read for slow change.

## Notes

- With the default settings the monthly lowest, highest and the running mean are the same as on the website, up to
  rounding (the website shows three decimals; the largest difference with the example data is 0.001).
- The website's sea level version (monthly anomaly with a 12-month running mean) is not in this package: it comes from monthly altimetry data.
- Salinity in the example is limited to 1993 to 2012 (one HYCOM model version, values below 30 PSU removed), as on the website.

Data of the example: ERA5-Land and ERA5 (Copernicus Climate Change Service / ECMWF) and HYCOM, grid cells near Sisal, Yucatán, Mexico.
