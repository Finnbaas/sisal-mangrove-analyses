Beta: tested on Sisal. Report problems via GitHub issues.

# Mangrove condition: Canopy density map for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package makes the **Canopy density** map: how dense the mangrove canopy is in recent years, at 10 m, for any study area, in your own Google Earth Engine (GEE) account. It is the same method as the Canopy density map on our Ecosystem page. The sibling packages `status` and `trend` show the condition for one year and the NDVI trend.

**Result:** a map with the median Sentinel-2 NDVI of the dry seasons 2019–2025 on a teal–brown scale (0.3 to 0.9), and the 10th percentile, median and 90th percentile of the NDVI of the mapped mangrove.

**How it is made:**

- **Sentinel-2 SR Harmonized**, dry-season months of 2019–2025 (January–May), clouds, shadow, cirrus and snow masked with the scene classification, median NDVI at 10 m.
- **Mangrove only** where the pixel was mangrove in both 2019–2023 and 2024–2025 (periods P6 and P7 of the mangrove maps).
- Teal = dense canopy. Brown = sparse canopy, dwarf mangrove or a wet background.

> **This shows canopy structure, not health.** Dwarf and basin mangrove are naturally low. Sentinel-2 has more detail (10 m) than the Landsat maps (30 m) but a shorter record (from 2017), so this package says nothing about trends.

---

## Choose your route

| | Quick: Global Mangrove Watch | Accurate: labelled training points |
|---|---|---|
| What decides "mangrove" | Global Mangrove Watch 2020, public in GEE | land-cover classes trained on labelled points (our Sisal method) |
| Where | anywhere in the world | Mexico via CONABIO maps, or anywhere with your own points |
| Preparation | none | upload CONABIO maps or your points (30–60 min) |
| Time in total | about 2–3 hours, mostly waiting for exports | about 3–4 hours |
| Use for | first impression, comparing areas | research and reporting |

You can start with the quick route and switch later: only the persistent mangrove mask (scripts 2a and 2) changes.

Only the **mask** differs between the routes. The rest of the package is the same.

---

## The persistent mangrove mask

The map covers only **persistent mangrove**: pixels that are mangrove in every one of the seven periods (1993–2025). Where the land cover itself changed (loss, gain), a change in NDVI says something about the change in cover, not about the condition of mangrove. Scripts 1, 2a and 2 are the Extent method and make this mask; they are copied into this folder so the package works on its own.

- **Quick: Global Mangrove Watch (default).** Script 2 with `MASK_SOURCE = 'GMW'` learns "mangrove or not" from Global Mangrove Watch 2020 (public in Earth Engine) and applies it to every period. Works anywhere, nothing to prepare, coarser at the edges.
- **Accurate: training points.** Script 2a makes labelled points from the CONABIO maps (Mexico) or you bring your own; script 2 with `MASK_SOURCE = 'POINTS'` classifies six land-cover classes per period. Persistent mangrove is then mangrove in every period. This is our Sisal method.

In both routes persistent mangrove is the class "stable mangrove" (`change = 1`) in the asset `<NAME>_mangrove` that script 2 makes.

**For this map** the mask is the mangrove maps of the periods 2019–2023 and 2024–2025 (bands `mangrove_P6` and `mangrove_P7` of `<NAME>_mangrove`), not mangrove in all seven periods: the NDVI is only from 2019–2025, so only these years matter. You can change the periods in `MASK_BANDS`.

---

## Files

| File | What it does | Needed for |
|---|---|---|
| `1_period_images.js` | Builds one cloud-free Landsat image per period (dry season) and saves it in your project | the mask, both routes |
| `2a_training_points_conabio.js` | Makes training points from the CONABIO mangrove maps of Mexico | the mask, accurate route, Mexico |
| `2_mangrove_maps.js` | Decides per period which pixels are mangrove and saves the result | the mask, both routes |
| `3_canopy_density_map.js` | Median Sentinel-2 NDVI over the mangrove: map, legend and percentiles | both routes |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán | testing |
| `example/sisal_training_points.csv` | Our training points for Sisal | testing the accurate route on Sisal |

---

## Before you start (once)

1. **Earth Engine account.** Sign up at earthengine.google.com and create a Cloud project. Register it for **non-commercial use** (free).
2. **Your asset folder.** In the Code Editor (code.earthengine.google.com), open the **Assets** tab. Your folder looks like `projects/your-project/assets/`. You'll fill this in as `MY_ASSETS` in every script.
3. **Make four empty scripts.** In the **Scripts** tab click **NEW → File** for each `.js` file you need and paste its contents in. Save them.
4. **Fill in the same two settings at the top of every script:**
   ```
   var MY_ASSETS = 'projects/your-project/assets/';
   var NAME      = 'myarea';     // short name, no spaces
   ```

