# Long-term trend

Run the "change since 1950" analysis of the Sisal Mangrove Monitor on your own data: the annual means of a variable and the trend through them, with its uncertainty and significance.

## What the analysis shows

For each variable (air temperature, wind, waves, rainfall, salinity, ...) the chart shows the mean of every year
(dots) and the linear trend through them, given per decade as "trend ± 95% range, p-value". The trend line is
drawn only when the trend is significant (p below 0.05); otherwise the chart says "No significant trend" and
still shows the numbers. Only years with at least 90% of their days count, so a year with a long gap does not
pull the trend. One panel per variable.

## What is in this folder

| File | What it is |
|---|---|
| `long_term_trend.py` | The script. Settings at the top, no other changes needed. |
| `load_data.py` | Reads and checks the input CSV. The same file is in every package; do not change it here only. |
| `requirements.txt` | The Python packages you need (pandas, numpy, scipy, matplotlib). |
| `example_data/sisal_daily.csv` | Our Sisal data in the input format (ERA5-Land, ERA5 and HYCOM). The settings in the script run on it. |

## Input format

One CSV file with a `date` column (YYYY-MM-DD) and one numeric column per variable. Any column names, any
number of columns. Days may be missing, and variables may start and end in different years.

| date | air_temperature_max_c | precipitation_mm | wind_speed_ms |
|---|---|---|---|
| 2024-10-07 | 31.2 | 5.8 | 11.6 |
| 2024-10-08 | 30.4 | 41.9 | 15.9 |
| 2024-10-09 | 31.0 | 0.6 | 10.2 |

At least about 20 years of daily data per variable is needed for a trend you can rely on (the script warns
below 10 complete years and does not calculate a trend below 3).

## Steps

1. Install Python 3.9 or newer. In this folder, make a virtual environment and install the packages:
   `python -m venv venv`, activate it, then `pip install -r requirements.txt`.
2. Put your data in a CSV file in the format above.
3. Open `long_term_trend.py` and change the SETTINGS: the CSV path and the columns with their names and units.
4. Run `python long_term_trend.py` and read the data checks and the trends it prints.
5. Open the chart and the CSV files in the `output` folder. Check the warnings before you use the result.

## What the warnings mean

| Message | What it means and what to do |
|---|---|
| N year(s) have fewer than 90% of their days and are left out | A year with many missing days has no annual mean. The trend is calculated on the other years. Years in the middle of the record that are left out make the trend less certain. |
| Only X complete years (less than 10) | The trend is very uncertain. Use a longer record, or treat the result as a rough picture. |
| Only X complete year(s); a trend needs at least 3 | No trend is calculated for this variable. Its panel shows "Too few years for a trend". |
| N missing days (longest gap X days) | Days without a value. They are not filled in or guessed. Whether a year counts is decided by the 90% rule above. |
| The years ... reach outside the data | Your YEARS setting is wider than the data. Only the days that exist are used. |
| N values are not numbers | Text in a numeric column. These values are treated as missing. |
| Dates occur more than once | Only the first row of each date is used. |

The script stops (with a message) when the date column is missing, a listed column is not in the CSV, the file
does not exist, or YEARS lies completely outside the data.

## How the method works

For every calendar year the mean of the daily values is calculated, but only when at least 90% of the days of
that year have a value. A straight line is then fitted through the annual means (ordinary least squares,
`scipy.stats.linregress`). The slope is given per decade; the 95% range is 1.96 times the standard error of
the slope; the p-value tests whether the slope differs from zero. The trend line is drawn only when p is below
0.05. The trend assumes the annual means are independent and roughly linear in time. A variable with a strong
step (for example a change of instrument) or a strong cycle over decades is not described well by one line.

## Notes

- With the default settings the annual means, trends, 95% ranges and p-values are the same as on the website, up
  to rounding (the largest difference in an annual mean is 0.001, the largest in a trend 0.0000 at 4 decimals).
- The website shows sea level per year and from monthly altimetry data; that is not in this package.
- Salinity in the example is limited to 1993 to 2012 (one HYCOM model version, values below 30 PSU removed), as on the website.
- Rainfall is the mean amount per day of each year (mm/day), as on the website.

Data of the example: ERA5-Land and ERA5 (Copernicus Climate Change Service / ECMWF) and HYCOM, grid cells near Sisal, Yucatán, Mexico.
