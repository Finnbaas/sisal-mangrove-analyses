# Mangrove maps

Maps of mangrove for your own study area, made in your own Google Earth Engine account. They use the same method as the Ecosystem page of the [Sisal Mangrove Monitor](https://sisalmangrovemonitor.netlify.app). Each map is a standalone package: everything you need is in its folder (scripts, README, example data).

All packages follow the same setup (`MY_ASSETS`, `NAME`, and a drawn study area or the Sisal default) and can be run on their own.

| Map | What it shows | Folder | Status |
|---|---|---|---|
| Extent: Change classes | Where mangrove disappeared or appeared between 1993 and 2025: stable, confirmed loss, confirmed gain, uncertain change, with areas per class. | [extent/change-classes](extent/change-classes/) | Beta |
| Extent: Change per period | When the confirmed loss and gain happened, per interval between two periods, with hectares per interval. | [extent/change-per-period](extent/change-per-period/) | Beta |
| Extent: dNDVI 2014–2025 | How much the NDVI of mangrove changed between two periods (default 2014–2018 and 2024–2025), compared with stable mangrove. | [extent/dndvi](extent/dndvi/) | Beta |
| Condition: Status | The condition of persistent mangrove for one chosen year: improving, stable, recently stressed or declining. | [condition/status](condition/status/) | Beta |
| Condition: Trend | Where the NDVI of persistent mangrove went up or down over 1993–2012 and 2014–2025 (significant trends only), with the share per direction. | [condition/trend](condition/trend/) | Beta |
| Condition: Canopy density 2019–2025 | How dense the mangrove canopy is, from Sentinel-2 NDVI at 10 m (structure, not health). | [condition/canopy-density](condition/canopy-density/) | Beta |
| Disturbance & recovery: Damage classes | How much the mangrove was damaged by a storm, as seen in the first dry season after it: no detectable impact, moderate, severe, cover lost, with hectares per class and a recovery chart. Presets for Opal 1995, Isidore 2002 and the 2020 storms. | [disturbance-recovery/damage-classes](disturbance-recovery/damage-classes/) | Beta |
| Disturbance & recovery: Lasting NDVI change | How far the NDVI of the first dry season after a storm lies below or above the normal (Z-score, continuous map). | [disturbance-recovery/lasting-ndvi-change](disturbance-recovery/lasting-ndvi-change/) | Beta |
| Disturbance & recovery: Acute NDVI change | The effect on vegetation in the first weeks after a storm: a short window compared with the same days in other years. One script, no assets. | [disturbance-recovery/acute-ndvi-change](disturbance-recovery/acute-ndvi-change/) | Beta |
| Disturbance & recovery: Acute wetness | The same with MNDWI: drier or wetter than normal in the first weeks after a storm. One script, no assets. | [disturbance-recovery/acute-wetness](disturbance-recovery/acute-wetness/) | Beta |
