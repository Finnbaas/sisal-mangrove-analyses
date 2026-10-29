Beta: tested on Sisal. Report problems via GitHub issues.

# Mangrove dNDVI map for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package maps how much the dry-season NDVI of mangrove changed between two periods, compared with **stable mangrove**, for any study area, in your own Google Earth Engine (GEE) account. It is the same method as the dNDVI 2014–2025 layer on our Ecosystem page. By default it compares 2014–2018 (P5) with 2024–2025 (P7); you can pick other periods.

**Result:** a map where white = changed like stable mangrove, red = dropped more, blue = rose more; the thresholds for a clear drop and a clear rise; and the share of mangrove in each class.

**How to read it:** the NDVI change of each pixel minus the median change of stable mangrove, so site-wide effects of climate and sensor are removed. A change beyond the 5th or 95th percentile of stable mangrove is a larger change than in 95% of stable mangrove.

---

## Choose your route

| | Quick: Global Mangrove Watch (default) | Accurate: labelled training points |
|---|---|---|
| What decides "mangrove" | Global Mangrove Watch 2020, public in GEE | land-cover classes trained on labelled points (our Sisal method) |
| What counts as "stable" | GMW mangrove further than 60 m from its edge | mangrove in every period |
| Where | anywhere in the world | Mexico via CONABIO maps, or anywhere with your own points |
| Scripts | 1, 3 | 1, 2a (or own points), 2, 3 |
| Time in total | about 1 hour, mostly waiting for the export | about 2–3 hours |
| Use for | first impression, comparing areas | research and reporting |

The quick route is shorter but its "stable mangrove" is only an approximation, so the thresholds differ somewhat from the accurate route.

---

## Files

| File | What it does | Needed for |
|---|---|---|
| `1_period_images.js` | Builds one cloud-free Landsat image per period (dry season) and saves it in your project | both routes |
| `2a_training_points_conabio.js` | Makes training points from the CONABIO mangrove maps of Mexico | accurate route, Mexico |
| `2_mangrove_maps.js` | Decides per period which pixels are mangrove (set to `'POINTS'` in this package) | accurate route |
| `3_dndvi_map.js` | Calculates the relative NDVI change, the thresholds and the shares, and draws the map and legend | both routes |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán | testing |
| `example/sisal_training_points.csv` | Our training points for Sisal | testing the accurate route on Sisal |

---

## Before you start (once)

1. **Earth Engine account.** Sign up at earthengine.google.com and create a Cloud project. Register it for **non-commercial use** (free).
2. **Your asset folder.** In the Code Editor (code.earthengine.google.com), open the **Assets** tab. Your folder looks like `projects/your-project/assets/`. You'll fill this in as `MY_ASSETS` in every script.
3. **Make the empty scripts.** In the **Scripts** tab click **NEW → File** for each `.js` file you need (quick route: 1 and 3; accurate route: all four) and paste its contents in. Save them.
4. **Fill in the same two settings at the top of every script:**
   ```
   var MY_ASSETS = 'projects/your-project/assets/';
   var NAME      = 'myarea';     // short name, no spaces
   ```

**Tip: test on Sisal first.** Don't draw anything and leave `NAME = 'sisal'`. The scripts then use our study area, and you can compare your result with "Expected result for Sisal" below.

---

## Your study area

In **each** script: use the polygon tool (top left of the map) to draw your study area. In the **Imports** panel at the top of the script, make sure the import is called `geometry`. The script uses it automatically instead of Sisal. Draw the **same** polygon in every script. The easiest way: draw it once, click the import, copy the code it shows, and paste it into the other scripts.

Alternative: upload a shapefile of your area (Assets → NEW → Shape files) and set at the top of each script:
```
var AOI = ee.FeatureCollection('projects/your-project/assets/my_area').geometry();
```

Keep the area reasonable: up to about 50 × 50 km works well. Larger areas take long or run out of memory.

---

## Route A: quick (Global Mangrove Watch)

| Step | Script | What to do | Waiting |
|---|---|---|---|
| 1 | `1_period_images.js` | Set `SEASON` to the dry months of your region. Run. Read the CHECKS. Set `RUN_EXPORT = true`, Run, then **Tasks → RUN**. | 10–40 min |
| 3 | `3_dndvi_map.js` | `MASK_SOURCE = 'GMW'`, set `FROM` and `TO`. Run. The map, legend and CHECKS appear. | 1–3 min |

## Route B: accurate (labelled training points)

**Option B1: CONABIO maps (Mexico)**
1. Download the CONABIO mangrove maps (Sistema de Monitoreo de los Manglares de México) as shapefiles:
   1. Open **geoportal.conabio.gob.mx**.
   2. Search for **"manglares"**.
   3. Go to **Biodiversidad → Monitoreo de manglares → Distribución de los manglares y otras coberturas**.
   4. Choose the region that covers your study area (we used **México (general)**).
   5. Download the layer **"Mapa de uso del suelo y vegetación de la zona costera"** for each year: 1981, 2005, 2010, 2015, 2020 and 2025. Use this land-use layer, not the mangrove-only layer: the script needs all cover classes (water, other wetland, built, ...), not only mangrove.

   **The right map depends on your study area.** For Sisal, "México (general)" with this layer was the most accurate. In another part of Mexico a regional map may fit better. Use the same map for all years. If the class names differ from ours, add them to `CLASS_MAP` in script 2a.
