# Shape-class map of your area

Run the shape-class map of the Sisal Mangrove Monitor on your own area: group many points into shape classes (stable, gain, loss, ...) from their NDVI lines, and plot the classes on a map.

## What the analysis shows

Monthly maximum NDVI from Landsat (1993–2026) for 1138 random points in the Sisal area. Each series is regularised to monthly values, deseasonalised and detrended (STL), and corrected for the upward drift caused by the growing number of images per year. On these series we (1) detect breakpoints, (2) test for early warning signals before each loss, and (3) group all points into shape classes, shown on the map.

This package makes the third part. For every point it computes the net NDVI change and the turnover and assigns a shape class: stable, gain, loss, loss + recovery, high turnover or non-mangrove. The notebook saves a scatter plot of the classes, the NDVI lines per class, a map of the points coloured by class, and the table of classes. The time series come from the first package (`ndvi-time-series`) and the early warning signals from the second (`tipping-point-analysis`).

## What is in this folder

| File | What it is |
|---|---|
| `GEE_NDVI.js` | Earth Engine script that extracts the monthly maximum NDVI per point. The settings (points, years, export) are at the top. |
| `ndvi_monthly_classification.ipynb` | The notebook: deseasonalising, breakpoints and shape classes. The settings (CONFIG, with all thresholds) are in the first code cell. |
| `requirements.txt` | The Python packages you need (pandas, numpy, matplotlib, statsmodels, notebook). |
| `example_data/monthly_max_NDVI_per_point.csv` | Our Sisal data: 150 points, monthly, 1993 to 2026 (the output of `GEE_NDVI.js`). The notebook runs on it as it is. |

## Input format

One CSV file with one row per point and month (this is what `GEE_NDVI.js` exports). Use many points in your area; a map of three points says little.

| point_id | traj | lon | lat | year | month | ndvi_max | n_images_that_month |
|---|---|---|---|---|---|---|---|
| 0 | 1 | -89.9674 | 21.1857 | 1993 | 1 | 0.7371 | 5 |
| 1 | 1 | -90.0557 | 21.1268 | 1993 | 1 | 0.7410 | 5 |
| 2 | 1 | -90.0805 | 21.1398 | 1993 | 1 | 0.6269 | 5 |

The map uses the `lon` and `lat` of every point. `traj` is the class the point was drawn from when the points were selected; the notebook does not need it.

## Steps

Before you start: install Python 3 and, in this folder, make a virtual environment and install the packages (`python -m venv venv`, activate it, then `pip install -r requirements.txt`). Start the notebook with `jupyter notebook`.

1. Make the NDVI time series as in the example "NDVI time series for your location", for many random points in your area.
2. In the notebook, compute the net NDVI change and turnover per point and assign the shape classes (stable, gain, loss, loss + recovery, high turnover, non-mangrove).
3. Plot the classes on a map using the point coordinates.

The notebook does steps 2 and 3 when you run all cells. Set the path to your CSV under `"input_csvs"` in the CONFIG (the first code cell). The results are saved in the folder `ndvi_output_monthly`: `shape_classes.csv` (the class per point), `shape_classes_points(n=...).csv` (with the net change, turnover and NDVI values), and the plots `Shape_classes_scatter_`, `shape_classes_lines` and `shape_classes_map`.

## What the warnings mean

The notebook has no warnings of its own; it prints what it did. These are the lines to read:

| Message | What it means and what to do |
|---|---|
| `N points kept, M dropped (too incomplete)` | A point is dropped when fewer than 60% of its months have a value (`min_completeness` in the CONFIG). Gaps of up to 2 months are filled by linear interpolation (`max_gap_months`). Dropped points are not on the map. |
| `drift from N stable mangrove points: +x NDVI per decade` | The upward drift of NDVI caused by the growing number of images per year, measured on the stable mangrove points of your data and removed before the classes are made. With few points the drift is less certain. |
| `More than 20 figures have been opened` | A matplotlib message because the notebook draws one plot per point. It is not a problem. |

The notebook stops with a Python error when the path in `input_csvs` is wrong (`FileNotFoundError`) or when a column is missing; check the path and the column names against the table above. Check the scatter plot and the lines per class before you use the thresholds of another area.

## How the method works

- Shape classes are based on the net NDVI change and the turnover of each series, with fixed thresholds. The start and end level are the median of the first and last 3 years. Loss: net change of −0.3 or less. Gain: net change of +0.3 or more. Loss + recovery: mangrove (NDVI 0.3 or more) at the start and the end, but below 0.3 for at least 2 years in between. High turnover: turnover of 1.4 or more, a whole year below NDVI 0.25, or a monthly trend below 0. Non-mangrove: below 0.3 at the start and the end, with a mean NDVI below 0.25. All other points are stable.
- The thresholds are in the CONFIG of the notebook and can be changed.
- The number of images per year increases over time, which pushes the monthly maximum upwards; this drift is removed before the classes are made.

## Notes

- You need a free Google Earth Engine account and Python 3 with pandas, numpy, matplotlib, statsmodels (STL) and scipy (Kendall's tau and smoothing).
- The Earth Engine script can only run in the Earth Engine Code Editor, with your own account and points asset; it was not run for this package. The notebook was run on the example data.
- The classes depend on the points in your file: the drift correction uses the stable mangrove points of that file. On the 150 example points 146 of the 150 classes are the same as on the website, where the drift is estimated on all 1138 points.
- The Earth Engine script has the same settings as the original; only the settings were moved to the top. The notebook has the same code as the original; only the paths in the CONFIG were changed to the example data and the output folder.
- The notebooks of the three satellite packages use the same `GEE_NDVI.js` and `ndvi_monthly_classification.ipynb`. `check_shared.py` in the main folder of the repository checks that these copies are identical.
- The map is made from the point coordinates only, without a background map.
