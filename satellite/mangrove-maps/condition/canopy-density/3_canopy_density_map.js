/**********************************************************************
 * MANGROVE CONDITION: CANOPY DENSITY  ·  STEP 3: CANOPY DENSITY MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Median NDVI of Sentinel-2 at 10 m over the dry seasons YEARS, for
 * pixels that were mangrove in BOTH of the periods in MASK_BANDS
 * (default: 2019-2023 and 2024-2025). Reads the asset of step 2.
 *
 * WHAT IT SHOWS: how dense the mangrove canopy is, in teal (dense) to
 * brown (sparse). This is canopy STRUCTURE, not health: dwarf and basin
 * mangrove are naturally low, and a wet background lowers NDVI too.
 *
 * Why Sentinel-2: 10 m instead of 30 m, so more detail, but the record
 * starts in 2017, so it says nothing about trends.
 *
 * OUTPUT
 *   - map with the teal-brown scale (NDVI 0.3 to 0.9)
 *   - Console: 10th percentile, median and 90th percentile of the NDVI
 *     of the mapped mangrove
 *   - WEB_LINKS = true: PNG link of the map
 *   - RUN_EXPORT = true: GeoTIFF of the NDVI (10 m) and a CSV with the
 *     percentiles in Google Drive. Use this if the Console statistics
 *     time out for a large area.
 *********************************************************************/


// ========================== SETTINGS ===============================

var MY_ASSETS = 'projects/YOUR-PROJECT/assets/';   // same as step 1
var NAME      = 'sisal';                           // same as step 1

if (MY_ASSETS.indexOf('YOUR-PROJECT') >= 0) {
  throw new Error('Set MY_ASSETS at the top of this script to your own asset folder, ' +
                  'e.g. projects/your-project/assets/ (see the Assets tab).');
}

var SISAL = ee.Geometry.Polygon(
  [[[-90.05041551503234, 21.162924684073946], [-90.09495298591237, 21.158981726153797],
    [-90.12053053107839, 21.141531063671124], [-90.12018720832448, 21.078595563619460],
    [-90.05066435065847, 21.078497576643580], [-89.93977110114675, 21.113251544607984],
    [-89.93925611701589, 21.213143836734320], [-90.00933715735849, 21.174100452704874],
    [-90.02163012765293, 21.17150261406858],  [-90.01991318489279, 21.164856004032620],
    [-90.03102825905050, 21.162574817466144], [-90.03858135963644, 21.161774392793973],
    [-90.04819439674581, 21.159733290287747], [-90.05016850258077, 21.165816493119890]]]);
var AOI = (typeof geometry !== 'undefined') ? ee.Geometry(geometry) : SISAL;

var YEARS  = [2019, 2025];   // first and last year (Sentinel-2 SR Harmonized starts in 2017)
var SEASON = [1, 5];         // first and last month of the dry season (driest months of your region)

// Mangrove must be present in all these periods of step 2 (P6 = 2019-2023, P7 = 2024-2025)
var MASK_BANDS = ['mangrove_P6', 'mangrove_P7'];

var MAX_CLOUD_PCT = 60;      // skip scenes with more cloud than this (%)
var NDVI_RANGE    = [0.3, 0.9];

var RUN_EXPORT   = false;    // true: GeoTIFF + CSV in Google Drive
var WEB_LINKS    = false;    // print a PNG link of the map
var WEB_PNG_SIZE = 1280;     // ~ width of the study area / 10 m
var DRIVE_FOLDER = 'mangrove_condition';


// ========================== MANGROVE MASK ==========================

var CH   = ee.Image(MY_ASSETS + NAME + '_mangrove');      // step 2
var PROJ = CH.select('change').projection();
var MANGROVE = ee.Image.cat(MASK_BANDS.map(function (b) { return CH.select(b); }))
  .reduce(ee.Reducer.min()).eq(1).selfMask().clip(AOI);   // mangrove in every period of MASK_BANDS


