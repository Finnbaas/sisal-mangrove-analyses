/**********************************************************************
 * MANGROVE CONDITION: TREND  ·  STEP 3: TREND MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 2 and 2b. For every pixel of persistent
 * mangrove (mangrove in every period) and for each time window:
 *   slope = Theil-Sen slope of the yearly dry-season NDVI (NDVI per year)
 *   test  = Mann-Kendall trend test, two-sided, p < ALPHA
 * Only pixels with a significant trend are coloured: red = NDVI went
 * down, blue = NDVI went up. Pixels without a significant trend stay
 * uncoloured (no clear trend, not "no change").
 *
 * Why two windows: Landsat 5/7 (1993-2012) and Landsat 8/9 (2014-2025)
 * are different sensors, so a trend is never calculated across them.
 * Set your own windows in WINDOWS (all years must exist in step 2b).
 *
 * OUTPUT
 *   - map with one layer per window + legend
 *   - Console: share of persistent mangrove with a significant increase
 *     and decrease, per window (also as CSV with RUN_EXPORT = true)
 *   - WEB_LINKS = true: PNG links of the map per window
 *
 * Nothing to export first: just Run. Shares are shares of the MAPPED
 * persistent mangrove, not error-adjusted.
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

var WINDOWS = [   // first and last year of each window (one sensor family per window)
  {id: '1993-2012', from: 1993, to: 2012},   // Landsat 5/7
  {id: '2014-2025', from: 2014, to: 2025}    // Landsat 8/9
];
var SHOW = '2014-2025';      // window visible on the map (the others are in the Layers menu)

var ALPHA     = 0.05;        // significance level: 0.10, 0.05 or 0.01
var MIN_YEARS = 8;           // a pixel needs at least this many valid years in a window
var SLOPE_MAX = 0.01;        // colour scale: +-0.01 NDVI per year (= 0.1 per decade)

var RUN_EXPORT   = false;    // true: CSV with the shares in Google Drive
var WEB_LINKS    = false;    // print PNG links of the map
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


// ========================== TREND PER WINDOW =======================

// Returns the bands slope (NDVI per year), z (Mann-Kendall), n (valid years)
// and sig (1 = significant trend) for the years from..to.
function trendOf(w) {
  var years = [];
  for (var y = w.from; y <= w.to; y++) { years.push(y); }
  var v = years.map(function (y) { return YEARLY.select('NDVI_' + y).rename('v'); });

  // Theil-Sen: median of the slopes between all pairs of years
  var col = ee.ImageCollection.fromImages(years.map(function (y, i) {
    return ee.Image.cat([ee.Image.constant(y).toFloat().rename('t'), v[i].rename('NDVI')]);
  }));
  var slope = col.reduce(ee.Reducer.sensSlope()).select('slope');

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
  var z = S.subtract(S.signum()).divide(varS.sqrt()).where(S.eq(0), 0);
  var sig = z.abs().gt(Z_CRIT).and(n.gte(MIN_YEARS));
  return ee.Image.cat([slope.rename('slope'), z.rename('z'), n.rename('n'), sig.rename('sig')]);
}


// ========================== SHARES =================================

function sumHa(img) {
  return img.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
}

var RESULTS = WINDOWS.map(trendOf);

var SHARE_FC = ee.FeatureCollection(WINDOWS.map(function (w, k) {
  var r = RESULTS[k];
  var a = sumHa(ee.Image.cat([
    PERSIST.rename('persistent'),
    r.select('sig').and(r.select('slope').gt(0)).and(PERSIST).rename('increase'),
    r.select('sig').and(r.select('slope').lt(0)).and(PERSIST).rename('decrease')]).unmask(0));
  var p = ee.Number(a.get('persistent'));
  return ee.Feature(null, {window: w.id, persistent_ha: p,
    increase_ha: a.get('increase'), decrease_ha: a.get('decrease'),
    increase_pct: ee.Number(a.get('increase')).divide(p).multiply(100),
    decrease_pct: ee.Number(a.get('decrease')).divide(p).multiply(100)});
}));

SHARE_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('SHARES TEXT (significant trend, p < ' + ALPHA + ', share of persistent mangrove): ' +
    fc.features.map(function (f) {
      var q = f.properties;
      return q.window + ': increase ' + q.increase_pct.toFixed(1) + ' % (' +
        q.increase_ha.toFixed(1) + ' ha), decrease ' + q.decrease_pct.toFixed(1) + ' % (' +
        q.decrease_ha.toFixed(1) + ' ha), of ' + q.persistent_ha.toFixed(1) + ' ha';
    }).join(' | '));
});


// ========================== CHECKS =================================

print('CHECK 1: yearly bands in the step 2b asset (should be one per year)', YEARLY.bandNames().size());
print('CHECK 2: persistent mangrove (ha)', sumHa(PERSIST.rename('persistent')).get('persistent'));
print('CHECK 3: valid years per pixel, median of persistent mangrove, per window (' +
  WINDOWS.map(function (w) { return w.id; }).join(', ') + ')',
  ee.List(RESULTS.map(function (r) {
    return r.select('n').updateMask(PERSIST).reduceRegion({reducer: ee.Reducer.median(),
      geometry: AOI, crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4}).get('n');
  })));


// ========================== MAP ====================================

var PALETTE = ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7', 'd1e5f0', '67a9cf', '2166ac'];

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);

var LAYERS = WINDOWS.map(function (w, k) {
  var r = RESULTS[k];
  var shown = r.select('slope').updateMask(r.select('sig').and(PERSIST))
    .visualize({min: -SLOPE_MAX, max: SLOPE_MAX, palette: PALETTE}).clip(AOI);
  Map.addLayer(shown, {}, 'Trend ' + w.id, w.id === SHOW);
  return shown;
});

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
legend.add(ui.Label('Mangrove NDVI trend (persistent mangrove)', {fontWeight: 'bold', fontSize: '12px'}));
legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {bbox: [0, 0, 1, 0.1], dimensions: '260x14', format: 'png', min: 0, max: 1, palette: PALETTE},
  style: {margin: '4px 0 0 0'}}));
legend.add(ui.Panel([
  ui.Label('-' + SLOPE_MAX + ' declining', {fontSize: '11px', margin: '0 70px 0 0'}),
  ui.Label('0', {fontSize: '11px', margin: '0 70px 0 0'}),
  ui.Label('+' + SLOPE_MAX + ' increasing', {fontSize: '11px', margin: '0'})],
  ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('NDVI per year (0.01 per year = 0.1 per decade). Only significant trends ' +
  '(Mann-Kendall, p < ' + ALPHA + ') are coloured; uncoloured mangrove has no significant trend.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  WINDOWS.forEach(function (w, k) {
    print('MAP PNG trend ' + w.id, LAYERS[k].getThumbURL(
      {region: REGION, dimensions: WEB_PNG_SIZE, format: 'png', crs: 'EPSG:3857'}));
  });
  REGION.coordinates().evaluate(function (c) {
    var lons = c[0].map(function (p) { return p[0]; });
    var lats = c[0].map(function (p) { return p[1]; });
    print('BOUNDS TEXT (west, south, east, north): ' +
      [Math.min.apply(null, lons), Math.min.apply(null, lats),
       Math.max.apply(null, lons), Math.max.apply(null, lats)].join(', '));
  });
}

if (RUN_EXPORT) {
  Export.table.toDrive({collection: SHARE_FC, description: NAME + '_trend_shares',
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export task created: open the Tasks tab and click RUN.');
}
