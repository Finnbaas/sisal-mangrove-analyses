Beta: tested on Sisal. Report problems via GitHub issues.

# Storm damage: Lasting NDVI change map for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package makes the **Lasting NDVI change** map: how far the NDVI of the first dry season after a storm lies below or above the normal, as a continuous map, for any storm and study area, in your own Google Earth Engine (GEE) account. It is the same method as the Lasting NDVI change map on our Ecosystem page. The sibling packages `damage-classes`, `acute-ndvi-change` and `acute-wetness` show the same storm in other ways.

**Result:** a map on a scale from −3 (red, far below normal) to +3 (blue, far above normal), and the median Z-score over the mangrove before the storm.

**How it is made** (per pixel of mangrove before the storm):

- **Z-score** = (NDVI of the first dry season after the storm − mean of the normal years) / standard deviation of the normal years. The dry season is January–May. The normal is the same dry season in the other years of the same sensor period (Landsat 5/7: 1993–2012, Landsat 8/9: 2014–2025), with the storm years left out.
- It is the same Z-score as in the `damage-classes` package, without the classes. Z = 0 is a normal year, Z = −2 is two standard deviations below.
- **Storm settings.** One storm block at the top of the script, with the three Sisal storms as presets (see "The storm settings").

---

## Choose your route

| | Quick: Global Mangrove Watch | Accurate: labelled training points |
|---|---|---|
| What decides "mangrove" | Global Mangrove Watch 2020, public in GEE | land-cover classes trained on labelled points (our Sisal method) |
| Where | anywhere in the world | Mexico via CONABIO maps, or anywhere with your own points |
| Preparation | none | upload CONABIO maps or your points (30–60 min) |
| Time in total | about 2–3 hours, mostly waiting for exports | about 3–4 hours |
| Use for | first impression, comparing areas | research and reporting |

You can start with the quick route and switch later: only the mangrove mask (scripts 2a and 2) changes.

Only the **mask** differs between the routes. The rest of the package is the same. One class of the damage map, Cover lost, only exists on the accurate route.

---

## The mangrove mask before the storm

The map covers the mangrove that was there **before the storm**: pixels that are mangrove in the last period whose dry seasons are all before the storm (the `BEFORE_YEAR` period). Scripts 1, 2a and 2 are the Extent method and make the mangrove maps per period; they are copied into this folder so the package works on its own.

- **Quick: Global Mangrove Watch (default).** Script 2 with `MASK_SOURCE = 'GMW'` learns "mangrove or not" from Global Mangrove Watch 2020 (public in Earth Engine) and applies it to every period. Works anywhere, nothing to prepare, coarser at the edges.
- **Accurate: training points.** Script 2a makes labelled points from the CONABIO maps (Mexico) or you bring your own; script 2 with `MASK_SOURCE = 'POINTS'` classifies six land-cover classes per period. This is our Sisal method.

In both routes the result is the asset `<NAME>_mangrove` with a band `mangrove_P1` … `mangrove_P7` (1 = mangrove) per period.

**Which period is "before the storm"?** Step 3 takes the last period that ends in or before `BEFORE_YEAR`. For Isidore (2002) that is P2 (1998–2002): its dry seasons, January–May, all come before the storm of September 2002. For the 2020 storms it is P5 (2014–2018). For Opal (1995) there is no period fully before the storm (P1 is 1993–1997), so P1 is used and the script prints a note.

---

## Files

| File | What it does | Needed for |
|---|---|---|
| `1_period_images.js` | Builds one cloud-free Landsat image per period (dry season) and saves it in your project | the mask, both routes |
| `2a_training_points_conabio.js` | Makes training points from the CONABIO mangrove maps of Mexico | the mask, accurate route, Mexico |
| `2_mangrove_maps.js` | Decides per period which pixels are mangrove | the mask, both routes |
| `2b_yearly_ndvi.js` | Builds one dry-season NDVI image per year (one band per year) and saves it in your project | both routes |
| `3_lasting_ndvi_map.js` | Z-score of the year after the storm: map, gradient legend and median Z | both routes |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán | testing |
| `example/sisal_training_points.csv` | Our training points for Sisal | testing the accurate route on Sisal |