// ========================== SENTINEL-2 NDVI ========================

// Cloud mask with the scene classification (SCL): drop no data (0), saturated (1),
// cloud shadow (3), cloud medium and high probability (8, 9), cirrus (10) and snow (11).
function maskClouds(img) {
  var scl = img.select('SCL');
  var clear = scl.neq(0).and(scl.neq(1)).and(scl.neq(3)).and(scl.neq(8))
    .and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
  return img.normalizedDifference(['B8', 'B4']).rename('NDVI').updateMask(clear)
    .copyProperties(img, ['system:time_start']);
}

var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(AOI)
  .filterDate(YEARS[0] + '-01-01', (YEARS[1] + 1) + '-01-01')
  .filter(ee.Filter.calendarRange(SEASON[0], SEASON[1], 'month'))
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', MAX_CLOUD_PCT))
  .map(maskClouds);

var NDVI = S2.median().rename('NDVI').updateMask(MANGROVE).clip(AOI);


// ========================== STATISTICS =============================

var STATS = NDVI.reduceRegion({
  reducer: ee.Reducer.percentile([10, 50, 90]),
  geometry: AOI, crs: PROJ, scale: 10, maxPixels: 1e10, tileScale: 16});

STATS.evaluate(function (s) {
  if (!s) { return; }
  print('STATS TEXT (NDVI of mangrove ' + YEARS[0] + '-' + YEARS[1] + '): 10th percentile ' +
    Number(s.NDVI_p10).toFixed(2) + ', median ' + Number(s.NDVI_p50).toFixed(2) +
    ', 90th percentile ' + Number(s.NDVI_p90).toFixed(2));
});


// ========================== CHECKS =================================

print('CHECK 1: study area (ha)', AOI.area(1).divide(1e4));
print('CHECK 2: Sentinel-2 scenes used (0 = no data, change YEARS or MAX_CLOUD_PCT)', S2.size());
print('CHECK 3: mangrove in ' + MASK_BANDS.join(' and ') + ' (ha)',
  MANGROVE.multiply(ee.Image.pixelArea()).divide(1e4).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: AOI, crs: PROJ, scale: 30,
    maxPixels: 1e10, tileScale: 4}).get('min'));
print('CHECK 4: 10th percentile, median, 90th percentile of the NDVI', STATS);


// ========================== MAP ====================================

var PALETTE = ['8c510a', 'd8b365', 'f6e8c3', 'c7eae5', '5ab4ac', '01665e'];

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);
var SHOWN = NDVI.visualize({min: NDVI_RANGE[0], max: NDVI_RANGE[1], palette: PALETTE}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Canopy density, NDVI ' + YEARS[0] + '-' + YEARS[1]);

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
legend.add(ui.Label('Mangrove canopy density ' + YEARS[0] + '-' + YEARS[1],
  {fontWeight: 'bold', fontSize: '12px'}));
legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '260x14', format: 'png', min: 0, max: 1, palette: PALETTE},
  style: {margin: '4px 0 0 0'}}));
legend.add(ui.Panel([
  ui.Label(String(NDVI_RANGE[0]) + ' sparse or dwarf', {fontSize: '11px', margin: '0 60px 0 0'}),
  ui.Label(String(NDVI_RANGE[1]) + ' dense', {fontSize: '11px', margin: '0'})],
  ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('Median Sentinel-2 NDVI (10 m). Canopy structure, not health: dwarf and ' +
  'basin mangrove are naturally low.', {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG canopy density', SHOWN.getThumbURL(
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
  Export.image.toDrive({image: NDVI.toFloat(), description: NAME + '_canopy_density',
    folder: DRIVE_FOLDER, fileNamePrefix: NAME + '_canopy_density', region: AOI,
    scale: 10, maxPixels: 1e10});
  Export.table.toDrive({collection: ee.FeatureCollection([ee.Feature(null, STATS)]),
    description: NAME + '_canopy_density_stats', folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export tasks created: open the Tasks tab and click RUN.');
}
