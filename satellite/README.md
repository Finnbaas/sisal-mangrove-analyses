# Satellite analyses

NDVI analyses of mangroves from Landsat satellite images, as used on the Satellite page of the Sisal Mangrove Monitor. Each folder is one analysis you can run on your own location; they follow the cards of the Method page.

| Analysis | What it does |
|---|---|
| [ndvi-time-series](ndvi-time-series/) | NDVI time series for your location: monthly maximum NDVI from Landsat (Earth Engine script), cleaned, deseasonalised and detrended in a notebook, with one plot per point. |
| [tipping-point-analysis](tipping-point-analysis/) | Tipping point analysis for your own location: breakpoints (lasting drops) and early warning signals before them, tested against surrogates and control points. |
| [shape-class-map](shape-class-map/) | Shape-class map of your area: groups many points into shape classes (stable, gain, loss, ...) and plots them on a map. |

The three folders each hold their own copy of the Earth Engine script and the notebook they need, so each one works on its own. `check_shared.py` in the main folder of the repository checks that the copies are identical.
