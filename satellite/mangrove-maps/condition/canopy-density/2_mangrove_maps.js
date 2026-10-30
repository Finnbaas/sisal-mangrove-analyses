/**********************************************************************
 * MANGROVE CONDITION  ·  STEP 2: PERSISTENT MANGROVE MASK
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Decides per period which pixels are mangrove, then compares the
 * periods. Choose one route with MASK_SOURCE:
 *
 *   'GMW'     QUICK. Works anywhere, nothing to prepare. A random forest
 *             learns mangrove vs. other from Global Mangrove Watch
 *             (2020, public catalog) in REF_PERIOD and is applied to
 *             every period. Coarser than the accurate route.
 *
 *   'POINTS'  ACCURATE (our Sisal method). Six land-cover classes per
 *             period, trained on labelled points: from step 2a
 *             (CONABIO, Mexico), the Sisal example CSV, or your own
 *             field points (same columns, see README).
 *
 * Both routes then do the same:
 *   - patches smaller than MIN_PATCH_PIX pixels take their surroundings
 *   - smoothing over time: majority of each period and its neighbours
 *     (P1: majority of P1-P3; last period unchanged)
 *   - change class per pixel: 1 stable mangrove, 2 stable non-mangrove,
 *     3 loss, 4 gain, 5 fluctuating, 6 change only in the last period
 *
 * THE CANOPY DENSITY MAP USES ONLY the bands mangrove_P6 and mangrove_P7
 * (mangrove in 2019-2023 and in 2024-2025). The other bands are not used.
 *
 * RUN: RUN_EXPORT = false to check one period (CHECKS + map), then
 * true and click RUN in Tasks (20-60 min). Output: <NAME>_mangrove.
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

var PIDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];   // same ids as step 1

var MASK_SOURCE = 'GMW';      // 'GMW' (quick) or 'POINTS' (accurate)

// POINTS route: table asset with columns period, train_class (1-6)
var POINTS_ASSET = MY_ASSETS + NAME + '_points';

// GMW route
var GMW_CATALOG = 'projects/sat-io/open-datasets/GMW/annual-extent/GMW_MNG_2020';
var REF_PERIOD  = 'P6';       // the period that contains 2020
var GMW_CORE_M  = 60;         // only train where GMW does not change within 60 m
var GMW_POINTS  = 1500;       // training pixels per class

// Method settings (Sisal values)
var N_TREES       = 300;
var TEST_FRACTION = 0.3;
var MIN_PATCH_PIX = 6;        // ~0.5 ha
var SEED          = 42;
var USE_BUILT_CONSTRAINT = true;   // POINTS route: 'built' only near settlements (GHSL)
var GHSL_MIN_M2   = 100;
var GHSL_BUFFER_M = 100;

var CHECK_PERIOD = 'P6';      // period shown on the map while checking
var RUN_EXPORT   = false;


// ========================== DATA ===================================

var REGION = AOI.buffer(BUFFER_M);
var PERIOD_IMG = ee.Image(MY_ASSETS + NAME + '_periods');
var PROJ = PERIOD_IMG.select(0).projection();
var N = PIDS.length;

var DEM = ee.ImageCollection('COPERNICUS/DEM/GLO30').filterBounds(REGION)
  .select('DEM').mosaic().rename('elevation').toFloat();

var BASE = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2',
            'NDVI', 'EVI', 'MVI', 'NDMI', 'MNDWI', 'NDVI_sd', 'MNDWI_max'];
var FEATURES = BASE.concat(['elevation']);

function feats(pid) {
  var f = PERIOD_IMG.select(BASE.map(function (b) { return pid + '_' + b; }), BASE);
  f = f.addBands(f.select('MVI').clamp(-10, 30), null, true);
  return f.addBands(DEM).select(FEATURES).clip(REGION);
}

function rf() {
  return ee.Classifier.smileRandomForest({numberOfTrees: N_TREES, seed: SEED});
}

function cleanMap(cls) {
  cls = cls.reproject(PROJ);
  var size = cls.connectedPixelCount({maxSize: MIN_PATCH_PIX + 1, eightConnected: true});
  var mode = cls.focalMode({radius: 1, kernelType: 'square', units: 'pixels', iterations: 2});
  return cls.where(size.lt(MIN_PATCH_PIX), mode).rename('class').toByte();
}


// ========================== ROUTE: POINTS ===========================

var SETTLEMENT = ee.ImageCollection('JRC/GHSL/P2023A/GHS_BUILT_S')
  .filterDate('1975-01-01', '2026-01-01').select('built_surface').max()
  .gt(GHSL_MIN_M2).focalMax({radius: GHSL_BUFFER_M, units: 'meters'})
  .unmask(0).rename('settlement');

function classifyPoints(pid) {
  var f = feats(pid);
  var samples = f.sampleRegions({
    collection: ee.FeatureCollection(POINTS_ASSET).filter(ee.Filter.eq('period', pid))
      .map(function (p) { return p.set('train_class', ee.Number(p.get('train_class')).toInt()); })
      .randomColumn('split', SEED),
    properties: ['train_class', 'split'], scale: 30, projection: PROJ, tileScale: 16
  });
  var test = samples.filter(ee.Filter.lt('split', TEST_FRACTION));
  var cm = test.classify(rf().train(samples.filter(ee.Filter.gte('split', TEST_FRACTION)),
                                    'train_class', FEATURES))
    .errorMatrix('train_class', 'classification', [1, 2, 3, 4, 5, 6]);
  var raw = f.classify(rf().train(samples, 'train_class', FEATURES));
  if (USE_BUILT_CONSTRAINT) {
    var alt = f.classify(rf().train(samples.filter(ee.Filter.neq('train_class', 6)),
                                    'train_class', FEATURES));
    raw = raw.where(raw.eq(6).and(SETTLEMENT.not()), alt);
  }
  var cls = cleanMap(raw);
  return {cls: cls, mangrove: cls.eq(1), raw: raw, cm: cm, n: samples.size()};
}


// ========================== ROUTE: GMW =============================

var GMW = ee.ImageCollection(GMW_CATALOG).filterBounds(REGION).mosaic()
  .select(0).unmask(0).gt(0).rename('label').toInt().clip(REGION);
var GMW_CORE = GMW.reproject(PROJ).reduceNeighborhood({
    reducer: ee.Reducer.minMax(),
    kernel: ee.Kernel.circle({radius: GMW_CORE_M, units: 'meters'})})
  .expression('b(0) == b(1)');

var GMW_SAMPLES = feats(REF_PERIOD).addBands(GMW.updateMask(GMW_CORE)).stratifiedSample({
  numPoints: GMW_POINTS, classBand: 'label', region: AOI, scale: 30, projection: PROJ,
  seed: SEED, geometries: false, tileScale: 16
}).randomColumn('split', SEED);
var GMW_TEST = GMW_SAMPLES.filter(ee.Filter.lt('split', TEST_FRACTION));
var GMW_CM = GMW_TEST.classify(rf().train(GMW_SAMPLES.filter(ee.Filter.gte('split', TEST_FRACTION)),
                                          'label', FEATURES))
  .errorMatrix('label', 'classification', [0, 1]);
var GMW_RF = rf().train(GMW_SAMPLES, 'label', FEATURES);

function classifyGmw(pid) {
  var raw = feats(pid).classify(GMW_RF);                // 1 mangrove, 0 other
  var cls = cleanMap(raw);
  return {cls: cls, mangrove: cls.eq(1), raw: raw, cm: GMW_CM, n: GMW_SAMPLES.size()};
}


// ========================== CLASSIFY ALL PERIODS ====================

function classify(pid) { return MASK_SOURCE === 'POINTS' ? classifyPoints(pid) : classifyGmw(pid); }
if (MASK_SOURCE !== 'POINTS' && MASK_SOURCE !== 'GMW') {
  print('ERROR: MASK_SOURCE must be GMW or POINTS.');
}

var RES = PIDS.map(classify);
var R = RES.map(function (r) { return r.mangrove.toByte(); });


// ========================== SMOOTHING AND CHANGE ====================

var S = [];
for (var i = 0; i < N; i++) {
  var s;
  if (i === 0)          { s = R[0].add(R[1]).add(R[2]).gte(2); }
  else if (i === N - 1) { s = R[N - 1]; }
  else                  { s = R[i - 1].add(R[i]).add(R[i + 1]).gte(2); }
  S.push(s.rename('mangrove_' + PIDS[i]).toByte());
}

var nSwitch = ee.Image(0), nRaw = ee.Image(0), firstChange = ee.Image(0);
for (var j = 1; j < N; j++) {
  nSwitch = nSwitch.add(S[j].neq(S[j - 1]));
  nRaw    = nRaw.add(R[j].neq(R[j - 1]));
}
for (var k = N - 1; k >= 1; k--) {
  firstChange = firstChange.where(S[k].neq(S[k - 1]), k + 1);
}

var CHANGE = ee.Image(0)
  .where(nSwitch.eq(0).and(S[0].eq(1)), 1)
  .where(nSwitch.eq(0).and(S[0].eq(0)), 2)
  .where(nSwitch.eq(1).and(S[0].eq(1)), 3)
  .where(nSwitch.eq(1).and(S[0].eq(0)), 4)
  .where(nSwitch.gte(2), 5)
  .where(nSwitch.eq(1).and(firstChange.eq(N)), 6)
  .updateMask(nSwitch.mask()).rename('change').toByte();

var OUT = ee.Image.cat([CHANGE,
    firstChange.updateMask(nSwitch.mask()).rename('change_period').toByte(),
    nSwitch.rename('n_switch').toByte(), nRaw.rename('n_raw_flips').toByte()]
  .concat(S)
  .concat(RES.map(function (r, idx) { return r.cls.rename('class_' + PIDS[idx]); })))
  .clip(AOI)
  .set({name: NAME, mask_source: MASK_SOURCE, periods: PIDS.join(','),
        smoothing: '3-period majority, P1 = majority P1-P3, last period raw'});


// ========================== CHECKS =================================

var C = RES[PIDS.indexOf(CHECK_PERIOD)];
print('ROUTE: ' + MASK_SOURCE);
print('CHECK 1: training samples used (' + CHECK_PERIOD + ' for POINTS, ' + REF_PERIOD + ' for GMW)', C.n);
print('CHECK 2: internal test accuracy (0.9+ is good; optimistic, not a map accuracy)', C.cm.accuracy());
print('CHECK 3: confusion matrix (rows = reference, columns = map)', C.cm.array());
// Light check: raw classification (no patch cleaning) at 60 m, enough to compare.
print('CHECK 4: mangrove area ' + CHECK_PERIOD + ' (ha, approx.), ours vs Global Mangrove Watch 2020',
  ee.Image.cat(C.raw.eq(1).rename('ours'), GMW.rename('gmw'))
    .multiply(ee.Image.pixelArea()).divide(1e4)
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: AOI, scale: 60,
                   maxPixels: 1e10, tileScale: 16}));
print('NOTE: memory errors in the checks or the map do not affect the export. ' +
      'If they appear, set RUN_EXPORT = true and run the task anyway.');
print('CHECK 5: export goes to', MY_ASSETS + NAME + '_mangrove');


// ========================== MAP ====================================

var PAL6 = ['1b5e20', '1565c0', '80cbc4', 'c5e1a5', 'e0c27a', 'e53935'];
Map.centerObject(AOI, 12);
Map.addLayer(feats(CHECK_PERIOD).select(['swir1', 'nir', 'red']).clip(AOI), {min: 0, max: 0.4},
  CHECK_PERIOD + ' composite (false colour)');
if (MASK_SOURCE === 'POINTS') {
  Map.addLayer(C.raw.clip(AOI), {min: 1, max: 6, palette: PAL6}, CHECK_PERIOD + ' land-cover classes (preview)');
}
Map.addLayer(C.raw.eq(1).selfMask().clip(AOI), {palette: ['00e676']}, CHECK_PERIOD + ' mangrove (preview)');
Map.addLayer(GMW.selfMask().clip(AOI), {palette: ['ffff00']}, 'Global Mangrove Watch 2020', false);
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== EXPORT =================================

if (RUN_EXPORT) {
  var P = PROJ.getInfo();
  Export.image.toAsset({
    image: OUT, description: NAME + '_mangrove', assetId: MY_ASSETS + NAME + '_mangrove',
    region: AOI, crs: P.crs, crsTransform: P.transform, maxPixels: 1e10,
    pyramidingPolicy: {'.default': 'mode'}
  });
  print('Export task created: open the Tasks tab and click RUN.');
}
