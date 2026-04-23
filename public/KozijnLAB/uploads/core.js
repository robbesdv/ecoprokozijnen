"use strict";

var KL = window.KL = window.KL || {};
KL.version = "clean-split";
KL.meta = { appName: "KozynLAB", version: KL.version, storageKey: "KozynLAB_STATE_CLEAN" };
KL.core = KL.core || {};
KL.ui = KL.ui || {};

function clampNumber(value, min, max){
  var v = Number(value);
  if (!Number.isFinite(v)) v = min;
  if (v < min) v = min;
  if (v > max) v = max;
  return v;
}

function parseOptionalNumber(raw){
  var s = String(raw || "").trim();
  if (s === "") return null;
  var n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

function escapeHtml(s){
  return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
  });
}

function euro(amount){
  var n = Number(amount);
  if (!Number.isFinite(n)) n = 0;
  return "€ " + n.toFixed(2).replace(".", ",");
}

var DEFAULT_VAT = 0.21;

function generateProjectCode(){
  var d = new Date();
  var y = d.getFullYear().toString().slice(-2);
  var m = String(d.getMonth()+1).padStart(2,'0');
  var day = String(d.getDate()).padStart(2,'0');
  var rnd = Math.floor(Math.random()*9000)+1000;
  return y + m + day + "-" + rnd;
}

function createDefaultState(){
  return {
    projectCode: generateProjectCode(),
    customer: {
      name: "",
      projectName: "",
      address: "",
      postcode: "",
      city: "",
      phone: "",
      email: "",
      projectDate: "",
      deliveryDate: "",
      logoDataUrl: ""
    },
    profile: {
      preset: "standard70",
      frameMM: 70,
      sashMM: 60,
      mullionMM: 60,
      transomMM: 60,
      schuifpui: {
        outerFrameMM: 70,
        innerFrameMM: 60,
        sillMM: 40,
        sashMM: 60,
        glassInsetMM: 21,
        meetingGapMM: 0
      }
    },
    elementOptions: { colorOutside:"RAL7016", colorInside:"Wit", sill:false, profileSystem:"living_variant", profileShape:"15deg", hardwareType:"type2_siegenia" },

elementType: "kozijn",
    widthMM: 1200,
    heightMM: 1400,
    columnsCount: 2,
    activeColIndex: 0,
    activeRowIndex: 0,
    columns: [
      { rowsCount: 1, paneType: "auto", options: { hinge: "left" }, rowHeights:[100], widthPct:50 },
      { rowsCount: 1, paneType: "auto", options: { hinge: "left" }, rowHeights:[100], widthPct:50 }
    ],
    slideSystem: "hst",
    renderMode: "sales",
    showDims: false,
    showFieldDims: false,
    montageEuro: 0,
    discountPct: 0,
    vatRate: DEFAULT_VAT,
    view: { zoom: 1 },
    projectExtras: [], // { id, name, qty, unitEuro }
    projectItems: [] // {id,name,element,snapshot,priceIncl}
  };
}

var state = createDefaultState();

KL.core.getState = function(){ return state; };
KL.core.setState = function(next){ state = next; return state; };
KL.core.createDefaultState = createDefaultState;

function deepClone(obj){
  return JSON.parse(JSON.stringify(obj));
}
KL.core.deepClone = deepClone;

function isPlainObject(value){
  return !!value && Object.prototype.toString.call(value) === "[object Object]";
}

function mergeWithDefaults(defaults, incoming){
  if (Array.isArray(defaults)) return Array.isArray(incoming) ? incoming : defaults.slice();
  if (!isPlainObject(defaults)) return (incoming === undefined ? defaults : incoming);
  var out = Object.assign({}, defaults);
  if (!isPlainObject(incoming)) return out;
  Object.keys(incoming).forEach(function(key){
    var nextVal = incoming[key];
    var baseVal = defaults[key];
    if (Array.isArray(nextVal)){
      out[key] = nextVal;
    } else if (isPlainObject(nextVal) && isPlainObject(baseVal)) {
      out[key] = mergeWithDefaults(baseVal, nextVal);
    } else {
      out[key] = nextVal;
    }
  });
  return out;
}

