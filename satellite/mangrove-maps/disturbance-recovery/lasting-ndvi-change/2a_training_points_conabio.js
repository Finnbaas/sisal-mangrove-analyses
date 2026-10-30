/**********************************************************************
 * STORM DAMAGE  ·  STEP 2a (ACCURATE ROUTE, MEXICO): TRAINING POINTS
 * Sisal Mangrove Monitor (TU Delft x UNAM Sisal) · MIT license
 *
 * Only needed for the ACCURATE route. Skip it for the quick route
 * (Global Mangrove Watch), or if you already have your own labelled
 * points (see README: own points).
 *
 * Makes training points for six land-cover classes per period from the
 * official CONABIO mangrove maps of Mexico. Points are only taken in
 * the stable core of each class: where two CONABIO maps around the
 * period agree and the class does not change within 60 m (30 m for
 * narrow coastal classes).
 *
 * BEFORE YOU RUN
 *   1. Download the CONABIO mangrove maps as shapefiles for the epochs
 *      in EPOCHS: geoportal.conabio.gob.mx > search "manglares" >
 *      Biodiversidad > Monitoreo de manglares > Distribucion de los
 *      manglares y otras coberturas > your region (we used Mexico
 *      (general)) > "Mapa de uso del suelo y vegetacion de la zona
 *      costera" for each year (the land-use layer with all classes,
 *      not the mangrove-only layer).
 *      NOTE: the right CONABIO map depends on your area. For Sisal,
 *      Mexico (general) was the most accurate; elsewhere a regional
 *      map may fit better. Use the same map for all years.
 *   2. Upload each as a table asset (Assets > NEW > Shape files) into
 *      MY_ASSETS, named conabio_<year>, e.g. conabio_2020.
 *   3. Check LABEL_FIELD and CLASS_MAP against the attribute table
 *      (the script warns about class names it does not know).
 *   Optional: draw polygons for beach / salt flat (man_bare), dune
 *   vegetation (man_dune) and old built-up area (man_built), each as
 *   its own geometry import, only where the cover is the same in the
 *   1990s and today. They are added to every period.
 *
 * RUN: RUN_EXPORT = false to check, then true and click RUN in Tasks.
 * Output: table asset <NAME>_points (+ CSV in Google Drive).
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

// CONABIO epochs you uploaded (year -> asset name in MY_ASSETS)
var EPOCHS = [1981, 2005, 2010, 2015, 2020, 2025];

// Same periods as step 1, with the two CONABIO epochs around each.
var PERIODS = [
  {id: 'P1', years: [1993, 1997], epochs: [1981, 2005]},
  {id: 'P2', years: [1998, 2002], epochs: [1981, 2005]},
  {id: 'P3', years: [2004, 2008], epochs: [2005, 2010]},
  {id: 'P4', years: [2009, 2013], epochs: [2010, 2015]},
  {id: 'P5', years: [2014, 2018], epochs: [2015, 2020]},
  {id: 'P6', years: [2019, 2023], epochs: [2020, 2025]},
  {id: 'P7', years: [2024, 2025], epochs: [2020, 2025]}
];

var LABEL_FIELD = 'Descrip';   // attribute with the class name
var CLASS_MAP = {              // CONABIO class -> our class (0 = not used)
  'Manglar': 1,
  'Cuerpos de agua': 2,
  'Otros humedales': 3,
  'Otra vegetacion': 4,
  'Agricola - Pecuaria': 4,
  'Sin vegetacion': 5,
  'Desarrollo antropico': 6,
  'Manglar perturbado': 0,
  'Otros': 0
};

var POINTS_PER_CLASS = {1: 250, 2: 150, 3: 200, 4: 200, 5: 150, 6: 100};
var EDGE_WIDE_M   = 60;        // core distance for large classes (1-3)
var EDGE_NARROW_M = 30;        // core distance for narrow classes (4-6)
var NARROW_CLASSES = [4, 5, 6];
var SEED = 42;

var RUN_EXPORT = false;
var DRIVE_FOLDER = 'mangrove_disturbance';


// ========================== SETUP ==================================

var CLASS_NAMES = {'1': 'Mangrove', '2': 'Water', '3': 'Other wetland vegetation',
                   '4': 'Other vegetation', '5': 'Bare / salt flat', '6': 'Built / road'};
var REGION = AOI.buffer(BUFFER_M);
var PROJ = ee.Image(MY_ASSETS + NAME + '_periods').select(0).projection();
var CLASS_DICT = ee.Dictionary(CLASS_MAP);
var NAME_DICT  = ee.Dictionary(CLASS_NAMES);
var CLASS_VALUES = Object.keys(POINTS_PER_CLASS).map(Number);
var CLASS_POINTS = CLASS_VALUES.map(function (c) { return POINTS_PER_CLASS[c]; });

function epochFc(y) { return ee.FeatureCollection(MY_ASSETS + 'conabio_' + y); }

EPOCHS.forEach(function (y) {
  epochFc(y).aggregate_array(LABEL_FIELD).distinct()
    .removeAll(ee.List(Object.keys(CLASS_MAP)))
    .evaluate(function (u, err) {
      if (err) { print('ERROR epoch ' + y + ': ' + err); return; }
      if (u && u.length) { print('WARNING ' + y + ': classes not in CLASS_MAP (ignored):', u); }
    });
});

// Optional manual polygons (only used if you drew and named them).
var MANUAL = [];
if (typeof man_bare  !== 'undefined') { MANUAL.push({cls: 5, geom: man_bare,  n: 120}); }
if (typeof man_dune  !== 'undefined') { MANUAL.push({cls: 4, geom: man_dune,  n: 60}); }
if (typeof man_built !== 'undefined') { MANUAL.push({cls: 6, geom: man_built, n: 80}); }


// ========================== LABELS =================================

function epochImage(y) {
  var fc = epochFc(y).map(function (f) {
    return f.set('tc', CLASS_DICT.get(f.get(LABEL_FIELD), -1));
  });
  return fc.reduceToImage({properties: ['tc'], reducer: ee.Reducer.first()})
    .rename('tc').reproject(PROJ).clip(AOI).unmask(-9);
}

function homogeneous(img, r) {
  var k = ee.Kernel.circle({radius: r, units: 'meters'});
  return img.reduceNeighborhood({reducer: ee.Reducer.min(), kernel: k})
    .eq(img.reduceNeighborhood({reducer: ee.Reducer.max(), kernel: k}));
}

function core(img) {
  var narrow = ee.Image(0);
  NARROW_CLASSES.forEach(function (c) { narrow = narrow.or(img.eq(c)); });
  return img.updateMask(homogeneous(img, EDGE_WIDE_M)
    .or(homogeneous(img, EDGE_NARROW_M).and(narrow)));
}

function periodLabel(p) {
  var a = core(epochImage(p.epochs[0]));
  var b = core(epochImage(p.epochs[1]));
  return a.updateMask(a.eq(b).and(a.gt(0))).rename('label').toInt().clip(AOI);
}


// ========================== SAMPLING ===============================

function toPoint(f, p, lab, source, prefix) {
  var c = f.geometry().coordinates();
  lab = ee.Number(lab).int();
  return ee.Feature(f.geometry(), {
    point_id: ee.String(p.id + '_' + prefix).cat(ee.String(f.get('system:index'))),
    period: p.id, year_start: p.years[0], year_end: p.years[1],
    train_class: lab, class_name: NAME_DICT.get(lab.format('%d')),
    source: source, lon: c.get(0), lat: c.get(1)
  });
}

function samplePeriod(p) {
  var pts = periodLabel(p).stratifiedSample({
    numPoints: 0, classBand: 'label', region: AOI, scale: 30, projection: PROJ,
    classValues: CLASS_VALUES, classPoints: CLASS_POINTS,
    seed: SEED, geometries: true, tileScale: 4
  }).map(function (f) { return toPoint(f, p, f.get('label'), 'conabio', ''); });
  MANUAL.forEach(function (m) {
    pts = pts.merge(ee.FeatureCollection.randomPoints({
      region: ee.Geometry(m.geom).intersection(REGION, 1), points: m.n, seed: SEED + m.cls
    }).map(function (f) { return toPoint(f, p, m.cls, 'manual', 'M' + m.cls + '_'); }));
  });
  return pts;
}

var TRAINING = ee.FeatureCollection(PERIODS.map(samplePeriod)).flatten();


// ========================== CHECKS =================================

print('CHECK 1: training points per period and class (aim for > 50 per class)',
  TRAINING.reduceColumns({
    reducer: ee.Reducer.frequencyHistogram().group({groupField: 1, groupName: 'period'}),
    selectors: ['train_class', 'period']}).get('groups'));
print('CHECK 2: points per source', TRAINING.aggregate_histogram('source'));


// ========================== MAP ====================================

var PAL = ['1b5e20', '1565c0', '80cbc4', 'c5e1a5', 'e0c27a', 'e53935'];
var SHOW = PERIODS[PERIODS.length - 2];
Map.centerObject(AOI, 12);
Map.addLayer(periodLabel(SHOW), {min: 1, max: 6, palette: PAL}, SHOW.id + ' stable core labels');
Map.addLayer(TRAINING.filter(ee.Filter.eq('period', SHOW.id)).style({color: 'ffff00', pointSize: 2}),
  {}, SHOW.id + ' training points');
Map.addLayer(ee.Image().byte().paint(AOI, 0, 2), {palette: ['000000']}, 'Study area');


// ========================== EXPORT =================================

if (RUN_EXPORT) {
  Export.table.toAsset({collection: TRAINING, description: NAME + '_points',
                        assetId: MY_ASSETS + NAME + '_points'});
  Export.table.toDrive({collection: TRAINING, description: NAME + '_points_csv',
    folder: DRIVE_FOLDER, fileFormat: 'CSV',
    selectors: ['point_id', 'period', 'year_start', 'year_end', 'train_class',
                'class_name', 'source', 'lon', 'lat']});
  print('Export tasks created: open the Tasks tab and click RUN on both.');
}