**Tip: test on Sisal first.** Don't draw anything and leave `NAME = 'sisal'`. The scripts then use our study area, and you can compare your result with the numbers in "Expected result for Sisal" below and with the map on our website. If it looks the same, your setup works.

---

## Your study area

In **each** script: use the polygon tool (top left of the map) to draw your study area. In the **Imports** panel at the top of the script, make sure the import is called `geometry`. The script uses it automatically instead of Sisal. Draw the **same** polygon in every script. The easiest way: draw it once, click the import, copy the code it shows, and paste it into the other scripts.

Alternative: upload a shapefile of your area (Assets → NEW → Shape files) and set at the top of each script:
```
var AOI = ee.FeatureCollection('projects/your-project/assets/my_area').geometry();
```

Keep the area reasonable: up to about 50 × 50 km works well. Larger areas take long or run out of memory.

---
---

## Route A: quick (Global Mangrove Watch)

| Step | Script | What to do | Waiting |
|---|---|---|---|
| 1 | `1_period_images.js` | Set `SEASON` to the dry months of your region. Run. Read the CHECKS. Set `RUN_EXPORT = true`, Run, then **Tasks → RUN**. | 10–40 min |
| 2 | `2_mangrove_maps.js` | `MASK_SOURCE = 'GMW'`. Run and read the CHECKS (see below). Then `RUN_EXPORT = true`, Run, **Tasks → RUN**. Needs step 1 to be finished. | 20–60 min |
| 3 | `3_canopy_density_map.js` | Run. The map, legend and percentiles appear. If the percentiles time out for a large area, set `RUN_EXPORT = true` and run the tasks. | 1–5 min |

## Route B: accurate (labelled training points)

**Option B1: CONABIO maps (Mexico)**
1. Download the CONABIO mangrove maps (Sistema de Monitoreo de los Manglares de México) as shapefiles:
   1. Open **geoportal.conabio.gob.mx**.
   2. Search for **"manglares"**.
   3. Go to **Biodiversidad → Monitoreo de manglares → Distribución de los manglares y otras coberturas**.
   4. Choose the region that covers your study area (we used **México (general)**).
   5. Download the layer **"Mapa de uso del suelo y vegetación de la zona costera"** for each year: 1981, 2005, 2010, 2015, 2020 and 2025. Use this land-use layer, not the mangrove-only layer: the script needs all cover classes (water, other wetland, built, ...), not only mangrove.

   **The right map depends on your study area.** For Sisal, "México (general)" with this layer was the most accurate. CONABIO also publishes maps per region and in other versions; in another part of Mexico one of those may fit better. Compare the options for your area on the geoportal (or in QGIS on a satellite image) before you choose, and use the same map for all years. If the class names differ from ours, add them to `CLASS_MAP` in script 2a.