function normalizeLoadedStateShape(next){
  var s = mergeWithDefaults(createDefaultState(), next || {});
  if (!Array.isArray(s.columns)) s.columns = [];
  s.columnsCount = clampNumber(s.columnsCount, 1, 6);
  while (s.columns.length < s.columnsCount){
    s.columns.push({ rowsCount: 1, paneType: "auto", options: { hinge: "left" }, rowHeights:[100], rows:[{ paneType:"auto", options:{ hinge:"left" } }] });
  }
  while (s.columns.length > s.columnsCount){ s.columns.pop(); }
  for (var i=0;i<s.columns.length;i++) {
    var col = s.columns[i] || {};
    col.rowsCount = clampNumber(col.rowsCount || (Array.isArray(col.rows) ? col.rows.length : 1), 1, 6);
    col.options = isPlainObject(col.options) ? col.options : { hinge: "left" };
    var defaultWidthPct = 100 / s.columnsCount;
    var wPct = Number(col.widthPct);
    if (!Number.isFinite(wPct) || wPct <= 0) wPct = defaultWidthPct;
    col.widthPct = wPct;
    if (!Array.isArray(col.rowHeights)) col.rowHeights = [];
    while (col.rowHeights.length < col.rowsCount){ col.rowHeights.push(Math.round(100 / col.rowsCount)); }
    while (col.rowHeights.length > col.rowsCount){ col.rowHeights.pop(); }
    var rhSum = 0;
    for (var h=0;h<col.rowHeights.length;h++){
      var rh = Number(col.rowHeights[h]);
      if (!Number.isFinite(rh) || rh <= 0) rh = Math.round(100 / col.rowsCount);
      col.rowHeights[h] = rh;
      rhSum += rh;
    }
    if (rhSum <= 0) rhSum = 100;
    for (var h2=0;h2<col.rowHeights.length;h2++){
      col.rowHeights[h2] = (col.rowHeights[h2] / rhSum) * 100;
    }
    if (!Array.isArray(col.rows)) col.rows = [];
    while (col.rows.length < col.rowsCount){
      col.rows.push({ paneType: col.paneType || "auto", options: mergeWithDefaults({ hinge:"left" }, col.options || {}) });
    }
    while (col.rows.length > col.rowsCount){ col.rows.pop(); }
    for (var r=0;r<col.rows.length;r++) {
      var row = col.rows[r] || {};
      row.options = mergeWithDefaults({ hinge:"left" }, row.options || {});
      row.paneType = row.paneType || col.paneType || "auto";
      col.rows[r] = row;
    }
    s.columns[i] = col;
  }
  var wSum = 0;
  for (var wi=0; wi<s.columns.length; wi++){ wSum += Number(s.columns[wi].widthPct) || 0; }
  if (wSum <= 0) wSum = 100;
  for (var wj=0; wj<s.columns.length; wj++){ s.columns[wj].widthPct = ((Number(s.columns[wj].widthPct) || 0) / wSum) * 100; }
  return s;
}

KL.core.mergeWithDefaults = mergeWithDefaults;
KL.core.normalizeLoadedStateShape = normalizeLoadedStateShape;

KL.core.buildStateForProjectItem = function(baseState, item){
  var s = deepClone(baseState);
  if (!item || !item.element) return s;
  var el = item.element;
  s.elementType = el.elementType;
  s.widthMM = el.widthMM;
  s.heightMM = el.heightMM;
  s.columnsCount = el.columnsCount;
  s.activeColIndex = 0;
  s.activeRowIndex = 0;
  s.columns = deepClone(el.columns || []);
  s.profile = deepClone(el.profile || s.profile);
  s.elementOptions = deepClone(el.elementOptions || s.elementOptions || { colorOutside:"RAL7016", colorInside:"Wit", sill:false, profileSystem:"living_variant", profileShape:"15deg", hardwareType:"type2_siegenia" });
  s.slideSystem = el.slideSystem || s.slideSystem;
  s.schuifpuiActiveSide = el.schuifpuiActiveSide || s.schuifpuiActiveSide;
  s.schuifpuiBayCount = el.schuifpuiBayCount || s.schuifpuiBayCount;
  s.schuifpuiBays = deepClone(el.schuifpuiBays || s.schuifpuiBays || []);
  return s;
};

var STORAGE_KEY = KL.meta.storageKey;
var STORAGE_KEY_FALLBACKS = [
  "KozynLAB_STATE_V196"
];

function loadPersistedState(){
  try{
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw){
      for (var i=0;i<STORAGE_KEY_FALLBACKS.length;i++){
        raw = localStorage.getItem(STORAGE_KEY_FALLBACKS[i]);
        if (raw) break;
      }
    }
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeLoadedStateShape(parsed);
  }catch(e){
    return null;
  }
}

