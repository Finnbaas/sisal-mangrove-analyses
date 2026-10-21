Beta: tested on Sisal and one other area in Yucatan. Report problems via GitHub issues.

# Mangrove change for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package makes a map of where mangrove disappeared or appeared between 1993 and 2025, for any study area, in your own Google Earth Engine (GEE) account. It's the same method as the Change map on our Vegetation page.

**Result:** a map with four classes (stable mangrove, confirmed loss, confirmed gain, uncertain change), the area per class, and when the confirmed changes happened.

---

## Choose your route

| | Quick: Global Mangrove Watch | Accurate: labelled training points |
|---|---|---|
| What decides "mangrove" | Global Mangrove Watch 2020, public in GEE | land-cover classes trained on labelled points (our Sisal method) |
| Where | anywhere in the world | Mexico via CONABIO maps, or anywhere with your own points |
| Preparation | none | upload CONABIO maps or your points (30–60 min) |
| Time in total | about 1–2 hours, mostly waiting for exports | about 2–3 hours |
| Use for | first impression, comparing areas | research and reporting |

You can start with the quick route and switch later: only step 2 changes.

---

## Files

| File | What it does | Needed for |
|---|---|---|
| `1_period_images.js` | Builds one cloud-free Landsat image per period (dry season) and saves it in your project | both routes |
| `2a_training_points_conabio.js` | Makes training points from the CONABIO mangrove maps of Mexico | accurate route, Mexico |
| `2_mangrove_maps.js` | Decides per period which pixels are mangrove and makes the change classes | both routes |
| `3_change_map.js` | Checks every change against NDVI and draws the map, legend and tables | both routes |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán | testing |
| `example/sisal_training_points.csv` | Our training points for Sisal | testing the accurate route on Sisal |

---

## Before you start (once)

1. **Earth Engine account.** Sign up at earthengine.google.com and create a Cloud project. Register it for **non-commercial use** (free).
2. **Your asset folder.** In the Code Editor (code.earthengine.google.com), open the **Assets** tab. Your folder looks like `projects/your-project/assets/`. You'll fill this in as `MY_ASSETS` in every script.
3. **Make four empty scripts.** In the **Scripts** tab click **NEW → File** for each `.js` file and paste its contents in. Save them.
4. **Fill in the same two settings at the top of every script:**
   ```
   var MY_ASSETS = 'projects/your-project/assets/';
   var NAME      = 'myarea';     // short name, no spaces
   ```

**Tip: test on Sisal first.** Don't draw anything and leave `NAME = 'sisal'`. The scripts then use our study area, and you can compare your result with the Change map on our website. If it looks the same, your setup works.

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
| 2 | `2_mangrove_maps.js` | `MASK_SOURCE = 'GMW'`. Run and read the CHECKS (see below). Then `RUN_EXPORT = true`, Run, **Tasks → RUN**. | 20–60 min |
| 3 | `3_change_map.js` | Run. The map, legend and tables appear. | 1–3 min |

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

   Tip: the national maps are large. If an upload is slow or fails, first clip them to your region (for example in QGIS) and upload the clipped files.
3. Run `1_period_images.js` (export) as in route A.
4. Run `2a_training_points_conabio.js`. Read the warnings: if CONABIO uses class names the script doesn't know, add them to `CLASS_MAP`. Then `RUN_EXPORT = true` and **Tasks → RUN**. This creates `<NAME>_points`.
5. Run `2_mangrove_maps.js` with `MASK_SOURCE = 'POINTS'` (export).
6. Run `3_change_map.js`.

**Option B2: the Sisal example points (testing only)**
1. Upload `example/sisal_training_points.csv`: **Assets → NEW → CSV file**. Under advanced options set the **X column to `lon`** and the **Y column to `lat`**. Name the asset `sisal_points`.
2. Keep `NAME = 'sisal'` and no drawn study area. These points are only valid for Sisal.
3. Steps 1, 2 (`MASK_SOURCE = 'POINTS'`) and 3 as above.

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
| `SEASON` | 1 | `[1, 5]` (Jan–May) | Use the driest months of your region: fewer clouds and no flooding |
| `PERIODS` | 1, 2a, 3 (and `PIDS` in 2) | 7 periods 1993–2025 | Keep the same ids in all scripts. Periods of 4–5 years work best |
| `MIN_OBS` | 1 | `3` | Lower to 2 in very cloudy regions |
| `MASK_SOURCE` | 2 | `'GMW'` | `'POINTS'` for the accurate route |
| `REF_PERIOD` | 2 | `'P6'` | The period that contains 2020 (the Global Mangrove Watch year) |
| `MIN_PATCH_PIX` | 2 | `6` (~0.5 ha) | Smaller removes less noise, larger removes more detail |
| `USE_BUILT_CONSTRAINT` | 2 | `true` | Keep on: stops roads outside towns being mapped as "built" |
| `PCT` | 3 | `[5, 95]` | Stricter `[2.5, 97.5]` confirms fewer changes |
| `MAP_STYLE` | 3 | `'simplified'` | `'extended'` (9 classes) or `'per_period'` (when it changed) |

---

## Checks: is my result trustworthy?

Every script prints **CHECK** lines in the Console. Read them before exporting.

- **Step 1, scenes per period:** none should be 0. Few scenes (under about 10) means a noisy period.
- **Step 2, internal test accuracy:** 0.9 or higher is good. This test is optimistic (it uses points from homogeneous areas), so it's a minimum check, not your map accuracy.
- **Step 2, mangrove area vs Global Mangrove Watch:** should be in the same range. Very different means: check the mask on the map.
- **Step 3, on the map:** do red and blue sit in plausible places (coastline, roads, known restoration sites)? Lots of grey on the mangrove edge is normal: that's where the maps disagree.

**Accuracy assessment (for publication):** draw random points in the mapped classes, label them yourself on high-resolution images, and compute accuracy and error-adjusted area following Olofsson et al. (2014). Our Sisal scripts for this are available on request.

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Asset ... not found` | The export of the previous step hasn't finished, or `MY_ASSETS` / `NAME` differ between scripts |
| `User memory limit exceeded` | Area too large for interactive viewing. Use the exports; for the map, zoom in. Or make the area smaller |
| `Computation timed out` | Same as above. Exports have more time than the map view |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| CHECK 3 in step 2 is 0 ha | No Global Mangrove Watch mangrove in your area: route A doesn't work there, use route B |

---

## What to keep in mind

- One Landsat pixel is 30 m. Small patches (under ~0.5 ha) are not reliable.
- "Confirmed" means two independent sources agree: the mangrove maps and NDVI. "Uncertain" doesn't mean wrong, it means not proven.
- The areas are **mapped** areas, not error-adjusted.
- Landsat 7 has striping after 2003 (SLC-off). The period median removes most of it, but some noise can remain in P3 and P4.
- Our Sisal results used yearly images checked by hand (cloudy years marked). This package uses all years automatically, so results for Sisal can differ slightly from our website.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), CONABIO, GHSL (JRC), Copernicus DEM. Harmonisation: Roy et al. (2016). Accuracy assessment: Olofsson et al. (2014). Code under MIT license.

Training points in example/sisal_training_points.csv are derived from CONABIO, Mapa de uso del suelo y vegetacion de la zona costera.
