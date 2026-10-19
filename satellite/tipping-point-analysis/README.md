# Tipping point analysis for your own location

Run the tipping point analysis of the Sisal Mangrove Monitor on your own location: find the points with a lasting drop in NDVI, and test whether early warning signals came before the drop.

## What the analysis shows

Monthly maximum NDVI from Landsat (1993–2026) for 1138 random points in the Sisal area. Each series is regularised to monthly values, deseasonalised and detrended (STL), and corrected for the upward drift caused by the growing number of images per year. On these series we (1) detect breakpoints, (2) test for early warning signals before each loss, and (3) group all points into shape classes, shown on the map.

This package makes the first two parts. The breakpoint notebook lists every point with a lasting drop, with its date and magnitude. The early warning signals notebook takes, for each point with a loss, the NDVI before the loss and computes the rolling standard deviation, AR1, return rate, kurtosis and skewness, and their Kendall's tau. It compares these trends with AR(1) surrogates and with control points (points without a breakpoint) to test significance, places each point in the scenario matrix (NDVI tau against SD tau) and repeats the analysis for other window sizes and bandwidths (sensitivity analysis).

## What is in this folder

| File | What it is |
|---|---|
| `GEE_NDVI.js` | Earth Engine script that extracts the monthly maximum NDVI per point. The settings (points, years, export) are at the top. |
| `ndvi_monthly_classification.ipynb` | The breakpoint notebook: deseasonalising, breakpoints and shape classes. The settings (CONFIG) are in the first code cell. |
| `ews_monthly_new.ipynb` | The early warning signals notebook: Kendall's tau, surrogates, scenario matrix and sensitivity analysis. The settings (CONFIG) are in the first code cell. |
| `requirements.txt` | The Python packages you need (pandas, numpy, scipy, matplotlib, statsmodels, notebook). |
| `example_data/monthly_max_NDVI_per_point.csv` | Our Sisal data: 150 points, monthly, 1993 to 2026 (the output of `GEE_NDVI.js`). Both notebooks run on it as they are. |

## Input format

One CSV file with one row per point and month (this is what `GEE_NDVI.js` exports):

| point_id | traj | lon | lat | year | month | ndvi_max | n_images_that_month |
|---|---|---|---|---|---|---|---|
| 0 | 1 | -89.9674 | 21.1857 | 1993 | 1 | 0.7371 | 5 |
| 1 | 1 | -90.0557 | 21.1268 | 1993 | 1 | 0.7410 | 5 |
| 2 | 1 | -90.0805 | 21.1398 | 1993 | 1 | 0.6269 | 5 |

The early warning test needs enough points: the control points (points without a breakpoint) are the comparison, and only points with a pre-loss series of at least 60 months (5 years) are tested.

## Steps

Before you start: install Python 3 and, in this folder, make a virtual environment and install the packages (`python -m venv venv`, activate it, then `pip install -r requirements.txt`). Start the notebooks with `jupyter notebook`.

1. Make the NDVI time series as in the example "NDVI time series for your location".
2. Run the breakpoint detection: it lists every point with a lasting drop, with its date and magnitude.
3. Open the early warning signals notebook. For each point with a loss, it takes the NDVI before the loss and computes the rolling standard deviation, AR1, return rate, kurtosis and skewness, and their Kendall's tau.
4. It compares these trends with AR(1) surrogates and with control points to test significance.
5. It places each point in the scenario matrix (NDVI tau vs SD tau) and repeats the analysis for other window sizes and bandwidths (sensitivity analysis).

Set the path to your CSV under `"input_csvs"` in the CONFIG (the first code cell) of both notebooks. The breakpoint notebook saves its results in `ndvi_output_monthly` (`breakpoints.csv` and the plots), the early warning signals notebook in `ews_output_monthly` (`ews_results.csv`, the plots per point, `ews_hits_vs_controls.png`, `scenario_matrix.png` and `ews_sensitivity.png`).

## What the warnings mean

The notebooks have no warnings of their own; they print what they did. These are the lines to read:

| Message | What it means and what to do |
|---|---|
| `N points kept, M dropped (too incomplete)` | A point is dropped when fewer than 60% of its months have a value (`min_completeness` in the CONFIG). Gaps of up to 2 months are filled by linear interpolation (`max_gap_months`). |
| `N points with a loss breakpoint, M control points (no breakpoint)` | The loss points are tested; the control points are the comparison. With very few loss points the test says little. |
| `K loss points skipped (pre-loss segment < 60 months ...)` | The series before the loss is shorter than `min_segment_months`; there is too little data to compute early warning signals for these points. |
| `drift from N stable mangrove points: ...` | The upward drift of NDVI caused by the growing number of images per year, measured on the stable mangrove points and removed before the analysis (breakpoint notebook). |
| `More than 20 figures have been opened` | A matplotlib message because the notebooks draw one plot per point. It is not a problem. |

The notebooks stop with a Python error when the path in `input_csvs` is wrong (`FileNotFoundError`) or when a column is missing; check the path and the column names against the table above. The early warning signals notebook takes a few minutes to an hour, depending on the number of points and `n_surrogates` (500 in the CONFIG; the notebook says to raise it to about 1000 for final results).

## How the method works

- Breakpoint: a change of at least 0.25 NDVI within 12 months, after which the new level persists for at least 2 years. A drop followed by a quick recovery is resilience, not a breakpoint.
- Early warning signals are computed only on the deseasonalised NDVI before the start of each loss, because an abrupt drop inside the rolling window would create false increases in variance and autocorrelation.
- The significance of the early warning signals is tested against AR(1) surrogates; points without a breakpoint serve as controls.
- The thresholds, the window sizes, the number of surrogates and the random seed are in the CONFIG of the notebooks and can be changed.

## Notes

- You need a free Google Earth Engine account and Python 3 with pandas, numpy, matplotlib, statsmodels (STL) and scipy (Kendall's tau and smoothing).
- The Earth Engine script can only run in the Earth Engine Code Editor, with your own account and points asset; it was not run for this package. Both notebooks were run on the example data.
- The Earth Engine script has the same settings as the original; only the settings were moved to the top. The notebooks have the same code as the originals; only the paths in the CONFIG were changed to the example data and the output folders.
- `GEE_NDVI.js` and `ndvi_monthly_classification.ipynb` are the same files as in the other two satellite packages. `check_shared.py` in the main folder of the repository checks that these copies are identical.
- On the 150 example points the notebook finds 3 points with a loss and 139 control points, so the early warning test says little on this example: it shows how the notebook works, not a result. The notebook takes about 5 minutes on it. The example breakpoints are the same as the breakpoints of these points on the website.
