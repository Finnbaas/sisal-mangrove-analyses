# Mangrove maps

Maps of mangrove for your own study area, made in your own Google Earth Engine account. They use the same method as the Ecosystem page of the [Sisal Mangrove Monitor](https://github.com/Finnbaas/sisal-mangrove-monitor). Each map is a standalone package: everything you need is in its folder (scripts, README, example data).

| Map | What it shows | Folder | Status |
|---|---|---|---|
| Extent: Change classes | Where mangrove disappeared or appeared between 1993 and 2025: stable, confirmed loss, confirmed gain, uncertain change, with areas per class. | [extent/change-classes](extent/change-classes/) | Beta |
| Extent: Change per period | When the confirmed loss and gain happened, per interval between two periods, with hectares per interval. | [extent/change-per-period](extent/change-per-period/) | Beta |
| Extent: dNDVI 2014–2025 | How much the NDVI of mangrove changed between two periods (default 2014–2018 and 2024–2025), compared with stable mangrove. | [extent/dndvi](extent/dndvi/) | Beta |
| Condition: Status | The condition of persistent mangrove for one chosen year: improving, stable, recently stressed or declining. | [condition/status](condition/status/) | Beta |
| Condition: Trend | Where the NDVI of persistent mangrove went up or down over 1993–2012 and 2014–2025 (significant trends only), with the share per direction. | [condition/trend](condition/trend/) | Beta |
| Condition: Canopy density 2019–2025 | How dense the mangrove canopy is, from Sentinel-2 NDVI at 10 m (structure, not health). | [condition/canopy-density](condition/canopy-density/) | Beta |
| Disturbance & recovery | Where mangrove was disturbed and whether it recovered. | | Coming soon |