try{
  var persisted = loadPersistedState();
  if (persisted) state = persisted;
}catch(e){  }

var _persistT = null;
function queuePersist(reason){
  try{
    if (_persistT) clearTimeout(_persistT);
    _persistT = setTimeout(function(){
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }catch(e2){  }
    }, 250);
  }catch(e){  }
}

function defaultSchuifpuiBays(bayCount, activeSide){
  bayCount = Math.max(2, Number(bayCount || 2));
  activeSide = (activeSide || "left").toLowerCase();
  var bays = new Array(bayCount).fill("fixed");
  if (bayCount === 2){
    if (activeSide === "right"){ bays = ["fixed","slide"]; }
    else { bays = ["slide","fixed"]; }
    return bays;
  }
  if (bayCount === 3){
    if (activeSide === "right"){ bays = ["fixed","fixed","slide"]; }
    else { bays = ["slide","fixed","fixed"]; }
    return bays;
  }
  for (var i=0;i<bayCount;i++){
    var slideOnEven = (activeSide === "left"); // left => bay0 slide, right => bay1 slide
    var isSlide = slideOnEven ? (i%2===0) : (i%2===1);
    bays[i] = isSlide ? "slide" : "fixed";
  }
  return bays;
}

function normalizeSchuifpuiBays(){
  var bc = Math.max(2, Number(state.schuifpuiBayCount || state.columnsCount || 2));
  state.schuifpuiBayCount = bc;

  if (!Array.isArray(state.schuifpuiBays)){
    state.schuifpuiBays = defaultSchuifpuiBays(bc, state.schuifpuiActiveSide || "left");
    return;
  }

  for (var i=0;i<state.schuifpuiBays.length;i++){
    var v = String(state.schuifpuiBays[i] || "fixed").toLowerCase();
    state.schuifpuiBays[i] = (v === "slide") ? "slide" : "fixed";
  }

  if (state.schuifpuiBays.length > bc){
    state.schuifpuiBays = state.schuifpuiBays.slice(0, bc);
    return;
  }

  while (state.schuifpuiBays.length < bc){
    state.schuifpuiBays.push("fixed");
  }
}

var TEMPLATE_LIBRARY = {
  kozijn: [
    { id:"kz_1x1", name:"1 kolom • 1 vak (vast)", apply:function(s){
      s.columnsCount = 1;
      s.columns = [{ rowsCount: 1, paneType: "vast" }];
      s.widthMM = 900; s.heightMM = 1200;
    }},
    { id:"kz_2x1", name:"2 kolommen • 1 vak per kolom", apply:function(s){
      s.columnsCount = 2;
      s.columns = [
        { rowsCount: 1, paneType: "vast" },
        { rowsCount: 1, paneType: "draai_kiep" }
      ];
      s.widthMM = 1600; s.heightMM = 1300;
    }},
    { id:"kz_3x1", name:"3 kolommen • vast / draai-kiep / vast", apply:function(s){
      s.columnsCount = 3;
      s.columns = [
        { rowsCount: 1, paneType: "vast" },
        { rowsCount: 1, paneType: "draai_kiep" },
        { rowsCount: 1, paneType: "vast" }
      ];
      s.widthMM = 2400; s.heightMM = 1400;
    }}
  ],
  deur: [
    { id:"dr_1", name:"1 kolom • 1 vak (deur)", apply:function(s){
      s.columnsCount = 1;
      s.columns = [{ rowsCount: 1, paneType: "deur" }];
      s.widthMM = 950; s.heightMM = 2300;
    }},
    { id:"dr_bovenlicht", name:"1 kolom • 2 vakken (bovenlicht + deur)", apply:function(s){
      s.columnsCount = 1;
      s.columns = [{ rowsCount: 2, paneType: "deur" }];
      s.widthMM = 1000; s.heightMM = 2400;
    }},
    { id:"dr_openslaand", name:"2 kolommen • 1 vak (openslaande deuren)", apply:function(s){
      s.columnsCount = 2;
      s.columns = [
        { rowsCount: 1, paneType: "deur" },
        { rowsCount: 1, paneType: "deur" }
      ];
      s.widthMM = 1600; s.heightMM = 2300;
    }}
  ],

  schuifpui: [
    { id:"sp_2delig", name:"2 kolommen • schuif + vast", apply:function(s){
      s.columnsCount = 2;
      s.columns = [
        { rowsCount: 1, paneType: "schuif" },
        { rowsCount: 1, paneType: "vast" }
      ];
      s.widthMM = 3000; s.heightMM = 2300;
    }},
    { id:"sp_3delig", name:"3 kolommen • vast + schuif + vast", apply:function(s){
      s.columnsCount = 3;
      s.columns = [
        { rowsCount: 1, paneType: "vast" },
        { rowsCount: 1, paneType: "schuif" },
        { rowsCount: 1, paneType: "vast" }
      ];
      s.widthMM = 4200; s.heightMM = 2300;
    }}
  ],

  dakraam: [
    { id:"dkra_1", name:"1 kolom • 1 vak (dakraam)", apply:function(s){
      s.columnsCount = 1;
      s.columns = [{ rowsCount: 1, paneType: "kiep" }];
      s.widthMM = 780; s.heightMM = 1180;
    }}
  ]
};

