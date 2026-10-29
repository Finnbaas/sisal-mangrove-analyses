/**********************************************************************
 * MANGROVE dNDVI  ·  STEP 3 OF 3: RELATIVE NDVI CHANGE MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Shows how much the dry-season NDVI of every mangrove pixel changed
 * between two periods (FROM and TO), compared with STABLE mangrove:
 *   dNDVI    = median NDVI in TO - median NDVI in FROM
 *   relative = dNDVI - median dNDVI of stable mangrove
 *   clear drop / clear rise = the relative change is beyond the 5th /
 *              95th percentile of stable mangrove
 * Subtracting the median of stable mangrove removes sensor and climate
 * effects that hit the whole area. White = changed like stable mangrove.
 *
 * MASK_SOURCE (which pixels are mangrove, and which are stable)
 *   'GMW'     QUICK. Mangrove = Global Mangrove Watch 2020 (public).
 *             Stable = GMW mangrove further than GMW_CORE_M from its
 *             edge. Needs only step 1.
 *   'POINTS'  ACCURATE (our Sisal method). Mangrove = mangrove in FROM
 *             or TO; stable = mangrove in every period. Needs steps
 *             2a (or your own points) and 2 first.
 *
 * Output: map with a diverging legend; thresholds (median, drop, rise)
 * and the share of mangrove per class in the Console; CSV with
 * RUN_EXPORT; PNG links with WEB_LINKS.
 *
 * Nothing to export first: just Run. Areas are MAPPED areas, not
 * error-adjusted.
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
var BUFFER_M = 500;

var FROM = 'P5';                 // period before (Sisal: 2014-2018)
var TO   = 'P7';                 // period after (Sisal: 2024-2025)

var MASK_SOURCE = 'GMW';         // 'GMW' (quick) or 'POINTS' (accurate)
var GMW_CATALOG = 'projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020';
var GMW_CORE_M  = 60;            // GMW route: stable = further than 60 m from the GMW edge

var PCT        = [5, 95];        // percentiles of stable mangrove for "clear drop / rise" (whole numbers)
var LEGEND_MIN = -0.3;           // colour range of the map (relative dNDVI)
var LEGEND_MAX = 0.3;
var PALETTE    = ['b2182b', 'ef8a62', 'fddbc7', 'f7f7f7', 'd1e5f0', '67a9cf', '2166ac'];

var RUN_EXPORT   = false;        // true: CSV table in Google Drive
var WEB_LINKS    = false;        // true: print PNG links of the map
var WEB_PNG_SIZE = 640;          // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_dndvi';


// ========================== DATA ===================================

var REGION = AOI.buffer(BUFFER_M);
var PERIOD_IMG = ee.Image(MY_ASSETS + NAME + '_periods');
var PROJ = PERIOD_IMG.select(0).projection();
var PIX_HA = ee.Image.pixelArea().divide(1e4);

if (MASK_SOURCE !== 'POINTS' && MASK_SOURCE !== 'GMW') {
  throw new Error("MASK_SOURCE must be 'GMW' or 'POINTS'.");
}

// Check that FROM and TO exist in the step 1 asset, with a clear message
PERIOD_IMG.bandNames().evaluate(function (bands) {
  if (!bands) { return; }
  [FROM, TO].forEach(function (p) {
    if (bands.indexOf(p + '_NDVI') < 0) {
      print('ERROR: period ' + p + ' is not in ' + NAME + '_periods. Periods in the asset: ' +
        bands.filter(function (b) { return b.indexOf('_NDVI') > 0 && b.indexOf('_NDVI_') < 0; })
          .map(function (b) { return b.split('_')[0]; }).join(', '));
    }
  });
});

var DELTA = PERIOD_IMG.select(TO + '_NDVI').subtract(PERIOD_IMG.select(FROM + '_NDVI'))
  .rename('v');

var MANGROVE, STABLE;
if (MASK_SOURCE === 'POINTS') {
  var CH = ee.Image(MY_ASSETS + NAME + '_mangrove');          // made by step 2
  MANGROVE = CH.select('mangrove_' + FROM).or(CH.select('mangrove_' + TO)).eq(1);
  STABLE   = CH.select('change').eq(1);
} else {
  var GMW = ee.ImageCollection(GMW_CATALOG).filterBounds(REGION).mosaic()
    .select(0).unmask(0).gt(0).clip(REGION);
  MANGROVE = GMW;
  STABLE = GMW.reproject(PROJ).reduceNeighborhood({
    reducer: ee.Reducer.min(),
    kernel: ee.Kernel.circle({radius: GMW_CORE_M, units: 'meters'})}).eq(1);
}


// ========================== THRESHOLDS AND CLASSES =================

// Median and percentiles of the NDVI change over stable mangrove
var STATS = DELTA.updateMask(STABLE).reduceRegion({
  reducer: ee.Reducer.percentile([PCT[0], 50, PCT[1]]),
  geometry: AOI, crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
var MED  = ee.Number(STATS.get('v_p50'));
var DROP = ee.Number(STATS.get('v_p' + PCT[0])).subtract(MED);   // negative: clear drop below this
var RISE = ee.Number(STATS.get('v_p' + PCT[1])).subtract(MED);   // positive: clear rise above this

var REL = DELTA.subtract(MED).updateMask(MANGROVE).clip(AOI).rename('dndvi');

// 1 clear drop, 2 within the range of stable mangrove, 3 clear rise
var CLASS = ee.Image(2)
  .where(REL.lt(ee.Image.constant(DROP)), 1)
  .where(REL.gt(ee.Image.constant(RISE)), 3)
  .updateMask(REL.mask()).rename('class');
var CLASS_NAMES = ['Clear drop', 'Within the range of stable mangrove', 'Clear rise'];

function sumHa(img) {
  return img.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
}
var AREAS = sumHa(ee.Image.cat([CLASS.eq(1).rename('c1'), CLASS.eq(2).rename('c2'),
                                CLASS.eq(3).rename('c3')]).unmask(0));
var TOTAL = ee.Number(AREAS.get('c1')).add(AREAS.get('c2')).add(AREAS.get('c3'));

// One row per class; the thresholds are repeated on each row so the CSV is self-contained
var CLASS_FC = ee.FeatureCollection(CLASS_NAMES.map(function (n, i) {
  var ha = ee.Number(AREAS.get('c' + (i + 1)));
  return ee.Feature(null, {class: i + 1, name: n, area_ha: ha,
    share_percent: ha.divide(TOTAL).multiply(100),
    median_stable: MED, drop_below: DROP, rise_above: RISE,
    from_period: FROM, to_period: TO, mask_source: MASK_SOURCE});
}));


// ========================== CHECKS =================================

print('CHECK 1: periods compared', FROM + ' -> ' + TO + '   (mask: ' + MASK_SOURCE + ')');
print('CHECK 2: stable mangrove used as reference (ha), and all mangrove shown (ha)',
  ee.Dictionary({stable: sumHa(STABLE.rename('s')).get('s'),
                 mangrove: sumHa(MANGROVE.rename('m')).get('m')}));
ee.Dictionary({median: MED, drop: DROP, rise: RISE}).evaluate(function (t) {
  if (!t) { return; }
  print('CHECK 3: THRESHOLDS TEXT (relative dNDVI): median of stable mangrove = ' + t.median.toFixed(3) +
        '; clear drop below ' + t.drop.toFixed(3) + '; clear rise above +' + t.rise.toFixed(3));
});
CLASS_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('CHECK 4: SHARES TEXT (share of mangrove per class, mapped ha, not error-adjusted): ' +
    fc.features.map(function (f) {
      var q = f.properties;
      return q.name + ' = ' + q.share_percent.toFixed(1) + '% (' + q.area_ha.toFixed(1) + ' ha)';
    }).join('; '));
});
print('NOTE: if the thresholds look far from what you expect, check the mask on the map ' +
      '(layer "Stable mangrove (reference)").');


// ========================== MAP ====================================

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);

var VIS = {min: LEGEND_MIN, max: LEGEND_MAX, palette: PALETTE};
var SHOWN = REL.visualize(VIS);
Map.addLayer(SHOWN, {}, 'Relative dNDVI ' + FROM + ' -> ' + TO);
Map.addLayer(CLASS.visualize({min: 1, max: 3, palette: ['b2182b', 'ffffff', '2166ac']}).clip(AOI), {},
  'Clear drop / clear rise only', false);
Map.addLayer(STABLE.selfMask().clip(AOI), {palette: ['1b7837']}, 'Stable mangrove (reference)', false);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');

// Diverging legend: a colour bar with the low, middle and high labels
var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
var title = ui.Label('Relative NDVI change ' + FROM + ' -> ' + TO,
  {fontWeight: 'bold', fontSize: '12px'});
legend.add(title);
PERIOD_IMG.get('periods').evaluate(function (txt) {     // e.g. "P1:1993-1997,P2:..."
  if (!txt) { return; }
  var years = {};
  txt.split(',').forEach(function (s) { years[s.split(':')[0]] = s.split(':')[1]; });
  title.setValue('Relative NDVI change ' + FROM + ' (' + years[FROM] + ') -> ' + TO + ' (' + years[TO] + ')');
});
var bar = ee.Image.pixelLonLat().select('longitude')
  .multiply((LEGEND_MAX - LEGEND_MIN) / 100).add(LEGEND_MIN).visualize(VIS);
legend.add(ui.Thumbnail({image: bar, params: {bbox: '0,0,100,10', dimensions: '280x16'},
  style: {margin: '4px 0'}}));
legend.add(ui.Panel([
  ui.Label('dropped more', {fontSize: '10px', margin: '0', width: '95px'}),
  ui.Label('same as stable mangrove', {fontSize: '10px', margin: '0', width: '100px', textAlign: 'center'}),
  ui.Label('rose more', {fontSize: '10px', margin: '0', width: '75px', textAlign: 'right'})],
  ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('Scale ' + LEGEND_MIN + ' to +' + LEGEND_MAX + '. White = changed like stable mangrove.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
var thresholdLabel = ui.Label('', {fontSize: '10px', color: '555555', margin: '2px 0 0 0'});
legend.add(thresholdLabel);
ee.Dictionary({drop: DROP, rise: RISE}).evaluate(function (t) {
  if (!t) { return; }
  thresholdLabel.setValue('Clear drop below ' + t.drop.toFixed(3) + ', clear rise above +' +
    t.rise.toFixed(3) + ' (beyond ' + PCT[1] + '% of stable mangrove).');
});
Map.add(legend);


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var BOX = AOI.bounds();
  print('MAP PNG (relative dNDVI)', SHOWN.getThumbURL(
    {region: BOX, dimensions: WEB_PNG_SIZE, format: 'png', crs: 'EPSG:3857'}));
  BOX.coordinates().evaluate(function (c) {
    var lons = c[0].map(function (p) { return p[0]; });
    var lats = c[0].map(function (p) { return p[1]; });
    print('BOUNDS TEXT (west, south, east, north): ' +
      [Math.min.apply(null, lons), Math.min.apply(null, lats),
       Math.max.apply(null, lons), Math.max.apply(null, lats)].join(', '));
  });
}

if (RUN_EXPORT) {
  Export.table.toDrive({collection: CLASS_FC, description: NAME + '_dndvi_' + FROM + '_' + TO,
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export task created: open the Tasks tab and click RUN.');
}
