/**********************************************************************
 * STORM DAMAGE: DAMAGE CLASSES  ·  STEP 3: DAMAGE CLASSES MAP
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Reads the assets of steps 2 and 2b. For the mangrove that was there
 * before the storm, compares the first dry season after the storm
 * (AFTER_YEAR, January-May) with the normal of the same sensor period,
 * storm years left out:
 *   Z = (NDVI after the storm - mean of the normal years)
 *       / standard deviation of the normal years, per pixel
 *
 *   No detectable impact   Z >= -1
 *   Moderate               -2 <= Z < -1
 *   Severe                 Z < -2
 *   Cover lost             mangrove before the storm that is not mangrove
 *                          in the next period and not in the last period
 *                          (it has not come back). ACCURATE ROUTE ONLY:
 *                          with the quick route (Global Mangrove Watch)
 *                          the classifier cannot tell lost cover from
 *                          damaged mangrove, so this class is left out.
 *
 * Landsat 5/7 and Landsat 8/9 are different sensors, so the normal is
 * only taken from the sensor period of AFTER_YEAR (WINDOWS).
 *
 * OUTPUT
 *   - map + legend
 *   - Console: hectares per class and share of the mangrove before the
 *     storm; recovery chart (median NDVI per class per year, from 4
 *     years before to 6 years after the storm) with a table
 *   - RUN_EXPORT = true: CSV with the areas and the chart values
 *   - WEB_LINKS = true: PNG link of the map
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

// ---- THE STORM: choose a preset, or 'custom' and fill in CUSTOM ------------
// Used here: STORM_NAME, STORM_DATE, BEFORE_YEAR, AFTER_YEAR, STORM_YEARS. (ACUTE_START and ACUTE_END are used by the acute maps.)
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

var ASSET_YEARS = [1993, 2025];    // the years in the step 2b asset

var Z_MODERATE = -1;         // Z below this: Moderate
var Z_SEVERE   = -2;         // Z below this: Severe
var MIN_NORMAL_YEARS = 5;    // a pixel needs at least this many normal years
var CHART_BEFORE = 4;        // recovery chart: years before the storm year
var CHART_AFTER  = 6;        // recovery chart: years after the storm year

var RUN_EXPORT   = false;    // true: CSV files in Google Drive
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
var NEXT_ID = PERIODS[BEFORE_I + 1].id;
var LAST_ID = PERIODS[PERIODS.length - 1].id;

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


// ========================== CLASSES ================================

// 1 No detectable impact, 2 Moderate, 3 Severe, 4 Cover lost
// Cover lost only exists on the accurate route (step 2 with MASK_SOURCE = 'POINTS').
var IS_POINTS = ee.Number(ee.Algorithms.If(ee.String(CH.get('mask_source')).equals('POINTS'), 1, 0));
var LOST = BEFORE.and(CH.select('mangrove_' + NEXT_ID).eq(0)).and(CH.select('mangrove_' + LAST_ID).eq(0))
  .multiply(IS_POINTS);
var ZU = Z.unmask(0);
var CLS = ee.Image(1)
  .where(ZU.lt(Z_MODERATE), 2)
  .where(ZU.lt(Z_SEVERE), 3)
  .where(LOST, 4)
  .updateMask(BEFORE.and(Z.mask().or(LOST)))
  .toByte().clip(AOI);

var NAMES = ['No detectable impact', 'Moderate', 'Severe', 'Cover lost'];
var PAL   = ['1a9850', 'fee08b', 'd73027', '542788'];


// ========================== TABLES =================================

var TOTAL = ee.Number(BEFORE.multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
  crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4}).get('before'));
var AREAS = ee.Image.cat(NAMES.map(function (nm, k) { return CLS.eq(k + 1).rename('c' + (k + 1)); }))
  .unmask(0).multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4});
var AREA_FC = ee.FeatureCollection(NAMES.map(function (nm, k) {
  var ha = ee.Number(AREAS.get('c' + (k + 1)));
  return ee.Feature(null, {storm: STORM_NAME, class: nm, area_ha: ha,
                           share_pct: ha.divide(TOTAL).multiply(100)});
}));
AREA_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('AREAS TEXT (' + STORM_NAME + ', after year ' + AFTER_YEAR + ', mangrove before the storm, ' +
    'mapped ha, not error-adjusted): ' + fc.features.map(function (f) {
    var q = f.properties;
    return q.class + ' = ' + q.area_ha.toFixed(1) + ' ha (' + q.share_pct.toFixed(1) + ' %)';
  }).join('; '));
});


// ========================== RECOVERY CHART =========================

var STORM_YEAR = Number(STORM_DATE.slice(0, 4));
var CHART_YEARS = [];
for (var cy = STORM_YEAR - CHART_BEFORE; cy <= STORM_YEAR + CHART_AFTER; cy++) {
  if (cy >= ASSET_YEARS[0] && cy <= ASSET_YEARS[1]) { CHART_YEARS.push(cy); }
}
var ROWS = [];
NAMES.forEach(function (nm, k) {
  CHART_YEARS.forEach(function (cy) {
    var med = YEARLY.select('NDVI_' + cy).updateMask(CLS.eq(k + 1)).reduceRegion({
      reducer: ee.Reducer.median(), geometry: AOI, crs: PROJ, scale: 30,
      maxPixels: 1e10, tileScale: 4}).get('NDVI_' + cy);
    ROWS.push(ee.Feature(null, {storm: STORM_NAME, class: nm, year: cy, ndvi_median: med}));
  });
});
var CHART_FC = ee.FeatureCollection(ROWS);
var SORTED = NAMES.map(function (nm, k) { return {name: nm, color: '#' + PAL[k]}; })
  .sort(function (a, b) { return a.name < b.name ? -1 : 1; });   // the chart orders its lines by name
print(ui.Chart.feature.groups(CHART_FC, 'year', 'ndvi_median', 'class').setChartType('LineChart')
  .setOptions({title: 'Recovery after ' + STORM_NAME + ' (median NDVI per damage class)',
    hAxis: {title: 'Year', format: '####'}, vAxis: {title: 'NDVI (median)'},
    colors: SORTED.map(function (s) { return s.color; }), lineWidth: 2, pointSize: 4}));
CHART_FC.evaluate(function (fc) {
  if (!fc) { return; }
  print('RECOVERY TEXT (median NDVI per class; the ' + STORM_YEAR + ' value is from January-May, before the storm): ' +
    NAMES.map(function (nm) {
      return nm + ': ' + fc.features.filter(function (f) { return f.properties.class === nm; })
        .map(function (f) {
          var m = f.properties.ndvi_median;
          return f.properties.year + '=' + (m === null || m === undefined ? 'no data' : Number(m).toFixed(3));
        }).join(' ');
    }).join(' | '));
});


// ========================== CHECKS =================================

print('CHECK 1: mangrove before the storm (ha), period ' + BEFORE_ID, TOTAL);
print('CHECK 2: normal years used (' + WIN.id + ', storm years left out)', NORMAL_YEARS);
print('CHECK 3: cover lost is only calculated on the accurate route. Step 2 route (POINTS = accurate)',
  CH.get('mask_source'));
if (BEFORE_NOTE) { print('NOTE: ' + BEFORE_NOTE); }
print('CHECK 4: mangrove before the storm without a Z-score (ha, no data after the storm or too few normal years)',
  BEFORE.and(Z.mask().not()).multiply(PIX_HA).reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI,
    crs: PROJ, scale: 30, maxPixels: 1e10, tileScale: 4}).get('before'));


// ========================== MAP ====================================

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 12);
var SHOWN = CLS.visualize({min: 1, max: 4, palette: PAL}).clip(AOI);
Map.addLayer(SHOWN, {}, 'Damage classes: ' + STORM_NAME);

var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px 10px', width: '300px'}});
function swatch(color, text) {
  return ui.Panel([
    ui.Label('', {backgroundColor: '#' + color, padding: '7px', margin: '2px 6px 2px 0',
                  border: '1px solid #999999'}),
    ui.Label(text, {fontSize: '11px', margin: '3px 0'})], ui.Panel.Layout.flow('horizontal'));
}
legend.add(ui.Label('Damage classes: ' + STORM_NAME, {fontWeight: 'bold', fontSize: '12px'}));
NAMES.forEach(function (nm, k) { legend.add(swatch(PAL[k], nm)); });
legend.add(ui.Label('First dry season after the storm (' + AFTER_YEAR + ') against the normal of ' + WIN.id +
  '. Share of the mangrove before the storm. Mapped areas, not error-adjusted.',
  {fontSize: '10px', color: '555555', margin: '4px 0 0 0'}));
Map.add(legend);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== WEB LINKS AND EXPORT ====================

if (WEB_LINKS) {
  var REGION = AOI.bounds();
  print('MAP PNG damage classes ' + STORM_NAME + '', SHOWN.getThumbURL(
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
  Export.table.toDrive({collection: AREA_FC, description: NAME + '_damage_areas_' + STORM,
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  Export.table.toDrive({collection: CHART_FC, description: NAME + '_damage_recovery_' + STORM,
                        folder: DRIVE_FOLDER, fileFormat: 'CSV'});
  print('Export tasks created: open the Tasks tab and click RUN.');
}
