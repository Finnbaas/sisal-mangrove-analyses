Beta: tested on Sisal. Report problems via GitHub issues.

# Mangrove condition: Trend map for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package makes the **Trend** map: where the dry-season NDVI of persistent mangrove went up or down over a period, for any study area, in your own Google Earth Engine (GEE) account. It is the same method as the Trend map on our Ecosystem page. The sibling packages `status` and `canopy-density` show the condition for one year and the canopy density.

**Result:** a map where only pixels with a significant trend are coloured (red = NDVI went down, blue = NDVI went up), one map per time window, and the share of persistent mangrove with a significant increase and decrease.

**How it is made** (per pixel of persistent mangrove, per window):

- **Yearly NDVI:** the median NDVI of the dry season (Landsat 5, 7, 8 and 9, harmonised), one value per year.
- **Slope:** the Theil-Sen slope of the yearly NDVI, in NDVI per year. 0.01 per year is 0.1 per decade.
- **Significance:** the Mann-Kendall test, two-sided, p < 0.05. Only significant pixels are coloured. Uncoloured mangrove has **no significant trend**, which is not the same as "no change".
- **Windows.** Landsat 5/7 and Landsat 8/9 are different sensors, so a trend is never calculated across them. The default windows are 1993–2012 (Landsat 5/7) and 2014–2025 (Landsat 8/9). Both are settings (`WINDOWS`), so you can set your own.
- **About 2.5 % of pixels per direction can come out as significant by chance.** Read patches, not single pixels. Unlike the Status map, no small patches are removed here, so these shares are slightly higher than Improving and Declining in the Status map.

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

---

## Files

| File | What it does | Needed for |
|---|---|---|
| `1_period_images.js` | Builds one cloud-free Landsat image per period (dry season) and saves it in your project | the mask, both routes |
| `2a_training_points_conabio.js` | Makes training points from the CONABIO mangrove maps of Mexico | the mask, accurate route, Mexico |
| `2_mangrove_maps.js` | Decides per period which pixels are mangrove; persistent mangrove is the result | the mask, both routes |
| `2b_yearly_ndvi.js` | Builds one dry-season NDVI image per year (one band per year) and saves it in your project | both routes |
| `3_trend_map.js` | Theil-Sen slope and Mann-Kendall test per window: map, legend and shares | both routes |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán | testing |
| `example/sisal_training_points.csv` | Our training points for Sisal | testing the accurate route on Sisal |

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
| 3 | `3_trend_map.js` | Run. The map, legend and shares appear (read them in the Console). `WEB_LINKS = true` prints PNG links. | 1–5 min |

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
7. Run `3_trend_map.js`.

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
| `YEARS` | 2b | `[1993, 2025]` | The years in the yearly asset. Must include every year of your `WINDOWS` |
| `MIN_OBS` | 1, 2b | `3` | Clear dates needed per pixel per year. Lower to 2 in very cloudy regions |
| `WINDOWS` | 3 | 1993–2012 and 2014–2025 | Your own windows. One sensor family per window, at least about 10 years |
| `SHOW` | 3 | `'2014-2025'` | The window visible on the map when it opens |
| `ALPHA` | 3 | `0.05` | Significance of the trend: `0.10`, `0.05` or `0.01` |
| `MIN_YEARS` | 3 | `8` | Valid years a pixel needs in a window; fewer = no trend, the pixel stays uncoloured |
| `SLOPE_MAX` | 3 | `0.01` | The colour scale runs from −`SLOPE_MAX` to +`SLOPE_MAX` NDVI per year |

---

## Checks: is my result trustworthy?

Every script prints **CHECK** lines in the Console. Read them before exporting.

- **Step 1, scenes per period:** none should be 0. Few scenes (under about 10) means a noisy period.
- **Step 2, internal test accuracy:** 0.9 or higher is good. It is optimistic, so it is a minimum check.
- **Step 2, mangrove area vs Global Mangrove Watch:** should be in the same range.
- **Step 2b, scenes per year:** a year with 0 scenes stays empty. A few empty years are fine, many is not (the trend needs `MIN_YEARS` valid years).
- **Step 3, persistent mangrove (ha):** this is the 100 % of all shares. For Sisal on the accurate route it is 6974.9 ha. A very different number means the mask is different: check step 2 first.
- **Step 3, valid years per pixel:** should be close to the number of years in the window. Much lower means many cloudy years: the map shows few significant pixels for that reason.
- **Step 3, on the map:** do red and blue sit in coherent patches (not single pixels)?

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Asset ... not found` | The export of the previous step hasn't finished, or `MY_ASSETS` / `NAME` differ between scripts |
| `User memory limit exceeded` | Area too large for interactive viewing. Use the exports; for the map, zoom in. Or make the area smaller |
| `Computation timed out` | Same as above. Exports have more time than the map view |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| CHECK 3 in step 2 is 0 ha | No Global Mangrove Watch mangrove in your area: route A doesn't work there, use route B |
| `Band pattern 'NDVI_2013' did not match any bands` | A year of a window is missing in the step 2b asset: change `YEARS` in step 2b or `WINDOWS` in step 3 |

---

## Expected result for Sisal

Accurate route (route B2 with the Sisal example points), `NAME = 'sisal'`, no drawn area. Share of persistent mangrove (6974.9 ha) with a significant trend:

| Window | Significant increase | Significant decrease |
|---|---|---|
| 2014–2025 | 9.8 % | 18.5 % |
| 1993–2012 | 19.4 % | 4.9 % |

Small differences are normal: our website used yearly images checked by hand (see below), and the quick route (Global Mangrove Watch) gives another persistent mangrove area. If a number is far off, compare the persistent mangrove area first.

---

## What to keep in mind

- One Landsat pixel is 30 m. Small patches (under ~0.5 ha) are not reliable.
- "No significant trend" is not "no change": a short record or noisy years hide real trends.
- NDVI also reacts to water level, season and sensor. The 1993–2012 and 2014–2025 maps cannot be compared pixel by pixel: different sensors and different years.
- The shares are shares of **mapped** persistent mangrove, not error-adjusted. Mangrove that was lost or gained is not in the map (see "The persistent mangrove mask").
- Landsat 7 has striping after 2003 (SLC-off). It can add noise to single years in 1993–2012.
- Our Sisal results used yearly images checked by hand (cloudy years marked). This package uses all years automatically, so results for Sisal can differ slightly from our website.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), CONABIO, GHSL (JRC), Copernicus DEM. Harmonisation: Roy et al. (2016). Trend test: Theil (1950), Sen (1968), Mann (1945), Kendall (1975). Code under MIT license.

Training points in example/sisal_training_points.csv are derived from CONABIO, Mapa de uso del suelo y vegetacion de la zona costera.
