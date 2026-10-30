/**********************************************************************
 * MANGROVE CONDITION: STATUS  ·  STEP 3: STATUS MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 2 and 2b and classifies every pixel of
 * persistent mangrove (mangrove in every period) for ONE chosen YEAR:
 *
 *   Declining         significant downward NDVI trend in the window that
 *                     contains YEAR (Theil-Sen slope, Mann-Kendall test,
 *                     p < ALPHA)
 *   Recently stressed YEAR's NDVI is far below the pixel's own normal:
 *                     Z-score < Z_STRESS (default -2)
 *   Improving         significant upward NDVI trend in that window
 *   Stable            none of these
 *
 * Where rules overlap, the first one above wins. Patches of fewer than
 * MIN_PATCH pixels in one class count as Stable.
 *
 * Z-score = (NDVI of YEAR - mean of the yearly NDVI in the window) /
 * standard deviation of the yearly NDVI in the window, per pixel.
 *
 * Two windows, because Landsat 5/7 and Landsat 8/9 are different
 * sensors: 1993-2012 and 2014-2025 (years before 2013 use the first,
 * later years the second). A year in no window (2013) cannot be mapped.
 * Set your own windows in WINDOWS (all years must exist in step 2b).
 *
 * OUTPUT
 *   - map + legend for YEAR
 *   - Console: hectares and % of persistent mangrove per class
 *     (also as CSV with RUN_EXPORT = true)
 *   - WEB_LINKS = true: PNG link of the map
 *
 * Nothing to export first: just Run. Change YEAR and Run again for
 * another year. About 2.5% of pixels per direction can come out as
 * significant by chance: read patches, not single pixels.
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

var YEAR = 2025;             // the year to map

var WINDOWS = [              // first and last year of each trend window (one sensor family each)
  {id: '1993-2012', from: 1993, to: 2012},   // Landsat 5/7
  {id: '2014-2025', from: 2014, to: 2025}    // Landsat 8/9
];

var ALPHA     = 0.05;        // significance level of the trend: 0.10, 0.05 or 0.01
var MIN_YEARS = 8;           // a pixel needs at least this many valid years in the window
var Z_STRESS  = -2;          // "recently stressed": Z-score of YEAR below this
var MIN_PATCH = 6;           // patches smaller than this (pixels) count as Stable

var RUN_EXPORT   = false;    // true: CSV with the areas in Google Drive
var WEB_LINKS    = false;    // print a PNG link of the map
var WEB_PNG_SIZE = 640;      // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_condition';


// ========================== DATA ===================================

var YEARLY = ee.Image(MY_ASSETS + NAME + '_yearly_ndvi');   // step 2b
var CH     = ee.Image(MY_ASSETS + NAME + '_mangrove');      // step 2
var PROJ   = CH.select('change').projection();
var PIX_HA = ee.Image.pixelArea().divide(1e4);

// Persistent mangrove = mangrove in every period (change class 1 of step 2).
var PERSIST = CH.select('change').eq(1).unmask(0).clip(AOI);

var Z_TABLE = {'0.1': 1.645, '0.05': 1.96, '0.01': 2.576};
var Z_CRIT  = Z_TABLE[String(ALPHA)];
if (Z_CRIT === undefined) { throw new Error('ALPHA must be 0.1, 0.05 or 0.01.'); }

var WIN = null;
WINDOWS.forEach(function (w) { if (YEAR >= w.from && YEAR <= w.to) { WIN = w; } });
if (WIN === null) {
  throw new Error('YEAR ' + YEAR + ' is in none of the WINDOWS (2013 is between the two sensor ' +
                  'windows). Choose another YEAR or add a window.');
}


// ========================== TREND AND Z-SCORE ======================

var years = [];
for (var y = WIN.from; y <= WIN.to; y++) { years.push(y); }
var v = years.map(function (yy) { return YEARLY.select('NDVI_' + yy).rename('v'); });

// Theil-Sen slope (NDVI per year): median of the slopes between all pairs of years
var col = ee.ImageCollection.fromImages(years.map(function (yy, i) {
  return ee.Image.cat([ee.Image.constant(yy).toFloat().rename('t'), v[i].rename('NDVI')]);
}));
var SLOPE = col.reduce(ee.Reducer.sensSlope()).select('slope');

// Mann-Kendall: S = sum of the signs of all differences between later and earlier years.
// A year that is empty (masked) for a pixel is skipped.
var S = ee.Image(0), n = ee.Image(0);
for (var i = 0; i < v.length; i++) {
  n = n.add(v[i].mask());
  for (var j = i + 1; j < v.length; j++) {
    S = S.add(v[j].subtract(v[i]).signum().unmask(0));
  }
}
var varS = n.multiply(n.subtract(1)).multiply(n.multiply(2).add(5)).divide(18);   // no ties
var Z_MK = S.subtract(S.signum()).divide(varS.sqrt()).where(S.eq(0), 0);
var SIG  = Z_MK.abs().gt(Z_CRIT).and(n.gte(MIN_YEARS));

// Z-score of YEAR against the pixel's own normal (mean and standard deviation of the window)
var NORMAL = ee.ImageCollection.fromImages(v);
var ZSCORE = YEARLY.select('NDVI_' + YEAR)
  .subtract(NORMAL.mean()).divide(NORMAL.reduce(ee.Reducer.sampleStdDev()));
var STRESSED = ZSCORE.lt(Z_STRESS).and(n.gte(MIN_YEARS)).unmask(0);


// ========================== CLASSES ================================

// 1 Improving, 2 Stable, 3 Recently stressed, 4 Declining
var DOWN = SIG.and(SLOPE.lt(0)).unmask(0);
var UP   = SIG.and(SLOPE.gt(0)).unmask(0);
var CLS = ee.Image(2)
  .where(UP, 1)
  .where(STRESSED, 3)
  .where(DOWN, 4)
  .updateMask(PERSIST);

// patches of fewer than MIN_PATCH pixels count as Stable
function small(c) {
  return CLS.eq(c).selfMask().reproject({crs: PROJ})
    .connectedPixelCount(MIN_PATCH, true).lt(MIN_PATCH).unmask(0);
}
CLS = CLS.where(CLS.neq(2).and(small(1).or(small(3)).or(small(4))), 2).toByte().clip(AOI);

var NAMES = ['Improving', 'Stable', 'Recently stressed', 'Declining'];
var PAL   = ['2c7bb6', 'd9d9d9', 'fdae61', 'd7191c'];


// ========================== TABLE ==================================

var AREAS = ee.Image.cat(NAMES.map(function (nm, k) { return CLS.eq(k + 1).rename('c' + (k + 1)); }))
  .addBands(PERSIST.rename('persistent')).unmask(0)
  .multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
var TOTAL = ee.Number(AREAS.get('persistent'));
var AREA_FC = ee.FeatureCollection(NAMES.map(function (nm, k) {
  var ha = ee.Number(AREAS.get('c' + (k + 1)));
  return ee.Feature(null, {year: YEAR, window: WIN.id, class: nm, area_ha: ha,
                           share_pct: ha.divide(TOTAL).multiply(100)});
}));
AREA_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('AREAS TEXT (' + YEAR + ', trend window ' + WIN.id + ', persistent mangrove, ' +
    'mapped ha, not error-adjusted): ' + fc.features.map(function (f) {
    var q = f.properties;
    return q.class + ' = ' + q.area_ha.toFixed(1) + ' ha (' + q.share_pct.toFixed(1) + ' %)';
  }).join('; '));
});


// ========================== CHECKS =================================

print('CHECK 1: persistent mangrove (ha)', TOTAL);
print('CHECK 2: yearly bands in the step 2b asset (should be one per year)', YEARLY.bandNames().size());
print('CHECK 3: trend window used for ' + YEAR, WIN.id);


// ========================== MAP ====================================

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);

var SHOWN = CLS.visualize({min: 1, max: 4, palette: PAL}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Mangrove condition: status ' + YEAR);

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
function swatch(color, text) {
  return ui.Panel([
    ui.Label('', {backgroundColor: '#' + color, padding: '7px', margin: '2px 6px 2px 0',
                  border: '1px solid #999999'}),
    ui.Label(text, {fontSize: '11px', margin: '3px 0'})], ui.Panel.Layout.flow('horizontal'));
}
legend.add(ui.Label('Mangrove condition ' + YEAR + ' (persistent mangrove)',
  {fontWeight: 'bold', fontSize: '12px'}));
NAMES.forEach(function (nm, k) { legend.add(swatch(PAL[k], nm)); });
legend.add(ui.Label('Trend window ' + WIN.id + '. Patches under ' + MIN_PATCH +
  ' pixels count as Stable. Mapped areas, not error-adjusted.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG status ' + YEAR, SHOWN.getThumbURL(
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
  Export.table.toDrive({collection: AREA_FC, description: NAME + '_status_' + YEAR + '_areas',
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export task created: open the Tasks tab and click RUN.');
}
