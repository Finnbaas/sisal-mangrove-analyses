/**********************************************************************
 * MANGROVE CHANGE PER PERIOD  ·  STEP 3 OF 3: CHANGE PER PERIOD MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 1 and 2 and shows WHEN mangrove was lost or
 * gained. Every change is checked against NDVI, per interval between
 * two periods (P1->P2, P2->P3, ...):
 *   delta     = median NDVI after the change - median NDVI before
 *   reference = the same delta over stable mangrove, same interval
 *   confirmed = the drop (rise) is larger than in 95% of stable
 *               mangrove over the same interval
 * Subtracting the reference removes sensor and climate effects that
 * hit the whole area.
 *
 * Map: confirmed loss in reds, confirmed gain in blues. Each pixel has
 * the colour of the interval in which its new state started; darker =
 * more recent. The LAST interval is PROVISIONAL: a change that shows up
 * only in the last period is not yet confirmed by a later period.
 *
 * Output: map + legend, a table with loss and gain in ha per interval
 * (Console, and CSV with RUN_EXPORT), PNG links with WEB_LINKS.
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

var PERIODS = [   // same as step 1
  {id: 'P1', years: [1993, 1997]},
  {id: 'P2', years: [1998, 2002]},
  {id: 'P3', years: [2004, 2008]},
  {id: 'P4', years: [2009, 2013]},
  {id: 'P5', years: [2014, 2018]},
  {id: 'P6', years: [2019, 2023]},
  {id: 'P7', years: [2024, 2025]}
];

var PCT        = [5, 95];        // reference percentiles for "confirmed" (whole numbers)
var MIN_CONF_PATCH = 6;          // confirmed patches smaller than this -> not confirmed

var RUN_EXPORT   = false;        // true: CSV table in Google Drive
var WEB_LINKS    = false;        // true: print PNG links of the map
var WEB_PNG_SIZE = 640;          // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_change_per_period';

// Colours per interval, light (oldest) to dark (most recent)
var LOSS_PAL = ['fee5d9', 'fcbba1', 'fc9272', 'fb6a4a', 'de2d26', 'a50f15'];
var GAIN_PAL = ['eff3ff', 'c6dbef', '9ecae1', '6baed6', '3182bd', '08519c'];


// ========================== DATA ===================================

var PERIOD_IMG = ee.Image(MY_ASSETS + NAME + '_periods');
var CH   = ee.Image(MY_ASSETS + NAME + '_mangrove');
var PROJ = CH.select('change').projection();
var N    = PERIODS.length;
var LAST = PERIODS[N - 1].id;

var C3  = CH.select('change');          // 1 stable, 2 never, 3 loss, 4 gain, 5 fluctuating, 6 last period only
var CP  = CH.select('change_period');   // number of the period in which the new state started (2..N)
var MPL = CH.select('mangrove_' + LAST);
var PERSIST = C3.eq(1);
var PIX_HA  = ee.Image.pixelArea().divide(1e4);
var PM = PERIODS.map(function (p) { return PERIOD_IMG.select(p.id + '_NDVI').rename('v'); });

// ========================== NDVI CHECK PER INTERVAL ================

var INTERVALS = [], REF_STATS = [];
var IL = ee.Image(0), IG = ee.Image(0);
for (var k = 1; k < N; k++) {
  var delta = ee.ImageCollection.fromImages(PM.slice(k)).median().subtract(PM[k - 1]).rename('v');
  var st = delta.updateMask(PERSIST).reduceRegion({
    reducer: ee.Reducer.percentile([PCT[0], 50, PCT[1]]),
    geometry: AOI, crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
  var med = ee.Number(st.get('v_p50'));
  var rel = delta.subtract(med);
  var sel = CP.eq(k + 1);
  IL = IL.where(sel, rel.lt(ee.Image.constant(ee.Number(st.get('v_p' + PCT[0])).subtract(med))).unmask(0));
  IG = IG.where(sel, rel.gt(ee.Image.constant(ee.Number(st.get('v_p' + PCT[1])).subtract(med))).unmask(0));
  REF_STATS.push(ee.Dictionary({interval: PERIODS[k - 1].id + '->' + PERIODS[k].id,
    median: med, lower: st.get('v_p' + PCT[0]), upper: st.get('v_p' + PCT[1])}));
  INTERVALS.push({code: k + 1, label: PERIODS[k - 1].id + '->' + PERIODS[k].id,
    span: PERIODS[k - 1].years.join('-') + ' -> ' + PERIODS[k].years[0] + '+',
    provisional: (k + 1 === N),
    dy: (PERIODS[k].years[0] + PERIODS[k].years[1]) / 2 -
        (PERIODS[k - 1].years[0] + PERIODS[k - 1].years[1]) / 2});
}


// ========================== CONFIRMED LOSS AND GAIN ================

// Remove confirmed patches smaller than MIN_CONF_PATCH pixels
function dropSmall(m) {
  m = m.unmask(0);
  if (MIN_CONF_PATCH <= 1) { return m; }
  var size = m.selfMask().reproject({crs: PROJ}).connectedPixelCount(MIN_CONF_PATCH, true);
  return m.and(size.gte(MIN_CONF_PATCH).unmask(0));
}

// Intervals 1 to N-2: mangrove maps changed AND NDVI agrees
var LOSS = dropSmall(C3.eq(3).and(IL));
var GAIN = dropSmall(C3.eq(4).and(IG));
// Last interval (provisional): changed only in the last period AND NDVI agrees
var LOSS_PROV = dropSmall(C3.eq(6).and(MPL.eq(0)).and(IL));
var GAIN_PROV = dropSmall(C3.eq(6).and(MPL.eq(1)).and(IG));

var LOSS_ALL = LOSS.or(LOSS_PROV);
var GAIN_ALL = GAIN.or(GAIN_PROV);


// ========================== TABLE ==================================

function sumHa(img) {
  return img.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
}

var PERIOD_FC = ee.FeatureCollection(INTERVALS.map(function (it) {
  var s = sumHa(ee.Image.cat([LOSS_ALL, GAIN_ALL]).and(CP.eq(it.code)).unmask(0)
    .rename(['loss', 'gain']));
  return ee.Feature(null, {interval: it.label, span: it.span,
    status: it.provisional ? 'provisional' : 'confirmed',
    loss_ha: s.get('loss'), gain_ha: s.get('gain'),
    loss_ha_per_yr: ee.Number(s.get('loss')).divide(it.dy),
    gain_ha_per_yr: ee.Number(s.get('gain')).divide(it.dy)});
}));


// ========================== CHECKS =================================

print('CHECK 1: stable mangrove used as reference (ha)', sumHa(PERSIST.rename('stable')));
print('CHECK 2: reference per interval: median NDVI change of stable mangrove and the ' +
      PCT[0] + 'th / ' + PCT[1] + 'th percentiles', ee.List(REF_STATS));
PERIOD_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('CHECK 3: loss and gain per interval (mapped ha, not error-adjusted). The last ' +
        'interval is PROVISIONAL.');
  fc.features.forEach(function (f) {
    var q = f.properties;
    print(q.interval + ' (' + q.span + ', ' + q.status + '): loss ' + (q.loss_ha || 0).toFixed(1) +
      ' ha, gain ' + (q.gain_ha || 0).toFixed(1) + ' ha  |  per year: loss ' +
      (q.loss_ha_per_yr || 0).toFixed(1) + ', gain ' + (q.gain_ha_per_yr || 0).toFixed(1));
  });
});
if (N !== 7) {
  print('NOTE: the colours are made for 7 periods (6 intervals). With ' + N +
        ' periods some colours repeat or are missing.');
}


// ========================== MAP ====================================

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);

// One colour per interval (the palettes have 6 colours)
function pick(pal, i) { return pal[Math.min(i, pal.length - 1)]; }
var LOSS_COL = INTERVALS.map(function (it, i) { return pick(LOSS_PAL, i); });
var GAIN_COL = INTERVALS.map(function (it, i) { return pick(GAIN_PAL, i); });

var LOSS_VIS = CP.updateMask(LOSS_ALL).visualize({min: 2, max: N, palette: LOSS_COL});
var GAIN_VIS = CP.updateMask(GAIN_ALL).visualize({min: 2, max: N, palette: GAIN_COL});
var SHOWN = ee.ImageCollection([LOSS_VIS, GAIN_VIS]).mosaic().clip(AOI);
Map.addLayer(PERSIST.selfMask().clip(AOI), {palette: ['1b7837']}, 'Stable mangrove (context)', true, 0.4);
Map.addLayer(SHOWN, {}, 'Confirmed loss and gain per interval');
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '320px'}});
legend.add(ui.Label('Confirmed mangrove loss (red) and gain (blue) per interval',
  {fontWeight: 'bold', fontSize: '12px'}));
INTERVALS.forEach(function (it, i) {
  legend.add(ui.Panel([
    ui.Label('', {backgroundColor: '#' + LOSS_COL[i], padding: '7px', margin: '2px 1px 2px 0'}),
    ui.Label('', {backgroundColor: '#' + GAIN_COL[i], padding: '7px', margin: '2px 6px 2px 0'}),
    ui.Label(it.label + '  (' + it.span + ')' + (it.provisional ? '  PROVISIONAL' : ''),
      {fontSize: '11px', margin: '3px 0', fontWeight: it.provisional ? 'bold' : 'normal'})],
    ui.Panel.Layout.flow('horizontal')));
});
legend.add(ui.Panel([
  ui.Label('', {backgroundColor: '#1b7837', padding: '7px', margin: '2px 6px 2px 0'}),
  ui.Label('Stable mangrove (faint, for context)', {fontSize: '11px', margin: '3px 0'})],
  ui.Panel.Layout.flow('horizontal')));
legend.add(ui.Label('Darker = more recent. The last interval is not yet confirmed by a later ' +
  'period. Confirmed = mangrove maps and NDVI agree. Mapped areas, not error-adjusted.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG (change per period)', SHOWN.getThumbURL(
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
  Export.table.toDrive({collection: PERIOD_FC, description: NAME + '_change_per_period',
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export task created: open the Tasks tab and click RUN.');
}
