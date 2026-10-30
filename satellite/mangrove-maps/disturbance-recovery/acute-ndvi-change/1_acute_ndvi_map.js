/**********************************************************************
 * STORM EFFECT: ACUTE NDVI CHANGE  ·  THE ONLY SCRIPT
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Shows the effect in the first weeks after a storm: NDVI (vegetation)
 * in the short window ACUTE_START - ACUTE_END, compared with the same
 * calendar window in other years:
 *   Z = (NDVI in the storm window - mean of the same window in
 *        the normal years) / standard deviation of those years, per pixel
 * Storm years (STORM_YEARS) are left out of the normal. Landsat 5/7 and
 * Landsat 8/9 are different sensors, so the normal is only taken from
 * the sensor period of the storm (WINDOWS).
 *
 * This script needs no assets and no earlier steps: just Run. Landsat 5,
 * 7 (until 2013), 8 and 9, Collection 2 Level 2, cloud/shadow/saturation
 * mask, TM/ETM+ harmonised to OLI (Roy et al. 2016). Per year the median
 * of the scenes in the window.
 *
 * WHERE: MASK_SOURCE = 'NONE' maps the whole study area (default, as in
 * the whole-area numbers of our site); 'GMW' only maps Global Mangrove
 * Watch mangrove (2020, public in Earth Engine).
 *
 * OUTPUT
 *   - map + gradient legend
 *   - Console: the whole-area Z (Z of the area mean NDVI) and the
 *     mean of the pixel Z-scores; the number of image dates in the window
 *     (a warning below 2); the years used as normal
 *   - WEB_LINKS = true: PNG link of the map
 *   - RUN_EXPORT = true: GeoTIFF of the Z-score in Google Drive
 *
 * Short windows mean few images; single pixels can be noisy.
 *********************************************************************/


// ========================== SETTINGS ===============================

var SISAL = ee.Geometry.Polygon(
  [[[-90.05041551503234, 21.162924684073946], [-90.09495298591237, 21.158981726153797],
    [-90.12053053107839, 21.141531063671124], [-90.12018720832448, 21.078595563619460],
    [-90.05066435065847, 21.078497576643580], [-89.93977110114675, 21.113251544607984],
    [-89.93925611701589, 21.213143836734320], [-90.00933715735849, 21.174100452704874],
    [-90.02163012765293, 21.17150261406858],  [-90.01991318489279, 21.164856004032620],
    [-90.03102825905050, 21.162574817466144], [-90.03858135963644, 21.161774392793973],
    [-90.04819439674581, 21.159733290287747], [-90.05016850258077, 21.165816493119890]]]);
var AOI = (typeof geometry !== 'undefined') ? ee.Geometry(geometry) : SISAL;

// ---- THE STORM: choose a preset, or 'custom' and fill in CUSTOM ------------
// Used here: STORM_NAME, ACUTE_START, ACUTE_END (inside one calendar year), STORM_YEARS. (STORM_DATE, BEFORE_YEAR and AFTER_YEAR are used by the lasting maps.)
var STORM = 'isidore';      // 'opal', 'isidore', '2020' or 'custom'

var PRESETS = {
  opal:    {name: 'Opal 1995',    date: '1995-09-30', before: 1995, after: 1996,
            acute: ['1995-11-01', '1995-12-15'], stormYears: [1995, 1996]},
  isidore: {name: 'Isidore 2002', date: '2002-09-23', before: 2002, after: 2003,
            acute: ['2002-11-01', '2002-12-15'], stormYears: [2002, 2003]},
  '2020':  {name: '2020 storms (Cristobal, Gamma, Delta)', date: '2020-06-05', before: 2020, after: 2021,
            acute: ['2020-06-05', '2020-07-31'], stormYears: [2020, 2021]}
};
var CUSTOM = {name: 'My storm', date: '2010-07-12', before: 2010, after: 2011,
              acute: ['2010-07-14', '2010-08-31'], stormYears: [2010, 2011]};

var P = (STORM === 'custom') ? CUSTOM : PRESETS[STORM];
if (!P) { throw new Error("STORM must be 'opal', 'isidore', '2020' or 'custom'."); }
var STORM_NAME  = P.name;          // name used in titles
var STORM_DATE  = P.date;          // date of the storm (peak near the study area), YYYY-MM-DD
var BEFORE_YEAR = P.before;        // last dry season before the storm (Jan-May of the storm year is before it)
var AFTER_YEAR  = P.after;         // first dry season after the storm
var ACUTE_START = P.acute[0];      // first day of the short window right after the storm
var ACUTE_END   = P.acute[1];      // last day of that window (inside one calendar year)
var STORM_YEARS = P.stormYears;    // years left out of the normal (storm year, after year, other storm years)

