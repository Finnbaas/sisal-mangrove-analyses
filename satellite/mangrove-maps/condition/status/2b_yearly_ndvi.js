/**********************************************************************
 * MANGROVE CONDITION  ·  STEP 2b: YEARLY NDVI
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Builds one dry-season NDVI image per YEAR (not per period) for your
 * study area and saves it as ONE asset with one band per year
 * (NDVI_1993, NDVI_1994, ...). Step 3 reads this asset to calculate the
 * trend (and, for the status map, how far a year is from normal).
 * It does not need steps 1, 2a or 2.
 *
 * WHAT TO SET (SETTINGS block below)
 *   MY_ASSETS  your asset folder, e.g. 'projects/my-project/assets/'
 *   NAME       short name for your area, used in all asset names
 *   study area draw a polygon and name the import 'geometry';
 *              without it the Sisal study area is used
 *   SEASON     driest months of your region (Yucatan: January-May)
 *   YEARS      first and last year
 *
 * RUN
 *   1. Run with RUN_EXPORT = false and read the CHECKS in the Console.
 *   2. Set RUN_EXPORT = true, Run, open the Tasks tab, click RUN.
 *      The export takes 20-60 minutes depending on the area.
 *
 * RECIPE (same as step 1 and our Sisal analysis)
 *   Landsat 5, 7 (until 2013), 8 and 9, Collection 2 Level 2.
 *   Cloud, shadow and saturation mask. TM/ETM+ harmonised to OLI
 *   (Roy et al. 2016). One mosaic per acquisition date. Yearly median
 *   NDVI of the dry season; a pixel needs >= MIN_OBS clear dates in a
 *   year, otherwise that year is empty (masked) for that pixel.
 *********************************************************************/


// ========================== SETTINGS ===============================

var MY_ASSETS = 'projects/YOUR-PROJECT/assets/';   // <- change this
var NAME      = 'sisal';                           // <- short name of your area

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
var BUFFER_M = 500;           // extra margin around the study area

var SEASON = [1, 5];          // first and last month of the dry season
var YEARS  = [1993, 2025];    // first and last year (Landsat 5 starts 1984; before 1993 there are few images over Sisal)

var MIN_OBS    = 3;           // clear dates per pixel per year
var RUN_EXPORT = false;       // true: create the export task


// ========================== LANDSAT ================================

var REGION = AOI.buffer(BUFFER_M);

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
    return ee.Image(sr.normalizedDifference(['nir', 'red']).rename('NDVI').toFloat()
      .updateMask(clear).copyProperties(img, ['system:time_start']));
  };
}

var IN_SEASON = ee.Filter.calendarRange(SEASON[0], SEASON[1], 'month');
function scenes(id) {
  return ee.ImageCollection(id).filterBounds(REGION).filter(IN_SEASON);
}
var LS = scenes('LANDSAT/LT05/C02/T1_L2').map(prepScene(TM, true))
  .merge(scenes('LANDSAT/LE07/C02/T1_L2').filterDate('1999-01-01', '2014-01-01')
    .map(prepScene(TM, true)))
  .merge(scenes('LANDSAT/LC08/C02/T1_L2').map(prepScene(OLI, false)))
  .merge(scenes('LANDSAT/LC09/C02/T1_L2').map(prepScene(OLI, false)));

// One mosaic per acquisition date (overlapping scenes count once).
function dailyMosaic(col) {
  var days = col.aggregate_array('system:time_start').map(function (t) {
    return ee.Date(t).format('YYYY-MM-dd');
  }).distinct();
  return ee.ImageCollection(days.map(function (d) {
    d = ee.Date(d);
    return col.filterDate(d, d.advance(1, 'day')).mosaic().set('system:time_start', d.millis());
  }));
}

var EMPTY = ee.Image.constant([0, 0]).rename(['NDVI', 'n_obs']).toFloat().selfMask();

// Yearly NDVI: median of the dry-season dates, empty where < MIN_OBS clear dates.
function yearImage(y) {
  var col = LS.filterDate(y + '-01-01', (y + 1) + '-01-01');
  var daily = dailyMosaic(col);
  var comp = daily.select('NDVI').median()
    .addBands(daily.select('NDVI').count().rename('n_obs')).toFloat();
  var img = ee.Image(ee.Algorithms.If(col.size().gt(0), comp, EMPTY));
  return img.select('NDVI').updateMask(img.select('n_obs').gte(MIN_OBS))
    .rename('NDVI_' + y).toFloat();
}

var YEAR_LIST = [];
for (var y = YEARS[0]; y <= YEARS[1]; y++) { YEAR_LIST.push(y); }

var YEARLY_IMG = ee.Image.cat(YEAR_LIST.map(yearImage)).clip(REGION)
  .set({name: NAME, season: SEASON.join('-'), years: YEARS.join('-'), min_obs: MIN_OBS});


// ========================== CHECKS =================================

print('CHECK 1: study area (ha)', AOI.area(1).divide(1e4));
print('CHECK 2: Landsat scenes per year (0 = no data, that year stays empty)',
  ee.Dictionary.fromLists(YEAR_LIST.map(String), YEAR_LIST.map(function (y) {
    return LS.filterDate(y + '-01-01', (y + 1) + '-01-01').size();
  })));
print('CHECK 3: export goes to', MY_ASSETS + NAME + '_yearly_ndvi');


// ========================== MAP ====================================

Map.centerObject(AOI, 12);
// Light preview (simple median of the scenes of the last year); the export uses the full recipe.
Map.addLayer(LS.filterDate(YEARS[1] + '-01-01', (YEARS[1] + 1) + '-01-01')
    .select('NDVI').median().clip(AOI),
  {min: 0, max: 0.9, palette: ['ffffff', 'ce7e45', 'fcd163', '66a000', '207401', '056201']},
  YEARS[1] + ' NDVI preview');
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== EXPORT =================================

if (RUN_EXPORT) {
  var GRID = ee.Image(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterBounds(AOI).first())
    .select('SR_B4').projection().getInfo();
  Export.image.toAsset({
    image: YEARLY_IMG, description: NAME + '_yearly_ndvi',
    assetId: MY_ASSETS + NAME + '_yearly_ndvi', region: REGION,
    crs: GRID.crs, crsTransform: GRID.transform, maxPixels: 1e10
  });
  print('Export task created: open the Tasks tab and click RUN.');
}
