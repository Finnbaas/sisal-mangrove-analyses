/**********************************************************************
 * MANGROVE EXTENT  ·  STEP 3 OF 3: EXTENT MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 1 and 2 and checks every mangrove loss or
 * gain against NDVI:
 *   delta     = median NDVI after the change - median NDVI before
 *   reference = the same delta over stable mangrove, same interval
 *   confirmed = the drop (rise) is larger than in 95% of stable
 *               mangrove over the same interval
 * Subtracting the reference removes sensor and climate effects that
 * hit the whole area.
 *
 * MAP_STYLE
 *   'simplified'  Stable mangrove / Loss (confirmed) / Gain (confirmed)
 *                 / Uncertain change
 *   'extended'    all 9 classes (see legend)
 *
 * Nothing to export first: just Run. Optional: RUN_EXPORT = true for a
 * GeoTIFF and CSV tables in Google Drive; WEB_LINKS = true prints PNG
 * links of the map (for reports or websites).
 *
 * Areas are MAPPED areas, not error-adjusted. For an accuracy
 * assessment, see the README (validation).
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

var MAP_STYLE  = 'simplified';   // 'simplified' or 'extended'
var PCT        = [5, 95];        // reference percentiles for "confirmed"
var MIN_CONF_PATCH = 6;          // confirmed patches smaller than this -> not confirmed

var RUN_EXPORT   = false;
var WEB_LINKS    = false;        // print PNG links of the map
var WEB_PNG_SIZE = 640;          // ~ width of the study area / 30 m
var DRIVE_FOLDER = 'mangrove_extent';


// ========================== DATA ===================================

var PERIOD_IMG = ee.Image(MY_ASSETS + NAME + '_periods');
var CH   = ee.Image(MY_ASSETS + NAME + '_mangrove');
var PROJ = CH.select('change').projection();
var N    = PERIODS.length;
var LAST = PERIODS[N - 1].id;

var C3  = CH.select('change');
var CP  = CH.select('change_period');
var MPL = CH.select('mangrove_' + LAST);
var PERSIST = C3.eq(1);
var PIX_HA  = ee.Image.pixelArea().divide(1e4);
var PM = PERIODS.map(function (p) { return PERIOD_IMG.select(p.id + '_NDVI').rename('v'); });


// ========================== NDVI CHECK PER INTERVAL ================

var INTERVALS = [];
var IL = ee.Image(0), IG = ee.Image(0), VALID = ee.Image(0);
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
  VALID = VALID.where(sel, rel.mask().gt(0));
  INTERVALS.push({code: k + 1, label: PERIODS[k - 1].id + '->' + PERIODS[k].id,
    span: PERIODS[k - 1].years.join('-') + ' -> ' + PERIODS[k].years[0] + '+',
    dy: (PERIODS[k].years[0] + PERIODS[k].years[1]) / 2 -
        (PERIODS[k - 1].years[0] + PERIODS[k - 1].years[1]) / 2});
}


// ========================== CLASSES ================================

// 1 stable mangrove, 2 stable non-mangrove, 3 loss confirmed,
// 4 loss class change only, 5 gain confirmed, 6 gain class change only,
// 7 fluctuating, 8 recent loss (last period), 9 recent gain (last period)
var CLS = ee.Image(0)
  .where(C3.eq(1), 1)
  .where(C3.eq(2), 2)
  .where(C3.eq(3), 4).where(C3.eq(3).and(IL), 3)
  .where(C3.eq(4), 6).where(C3.eq(4).and(IG), 5)
  .where(C3.eq(5), 7)
  .where(C3.eq(6).and(MPL.eq(0)), 8)
  .where(C3.eq(6).and(MPL.eq(1)), 9)
  .updateMask(C3.mask());

if (MIN_CONF_PATCH > 1) {
  var small = function (c) {
    return CLS.eq(c).selfMask().reproject({crs: PROJ})
      .connectedPixelCount(MIN_CONF_PATCH, true).lt(MIN_CONF_PATCH).unmask(0);
  };
  CLS = CLS.where(CLS.eq(3).and(small(3)), 4).where(CLS.eq(5).and(small(5)), 6);
}
CLS = CLS.toByte().clip(AOI);

var STYLES = {
  extended: {
    names: ['Stable mangrove', 'Stable non-mangrove', 'Loss, confirmed',
            'Loss, class change only', 'Gain, confirmed', 'Gain, class change only',
            'Fluctuating (uncertain)', 'Recent loss (provisional)', 'Recent gain (provisional)'],
    pal:  ['1b7837', 'ffffff', 'd7191c', 'fdae61', '2c7bb6', 'abd9e9', '9e9e9e', '762a83', 'c51b7d'],
    from: [1, 2, 3, 4, 5, 6, 7, 8, 9], to: [1, 2, 3, 4, 5, 6, 7, 8, 9], hide: 2
  },
  simplified: {
    names: ['Stable mangrove', 'Mangrove loss (confirmed)', 'Mangrove gain (confirmed)',
            'Uncertain change'],
    pal:  ['1b7837', 'd7191c', '2c7bb6', 'bdbdbd'],
    from: [1, 2, 3, 4, 5, 6, 7, 8, 9], to: [1, 0, 2, 4, 3, 4, 4, 4, 4], hide: 0
  }
};


// ========================== TABLES =================================

function sumHa(img) {
  return img.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
}

var S = STYLES[MAP_STYLE === 'extended' ? 'extended' : 'simplified'];
var MAPPED = CLS.remap(S.from, S.to).rename('class');
var AREAS = sumHa(ee.Image.cat(S.names.map(function (n, i) {
  return MAPPED.eq(i + 1).rename('c' + (i + 1));
})));
var AREA_FC = ee.FeatureCollection(S.names.map(function (n, i) {
  return ee.Feature(null, {class: i + 1, name: n, area_ha: AREAS.get('c' + (i + 1))});
}));
AREA_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('AREAS TEXT (' + (MAP_STYLE === 'extended' ? 'extended' : 'simplified') +
        ', mapped ha, not error-adjusted): ' + fc.features.map(function (f) {
    return f.properties.name + ' = ' + (f.properties.area_ha || 0).toFixed(1) + ' ha';
  }).join('; '));
});

var PERIOD_FC = ee.FeatureCollection(INTERVALS.map(function (it) {
  var s = sumHa(ee.Image.cat([CLS.eq(3), CLS.eq(5)]).and(CP.eq(it.code)).rename(['loss', 'gain']));
  return ee.Feature(null, s).set({interval: it.label, span: it.span,
    loss_ha_per_yr: ee.Number(s.get('loss')).divide(it.dy),
    gain_ha_per_yr: ee.Number(s.get('gain')).divide(it.dy)});
}));
PERIOD_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('PERIODS TEXT (confirmed): ' + fc.features.map(function (f) {
    var q = f.properties;
    return q.interval + ' (' + q.span + '): loss ' + (q.loss || 0).toFixed(1) + ' ha, gain ' +
      (q.gain || 0).toFixed(1) + ' ha, loss/yr ' + (q.loss_ha_per_yr || 0).toFixed(1) +
      ', gain/yr ' + (q.gain_ha_per_yr || 0).toFixed(1);
  }).join(' | '));
});


// ========================== MAP ====================================

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);

var SHOWN, legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
function swatch(color, text) {
  return ui.Panel([
    ui.Label('', {backgroundColor: '#' + color, padding: '7px', margin: '2px 6px 2px 0',
                  border: '1px solid #999999'}),
    ui.Label(text, {fontSize: '11px', margin: '3px 0'})], ui.Panel.Layout.flow('horizontal'));
}

SHOWN = MAPPED.updateMask(MAPPED.neq(S.hide).and(MAPPED.gt(0)))
  .visualize({min: 1, max: S.names.length, palette: S.pal}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Mangrove extent (' + MAP_STYLE + ')');
legend.add(ui.Label('Mangrove extent ' + PERIODS[0].years[0] + '-' + PERIODS[N - 1].years[1],
  {fontWeight: 'bold', fontSize: '12px'}));
S.names.forEach(function (n, i) { if (i + 1 !== S.hide) { legend.add(swatch(S.pal[i], n)); } });
legend.add(ui.Label('Confirmed = mangrove maps and NDVI agree. Mapped areas, not error-adjusted.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG (' + MAP_STYLE + ')', SHOWN.getThumbURL(
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
  var P = PROJ.getInfo();
  Export.image.toDrive({image: ee.Image.cat([CLS.rename('class_extended'),
      CLS.remap(STYLES.simplified.from, STYLES.simplified.to).rename('class_simplified'),
      CP.rename('change_period')]).toByte().unmask(0),
    description: NAME + '_extent_classes', folder: DRIVE_FOLDER,
    fileNamePrefix: NAME + '_extent_classes', region: AOI,
    crs: P.crs, crsTransform: P.transform, maxPixels: 1e10});
  Export.table.toDrive({collection: AREA_FC, description: NAME + '_extent_areas',
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  Export.table.toDrive({collection: PERIOD_FC, description: NAME + '_extent_per_period',
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export tasks created: open the Tasks tab and click RUN.');
}