var WINDOWS = [                  // one sensor family per window; the normal never crosses them
  {id: '1993-2012', from: 1993, to: 2012},   // Landsat 5/7
  {id: '2014-2025', from: 2014, to: 2025}    // Landsat 8/9
];

var ASSET_YEARS = [1993, 2025];    // years that can be used as normal

var MASK_SOURCE = 'NONE';    // 'NONE' (whole study area) or 'GMW' (Global Mangrove Watch mangrove only)
var MIN_NORMAL_YEARS = 5;    // a pixel needs at least this many normal years
var MIN_IMAGES = 2;          // warn if the storm window has fewer image dates than this

var RUN_EXPORT   = false;    // true: GeoTIFF of the Z-score in Google Drive
var WEB_LINKS    = false;    // print a PNG link of the map
var WEB_PNG_SIZE = 640;      // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_disturbance';

var INDEX = 'NDVI';         // the index of this map


// ========================== WINDOWS AND YEARS ======================

var STORM_YEAR = Number(ACUTE_START.slice(0, 4));
var DAY_START  = ACUTE_START.slice(5);       // 'MM-DD'
var DAY_END    = ACUTE_END.slice(5);
if (Number(ACUTE_END.slice(0, 4)) !== STORM_YEAR) {
  throw new Error('ACUTE_START and ACUTE_END must be in the same calendar year.');
}

var WIN = null;
WINDOWS.forEach(function (w) { if (STORM_YEAR >= w.from && STORM_YEAR <= w.to) { WIN = w; } });
if (WIN === null) {
  throw new Error('The storm year ' + STORM_YEAR + ' is in none of the WINDOWS (2013 is between the two sensor windows).');
}
var NORMAL_YEARS = [];
for (var y = Math.max(WIN.from, ASSET_YEARS[0]); y <= Math.min(WIN.to, ASSET_YEARS[1]); y++) {
  if (STORM_YEARS.indexOf(y) < 0) { NORMAL_YEARS.push(y); }
}


// ========================== LANDSAT ================================

var REGION = AOI.buffer(500);

var ROY = {slope: [0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071],
           itcp:  [0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172]};
var BN  = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
var TM  = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var OLI = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];

function prepScene(bands, harmonize) {
  return function (img) {
    var qa = img.select('QA_PIXEL');
    var clear = qa.bitwiseAnd(1 << 3).eq(0)
      .and(qa.bitwiseAnd(1 << 4).eq(0))
      .and(img.select('QA_RADSAT').eq(0));
    var sr = img.select(bands, BN).multiply(0.0000275).add(-0.2);
    if (harmonize) {
      sr = sr.multiply(ee.Image.constant(ROY.slope)).add(ee.Image.constant(ROY.itcp));
    }
    sr = sr.toFloat();
    var idx = INDEX === 'NDVI' ? sr.normalizedDifference(['nir', 'red'])
                               : sr.normalizedDifference(['green', 'swir1']);
    return ee.Image(idx.rename('v').toFloat().updateMask(clear)
      .copyProperties(img, ['system:time_start']));
  };
}

function scenes(id) { return ee.ImageCollection(id).filterBounds(REGION); }
var LS = scenes('LANDSAT/LT05/C02/T1_L2').map(prepScene(TM, true))
  .merge(scenes('LANDSAT/LE07/C02/T1_L2').filterDate('1999-01-01', '2014-01-01')
    .map(prepScene(TM, true)))
  .merge(scenes('LANDSAT/LC08/C02/T1_L2').map(prepScene(OLI, false)))
  .merge(scenes('LANDSAT/LC09/C02/T1_L2').map(prepScene(OLI, false)));

// Where to map: the whole study area, or Global Mangrove Watch mangrove only.
var GMW = ee.ImageCollection('projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020')
  .filterBounds(REGION).mosaic().select(0).gt(0);
var WHERE = (MASK_SOURCE === 'GMW') ? GMW.selfMask() : ee.Image(1);
if (MASK_SOURCE !== 'GMW' && MASK_SOURCE !== 'NONE') { throw new Error("MASK_SOURCE must be 'NONE' or 'GMW'."); }

var EMPTY = ee.Image.constant(0).rename('v').toFloat().selfMask();

function windowOf(yr) {
  var start = ee.Date(yr + '-' + DAY_START);
  return LS.filterDate(start, ee.Date(yr + '-' + DAY_END).advance(1, 'day'));
}
// median of the scenes in the window of year yr (empty if there are none)
function composite(yr) {
  var col = windowOf(yr);
  return ee.Image(ee.Algorithms.If(col.size().gt(0), col.median(), EMPTY))
    .rename('v').updateMask(WHERE).set('year', yr);
}


// ========================== Z-SCORE ================================