---

## The storm settings

The top of every map script has the same storm block. Choose a preset with `STORM`, or `STORM = 'custom'` and fill in `CUSTOM`:

| Setting | What it is | Used by |
|---|---|---|
| `STORM_NAME` | Name in titles and legends | all |
| `STORM_DATE` | Date of the storm near your area (peak), `YYYY-MM-DD` | damage classes (centre of the recovery chart) |
| `BEFORE_YEAR` | The year of the storm: its dry season (January–May) is still before the storm | damage classes, lasting |
| `AFTER_YEAR` | First dry season after the storm | damage classes, lasting |
| `ACUTE_START`, `ACUTE_END` | The short window right after the storm, within one calendar year | acute maps |
| `STORM_YEARS` | Years left out of the normal: the storm year, the after year and every other year a storm hit your area in the same sensor period | all |

| Preset (`STORM`) | `STORM_DATE` | `BEFORE_YEAR` | `AFTER_YEAR` | Acute window | `STORM_YEARS` |
|---|---|---|---|---|---|
| `'opal'` Opal 1995 | 1995-09-30 | 1995 | 1996 | 1 Nov – 15 Dec 1995 | 1995, 1996 |
| `'isidore'` Isidore 2002 | 2002-09-23 | 2002 | 2003 | 1 Nov – 15 Dec 2002 | 2002, 2003 |
| `'2020'` 2020 storms | 2020-06-05 | 2020 | 2021 | 5 Jun – 31 Jul 2020 (Cristobal) | 2020, 2021 |

**How to pick the dates for another storm.**
1. Find the storm and its date near your area, for example in the storm tracks package on the Climatology tab of our site (HURDAT2). Use the date of the closest approach for `STORM_DATE`.
2. `BEFORE_YEAR` is the year of the storm if it came after the dry season (January–May), otherwise the year before. `AFTER_YEAR` is the first dry season after the storm.
3. The acute window starts a few days after the storm (the sky must be clear enough for Landsat) and runs for four to eight weeks. Landsat passes every 8 days (two satellites) to 16 days, so a short window may hold only one or two images: the acute scripts warn when there are fewer than two.
4. Add every other year in the same sensor period (1993–2012 or 2014–2025) in which a storm hit your area to `STORM_YEARS`, so that damage is not part of the "normal".

The normal always comes from the same sensor period as the storm year, because Landsat 5/7 (1993–2012) and Landsat 8/9 (2014–2025) are different sensors. The year 2013 is in neither.

---

## Before you start (once)

1. **Earth Engine account.** Sign up at earthengine.google.com and create a Cloud project. Register it for **non-commercial use** (free).
2. **Your asset folder.** In the Code Editor (code.earthengine.google.com), open the **Assets** tab. Your folder looks like `projects/your-project/assets/`. You'll fill this in as `MY_ASSETS` in every script.
3. **Make five empty scripts.** In the **Scripts** tab click **NEW → File** for each `.js` file you need and paste its contents in. Save them.
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
| 2b | `2b_yearly_ndvi.js` | Same `SEASON` as step 1. Run, read the CHECKS, `RUN_EXPORT = true`, Run, **Tasks → RUN**. Can run at the same time as steps 1 and 2. | 20–60 min |
| 3 | `3_lasting_ndvi_map.js` | Choose the storm (`STORM`). Run. The map, legend and median Z appear. Run again with another storm for another map. | 1–5 min |

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
6. Run `2b_yearly_ndvi.js` (export), as in route A.
7. Run `3_lasting_ndvi_map.js`.

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
| `SEASON` | 1, 2b | `[1, 5]` (Jan–May) | Use the driest months of your region: fewer clouds and no flooding. Keep it the same in 1 and 2b |
| `PERIODS` | 1, 2a (and `PIDS` in 2) | 7 periods 1993–2025 | Only for the mask. Keep the same ids in all scripts |
| `MASK_SOURCE` | 2 | `'GMW'` | `'POINTS'` for the accurate route |
| `REF_PERIOD` | 2 | `'P6'` | The period that contains 2020 (the Global Mangrove Watch year) |
| `MIN_PATCH_PIX` | 2 | `6` (~0.5 ha) | Smaller removes less noise, larger removes more detail |
| `YEARS` | 2b | `[1993, 2025]` | The years in the yearly asset. Must include the normal years of the storm |
| `MIN_OBS` | 1, 2b | `3` | Clear dates needed per pixel per year. Lower to 2 in very cloudy regions |
| `STORM` and the storm block | 3 | `'isidore'` | See "The storm settings" |
| `WINDOWS` | 3 | 1993–2012 and 2014–2025 | Your own sensor windows. One sensor family per window |
| `MIN_NORMAL_YEARS` | 3 | `5` | Normal years a pixel needs; fewer = no Z-score |