function getTemplatesForElementType(elementType){
  return TEMPLATE_LIBRARY[elementType] || TEMPLATE_LIBRARY["kozijn"];
}

function countTotalVakken(s){
  var cols = Array.isArray(s.columns) ? s.columns : [];
  var total = 0;
  for (var i=0;i<cols.length;i++){
    var col = cols[i] || {};
    var rows = Array.isArray(col.rows) ? col.rows : null;
    if (rows && rows.length){ total += rows.length; }
    else { total += Math.max(1, Number(col.rowsCount) || 1); }
  }
  return Math.max(1, total);
}

function roundMmToMatrixCmUp(mm){
  return Math.ceil((Number(mm) || 0) / 10);
}

function roundMmToWholeCmNearest(mm){
  return Math.max(0, Math.round((Number(mm) || 0) / 10));
}

function roundMmToWholeCmUp(mm){
  return Math.max(0, Math.ceil((Number(mm) || 0) / 10));
}


function resolvePaneTypeForElement(elementType, paneType){
  if (paneType && paneType !== 'auto') return paneType;
  if (elementType === 'deur') return 'deur';
  if (elementType === 'schuifpui') return 'schuif';
  if (elementType === 'dakraam') return 'kiep';
  return 'vast';
}

function normalizeGlassPackValue(pack){
  var v = String(pack || 'HR++');
  return (v === 'HR+++' || v === 'Triple') ? 'HR+++' : 'HR++';
}

function getElementGlassInfo(element){
  var el = element || state || {};
  var cols = Array.isArray(el.columns) ? el.columns : [];
  var lines = [];
  var packs = [];
  var hasTriple = false;
  for (var ci=0; ci<cols.length; ci++){
    var col = cols[ci] || {};
    var rows = Array.isArray(col.rows) ? col.rows : [];
    for (var ri=0; ri<rows.length; ri++){
      var row = rows[ri] || {};
      var opt = row.options || {};
      var resolved = resolvePaneTypeForElement(el.elementType, row.paneType);
      var isGlass = (opt.fill === 'glass') || (el.elementType === 'deur' && resolved === 'vast');
      if (!isGlass) continue;
      var pack = normalizeGlassPackValue(opt.glassPack || (el.elementOptions && el.elementOptions.glassPack) || 'HR++');
      if (packs.indexOf(pack) === -1) packs.push(pack);
      if (pack === 'HR+++') hasTriple = true;
      lines.push({
        colIndex: ci,
        rowIndex: ri,
        pack: pack,
        widthMM: Math.round(getColumnOuterWidthMm(el, ci) || 0),
        heightMM: Math.round(getRowOuterHeightMm(el, ci, ri) || 0),
        finish: opt.glassFinish || 'clear',
        build: opt.glassBuild || ({ none:'standard', inside:'laminated_inside', outside:'laminated_outside', both:'laminated_both' }[(opt.safetyGlass || 'none')] || 'standard')
      });
    }
  }
  var primaryPack = hasTriple ? 'HR+++' : (packs[0] || normalizeGlassPackValue(el.elementOptions && el.elementOptions.glassPack));
  return {
    primaryPack: primaryPack,
    ug: (primaryPack === 'HR+++') ? '0.5' : '1.0',
    packs: packs,
    lines: lines,
    hasGlass: lines.length > 0
  };
}