2. Upload each one: **Assets → NEW → Shape files**. Select all files of one year together (`.shp`, `.shx`, `.dbf`, `.prj`, or the `.zip`). Name them `conabio_1981`, `conabio_2005` and so on, in `MY_ASSETS`.

   **Clip the Mexico maps first.** The national maps are too big to upload to Earth Engine, so clip each one to your study area and upload only the clipped files. Clip in [Mapshaper](https://mapshaper.org) (drop the files in, use the `-clip` command or the Clip tool with your area, export as shapefile) or in QGIS (Vector → Geoprocessing → Clip). Do this for every year, with the same area.
3. Run `1_period_images.js` (export) as in route A.
4. Run `2a_training_points_conabio.js`. Read the warnings: if CONABIO uses class names the script doesn't know, add them to `CLASS_MAP`. Then `RUN_EXPORT = true` and **Tasks → RUN**. This creates `<NAME>_points`.
5. Run `2_mangrove_maps.js` (already set to `MASK_SOURCE = 'POINTS'`). Read the CHECKS, then `RUN_EXPORT = true`, Run, **Tasks → RUN** (20–60 min). This creates `<NAME>_mangrove`.
6. Run `3_dndvi_map.js` with `MASK_SOURCE = 'POINTS'`.

**Option B2: the Sisal example points (testing only)**
1. Upload `example/sisal_training_points.csv`: **Assets → NEW → CSV file**. Under advanced options set the **X column to `lon`** and the **Y column to `lat`**. Name the asset `sisal_points`.
2. Keep `NAME = 'sisal'` and no drawn study area. These points are only valid for Sisal.
3. Steps 1, 2 and 3 as above.

**Option B3: your own points (anywhere)**
Make a CSV with at least these columns and upload it as in B2, named `<NAME>_points`:

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
| `FROM`, `TO` | 3 | `'P5'`, `'P7'` | Any two period ids that exist in step 1 (periods P1 to P7 for Sisal). The map shows `TO` minus `FROM` |
| `MASK_SOURCE` | 3 (and 2) | `'GMW'` | `'POINTS'` for the accurate route |
| `GMW_CORE_M` | 3 | `60` | Quick route: how far from the GMW edge a pixel must be to count as stable |
| `PCT` | 3 | `[5, 95]` | Whole numbers. Stricter `[2, 98]` marks fewer pixels as a clear change |
| `LEGEND_MIN`, `LEGEND_MAX` | 3 | `-0.3`, `0.3` | Colour range of the map only; it does not change any number |
| `SEASON` | 1 | `[1, 5]` (Jan–May) | Use the driest months of your region: fewer clouds and no flooding |
| `PERIODS` | 1 (and 2a, `PIDS` in 2) | 7 periods 1993–2025 | Keep the same ids in all scripts. Periods of 4–5 years work best |
| `MIN_OBS` | 1 | `3` | Lower to 2 in very cloudy regions |
| `WEB_LINKS`, `RUN_EXPORT` | 3 | `false` | `true` prints PNG links of the map / saves the table as CSV in Google Drive |

Short periods (like P7, 2 years) are noisier than 5-year periods.

---

## Checks: is my result trustworthy?

Every script prints **CHECK** lines in the Console. Read them before you use the map.

- **Step 1, scenes per period:** none should be 0. Few scenes (under about 10) means a noisy period.
- **Step 2 (accurate route), internal test accuracy:** 0.9 or higher is good. This test is optimistic, so it's a minimum check, not your map accuracy.
- **Step 3, CHECK 2:** the stable mangrove area should be a large part of all mangrove. If it is tiny, the thresholds are not reliable.
- **Step 3, CHECK 3, thresholds:** the median is usually close to 0 (a few hundredths); the drop and the rise are roughly symmetric around 0.
- **Step 3, on the map:** do the red areas sit in plausible places (coastline, roads, storm damage, known clearing)?

---

## Expected result for Sisal

Run on Sisal (no drawn area, `NAME = 'sisal'`, `FROM = 'P5'`, `TO = 'P7'`) and compare CHECK 3 and CHECK 4 with the values on our website (Ecosystem page, relative NDVI change 2014–2025). These come from the accurate route (route B); the quick route gives similar but not identical values.

| Value | Sisal |
|---|---|
| Median NDVI change of stable mangrove | −0.018 |
| Clear drop (relative change below) | −0.086 |
| Clear rise (relative change above) | +0.105 |

By definition about 5% of stable mangrove lies beyond each threshold. Small differences are normal: this package uses all years automatically, while our website used yearly images checked by hand.

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Asset ... not found` | The export of the previous step hasn't finished, or `MY_ASSETS` / `NAME` differ between scripts |
| `ERROR: period ... is not in ..._periods` | `FROM` or `TO` is not a period of step 1. The message lists the periods that exist |
| `User memory limit exceeded` | Area too large for interactive viewing. Zoom in, or make the area smaller |
| `Computation timed out` | Same as above |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| Stable mangrove (CHECK 2) is 0 ha | No Global Mangrove Watch mangrove in your area: route A doesn't work there, use route B |

---

## What to keep in mind

- One Landsat pixel is 30 m. Small patches are not reliable.
- The map shows a change in **greenness** (NDVI) between two dry-season periods. It does not say why: storm damage, dieback, clearing, a wetter or drier year and a different sensor can all look alike. The correction for stable mangrove removes what hits the whole area, not local causes.
- Choose `FROM` and `TO` in the same sensor era when you can: Landsat 5/7 and 8/9 differ slightly, which the correction removes only on average.
- The areas are **mapped** areas, not error-adjusted.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), CONABIO, GHSL (JRC), Copernicus DEM. Harmonisation: Roy et al. (2016). Code under MIT license.

Training points in example/sisal_training_points.csv are derived from CONABIO, Mapa de uso del suelo y vegetacion de la zona costera.