var STORM_IMG = composite(STORM_YEAR);
var NORMAL = ee.ImageCollection.fromImages(NORMAL_YEARS.map(composite));
var SD = NORMAL.reduce(ee.Reducer.sampleStdDev());
var Z = STORM_IMG.subtract(NORMAL.mean()).divide(SD)
  .updateMask(NORMAL.count().gte(MIN_NORMAL_YEARS).and(SD.gt(0))).rename('z').clip(AOI);

// Whole-area Z: the area mean NDVI of the storm window against the same for the normal years.
function areaMean(img) {
  return ee.Feature(null, {v: img.reduceRegion({reducer: ee.Reducer.mean(), geometry: AOI,
    scale: 30, maxPixels: 1e10, tileScale: 4}).get('v')});
}
var AREA_NORMAL = ee.FeatureCollection(NORMAL_YEARS.map(function (yr) { return areaMean(composite(yr)); }))
  .filter(ee.Filter.notNull(['v']));
var AREA_STORM = ee.Number(areaMean(STORM_IMG).get('v'));
var AREA_Z = AREA_STORM.subtract(ee.Number(AREA_NORMAL.aggregate_mean('v')))
  .divide(ee.Number(AREA_NORMAL.aggregate_sample_sd('v')));
var MEAN_PIXEL_Z = Z.reduceRegion({reducer: ee.Reducer.mean(), geometry: AOI, scale: 30,
  maxPixels: 1e10, tileScale: 4}).get('z');


// ========================== CHECKS =================================

var DATES = windowOf(STORM_YEAR).aggregate_array('system:time_start').map(function (t) {
  return ee.Date(t).format('YYYY-MM-dd');
}).distinct();
DATES.evaluate(function (d) {
  if (!d) { return; }
  print('CHECK 1: image dates in the storm window ' + ACUTE_START + ' to ' + ACUTE_END, d.length, d);
  if (d.length < MIN_IMAGES) {
    print('WARNING: fewer than ' + MIN_IMAGES + ' image dates in the window. The map is unreliable or empty: ' +
          'make the window longer (ACUTE_END) or use the lasting maps.');
  }
});
print('CHECK 2: normal years used (' + WIN.id + ', storm years left out)', NORMAL_YEARS);
print('CHECK 3: years with at least one image in the window (should be most of CHECK 2)',
  ee.List(NORMAL_YEARS.map(function (yr) { return windowOf(yr).size().gt(0); })).reduce(ee.Reducer.sum()));
ee.Dictionary({whole_area_z: AREA_Z, mean_pixel_z: MEAN_PIXEL_Z}).evaluate(function (r) {
  if (!r) { return; }
  print('WHOLE AREA TEXT (' + STORM_NAME + ', ' + INDEX + ', window ' + ACUTE_START + ' to ' + ACUTE_END +
    '): Z of the area mean = ' + Number(r.whole_area_z).toFixed(2) +
    '; mean of the pixel Z-scores = ' + Number(r.mean_pixel_z).toFixed(2));
});


// ========================== MAP ====================================

var PALETTE = ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7', 'd1e5f0', '67a9cf', '2166ac'];

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);
var SHOWN = Z.visualize({min: -3, max: 3, palette: PALETTE}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Acute NDVI change: ' + STORM_NAME);

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
legend.add(ui.Label('Acute NDVI change (Z-score): ' + STORM_NAME, {fontWeight: 'bold', fontSize: '12px'}));
legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '260x14', format: 'png', min: 0, max: 1, palette: PALETTE},
  style: {margin: '4px 0 0 0'}}));
legend.add(ui.Panel([
  ui.Label('-3 far below normal', {fontSize: '11px', margin: '0 40px 0 0'}),
  ui.Label('0', {fontSize: '11px', margin: '0 40px 0 0'}),
  ui.Label('+3 far above', {fontSize: '11px', margin: '0'})], ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('Window ' + ACUTE_START + ' to ' + ACUTE_END + ' against the same days in other years (' + WIN.id + '), storm years left out. Few images: single pixels can be noisy.', {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG acute NDVI ' + STORM_NAME + '', SHOWN.getThumbURL(
    {region: REGION, dimensions: WEB_PNG_SIZE, format: 'png', crs: 'EPSG:3857'}));
  REGION.coordinates().evaluate(function (c) {
    var lons = c[0].map(function (p) { return p[0]; });
    var lats = c[0].map(function (p) { return p[1]; });
    print('BOUNDS TEXT (west, south, east, north): ' +
      [Math.min.apply(null, lons), Math.min.apply(null, lats),
       Math.max.apply(null, lons), Math.max.apply(null, lats)].join(', '));
  });
}

if (RUN_EXPORT) {
  Export.image.toDrive({image: Z.toFloat(), description: 'acute_ndvi_z_' + STORM,
    folder: DRIVE_FOLDER, fileNamePrefix: 'acute_ndvi_z_' + STORM, region: AOI,
    scale: 30, maxPixels: 1e10});
  print('Export task created: open the Tasks tab and click RUN.');
}
