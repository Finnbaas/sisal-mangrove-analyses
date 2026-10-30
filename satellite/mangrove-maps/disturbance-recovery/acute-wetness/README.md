Beta: tested on Sisal. Report problems via GitHub issues.

# Storm effect: Acute wetness map for your own study area

Part of the **Sisal Mangrove Monitor** (TU Delft × UNAM Sisal). This package makes the **Acute wetness** map: the surface wetness (flooding) in the first weeks after a storm, for any storm and study area, in your own Google Earth Engine (GEE) account. It is the same method as the Acute wetness map on our Ecosystem page, and the same script as `acute-ndvi-change` with MNDWI instead of NDVI. The sibling packages `damage-classes`, `lasting-ndvi-change` and `acute-ndvi-change` show the same storm in other ways.

**Result:** a map on a scale from −3 (red, drier than normal) to +3 (blue, wetter than normal), and the whole-area Z-score of the MNDWI.
**How it is made** (per pixel):

- **Short window.** Landsat 5, 7, 8 and 9 images from the window `ACUTE_START` – `ACUTE_END` right after the storm (for Isidore 1 Nov – 15 Dec 2002; for Cristobal 5 Jun – 31 Jul 2020). Clouds, shadow and saturation are masked, and the old sensors are harmonised to the new one (Roy et al. 2016). Per year the median of the scenes in the window.
- **Z-score** = (MNDWI in the storm window − mean of the same days in the normal years) / standard deviation of those years. The normal is the same calendar window in the other years of the same sensor period (Landsat 5/7: 1993–2012, Landsat 8/9: 2014–2025), with the storm years left out.
- **Storm settings.** One storm block at the top of the script, with the three Sisal storms as presets (see "The storm settings").
- **Where.** `MASK_SOURCE = 'NONE'` maps the whole study area (default). `'GMW'` maps only Global Mangrove Watch mangrove (2020, public in Earth Engine).
- NDVI shows vegetation; MNDWI shows surface wetness (flooding). The two maps use the same method.

**This is the shortest package: one script, no assets, no export first.** There is no mangrove mask to make unless you want one: nothing but the storm settings needs to be filled in.

---

## Files

| File | What it does |
|---|---|
| `1_acute_wetness_map.js` | Builds the Z-score map for the storm window: map, gradient legend, whole-area Z, number of image dates |
| `example/sisal_aoi.geojson` | Our study area in Sisal, Yucatán, for testing |

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
2. **Make one empty script.** In the Code Editor (code.earthengine.google.com), **Scripts** tab, click **NEW → File** and paste the contents of `1_acute_wetness_map.js` in. Save it.
3. **Nothing to fill in** except the storm. This script does not use an asset folder.

**Tip: test on Sisal first.** Don't draw anything. The script then uses our study area and you can compare your result with the numbers in "Expected result for Sisal" below and with the map on our website.

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

## Run it

| Step | Script | What to do | Waiting |
|---|---|---|---|
| 1 | `1_acute_wetness_map.js` | Choose the storm (`STORM`). Run. Read the CHECKS in the Console: the number of image dates in the window must be at least 2. The map, legend and whole-area Z appear. Run again with another storm for another map. | 1–3 min |

Optional: `MASK_SOURCE = 'GMW'` to map mangrove only; `WEB_LINKS = true` to print a PNG link of the map; `RUN_EXPORT = true` for a GeoTIFF of the Z-score in Google Drive.

---

## Settings you may want to change

| Setting | Sisal value | When to change |
|---|---|---|
| `STORM` and the storm block | `'isidore'` | See "The storm settings" |
| `MASK_SOURCE` | `'NONE'` | `'GMW'` to map Global Mangrove Watch mangrove only |
| `WINDOWS` | 1993–2012 and 2014–2025 | Your own sensor windows. One sensor family per window |
| `MIN_NORMAL_YEARS` | `5` | Normal years a pixel needs; fewer = no Z-score |
| `MIN_IMAGES` | `2` | The warning limit for the number of image dates in the window |

---

## Checks: is my result trustworthy?

Every run prints **CHECK** lines in the Console.

- **CHECK 1, image dates in the storm window:** at least 2 (the script warns below that). With one date the "map" is a single image; with none it is empty. Make the window longer, or wait for the clouds: after a storm the sky is often cloudy.
- **CHECK 2, normal years used:** the sensor period without the storm years. At least about 10 years is better.
- **CHECK 3, years with at least one image:** should be most of CHECK 2's years. Years without an image in the window do not count in the normal.
- **WHOLE AREA TEXT:** the whole-area Z and the mean pixel Z. A whole-area Z beyond ±2 is far from normal.
- **On the map:** are the red or blue areas in patches, not single pixels? Short windows mean few images; single pixels can be noisy.

---

## Troubleshooting

| Message | Cause and fix |
|---|---|
| `Computation timed out` / `User memory limit exceeded` | Area too large for interactive viewing. Zoom in, make the area smaller, or use `RUN_EXPORT = true` |
| `geometry is not defined` | Not a problem: no drawn area, the script uses Sisal |
| `ACUTE_START and ACUTE_END must be in the same calendar year` | The window crosses New Year. Use two runs, or end the window on 31 December |
| `The storm year ... is in none of the WINDOWS` | The storm is in 2013, between the two sensor windows. Add a window |
| The map is empty | No images in the window (CHECK 1). Make the window longer |

---

## Expected result for Sisal

No drawn area, `MASK_SOURCE = 'NONE'` (whole study area). Whole-area Z-score of the MNDWI (the line `WHOLE AREA TEXT` in the Console):

| Storm (`STORM`) | Window | Whole-area MNDWI Z |
|---|---|---|
| Isidore 2002 (`'isidore'`) | 1 Nov – 15 Dec 2002 | +0.60 (wetter than normal) |
| Cristobal 2020 (`'2020'`) | 5 Jun – 31 Jul 2020 | +1.68 (wetter than normal) |
| Opal 1995 (`'opal'`) | 1 Nov – 15 Dec 1995 | +1.55 (text only, no map on our site) |

- **Cristobal 2020:** greener and wetter than normal right after the storm: flooding and rain, no acute vegetation loss.
- **Opal on our site.** Our site shows no wetness map for Opal ("Not available for Opal"); the whole-area value, +1.55, only appears in the text next to the other Opal maps. The script does run for Opal. Check the number of image dates (CHECK 1) before you trust the map: with few images in a short window, single pixels are noisy.

The script prints two numbers: the Z of the area-mean MNDWI (the whole-area value above) and the mean of the pixel Z-scores. If the first one is far off the table, check the number of image dates (CHECK 1) and `STORM_YEARS`.
---

## What to keep in mind

- Short windows mean few images; single pixels can be noisy. Read patches, not single pixels.
- The Z-score says "far from the normal of this pixel in this window", not "caused by the storm". The same window in other years can also be wet or dry for other reasons.
- Wet-season windows (like Cristobal in June) are cloudy: fewer images, and the normal years differ in the cloud cover.
- Whole area means the whole study area, not only mangrove, unless `MASK_SOURCE = 'GMW'`. The numbers above are for the whole area.
- One Landsat pixel is 30 m. Landsat 7 has striping after 2003 (SLC-off).
- The window must lie in one calendar year.

---

## Credits

Method: Sisal Mangrove Monitor, TU Delft MDP 2026, with UNAM Sisal. Landsat (USGS/NASA), Global Mangrove Watch (Bunting et al.), HURDAT2 (NOAA National Hurricane Center). Harmonisation: Roy et al. (2016). Code under MIT license.
