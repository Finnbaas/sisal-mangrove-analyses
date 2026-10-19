# Seasonal cycle

Run the seasonal cycle chart ("a typical year") of the Sisal Mangrove Monitor on your own data, for any place and variable.

## What the analysis shows

For each variable (air temperature, wind, waves, salinity, rainfall, ...) the chart shows what a typical year
looks like: the line is the mean of all daily values in each calendar month, and the band runs from the 10th to
the 90th percentile of those daily values, so it shows how much the days of a month differ from each other.
Rainfall (or any amount per day) is shown as the mean monthly total, in bars without a band. One panel per variable.

## What is in this folder

| File | What it is |
|---|---|
| `seasonal_cycle.py` | The script. Settings at the top, no other changes needed. |
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

At least about 10 years of daily data per variable is needed for a reliable seasonal cycle.

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Put your data in a CSV file in the format above.
3. Open `seasonal_cycle.py` and change the SETTINGS: the CSV path, the columns with their names and units, and
   for each column `"mean"` (line with band) or `"total"` (monthly total in bars).
4. Run `python seasonal_cycle.py` and read the data checks it prints.
5. Open the chart and the CSV in the `output` folder. Check the warnings before you use the result.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| Only X years of data | The variable has fewer than 10 years, so the means and percentiles are uncertain. Use a longer record, or treat the result as a rough picture. |
| N missing days (longest gap X days) | Days without a value. They are not filled in or guessed: they are left out of the calculation. |
| N of M months have missing days (total variables) | A monthly total is the sum of the days that exist, so a month with missing days has a total that is too low. Use complete months or a longer record. |
| No values in month(s) ... | The variable has no data in that calendar month (a short record). The month is empty in the chart. |
| The years ... reach outside the data | Your YEARS setting is wider than the data. Only the days that exist are used. |
| N values are not numbers | Text in a numeric column. These values are treated as missing. |
| Dates occur more than once | Only the first row of each date is used. |

The script stops (with a message) when the date column is missing, a listed column is not in the CSV, the file
does not exist, or YEARS lies completely outside the data.

## How the method works

For every calendar month (January to December) all daily values of the whole record are put together. The line is
their mean, the band their 10th to 90th percentile. For a "total" variable the daily values of each month of each
year are summed first, and the line is the mean of the January totals, the February totals, and so on. By default
the whole record of each variable is used, as on the website; the YEARS setting limits it to a range of years (for
example 1991 to 2020) so that variables can be compared over the same period.

## Notes

- With the default settings the numbers are the same as on the website, up to rounding (the website shows two
  decimals; the largest difference with the example data is 0.01).
- The website's sea level cycle is not in this package: it comes from monthly altimetry data, not from daily values.
- Salinity in the example is limited to 1993 to 2012 (one HYCOM model version, values below 30 PSU removed), as on the website.

Data of the example: ERA5-Land and ERA5 (Copernicus Climate Change Service / ECMWF) and HYCOM, grid cells near Sisal, Yucatán, Mexico.