---

## Checks: is my result trustworthy?

Every script prints **CHECK** lines in the Console. Read them before exporting.

- **Step 1, scenes per period:** none should be 0. Few scenes (under about 10) means a noisy period.
- **Step 2, internal test accuracy:** 0.9 or higher is good. It is optimistic, so it is a minimum check.
- **Step 2b, scenes per year:** a year with 0 scenes stays empty. The after year must have data.
- **Step 3, mangrove before the storm (ha):** the area the median is taken over.
- **Step 3, normal years used:** the sensor period without the storm years. At least about 10 years is better.
- **Step 3, on the map:** do the red areas follow the coast and the storm track? Blue areas after a storm can be a wetter or greener year, not recovery.

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Asset ... not found` | The export of the previous step hasn't finished, or `MY_ASSETS` / `NAME` differ between scripts |
| `User memory limit exceeded` | Area too large for interactive viewing. Use the exports; for the map, zoom in. Or make the area smaller |
| `Computation timed out` | Same as above. Exports have more time than the map view |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| CHECK 3 in step 2 is 0 ha | No Global Mangrove Watch mangrove in your area: route A doesn't work there, use route B |
| `Band pattern 'NDVI_2003' did not match any bands` | A year is missing in the step 2b asset: change `YEARS` in step 2b |
| `AFTER_YEAR 2013 is in none of the WINDOWS` | 2013 falls between the two sensor windows. Choose another storm or add a window |

---

## Expected result for Sisal

Accurate route (route B2 with the Sisal example points), `NAME = 'sisal'`, no drawn area. Our site publishes no median Z for this map, so check the picture and the link with the damage classes: for Isidore (`STORM = 'isidore'`) the damage classes give 2949.8 ha Moderate (Z between −1 and −2) and 1660.5 ha Severe (Z below −2) out of the mangrove before the storm. So about 60 % of that mangrove has a Z-score below −1 in 2003, and the median Z over the mangrove must be negative. Opal gives a much lighter map (258.8 ha Moderate and 22.6 ha Severe), the 2020 storms a heavier one (1979.9 ha Moderate and 1489.8 ha Severe).

The same mask and the same Z-score are used in both packages, so the lasting map and the damage classes always agree.

---

## What to keep in mind

- **Opal (1995).** There is no period fully before Opal in the mangrove maps (1993–1997 contains 1995), so stands killed in 1995 may be missing from the mask. Read "little impact" with care.
- **The 2020 storms.** Dry-season images show lasting damage, not the short flooding of June 2020; that is underestimated here.
- The map shows the first dry season after the storm. Damage that recovers within a few months, or that happens after the dry season, is not seen.
- One Landsat pixel is 30 m. Small patches (under ~0.5 ha) are not reliable.
- NDVI also reacts to water level and season, not only to storms. A low Z-score means "far below the normal of this pixel", not necessarily "caused by the storm".
- Landsat 7 has striping after 2003 (SLC-off). It can add noise to single years in 1993–2012.
- Our Sisal results used yearly images checked by hand (cloudy years marked). This package uses all years automatically, so results for Sisal can differ slightly from our website.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), CONABIO, GHSL (JRC), Copernicus DEM, HURDAT2 (NOAA National Hurricane Center). Harmonisation: Roy et al. (2016). Code under MIT license.

Training points in example/sisal_training_points.csv are derived from CONABIO, Mapa de uso del suelo y vegetacion de la zona costera.
