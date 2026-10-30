/**********************************************************************
 * STORM DAMAGE  ·  STEP 1: PERIOD IMAGES
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Builds one cloud-free Landsat image per period (dry season only) for
 * your study area and saves it as ONE asset in your own project.
 * Step 2 reads this asset (it is only used to decide where mangrove is).
 *
 * WHAT TO SET (SETTINGS block below)
 *   MY_ASSETS  your asset folder, e.g. 'projects/my-project/assets/'
 *   NAME       short name for your area, used in all asset names
 *   study area draw a polygon and name the import 'geometry';
 *              without it the Sisal study area is used
 *   SEASON     driest months of your region (Yucatan: January-May)
 *   PERIODS    the periods you want to compare
 *
 * RUN
 *   1. Run with RUN_EXPORT = false and read the CHECKS in the Console.
 *   2. Set RUN_EXPORT = true, Run, open the Tasks tab, click RUN.
 *      The export takes 10-40 minutes depending on the area.
 *
 * RECIPE (same as our Sisal analysis)
 *   Landsat 5, 7 (until 2013), 8 and 9, Collection 2 Level 2.
 *   Cloud, shadow and saturation mask. TM/ETM+ harmonised to OLI
 *   (Roy et al. 2016). One mosaic per acquisition date. Yearly median
 *   of the dry season; pixels need >= MIN_OBS clear dates per year.
 *   Per period: median of the yearly images, plus the year-to-year
 *   NDVI variability (NDVI_sd), the wettest year (MNDWI_max) and the
 *   number of valid years (n_years).
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

var PERIODS = [
  {id: 'P1', years: [1993, 1997]},
  {id: 'P2', years: [1998, 2002]},
  {id: 'P3', years: [2004, 2008]},
  {id: 'P4', years: [2009, 2013]},
  {id: 'P5', years: [2014, 2018]},
  {id: 'P6', years: [2019, 2023]},
  {id: 'P7', years: [2024, 2025]}
];

var MIN_OBS    = 3;           // clear dates per pixel per year
var RUN_EXPORT = false;       // true: create the export task


// ========================== LANDSAT ================================

var REGION = AOI.buffer(BUFFER_M);

var ROY = {slope: [0.8474, 0.8483, 0.9047, 0.8462, 0.8937, 0.9071],
           itcp:  [0.0003, 0.0088, 0.0061, 0.0412, 0.0254, 0.0172]};
var BN  = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
var TM  = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var OLI = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
var SPEC = BN.concat(['NDVI', 'EVI', 'MVI', 'NDMI', 'MNDWI']);

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
    var idx = ee.Image.cat([
      sr.normalizedDifference(['nir', 'red']).rename('NDVI'),
      sr.expression('2.5 * (n - r) / (n + 6 * r - 7.5 * b + 1)',
        {n: sr.select('nir'), r: sr.select('red'), b: sr.select('blue')}).rename('EVI'),
      sr.expression('(n - g) / (s - g)',
        {n: sr.select('nir'), g: sr.select('green'), s: sr.select('swir1')}).rename('MVI'),
      sr.normalizedDifference(['nir', 'swir1']).rename('NDMI'),
      sr.normalizedDifference(['green', 'swir1']).rename('MNDWI')]).toFloat();
    return ee.Image(sr.addBands(idx).updateMask(clear)
      .copyProperties(img, ['system:time_start']));
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

var EMPTY = ee.Image.constant(SPEC.concat(['n_obs']).map(function () { return 0; }))
  .rename(SPEC.concat(['n_obs'])).toFloat().selfMask();

function yearImage(y) {
  var col = LS.filterDate(y + '-01-01', (y + 1) + '-01-01');
  var daily = dailyMosaic(col);
  var comp = daily.select(SPEC).median()
    .addBands(daily.select('NDVI').count().rename('n_obs')).toFloat();
  return ee.Image(ee.Algorithms.If(col.size().gt(0), comp, EMPTY)).set('year', y);
}

function periodImage(p) {
  var yrs = [];
  for (var y = p.years[0]; y <= p.years[1]; y++) { yrs.push(y); }
  var ycol = ee.ImageCollection(yrs.map(yearImage)).map(function (i) {
    i = ee.Image(i);
    return i.updateMask(i.select('n_obs').gte(MIN_OBS));
  });
  var img = ycol.select(SPEC).median()
    .addBands(ycol.select('NDVI').reduce(ee.Reducer.stdDev()).rename('NDVI_sd'))
    .addBands(ycol.select('MNDWI').max().rename('MNDWI_max'))
    .addBands(ycol.select('NDVI').count().rename('n_years'));
  var names = img.bandNames().map(function (b) { return ee.String(p.id + '_').cat(b); });
  return img.rename(names).toFloat();
}

var PERIOD_IMG = ee.Image.cat(PERIODS.map(periodImage)).clip(REGION)
  .set({name: NAME, season: SEASON.join('-'),
        periods: PERIODS.map(function (p) { return p.id + ':' + p.years.join('-'); }).join(',')});


// ========================== CHECKS =================================

print('CHECK 1: study area (ha)', AOI.area(1).divide(1e4));
print('CHECK 2: Landsat scenes per period (0 = no data, change the period)',
  ee.Dictionary.fromLists(PERIODS.map(function (p) { return p.id; }),
    PERIODS.map(function (p) {
      return LS.filterDate(p.years[0] + '-01-01', (p.years[1] + 1) + '-01-01').size();
    })));
print('CHECK 3: export goes to', MY_ASSETS + NAME + '_periods');
if (MY_ASSETS.indexOf('YOUR-PROJECT') >= 0) {
  print('ERROR: set MY_ASSETS to your own asset folder first.');
}


// ========================== MAP ====================================

var LAST = PERIODS[PERIODS.length - 1].id;
Map.centerObject(AOI, 12);
// Light preview (simple median of the scenes); the export uses the full recipe.
var LP = PERIODS[PERIODS.length - 1];
Map.addLayer(LS.filterDate(LP.years[0] + '-01-01', (LP.years[1] + 1) + '-01-01')
    .select(['swir1', 'nir', 'red']).median().clip(AOI),
  {min: 0, max: 0.4}, LAST + ' preview (false colour: mangrove = dark green)');
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== EXPORT =================================

if (RUN_EXPORT) {
  var GRID = ee.Image(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterBounds(AOI).first())
    .select('SR_B4').projection().getInfo();
  Export.image.toAsset({
    image: PERIOD_IMG, description: NAME + '_periods',
    assetId: MY_ASSETS + NAME + '_periods', region: REGION,
    crs: GRID.crs, crsTransform: GRID.transform, maxPixels: 1e10
  });
  print('Export task created: open the Tasks tab and click RUN.');
}
