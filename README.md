# Sisal Mangrove Analyses

Downloadable analyses from the Sisal Mangrove Monitor, a mangrove monitoring study in Sisal, Yucatán, Mexico
(TU Delft students with UNAM). Each analysis can be run on your own data, location and question.

The website that shows our finished results: [Sisal Mangrove Monitor](https://github.com/Finnbaas/sisal-mangrove-monitor)
(its Method page explains each analysis).

## Analyses

| Analysis | What it does |
|---|---|
| [climatology/event-anomaly](climatology/event-anomaly/) | Anomaly chart around an event (storm, heat wave, ...): how much daily climate values differed from normal. |
| [climatology/seasonal-cycle](climatology/seasonal-cycle/) | Seasonal cycle (a typical year): monthly mean with a 10th to 90th percentile band, rainfall as monthly totals. |
| [climatology/long-term-trend](climatology/long-term-trend/) | Long-term trend: annual means with a linear trend (± 95% range, p-value); the trend line is drawn only when p < 0.05. |
| [climatology/monthly-range](climatology/monthly-range/) | Monthly range and running mean: the lowest to highest daily value of each month as a band, plus a 365-day running mean. |
| [climatology/wave-wind-rose](climatology/wave-wind-rose/) | Wave and wind rose: where waves or wind come from in 8 sectors, for all days and for days above a threshold. |
| [climatology/event-counts](climatology/event-counts/) | Events per month and year from a list of events, plus a helper that makes a storm list from HURDAT2 for any location, radius and strength. |
| [climatology/storm-tracks](climatology/storm-tracks/) | Storm tracks near a location: map of the tropical storms and hurricanes within a radius, coloured by strength. |
| [satellite/ndvi-time-series](satellite/ndvi-time-series/) | NDVI time series for your location: monthly maximum NDVI from Landsat (Earth Engine script plus notebook), with one plot per point. |
| [satellite/tipping-point-analysis](satellite/tipping-point-analysis/) | Tipping point analysis: breakpoints and early warning signals before them, tested against surrogates and control points. |
| [satellite/shape-class-map](satellite/shape-class-map/) | Shape-class map: groups many points into shape classes and plots them on a map. |
| [satellite/mangrove-maps](satellite/mangrove-maps/) | Mangrove maps for your own area in Earth Engine. First map: Change (where mangrove was lost or gained, 1993 to 2025, beta). Condition and Disturbance and recovery follow. |

## License

MIT, see [LICENSE](LICENSE).