function getProfileDescriptor(element){
  var opt = (element && element.elementOptions) || {};
  var system = String(opt.profileSystem || 'living_variant');
  var shape = String(opt.profileShape || '15deg');
  var systemLabel = ({ living_variant:'Living Variant', blokkader:'Blokkader', standard:'Standaard profiel' })[system] || 'Living Variant';
  var shapeLabel = ({ '15deg':'15 graden profiel', straight:'Recht profiel' })[shape] || '15 graden profiel';
  var frameCode = (system === 'blokkader') ? '9495 Blokkader' : '9495 Blokkader';
  var mullionCode = '9468 T-profiel';
  var sashCode = '9431 DK vleugel';
  var transomCode = '9468 T-profiel';
  return {
    system: system,
    shape: shape,
    systemLabel: systemLabel,
    shapeLabel: shapeLabel,
    fullLabel: systemLabel + ', ' + shapeLabel,
    sections: [
      { key:'Kader', mm: Number((element && element.profile && element.profile.frameMM) || 70), code: frameCode + ' ' + (shape === '15deg' ? '15 graden' : 'recht') },
      { key:'Vleugel', mm: Number((element && element.profile && element.profile.sashMM) || 60), code: sashCode },
      { key:'Middenstijl', mm: Number((element && element.profile && element.profile.mullionMM) || 60), code: mullionCode + ' ' + (shape === '15deg' ? '15 graden' : 'recht') },
      { key:'Tussenregel', mm: Number((element && element.profile && element.profile.transomMM) || 60), code: transomCode + ' ' + (shape === '15deg' ? '15 graden' : 'recht') }
    ]
  };
}

function getHardwareLabelValue(type){
  return String(type || 'type2_siegenia') === 'type1_hidden' ? 'Type 1: verdekt liggend' : 'Type 2: standaard (Siegenia)';
}


function getKozijnBasePriceInclByVakken(vakken, widthMM, heightMM){
  var startsIncl = {
    1: 1365,
    2: 1522.5,
    3: 1680,
    4: 1837.5,
    5: 1995
  };
  var startIncl = startsIncl[vakken] || startsIncl[5];
  var widthCm = roundMmToMatrixCmUp(widthMM);
  var heightCm = roundMmToMatrixCmUp(heightMM);
  var widthSteps = Math.max(0, Math.ceil((widthCm - 70) / 10));
  var heightSteps = Math.max(0, Math.ceil((heightCm - 70) / 10));
  return startIncl + ((widthSteps + heightSteps) * 31);
}

function getColumnOuterWidthMm(s, colIndex){
  var totalWidth = Number(s.widthMM) || 0;
  var cols = Array.isArray(s.columns) ? s.columns : [];
  if (!cols.length || totalWidth <= 0) return 0;
  var sumPct = 0;
  for (var i=0;i<cols.length;i++) sumPct += Number(cols[i] && cols[i].widthPct) || 0;
  if (sumPct <= 0) return totalWidth / cols.length;
  var col = cols[colIndex] || {};
  var pct = Number(col.widthPct) || 0;
  return totalWidth * (pct / sumPct);
}

function getRowOuterHeightMm(s, colIndex, rowIndex){
  var totalHeight = Number(s.heightMM) || 0;
  var cols = Array.isArray(s.columns) ? s.columns : [];
  var col = cols[colIndex] || {};
  var rowHeights = Array.isArray(col.rowHeights) ? col.rowHeights : [];
  if (totalHeight <= 0) return 0;
  if (!rowHeights.length) return totalHeight / Math.max(1, Number(col.rowsCount) || 1);
  var sumPct = 0;
  for (var i=0;i<rowHeights.length;i++) sumPct += Number(rowHeights[i]) || 0;
  if (sumPct <= 0) return totalHeight / rowHeights.length;
  var pct = Number(rowHeights[rowIndex]);
  if (!Number.isFinite(pct) || pct <= 0) pct = 100 / rowHeights.length;
  return totalHeight * (pct / sumPct);
}

function getVakOuterAreaM2(s, colIndex, rowIndex){
  var wMm = getColumnOuterWidthMm(s, colIndex);
  var hMm = getRowOuterHeightMm(s, colIndex, rowIndex);
  if (!(wMm > 0) || !(hMm > 0)) return 0;
  return (wMm * hMm) / 1000000;
}

function isOpenendVak(paneType){
  return paneType === 'draai_kiep' || paneType === 'draai' || paneType === 'kiep';
}