2. Upload each one: **Assets → NEW → Shape files**. Select all files of one year together (`.shp`, `.shx`, `.dbf`, `.prj`, or the `.zip`). Name them `conabio_1981`, `conabio_2005` and so on, in `MY_ASSETS`. Uploading takes a few minutes per year; follow it in the Tasks tab.

   **Clip the Mexico maps first.** The national maps are too big to upload to Earth Engine, so clip each one to your study area and upload only the clipped files. Clip in [Mapshaper](https://mapshaper.org) (drop the files in, use the `-clip` command or the Clip tool with your area, export as shapefile) or in QGIS (Vector → Geoprocessing → Clip). Do this for every year, with the same area.
3. Run `1_period_images.js` (export) as in route A.
4. Run `2a_training_points_conabio.js`. Read the warnings: if CONABIO uses class names the script doesn't know, add them to `CLASS_MAP`. Then `RUN_EXPORT = true` and **Tasks → RUN**. This creates `<NAME>_points`.
5. Run `2_mangrove_maps.js` with `MASK_SOURCE = 'POINTS'` (export).
6. Run `3_canopy_density_map.js`.

**Option B2: the Sisal example points (testing only)**
1. Upload `example/sisal_training_points.csv`: **Assets → NEW → CSV file**. Under advanced options set the **X column to `lon`** and the **Y column to `lat`**. Name the asset `sisal_points`.
2. Keep `NAME = 'sisal'` and no drawn study area. These points are only valid for Sisal.
3. Skip script 2a (the points are already there). Do all other steps of route B in the same order.

**Option B3: your own points (anywhere)**
Make a CSV with at least these columns and upload it as in B2, named `<NAME>_points`. Then skip script 2a (the points are already there) and do all other steps of route B in the same order.

| column | example | meaning |
|---|---|---|
| `period` | `P6` | period the point is valid for (same ids as the scripts) |
| `train_class` | `1` | 1 Mangrove, 2 Water, 3 Other wetland vegetation, 4 Other vegetation, 5 Bare / salt flat, 6 Built / road |
| `lon`, `lat` | `-90.05`, `21.16` | position (WGS84) |

Aim for at least 50 points per class and period, spread over the area, away from class boundaries.

---

## Settings you may want to change

| Setting | Script | Sisal value | When to change |
|---|---|---|---|
| `SEASON` | 1 | `[1, 5]` (Jan–May) | Use the driest months of your region (for the Landsat mask): fewer clouds and no flooding |
| `PERIODS` | 1, 2a (and `PIDS` in 2) | 7 periods 1993–2025 | Only for the mask. Keep the same ids in all scripts |
| `MASK_SOURCE` | 2 | `'GMW'` | `'POINTS'` for the accurate route |
| `REF_PERIOD` | 2 | `'P6'` | The period that contains 2020 (the Global Mangrove Watch year) |
| `MIN_PATCH_PIX` | 2 | `6` (~0.5 ha) | Smaller removes less noise, larger removes more detail |
| `YEARS` | 3 | `[2019, 2025]` | The years of Sentinel-2 (available from 2017) |
| `SEASON` | 3 | `[1, 5]` | Dry months of your region. Use the same as in step 1 |
| `MASK_BANDS` | 3 | `['mangrove_P6', 'mangrove_P7']` | The periods in which the pixel must be mangrove |
| `MAX_CLOUD_PCT` | 3 | `60` | Scenes with more cloud (%) are skipped. Lower = cleaner but fewer scenes |
| `NDVI_RANGE` | 3 | `[0.3, 0.9]` | Colour scale of the map |

---

## Checks: is my result trustworthy?

Every script prints **CHECK** lines in the Console. Read them before exporting.

- **Step 1, scenes per period:** none should be 0. Few scenes (under about 10) means a noisy period.
- **Step 2, internal test accuracy:** 0.9 or higher is good. It is optimistic, so it is a minimum check.
- **Step 2, mangrove area vs Global Mangrove Watch:** should be in the same range.
- **Step 3, Sentinel-2 scenes used:** should be well above 0. Fewer than about 20 gives a noisy median.
- **Step 3, mangrove area (ha):** the area of mangrove in both periods. A very different number means the mask is different: check step 2 first.
- **Step 3, percentiles:** for Sisal see below. Median far below 0.5 over mangrove usually means water in the pixels (mask problem) or a cloud problem.

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Asset ... not found` | The export of the previous step hasn't finished, or `MY_ASSETS` / `NAME` differ between scripts |
| `User memory limit exceeded` | Area too large for interactive viewing. Use the exports; for the map, zoom in. Or make the area smaller |
| `Computation timed out` | Same as above. Exports have more time than the map view |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| CHECK 3 in step 2 is 0 ha | No Global Mangrove Watch mangrove in your area: route A doesn't work there, use route B |
| `Image.select: Pattern 'mangrove_P6' did not match any bands` | The `PERIODS` of steps 1 and 2 have other ids: change `MASK_BANDS` in step 3 |
| `Computation timed out` in the percentiles | Use `RUN_EXPORT = true`: the CSV with the percentiles and the GeoTIFF come from the Tasks tab |

---

## Expected result for Sisal

Accurate route (route B2 with the Sisal example points), `NAME = 'sisal'`, no drawn area. NDVI of mangrove 2019–2025:

| 10th percentile | Median | 90th percentile |
|---|---|---|
| 0.59 | 0.76 | 0.88 |

Small differences are normal (another cloud mask or mangrove mask moves the percentiles). The quick route (Global Mangrove Watch) uses another mangrove mask, so its numbers differ more.

---

## What to keep in mind

- This is canopy **structure**, not health. Dwarf and basin mangrove are naturally low here, and a wet background lowers NDVI as well.
- NDVI saturates over very dense canopy: differences at the top of the scale (above about 0.85) are small.
- One value per pixel for the whole of 2019–2025: the map does not show change.
- The mask comes from 30 m Landsat maps, so mangrove edges at 10 m are not exact.
- Sentinel-2 and Landsat NDVI are not the same scale. Do not compare the numbers with the Trend or Status packages.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Sentinel-2 (ESA/Copernicus), Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), CONABIO, GHSL (JRC), Copernicus DEM. Harmonisation of Landsat: Roy et al. (2016). Code under MIT license.

Training points in example/sisal_training_points.csv are derived from CONABIO, Mapa de uso del suelo y vegetacion de la zona costera.
