/**********************************************************************
 * STORM DAMAGE: LASTING NDVI CHANGE  ·  STEP 3: LASTING NDVI MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 2 and 2b. Shows, as a continuous map, how
 * far the NDVI of the first dry season after the storm (AFTER_YEAR,
 * January-May) lies below or above the normal of the same sensor
 * period, storm years left out, over the mangrove that was there before
 * the storm:
 *   Z = (NDVI after the storm - mean of the normal years)
 *       / standard deviation of the normal years, per pixel
 *
 * Colour scale: -3 (red, far below normal) to +3 (blue, far above).
 * It is the same Z-score as in the damage classes package, without the
 * classes.
 *
 * Landsat 5/7 and Landsat 8/9 are different sensors, so the normal is
 * only taken from the sensor period of AFTER_YEAR (WINDOWS).
 *
 * OUTPUT
 *   - map + gradient legend
 *   - Console: the median Z over the mangrove before the storm
 *   - WEB_LINKS = true: PNG link of the map
 *
 * Nothing to export first: just Run.
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

// ---- THE STORM: choose a preset, or 'custom' and fill in CUSTOM ------------
// Used here: STORM_NAME, BEFORE_YEAR, AFTER_YEAR, STORM_YEARS. (STORM_DATE, ACUTE_START and ACUTE_END are used by other maps.)
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

var PERIODS = [   // same as step 1
  {id: 'P1', years: [1993, 1997]},
  {id: 'P2', years: [1998, 2002]},
  {id: 'P3', years: [2004, 2008]},
  {id: 'P4', years: [2009, 2013]},
  {id: 'P5', years: [2014, 2018]},
  {id: 'P6', years: [2019, 2023]},
  {id: 'P7', years: [2024, 2025]}
];

var WINDOWS = [                  // one sensor family per window; the normal never crosses them
  {id: '1993-2012', from: 1993, to: 2012},   // Landsat 5/7
  {id: '2014-2025', from: 2014, to: 2025}    // Landsat 8/9
];

var MIN_NORMAL_YEARS = 5;    // a pixel needs at least this many normal years

var RUN_EXPORT   = false;    // true: GeoTIFF of the Z-score in Google Drive
var WEB_LINKS    = false;    // print a PNG link of the map
var WEB_PNG_SIZE = 640;      // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_disturbance';


// ========================== DATA ===================================

var YEARLY = ee.Image(MY_ASSETS + NAME + '_yearly_ndvi');   // step 2b
var CH     = ee.Image(MY_ASSETS + NAME + '_mangrove');      // step 2
var PROJ   = CH.select('change').projection();
var PIX_HA = ee.Image.pixelArea().divide(1e4);

// ========================== MANGROVE BEFORE THE STORM ==============

// BEFORE period = the last period that ends in or before BEFORE_YEAR (its dry seasons are all before the storm).
// If there is none (Opal: 1993-1997 contains 1995), the period that contains BEFORE_YEAR is used.
var BEFORE_I = -1;
PERIODS.forEach(function (p, i) { if (p.years[1] <= BEFORE_YEAR) { BEFORE_I = i; } });
var BEFORE_NOTE = '';
if (BEFORE_I < 0) {
  PERIODS.forEach(function (p, i) { if (p.years[0] <= BEFORE_YEAR && BEFORE_YEAR <= p.years[1]) { BEFORE_I = i; } });
  BEFORE_NOTE = 'No period is fully before ' + BEFORE_YEAR + ': ' + PERIODS[BEFORE_I].id + ' contains the storm year, ' +
    'so stands killed by the storm may be missing from the mask. Read little impact with care.';
}
if (BEFORE_I < 0 || BEFORE_I >= PERIODS.length - 1) {
  throw new Error('BEFORE_YEAR ' + BEFORE_YEAR + ' has no period before it and a later one in PERIODS.');
}
var BEFORE_ID = PERIODS[BEFORE_I].id;
var BEFORE = CH.select('mangrove_' + BEFORE_ID).eq(1).unmask(0).clip(AOI).rename('before');

// ========================== Z-SCORE OF THE YEAR AFTER THE STORM ====

var WIN = null;
WINDOWS.forEach(function (w) { if (AFTER_YEAR >= w.from && AFTER_YEAR <= w.to) { WIN = w; } });
if (WIN === null) {
  throw new Error('AFTER_YEAR ' + AFTER_YEAR + ' is in none of the WINDOWS (2013 is between the two sensor windows).');
}
var NORMAL_YEARS = [];
for (var y = WIN.from; y <= WIN.to; y++) {
  if (STORM_YEARS.indexOf(y) < 0) { NORMAL_YEARS.push(y); }
}
var NORMAL = ee.ImageCollection.fromImages(NORMAL_YEARS.map(function (yy) {
  return YEARLY.select('NDVI_' + yy).rename('v');
}));
var N_NORMAL = NORMAL.count();
var SD = NORMAL.reduce(ee.Reducer.sampleStdDev());
// Z = (NDVI after the storm - mean of the normal years) / standard deviation of the normal years, per pixel
var Z = YEARLY.select('NDVI_' + AFTER_YEAR).subtract(NORMAL.mean()).divide(SD)
  .updateMask(N_NORMAL.gte(MIN_NORMAL_YEARS).and(SD.gt(0))).rename('z');

var ZM = Z.updateMask(BEFORE).clip(AOI);


// ========================== CHECKS =================================

print('CHECK 1: median Z-score over the mangrove before the storm (0 = normal, negative = below normal)',
  ZM.reduceRegion({reducer: ee.Reducer.median(), geometry: AOI, crs: PROJ, scale: 30,
    maxPixels: 1e10, tileScale: 4}).get('z'));
print('CHECK 2: mangrove before the storm (ha), period ' + BEFORE_ID,
  BEFORE.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4}).get('before'));
print('CHECK 3: normal years used (' + WIN.id + ', storm years left out)', NORMAL_YEARS);
if (BEFORE_NOTE) { print('NOTE: ' + BEFORE_NOTE); }


// ========================== MAP ====================================

var PALETTE = ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7', 'd1e5f0', '67a9cf', '2166ac'];

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);
var SHOWN = ZM.visualize({min: -3, max: 3, palette: PALETTE}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Lasting NDVI change: ' + STORM_NAME);

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
legend.add(ui.Label('Lasting NDVI change (Z-score): ' + STORM_NAME, {fontWeight: 'bold', fontSize: '12px'}));
legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '260x14', format: 'png', min: 0, max: 1, palette: PALETTE},
  style: {margin: '4px 0 0 0'}}));
legend.add(ui.Panel([
  ui.Label('-3 far below normal', {fontSize: '11px', margin: '0 40px 0 0'}),
  ui.Label('0', {fontSize: '11px', margin: '0 40px 0 0'}),
  ui.Label('+3 far above', {fontSize: '11px', margin: '0'})], ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('NDVI of ' + AFTER_YEAR + ' (January-May) against the normal of ' + WIN.id + ', storm years left out. Mangrove before the storm.', {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG lasting NDVI change ' + STORM_NAME + '', SHOWN.getThumbURL(
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
  var P2 = PROJ.getInfo();
  Export.image.toDrive({image: ZM.toFloat(), description: NAME + '_lasting_z_' + STORM,
    folder: DRIVE_FOLDER, fileNamePrefix: NAME + '_lasting_z_' + STORM, region: AOI,
    crs: P2.crs, crsTransform: P2.transform, maxPixels: 1e10});
  print('Export task created: open the Tasks tab and click RUN.');
}