function estimateMaterialPrice(s){
  if (!s || s.elementType !== 'kozijn') return 0;

  var vakken = Math.min(5, countTotalVakken(s));
  var baseIncl = getKozijnBasePriceInclByVakken(vakken, s.widthMM, s.heightMM);
  var openVakToeslagIncl = 300;
  var ventilationPerCmIncl = 2;
  var triplePerM2Incl = 105;
  var solarPerM2Incl = 70;
  var laminatedOneSidePerM2Incl = 70;
  var laminatedBothSidesPerM2Incl = 140;
  var satinatoPerM2Incl = 5;
  var totalIncl = baseIncl;

  var cols = Array.isArray(s.columns) ? s.columns : [];
  for (var ci=0; ci<cols.length; ci++){
    var col = cols[ci] || {};
    var rows = Array.isArray(col.rows) ? col.rows : [];
    for (var ri=0; ri<rows.length; ri++){
      var cell = rows[ri] || {};
      var pType = (cell.paneType === 'auto') ? deriveAutoPaneType(s.elementType) : cell.paneType;
      var opt = cell.options || {};
      if (isOpenendVak(pType)) totalIncl += openVakToeslagIncl;
      if (pType === 'vent'){
        var ventCm = roundMmToWholeCmUp(getColumnOuterWidthMm(s, ci));
        totalIncl += ventCm * ventilationPerCmIncl;
      }
      if (opt.fill === 'glass'){
        var vakAreaM2 = getVakOuterAreaM2(s, ci, ri);
        var perM2Incl = 0;
        var glassPack = opt.glassPack || 'HR++';
        var glassFinish = opt.glassFinish || 'clear';
        var glassBuild = opt.glassBuild || ({ none:'standard', inside:'laminated_inside', outside:'laminated_outside', both:'laminated_both' }[(opt.safetyGlass || 'none')] || 'standard');

        if (glassPack === 'HR+++' || glassPack === 'Triple') perM2Incl += triplePerM2Incl;
        if (glassFinish === 'solar') perM2Incl += solarPerM2Incl;
        if (glassFinish === 'satinato' || glassFinish === 'mat' || glassFinish === 'milk') perM2Incl += satinatoPerM2Incl;

        if (glassBuild === 'laminated_inside' || glassBuild === 'laminated_outside') perM2Incl += laminatedOneSidePerM2Incl;
        else if (glassBuild === 'laminated_both') perM2Incl += laminatedBothSidesPerM2Incl;

        totalIncl += vakAreaM2 * perM2Incl;
      }
    }
  }

  var vatRate = Number(s.vatRate);
  if (!Number.isFinite(vatRate)) vatRate = DEFAULT_VAT;
  return totalIncl / (1 + vatRate);
}

function estimateElementGross(element){
  var material = estimateMaterialPrice(element);
  var vat = material * (Number(state.vatRate) || 0);
  return material + vat;
}

function extrasSubtotal(s){
  var sum = 0;
  for (var i=0;i<s.projectExtras.length;i++){
    var e = s.projectExtras[i];
    sum += (Number(e.qty) || 0) * (Number(e.unitEuro) || 0);
  }
  return sum;
}

function computeTotals(s){
  var material = estimateMaterialPrice(s);
  var montage = Number(s.montageEuro) || 0;
  var extras = extrasSubtotal(s);

  var sub = material + montage + extras;
  var discount = sub * (clampNumber(s.discountPct, 0, 50) / 100);
  var net = Math.max(0, sub - discount);
  var vat = net * (Number(s.vatRate) || 0);
  var gross = net + vat;

  return {
    material: material,
    montage: montage,
    extras: extras,
    subtotal: sub,
    discount: discount,
    net: net,
    vat: vat,
    gross: gross
  };
}

KL.core.createDefaultState = createDefaultState;
KL.core.escapeHtml = escapeHtml;
KL.core.euro = euro;
KL.core.clampNumber = clampNumber;
KL.core.parseOptionalNumber = parseOptionalNumber;
KL.core.computeTotals = computeTotals;
KL.core.estimateMaterialPrice = estimateMaterialPrice;
KL.core.getElementGlassInfo = getElementGlassInfo;
KL.core.getProfileDescriptor = getProfileDescriptor;
KL.core.getHardwareLabelValue = getHardwareLabelValue;
KL.core.estimateElementGross = estimateElementGross;
KL.core.defaultSchuifpuiBays = defaultSchuifpuiBays;
KL.core.normalizeSchuifpuiBays = normalizeSchuifpuiBays;
KL.core.deepClone = KL.core.deepClone || function(obj){ return JSON.parse(JSON.stringify(obj)); };

KL.core.getState = function(){ return state; };
KL.core.setState = function(next){ state = next; queuePersist("setState"); };
