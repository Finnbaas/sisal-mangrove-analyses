# Sisal Mangrove Analyses

Downloadable analyses from the Sisal Mangrove Monitor, a mangrove monitoring study in Sisal, Yucatán, Mexico
(TU Delft students with UNAM). Each analysis can be run on your own data, location and question.

The website that shows our finished results: [Sisal Mangrove Monitor](https://sisalmangrovemonitor.netlify.app)
(its [Method page](https://sisalmangrovemonitor.netlify.app/#method) explains each analysis).

## How to use

Each folder below is a standalone package: open its README, which says what you need, which settings to change and what result to expect for Sisal. On the website, each card on the Method page has a "Download all files" button that downloads the folder as a ZIP.

Data not included: the CONABIO maps and other third-party data are not in this repository; the READMEs say where to get them.

## Analyses

The analyses are grouped like the three tabs of the Method page.

### Ecosystem

| Analysis | What it does |
|---|---|
| [satellite/mangrove-maps/extent/change-classes](satellite/mangrove-maps/extent/change-classes/) (beta) | Mangrove extent, change classes: where mangrove disappeared or appeared between 1993 and 2025 (stable, confirmed loss, confirmed gain, uncertain change), with the area per class. |
| [satellite/mangrove-maps/extent/change-per-period](satellite/mangrove-maps/extent/change-per-period/) (beta) | Mangrove extent, change per period: when the confirmed loss and gain happened, per interval between two periods, with hectares per interval. |
| [satellite/mangrove-maps/extent/dndvi](satellite/mangrove-maps/extent/dndvi/) (beta) | Mangrove extent, dNDVI: how much the NDVI of mangrove changed between two periods (default 2014–2018 and 2024–2025), compared with stable mangrove. |
| [satellite/mangrove-maps/condition/status](satellite/mangrove-maps/condition/status/) (beta) | Mangrove condition, status: the condition of persistent mangrove for one chosen year (improving, stable, recently stressed or declining), with hectares per class. |
| [satellite/mangrove-maps/condition/trend](satellite/mangrove-maps/condition/trend/) (beta) | Mangrove condition, trend: where the NDVI of persistent mangrove went up or down (significant trends only) in 1993–2012 and 2014–2025, with the share per direction. |
| [satellite/mangrove-maps/condition/canopy-density](satellite/mangrove-maps/condition/canopy-density/) (beta) | Mangrove condition, canopy density: how dense the mangrove canopy is in 2019–2025, from Sentinel-2 NDVI at 10 m (canopy structure, not health). |
| [satellite/mangrove-maps/disturbance-recovery/damage-classes](satellite/mangrove-maps/disturbance-recovery/damage-classes/) (beta) | Storm damage classes: how much the mangrove was damaged by a storm in the first dry season after it (no detectable impact, moderate, severe, cover lost), with a recovery chart. |
| [satellite/mangrove-maps/disturbance-recovery/lasting-ndvi-change](satellite/mangrove-maps/disturbance-recovery/lasting-ndvi-change/) (beta) | Lasting NDVI change after a storm: how far the NDVI of the first dry season after the storm lies below or above the normal, as a continuous Z-score map. |
| [satellite/mangrove-maps/disturbance-recovery/acute-ndvi-change](satellite/mangrove-maps/disturbance-recovery/acute-ndvi-change/) (beta) | Acute NDVI change after a storm: the effect on vegetation in the first weeks after the storm, compared with the same days in other years. One script. |
| [satellite/mangrove-maps/disturbance-recovery/acute-wetness](satellite/mangrove-maps/disturbance-recovery/acute-wetness/) (beta) | Acute wetness after a storm: how much drier or wetter than normal the surface (MNDWI) was in the first weeks after the storm. One script. |
| [satellite/ndvi-time-series](satellite/ndvi-time-series/) | NDVI time series for your location: monthly maximum NDVI from Landsat (Earth Engine script plus notebook), with one plot per point. |
| [satellite/shape-class-map](satellite/shape-class-map/) | Shape-class map: groups many points into shape classes and plots them on a map. |
| [satellite/tipping-point-analysis](satellite/tipping-point-analysis/) | Tipping point analysis: breakpoints and early warning signals before them, tested against surrogates and control points. |

The mangrove maps share one overview, [satellite/mangrove-maps](satellite/mangrove-maps/).

### Climatology

| Analysis | What it does |
|---|---|
| [climatology/event-anomaly](climatology/event-anomaly/) | Anomaly chart around an event (storm, heat wave, ...): how much daily climate values differed from normal. |
| [climatology/seasonal-cycle](climatology/seasonal-cycle/) | Seasonal cycle (a typical year): monthly mean with a 10th to 90th percentile band, rainfall as monthly totals. |
| [climatology/long-term-trend](climatology/long-term-trend/) | Long-term trend: annual means with a linear trend (± 95% range, p-value); the trend line is drawn only when p < 0.05. |
| [climatology/monthly-range](climatology/monthly-range/) | Monthly range and running mean: the lowest to highest daily value of each month as a band, plus a 365-day running mean. |
| [climatology/wave-wind-rose](climatology/wave-wind-rose/) | Wave and wind rose: where waves or wind come from in 8 sectors, for all days and for days above a threshold. |
| [climatology/event-counts](climatology/event-counts/) | Events per month and year from a list of events, plus a helper that makes a storm list from HURDAT2 for any location, radius and strength. |
| [climatology/storm-tracks](climatology/storm-tracks/) | Storm tracks near a location: map of the tropical storms and hurricanes within a radius, coloured by strength. |

### Stakeholder mapping

| Analysis | What it does |
|---|---|
| [stakeholder-mapping/map-interview](stakeholder-mapping/map-interview/) | Map interview: interview guide, consent form and base map to let stakeholders draw where and why the mangrove changed. |
| [stakeholder-mapping/interview-to-table](stakeholder-mapping/interview-to-table/) | From interview to table: coding sheet and theme rules that turn the interviews into one table sorted into three themes. |

## License

MIT, see [LICENSE](LICENSE). The templates in stakeholder-mapping are under CC BY 4.0.
