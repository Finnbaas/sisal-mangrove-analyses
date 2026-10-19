# NDVI time series for your location

Run the NDVI time series of the Sisal Mangrove Monitor on your own location: the monthly maximum NDVI from Landsat for one or many points, cleaned into a time series with a trend, with one plot per point.

## What the analysis shows

Monthly maximum NDVI from Landsat (1993–2026) for 1138 random points in the Sisal area. Each series is regularised to monthly values, deseasonalised and detrended (STL), and corrected for the upward drift caused by the growing number of images per year. On these series we (1) detect breakpoints, (2) test for early warning signals before each loss, and (3) group all points into shape classes, shown on the map.

This package makes the first part: the time series. The notebook saves one plot per point (the raw NDVI, the STL trend and the breakpoints), the STL trends of all points, and the tables of breakpoints and shape classes. The early warning signals have their own package (`tipping-point-analysis`) and the shape classes on a map theirs (`shape-class-map`).

## What is in this folder

| File | What it is |
|---|---|
| `GEE_NDVI.js` | Earth Engine script that extracts the monthly maximum NDVI per point. The settings (points, years, export) are at the top. |
| `ndvi_monthly_classification.ipynb` | The notebook: deseasonalising, breakpoints and shape classes. The settings (CONFIG) are in the first code cell. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib, statsmodels, notebook). |
| `example_data/monthly_max_NDVI_per_point.csv` | Our Sisal data: 150 points, monthly, 1993 to 2026 (the output of `GEE_NDVI.js`). The notebook runs on it as it is. |

## Input format

One CSV file with one row per point and month, with these columns (this is what `GEE_NDVI.js` exports):

| point_id | traj | lon | lat | year | month | ndvi_max | n_images_that_month |
|---|---|---|---|---|---|---|---|
| 0 | 1 | -89.9674 | 21.1857 | 1993 | 1 | 0.7371 | 5 |
| 1 | 1 | -90.0557 | 21.1268 | 1993 | 1 | 0.7410 | 5 |
| 2 | 1 | -90.0805 | 21.1398 | 1993 | 1 | 0.6269 | 5 |

`ndvi_max` is the maximum NDVI of that point in that month, `n_images_that_month` the number of Landsat images that month. `traj` is the class the point was drawn from when the points were selected; the notebook does not need it. Months without a cloud-free image are simply missing rows.

## Steps

Before you start: install Python 3 and, in this folder, make a virtual environment and install the packages (`python -m venv venv`, activate it, then `pip install -r requirements.txt`). Start the notebook with `jupyter notebook`.

1. Open the Earth Engine script in the Earth Engine Code Editor. Choose one location, or upload a CSV with the coordinates of several points.
2. Run the script and export the monthly maximum NDVI per point as a CSV to Google Drive.
3. Download the CSV from Google Drive to your computer.
4. Open the notebook, set the path to your CSV and run all cells.
5. The notebook regularises, deseasonalises and detrends each series and saves one plot per point, like the plots on the Satellite page.

In the Earth Engine script, the points come from a table asset (`POINTS_ASSET_ID` at the top): upload a CSV with the columns `point_id`, `traj`, `lon` and `lat` once, copy its asset ID into the script, and set `START_YEAR` and `END_YEAR` for the years you want.

In the notebook, set the path to your CSV under `"input_csvs"` in the CONFIG (the first code cell). The results are saved in the folder `ndvi_output_monthly`.

## What the warnings mean

The notebook has no warnings of its own; it prints what it did. These are the lines to read:

| Message | What it means and what to do |
|---|---|
| `N points kept, M dropped (too incomplete)` | A point is dropped when fewer than 60% of its months have a value (`min_completeness` in the CONFIG). Gaps of up to 2 months are filled by linear interpolation (`max_gap_months`); longer gaps are not filled. |
| `period: 1993-01 to 2026-08` | The first and last month in your data. Check that it is the period you asked for. |
| `drift from N stable mangrove points: +x NDVI per decade` | The upward drift of NDVI caused by the growing number of images per year, measured on the stable mangrove points and removed from all series. |
| `N breakpoints in M of K points` | The number of breakpoints the rule found (see below). Check some of the point plots before you use them. |
| `More than 20 figures have been opened` | A matplotlib message because the notebook draws one plot per point. It is not a problem. |

The notebook stops with a Python error when the path in `input_csvs` is wrong (`FileNotFoundError`) or when a column is missing; check the path and the column names against the table above.

## How the method works

- Monthly maximum NDVI: the maximum limits the effect of clouds; monthly steps are fine enough not to miss tipping points, which develop over several months.
- Data from 1993 onwards: before that there are fewer than 12 Landsat images per year over Sisal.
- The number of images per year increases over time, which pushes the monthly maximum upwards; this drift is removed in the detrending.
- Landsat and Sentinel-2 are not merged, because of sensor differences.

Data: Landsat 5 TM, 7 ETM+, 8 and 9 OLI, Collection 2 Tier 1 Level-2 (surface reflectance), via Google Earth Engine. Global Mangrove Watch was used for the first mangrove mask, to select the points. The final mangrove map is based on NDVI, so Global Mangrove Watch is not the definitive mask.

## Notes

- You need a free Google Earth Engine account and Python 3 with pandas, numpy, matplotlib, statsmodels (STL) and scipy (Kendall's tau and smoothing).
- The Earth Engine script can only run in the Earth Engine Code Editor, with your own account and points asset; it was not run for this package. The notebook was run on the example data.
- The script `GEE_NDVI.js` says to run a script `sisal_point_selection.js` first to choose the points. That script is not part of this package; any CSV with the columns `point_id`, `traj`, `lon` and `lat` will do.
- The Earth Engine script has the same settings as the original; only the settings (the points asset, the years, the scale and the export name) were moved to the top. The notebook has the same code as the original; only the paths in the CONFIG were changed to the example data and the output folder.
- The notebooks of the three satellite packages (`ndvi-time-series`, `tipping-point-analysis` and `shape-class-map`) use the same `GEE_NDVI.js` and `ndvi_monthly_classification.ipynb`. `check_shared.py` in the main folder of the repository checks that these copies are identical.
