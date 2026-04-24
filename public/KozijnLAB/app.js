/* KozijnLAB v2 — core app */
"use strict";

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY = 'KL_V2_STATE';

const COLORS = [
  { code: 'RAL9016', name: 'Verkeerswit', hex: '#f6f6f3' },
  { code: 'RAL9001', name: 'Crème', hex: '#f0ead6' },
  { code: 'RAL7016', name: 'Antraciet', hex: '#383e42' },
  { code: 'RAL7039', name: 'Quartzgrijs', hex: '#6c6960' },
  { code: 'RAL7012', name: 'Basaltgrijs', hex: '#51565a' },
  { code: 'RAL7038', name: 'Agate grijs', hex: '#b2b4b3' },
  { code: 'RAL9005', name: 'Zwart', hex: '#0a0a0d' },
];

const ELEMENT_TYPES = [
  { id: 'kozijn', label: 'Kozijn', icon: 'kozijn' },
  { id: 'deur', label: 'Deur', icon: 'deur' },
  { id: 'schuifpui', label: 'Schuifpui', icon: 'schuif' },
  { id: 'dakraam', label: 'Dakraam', icon: 'dak' },
];

const PANE_TYPES = {
  kozijn: [
    { id: 'vast', label: 'Vast' },
    { id: 'draai', label: 'Draai' },
    { id: 'kiep', label: 'Kiep' },
    { id: 'draaikiep', label: 'Draai-kiep' },
    { id: 'deur', label: 'Openslaand (deur)' },
    { id: 'deur2', label: 'Dubbele deur' },
    { id: 'vent', label: 'Ventilatie' },
  ],
  deur: [
    { id: 'deur', label: 'Openslaand' },
    { id: 'deur2', label: 'Dubbele deur' },
    { id: 'vast', label: 'Vast / bovenlicht' },
  ],
  schuifpui: [
    { id: 'schuif', label: 'Schuifdeel' },
    { id: 'vast', label: 'Vast deel' },
  ],
  hefschuif: [
    { id: 'schuif', label: 'Schuifdeel' },
    { id: 'vast', label: 'Vast deel' },
  ],
  dakraam: [
    { id: 'kiep', label: 'Kiep' },
    { id: 'vast', label: 'Vast' },
  ],
};

function uid() { return 'e_' + Math.random().toString(36).slice(2, 9); }

function newOfferCode() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `${y}${m}${dy}-${r}`;
}

function defaultProfile() {
  return { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 };
}

function defaultDoorPanel(fill = 'panel') {
  return {
    heightPct: 100,
    fill,
    glassPack: 'HR++',
    glassFinish: 'clear',
  };
}

function newElement(type = 'kozijn', name = '') {
  const base = {
    id: uid(),
    name: name || autoName(type),
    type,
    widthMM: 1200,
    heightMM: 1400,
    columns: [
      { widthPct: 50, rows: [{ paneType: 'vast', hinge: 'left', glassPack: 'HR++', glassFinish: 'clear', fill: 'glass', heightPct: 100 }] },
      { widthPct: 50, rows: [{ paneType: 'draaikiep', hinge: 'right', glassPack: 'HR++', glassFinish: 'clear', fill: 'glass', heightPct: 100 }] },
    ],
    profile: defaultProfile(),
    colorOutside: 'RAL7016',
    colorInside: 'same',
    finishOutside: 'smooth',
    finishInside: 'smooth',
    glassPack: 'HR++',
    hardware: 'siegenia',
    slideSystem: 'hst',
    qty: 1,
    notes: '',
  };
  if (type === 'deur') {
    base.widthMM = 1000; base.heightMM = 2300;
    base.doorSubtype = 'voordeur';
    base.doorOptions = {};
    base.doorPanels = [defaultDoorPanel('panel')];
    base.columns = [{ widthPct: 100, rows: [{ paneType: 'deur', hinge: 'left', hingeStyle: 'flag', fill: 'panel', heightPct: 100 }] }];
  }
  if (type === 'schuifpui' || type === 'hefschuif') {
    base.widthMM = 3000; base.heightMM = 2300;
    base.columns = [
      { widthPct: 50, rows: [{ paneType: 'schuif', heightPct: 100, fill: 'glass', glassPack: 'HR++' }] },
      { widthPct: 50, rows: [{ paneType: 'vast', heightPct: 100, fill: 'glass', glassPack: 'HR++' }] },
    ];
  }
  if (type === 'dakraam') {
    base.widthMM = 780; base.heightMM = 1180;
    base.columns = [{ widthPct: 100, rows: [{ paneType: 'kiep', heightPct: 100, fill: 'glass', glassPack: 'HR++' }] }];
  }
  return base;
}

function autoName(type) {
  const labels = { kozijn: 'Kozijn', deur: 'Deur', schuifpui: 'Schuifpui', hefschuif: 'Hefschuif', dakraam: 'Dakraam' };
  return labels[type] + ' ' + (state?.elements?.length ? state.elements.length + 1 : 1);
}

function newProject() {
  const el = newElement('kozijn', 'Kozijn 1');
  return {
    offerCode: newOfferCode(),
    customer: { name: '', projectName: '', address: '', postcode: '', city: '', phone: '', email: '', date: '', deliveryDate: '' },
    elements: [el],
    activeElementId: el.id,
    montageEuro: 0,
    discountPct: 0,
    vatRate: 0.21,
    notes: '',
    extras: [],
  };
}

let state = loadState() || newProject();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.elements)) return null;
    return p;
  } catch (e) { return null; }
}
let _saveT;
function saveState() {
  clearTimeout(_saveT);
  _saveT = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    setSaveLabel(false);
  }, 250);
  setSaveLabel(true);
}

function activeElement() {
  return state.elements.find(e => e.id === state.activeElementId) || state.elements[0];
}

function normalizeElementType(el) {
  if (!el) return el;
  if (el.type === 'hefschuif') {
    el.type = 'schuifpui';
    el.slideSystem = 'hst';
  }
  return el;
}

function drawingProfile(el) {
  const p = el.profile || defaultProfile();
  const keepOriginal = el?.type === 'schuifpui' || el?.type === 'hefschuif';
  const scale = keepOriginal ? 1 : 0.82;
  if (el?.type !== 'deur') {
    return {
      frameMM: (p.frameMM || 70) * scale,
      sashMM: (p.sashMM || 60) * scale,
      mullionMM: (p.mullionMM || 60) * scale,
      transomMM: (p.transomMM || p.mullionMM || 60) * scale,
    };
  }
  return {
    frameMM: (p.frameMM || 70) * scale * 2,
    sashMM: (p.sashMM || 60) * scale * 2,
    mullionMM: (p.mullionMM || 60) * scale * 2,
    transomMM: (p.transomMM || p.mullionMM || 60) * scale * 2,
  };
}

function doorPaneTypeFor(el) {
  return (el?.doorSubtype || 'voordeur') === 'tuindeur' ? 'deur2' : 'deur';
}

function normalizeDoorPanels(el) {
  if (!el || el.type !== 'deur') return;
  let panels = Array.isArray(el.doorPanels) ? el.doorPanels : null;
  if (!panels || panels.length === 0) {
    const rows = (el.columns || []).flatMap(col => col.rows || []);
    const source = rows.length > 1 ? rows : [rows[0] || {}];
    panels = source.map((r, i) => ({
      heightPct: r.heightPct || (100 / source.length),
      fill: r.fill || (isDoorPaneType(r.paneType) ? 'panel' : 'glass'),
      glassPack: r.glassPack || el.glassPack || 'HR++',
      glassFinish: r.glassFinish || 'clear',
      _active: i === 0,
    }));
  }

  panels = panels.slice(0, 6).map((p) => ({
    heightPct: Math.max(1, Number(p.heightPct) || 0),
    fill: p.fill === 'glass' ? 'glass' : 'panel',
    glassPack: p.glassPack || el.glassPack || 'HR++',
    glassFinish: p.glassFinish || 'clear',
  }));
  const sum = panels.reduce((a, p) => a + p.heightPct, 0);
  if (!sum) panels = [defaultDoorPanel('panel')];
  else panels.forEach(p => { p.heightPct = (p.heightPct / sum) * 100; });

  el.doorPanels = panels;
  if (typeof el._activeDoorPanelIdx !== 'number' || el._activeDoorPanelIdx >= panels.length) el._activeDoorPanelIdx = 0;
}

function setDoorPanelCount(el, count) {
  normalizeDoorPanels(el);
  const n = Math.max(1, Math.min(6, Number(count) || 1));
  while (el.doorPanels.length < n) el.doorPanels.push(defaultDoorPanel('glass'));
  while (el.doorPanels.length > n) el.doorPanels.pop();
  el.doorPanels.forEach(p => { p.heightPct = 100 / n; });
  if (el._activeDoorPanelIdx >= n) el._activeDoorPanelIdx = n - 1;
}

function tuindeurRowFrom(el) {
  const rows = (el.columns || []).flatMap(col => col.rows || []);
  const src = rows.find(r => isDoorPaneType(r.paneType)) || rows[0] || {};
  return {
    paneType: doorPaneTypeFor(el),
    hinge: src.hinge || 'left',
    hingeStyle: src.hingeStyle || 'flag',
    fill: src.fill || (el.doorPanels?.[0]?.fill || 'panel'),
    heightPct: 100,
    glassPack: src.glassPack || el.glassPack || 'HR++',
    glassFinish: src.glassFinish || 'clear',
  };
}

function applyDoorSubtypeLayout(el) {
  if (!el || el.type !== 'deur') return;
  normalizeDoorPanels(el);
  const row = tuindeurRowFrom(el);
  row.paneType = doorPaneTypeFor(el);
  row.heightPct = 100;
  row.fill = el.doorPanels?.some(p => p.fill === 'glass') ? 'glass' : 'panel';
  el.columns = [{ widthPct: 100, rows: [row] }];
  el._activeColIdx = 0;
  el._activeRowIdx = 0;
}

// ============================================================
// PRICING
// ============================================================
function kozijnMatrixBaseIncl(vakken, widthMM, heightMM) {
  const startTable = { 1: 1406, 2: 1568, 3: 1730, 4: 1893, 5: 2055 };
  const s = startTable[Math.min(5, Math.max(1, vakken))] || 1406;
  const wCm = Math.ceil(widthMM / 10);
  const hCm = Math.ceil(heightMM / 10);
  const wSteps = Math.max(0, Math.ceil((wCm - 70) / 10));
  const hSteps = Math.max(0, Math.ceil((hCm - 70) / 10));
  return s + (wSteps + hSteps) * 31;
}

function priceElement(el) {
  if (!el) return 0;
  normalizeElementType(el);
  let base = 0;
  const wM = el.widthMM / 1000, hM = el.heightMM / 1000;
  const m2 = wM * hM;

  // Alle prijzen zijn INCL. BTW (uit Excel). Aan het einde ÷1.21 → projectTotals voegt BTW toe.
  if (el.type === 'kozijn') {
    const vakken = countVakken(el);
    base = kozijnMatrixBaseIncl(vakken, el.widthMM, el.heightMM);

    let openCount = 0;
    let tuindeurCorrection = 0;
    const colPctSum = el.columns.reduce((sum, col) => sum + (Number(col.widthPct) || 0), 0) || 100;
    el.columns.forEach(col => col.rows.forEach(r => {
      if (['draai', 'kiep', 'draaikiep', 'deur'].includes(r.paneType)) openCount++;
      if (r.paneType === 'deur2') {
        openCount += 2;
        const rowPctSum = col.rows.reduce((sum, row) => sum + (Number(row.heightPct) || 0), 0) || 100;
        const colW = el.widthMM * ((Number(col.widthPct) || 0) / colPctSum);
        const rowH = el.heightMM * ((Number(r.heightPct) || 0) / rowPctSum);
        const normalDoubleDoorIncl = kozijnMatrixBaseIncl(2, colW || el.widthMM, rowH || el.heightMM) + 2 * 315;
        tuindeurCorrection += 7210 - normalDoubleDoorIncl;
      }
    }));
    base += openCount * 315;
    base += tuindeurCorrection;

    let glassUpgrade = 0;
    el.columns.forEach(col => col.rows.forEach(r => {
      if (r.fill !== 'glass') return;
      const colW = el.widthMM * (col.widthPct / 100);
      const rowH = el.heightMM * (r.heightPct / 100);
      const am2 = (colW * rowH) / 1e6;
      const pack = r.glassPack || el.glassPack || 'HR++';
      if (pack === 'HR+++') glassUpgrade += am2 * 105;
      if (pack === 'Triple') glassUpgrade += am2 * 105;
      if (r.glassFinish === 'satinato') glassUpgrade += am2 * 20;
      if (r.glassFinish === 'solar') glassUpgrade += am2 * 62;
    }));
    base += glassUpgrade;

    if (el.colorInside !== 'same' && el.colorInside !== el.colorOutside) base += 191;
    if (el.finishOutside === 'woodgrain' || el.finishInside === 'woodgrain') base += 101;

  } else if (el.type === 'deur') {
    const sub = el.doorSubtype || 'voordeur';
    const opts = el.doorOptions || {};
    if (sub === 'voordeur') {
      base = opts.epkSchuin ? 4892.5 : 4738;
      if (opts.briefklep)        base += 257.5;
      if (opts.briefbak)         base += 154.5;
      if (opts.draadlozeBel)     base += 103;
      if (opts.zijlicht)         base += 257.5;
      if (opts.bovenlicht)       base += 257.5;
      if (opts.dddPaneel)        base += 1545;
      if (opts.paneelSierrooster) base += 2575;
    } else if (sub === 'achterdeur') {
      base = 3811;
      if (opts.zijlicht)   base += 257.5;
      if (opts.bovenlicht) base += 257.5;
      if (opts.dddPaneel)  base += 1545;
    } else if (sub === 'tuindeur') {
      base = 7210;
      if (opts.zijlichtKlein) base += 515;
      if (opts.zijlichtGroot) base += 1030;
      if (opts.bovenlicht)    base += 515;
    }

  } else if (el.type === 'schuifpui') {
    base = (el.slideSystem || 'hst') === 'hst'
      ? 3502 + m2 * 1133
      : 2266 + m2 * 876;
  }
  else if (el.type === 'dakraam') base = 597 + m2 * 227;

  return (base / 1.21) * el.qty;
}

function countVakken(el) {
  let n = 0;
  el.columns.forEach(c => c.rows.forEach(r => {
    n += r.paneType === 'deur2' ? 2 : 1;
  }));
  return Math.max(1, n);
}

function projectTotals() {
  let material = 0;
  state.elements.forEach(el => material += priceElement(el));
  let extrasTotal = 0;
  (state.extras || []).forEach(ex => extrasTotal += (ex.qty || 1) * (ex.unitPrice || 0));
  const montage = Number(state.montageEuro) || 0;
  const sub = material + extrasTotal + montage;
  const discount = sub * ((Number(state.discountPct) || 0) / 100);
  const net = Math.max(0, sub - discount);
  const vat = net * (Number(state.vatRate) || 0);
  const gross = net + vat;
  return { material, extrasTotal, montage, sub, discount, net, vat, gross };
}

const fmtEuro = n => '€ ' + (Number(n) || 0).toFixed(2).replace('.', ',');

// ============================================================
// SVG DRAWING
// ============================================================
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

function isDoorPaneType(type) {
  return type === 'deur' || type === 'deur2';
}

// Geometry cache for drag interactions
let drawGeom = null;

function drawElement(svg, el, opts = {}) {
  const showDims = opts.showDims;
  const showFieldDims = opts.showFieldDims;
  const showLabels = opts.showLabels;
  const isFactory = opts.mode === 'factory';
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const VB_W = 1200, VB_H = 800;
  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);

  const padL = 80, padR = 100, padT = 70, padB = 60;
  const availW = VB_W - padL - padR;
  const availH = VB_H - padT - padB;
  const aspect = el.widthMM / el.heightMM;
  let fw = availW, fh = fw / aspect;
  if (fh > availH) { fh = availH; fw = fh * aspect; }
  const fx = padL + (availW - fw) / 2;
  const fy = padT + (availH - fh) / 2;
  const scale = fw / el.widthMM;

  const baseProfile = el.profile || defaultProfile();
  const profile = drawingProfile(el);
  const framePx = profile.frameMM * scale;
  const sashPx = profile.sashMM * scale;
  const mullPx = profile.mullionMM * scale;
  const transPx = profile.transomMM * scale;
  const thresholdSourcePx = (baseProfile.mullionMM || 60) * scale;
  const isSchuif = el.type === 'schuifpui' || el.type === 'hefschuif';
  const cols = el.columns;
  const hasDoorThreshold = cols.some(col => {
    const rows = col.rows || [];
    const lastRow = rows[rows.length - 1];
    return lastRow && isDoorPaneType(lastRow.paneType);
  });
  const thresholdPx = Math.max(3, thresholdSourcePx * 0.55);

  const ix = fx + framePx, iy = fy + framePx;
  const iw = fw - 2 * framePx;
  const ih = Math.max(1, fh - framePx - (hasDoorThreshold ? thresholdPx : framePx));

  const colWPct = cols.map(c => c.widthPct);
  const sumW = colWPct.reduce((a, b) => a + b, 0) || 100;
  const innerW = iw - mullPx * (cols.length - 1);
  const colWPx = colWPct.map(p => innerW * (p / sumW));
  const colXPx = [];
  let cx = ix;
  colWPx.forEach((w, i) => { colXPx.push(cx); cx += w + mullPx; });

  // Outer frame
  svg.appendChild(svgEl('rect', { x: fx, y: fy, width: fw, height: fh, class: 'svg-frame', rx: 2 }));
  svg.appendChild(svgEl('rect', {
    x: ix, y: iy,
    width: iw, height: ih,
    class: 'svg-frame-inner', rx: 1
  }));

  const colorObj = COLORS.find(c => c.code === el.colorOutside);
  if (!isFactory && colorObj) {
    svg.querySelectorAll('.svg-frame').forEach(r => {
      r.setAttribute('fill', colorObj.hex);
      r.setAttribute('stroke', shade(colorObj.hex, -25));
    });
  }

  // Mullions
  const mullionLines = []; // capture positions for drag
  for (let i = 1; i < cols.length; i++) {
    const mx = colXPx[i] - mullPx;
    const r = svgEl('rect', { x: mx, y: iy, width: mullPx, height: ih, class: 'svg-mull' });
    if (!isFactory && colorObj) {
      r.setAttribute('fill', colorObj.hex);
      r.setAttribute('stroke', shade(colorObj.hex, -25));
    }
    svg.appendChild(r);
    mullionLines.push({ idx: i - 1, cxPx: mx + mullPx / 2 });
  }

  // Rows per column
  const rowsGeom = [];
  const transomLines = []; // [{colIdx, rowIdx, cyPx}]
  cols.forEach((col, ci) => {
    const cxPx = colXPx[ci];
    const cwPx = colWPx[ci];
    const rows = col.rows;
    const rowSum = rows.reduce((a, r) => a + (r.heightPct || 0), 0) || 100;
    const innerH = ih - transPx * (rows.length - 1);
    let cyPos = iy;
    const rowGeoms = [];
    rows.forEach((r, ri) => {
      const rh = innerH * ((r.heightPct || 0) / rowSum);
      if (ri > 0) {
        const t = svgEl('rect', { x: cxPx, y: cyPos - transPx, width: cwPx, height: transPx, class: 'svg-mull' });
        if (!isFactory && colorObj) {
          t.setAttribute('fill', colorObj.hex);
          t.setAttribute('stroke', shade(colorObj.hex, -25));
        }
        svg.appendChild(t);
        transomLines.push({ colIdx: ci, rowIdx: ri - 1, cyPx: cyPos - transPx / 2, cxPx, cwPx });
      }
      rowGeoms.push({ x: cxPx, y: cyPos, w: cwPx, h: rh, row: r });
      drawPane(svg, cxPx, cyPos, cwPx, rh, r, el, sashPx, {
        isFactory,
      });
      cyPos += rh + transPx;
    });
    rowsGeom.push(rowGeoms);
  });

  if (hasDoorThreshold) {
    const thresholdY = fy + fh - thresholdPx;
    const returnW = framePx;
    const returnH = Math.max(6, thresholdPx * 1.35);
    svg.appendChild(svgEl('rect', {
      x: fx, y: thresholdY,
      width: fw, height: thresholdPx,
      class: 'svg-threshold', rx: 1
    }));
    svg.appendChild(svgEl('rect', {
      x: fx, y: thresholdY - returnH,
      width: returnW, height: returnH + thresholdPx,
      class: 'svg-threshold-return', rx: 1
    }));
    svg.appendChild(svgEl('rect', {
      x: fx + fw - returnW, y: thresholdY - returnH,
      width: returnW, height: returnH + thresholdPx,
      class: 'svg-threshold-return', rx: 1
    }));
    svg.appendChild(svgEl('line', {
      x1: fx, y1: thresholdY,
      x2: fx + fw, y2: thresholdY,
      class: 'svg-threshold-top'
    }));
  }

  // Sliding system rail
  if (isSchuif) {
    const railY = fy + fh - framePx + 2;
    const sys = el.slideSystem || 'hst';
    const strokeColor = getComputedStyle(document.documentElement).getPropertyValue('--draw-sash') || '#334155';
    if (sys === 'hst') {
      svg.appendChild(svgEl('line', { x1: fx + framePx, y1: railY - 4, x2: fx + fw - framePx, y2: railY - 4, stroke: strokeColor.trim(), 'stroke-width': 1 }));
      svg.appendChild(svgEl('line', { x1: fx + framePx, y1: railY - 1, x2: fx + fw - framePx, y2: railY - 1, stroke: strokeColor.trim(), 'stroke-width': 1 }));
    } else {
      svg.appendChild(svgEl('line', { x1: fx + framePx, y1: railY - 3, x2: fx + fw - framePx, y2: railY - 3, stroke: strokeColor.trim(), 'stroke-width': 1 }));
    }
  }

  // Labels
  if (showLabels || isFactory) {
    cols.forEach((col, ci) => {
      addTag(svg, colXPx[ci] + colWPx[ci] / 2, iy + 14, 'K' + (ci + 1));
      col.rows.forEach((r, ri) => {
        const g = rowsGeom[ci][ri];
        addTag(svg, g.x + 18, g.y + 14, 'K' + (ci + 1) + '-V' + (ri + 1), 'start');
      });
    });
  }

  // Dimensions
  if (showDims) {
    drawDimH(svg, fx, fy - 30, fx + fw, fy - 30, el.widthMM + ' mm');
    drawDimV(svg, fx + fw + 30, fy, fx + fw + 30, fy + fh, el.heightMM + ' mm');
    if (cols.length > 1) {
      cols.forEach((col, ci) => {
        const cxPx2 = colXPx[ci], cwPx2 = colWPx[ci];
        const widthMM = Math.round(el.widthMM * (col.widthPct / 100));
        drawDimH(svg, cxPx2, fy - 12, cxPx2 + cwPx2, fy - 12, widthMM + 'mm', { compact: true });
      });
    }
    const activeC = cols[0];
    if (activeC.rows.length > 1) {
      let cy2 = iy;
      const rowSum = activeC.rows.reduce((a, r) => a + (r.heightPct || 0), 0) || 100;
      const innerH = ih - transPx * (activeC.rows.length - 1);
      activeC.rows.forEach((r, ri) => {
        const rh = innerH * ((r.heightPct || 0) / rowSum);
        const heightMM = Math.round(el.heightMM * (r.heightPct / 100));
        drawDimV(svg, fx + fw + 12, cy2, fx + fw + 12, cy2 + rh, heightMM + 'mm', { compact: true });
        cy2 += rh + transPx;
      });
    }
  }

  if (showFieldDims) {
    rowsGeom.forEach((colRows, ci) => {
      colRows.forEach((g, ri) => {
        const colMM = Math.round(el.widthMM * (cols[ci].widthPct / 100));
        const rowMM = Math.round(el.heightMM * (cols[ci].rows[ri].heightPct / 100));
        addTag(svg, g.x + g.w / 2, g.y + g.h / 2, colMM + ' × ' + rowMM, 'middle', true);
      });
    });
  }

  // Draw grip handles (always) — click target + visual
  const activeColIdx = (typeof el._activeColIdx === 'number') ? el._activeColIdx : 0;
  mullionLines.forEach(m => {
    addColGrip(svg, m.cxPx, iy, ih, m.idx);
  });
  transomLines.forEach(t => {
    if (t.colIdx === activeColIdx) addRowGrip(svg, t.cxPx, t.cwPx, t.cyPx, t.colIdx, t.rowIdx);
  });

  // Click targets on panes (select vak) + active-vak highlight
  rowsGeom.forEach((colRows, ci) => {
    colRows.forEach((g, ri) => {
      const isActivePane = ci === activeColIdx && ri === ((typeof el._activeRowIdx === 'number') ? el._activeRowIdx : 0);
      if (isActivePane) {
        svg.appendChild(svgEl('rect', {
          x: g.x + 1, y: g.y + 1, width: g.w - 2, height: g.h - 2,
          class: 'svg-pane-active', rx: 2
        }));
      }
      const hit = svgEl('rect', {
        x: g.x, y: g.y, width: g.w, height: g.h,
        fill: 'transparent', class: 'svg-pane-hit',
        'data-col': ci, 'data-row': ri, style: 'cursor:pointer'
      });
      svg.appendChild(hit);
    });
  });

  // Cache geometry
  drawGeom = {
    svg, el,
    fx, fy, fw, fh, ix, iy, iw, ih,
    scale, mullPx, transPx,
    colXPx, colWPx, rowsGeom,
    cols, innerW,
  };
}

function doorPanelsFor(el, row) {
  const panels = (Array.isArray(row?.doorPanels) && row.doorPanels.length)
    ? row.doorPanels
    : (Array.isArray(el.doorPanels) && el.doorPanels.length)
    ? el.doorPanels
    : [defaultDoorPanel(row.fill === 'glass' ? 'glass' : 'panel')];
  const sum = panels.reduce((a, p) => a + (Number(p.heightPct) || 0), 0) || 100;
  return panels.map(p => ({
    heightPct: ((Number(p.heightPct) || 0) / sum) * 100,
    fill: p.fill === 'glass' ? 'glass' : 'panel',
    glassPack: p.glassPack || 'HR++',
    glassFinish: p.glassFinish || 'clear',
  }));
}

function drawDoorLeafPanels(svg, x, y, w, h, panels, profilePx) {
  const rail = Math.max(4, Math.min(18, profilePx * 0.34, Math.min(w, h) * 0.16));
  const gap = 0;
  const innerX = x + rail;
  const innerY = y + rail;
  const innerW = Math.max(1, w - 2 * rail);
  const innerH = Math.max(1, h - 2 * rail - gap * (panels.length - 1));
  let cy = innerY;

  panels.forEach((panel, i) => {
    const ph = innerH * (panel.heightPct / 100);
    if (panel.fill === 'glass') {
      svg.appendChild(svgEl('rect', { x: innerX, y: cy, width: innerW, height: ph, class: 'svg-glass svg-door-panel-fill', rx: 1 }));
      if (panel.glassFinish === 'satinato') {
        for (let ly = cy + 4; ly < cy + ph - 2; ly += 6) {
          svg.appendChild(svgEl('line', { x1: innerX + 4, y1: ly, x2: innerX + innerW - 4, y2: ly, stroke: 'rgba(255,255,255,.62)', 'stroke-width': .5 }));
        }
      }
    } else {
      svg.appendChild(svgEl('rect', { x: innerX, y: cy, width: innerW, height: ph, class: 'svg-door-panel', rx: 1 }));
      svg.appendChild(svgEl('rect', { x: innerX + 4, y: cy + 4, width: Math.max(1, innerW - 8), height: Math.max(1, ph - 8), class: 'svg-door-panel-inner', rx: 1 }));
    }
    cy += ph + gap;
  });
}

function drawFlagHinges(svg, side, edgeX, y, h, profilePx) {
  const frameW = Math.max(3.5, Math.min(7, profilePx * 0.14));
  const leafW = Math.max(7, Math.min(14, profilePx * 0.34));
  const hingeH = Math.max(12, Math.min(28, h * 0.06));
  const leafH = Math.max(7, Math.min(14, hingeH * 0.58));
  const leafY = hy => hy + Math.max(1, hingeH * 0.14);
  const positions = [0.18, 0.5, 0.82];

  positions.forEach(pos => {
    const hy = y + h * pos - hingeH / 2;
    if (side === 'left') {
      svg.appendChild(svgEl('rect', { x: edgeX - frameW, y: hy, width: frameW, height: hingeH, class: 'svg-hinge-frame', rx: Math.min(3, frameW / 2) }));
      svg.appendChild(svgEl('rect', { x: edgeX, y: leafY(hy), width: leafW, height: leafH, class: 'svg-hinge-leaf', rx: 1 }));
    } else {
      svg.appendChild(svgEl('rect', { x: edgeX, y: hy, width: frameW, height: hingeH, class: 'svg-hinge-frame', rx: Math.min(3, frameW / 2) }));
      svg.appendChild(svgEl('rect', { x: edgeX - leafW, y: leafY(hy), width: leafW, height: leafH, class: 'svg-hinge-leaf', rx: 1 }));
    }
  });
}

function drawRollerBandHinges(svg, side, edgeX, y, h, profilePx) {
  const barrelW = Math.max(5, Math.min(11, profilePx * 0.22));
  const hingeH = Math.max(15, Math.min(30, h * 0.06));
  const capH = Math.max(2, Math.min(4, hingeH * 0.16));
  const x = edgeX - barrelW / 2;
  const positions = [0.18, 0.5, 0.82];

  positions.forEach(pos => {
    const hy = y + h * pos - hingeH / 2;
    svg.appendChild(svgEl('rect', { x, y: hy, width: barrelW, height: hingeH, class: 'svg-hinge-roller', rx: barrelW / 2 }));
    svg.appendChild(svgEl('line', { x1: x + 1, y1: hy + capH, x2: x + barrelW - 1, y2: hy + capH, class: 'svg-hinge-cap' }));
    svg.appendChild(svgEl('line', { x1: x + 1, y1: hy + hingeH - capH, x2: x + barrelW - 1, y2: hy + hingeH - capH, class: 'svg-hinge-cap' }));
  });
}

function drawDoorHinges(svg, style, side, edgeX, y, h, profilePx) {
  if (style === 'roller') drawRollerBandHinges(svg, side, edgeX, y, h, profilePx);
  else drawFlagHinges(svg, side, edgeX, y, h, profilePx);
}

function shouldDrawDoorHinges(el) {
  return !(el?.type === 'deur' && (el.doorSubtype || 'voordeur') === 'voordeur');
}

function drawDoorHandle(svg, edgeX, centerY, side, profilePx) {
  const plateW = Math.max(4, Math.min(7, profilePx * 0.13));
  const plateH = Math.max(16, Math.min(30, profilePx * 0.48));
  const leverW = Math.max(16, Math.min(30, profilePx * 0.56));
  const leverH = Math.max(3.5, Math.min(6, profilePx * 0.12));
  const plateX = side === 'left' ? edgeX : edgeX - plateW;
  const plateY = centerY - plateH / 2;
  const leverY = centerY - leverH / 2;
  const leverX = side === 'left' ? plateX + plateW - 1 : plateX - leverW + 1;

  svg.appendChild(svgEl('rect', { x: plateX, y: plateY, width: plateW, height: plateH, class: 'svg-door-handle', rx: 1 }));
  svg.appendChild(svgEl('rect', { x: leverX, y: leverY, width: leverW, height: leverH, class: 'svg-door-handle', rx: leverH / 2 }));
  svg.appendChild(svgEl('circle', { cx: side === 'left' ? plateX + plateW : plateX, cy: centerY, r: Math.max(1.6, leverH * 0.55), class: 'svg-door-handle' }));
}

function drawPane(svg, x, y, w, h, row, el, sashPx, opts = {}) {
  const isFactory = !!opts.isFactory;
  const pType = row.paneType;
  const isDoorPane = isDoorPaneType(pType);
  if (isDoorPane) {
    svg.appendChild(svgEl('rect', {
      x: x + 4, y: y + 4, width: w - 8, height: h - 8,
      fill: 'var(--surface-1)', stroke: 'var(--draw-glass-edge)', 'stroke-width': 1, rx: 2
    }));
  } else if (row.fill === 'panel') {
    svg.appendChild(svgEl('rect', {
      x: x + 4, y: y + 4, width: w - 8, height: h - 8,
      fill: 'var(--surface-3)', stroke: 'var(--draw-mull)', 'stroke-width': 1, rx: 2
    }));
  } else {
    svg.appendChild(svgEl('rect', {
      x: x + 4, y: y + 4, width: w - 8, height: h - 8,
      class: 'svg-glass', rx: 2
    }));
    if (row.glassFinish === 'satinato') {
      for (let i = 0; i < h; i += 6) {
        svg.appendChild(svgEl('line', { x1: x + 6, y1: y + 4 + i, x2: x + w - 6, y2: y + 4 + i, stroke: 'rgba(255,255,255,.6)', 'stroke-width': .5 }));
      }
    }
  }

  const doorPaneProfilePx = isDoorPane && el.type !== 'deur' ? sashPx * 2 : sashPx;
  const inset = Math.max(4, Math.min(isDoorPane ? doorPaneProfilePx : sashPx, Math.min(w, h) * (isDoorPane ? 0.16 : 0.12)));
  const isOpenable = ['draai', 'kiep', 'draaikiep', 'deur', 'schuif'].includes(pType);
  if (isOpenable) {
    svg.appendChild(svgEl('rect', {
      x: x + inset, y: y + inset, width: w - 2 * inset, height: h - 2 * inset,
      class: 'svg-sash', rx: 1
    }));
  }

  const sx = x + inset, sy = y + inset, sw = w - 2 * inset, sh = h - 2 * inset;
  const hinge = row.hinge || 'left';
  const hingeStyle = row.hingeStyle || 'flag';

  if (pType === 'draai' || pType === 'draaikiep') {
    const hx = hinge === 'left' ? sx : sx + sw;
    const handleX = hinge === 'left' ? sx + sw : sx;
    svg.appendChild(svgEl('path', { d: `M ${hx} ${sy} L ${handleX} ${sy + sh / 2} L ${hx} ${sy + sh}`, class: 'svg-op' }));
  }
  if (pType === 'deur') {
    const hx = hinge === 'left' ? x : x + w;
    const handleX = hinge === 'left' ? x + w : x;
    drawDoorLeafPanels(svg, sx, sy, sw, sh, doorPanelsFor(el, row), doorPaneProfilePx);
    svg.appendChild(svgEl('path', { d: `M ${hx} ${y} L ${handleX} ${y + h / 2} L ${hx} ${y + h}`, class: 'svg-op' }));
    drawDoorHandle(svg, hinge === 'left' ? sx + sw : sx, sy + sh * 0.5, hinge === 'left' ? 'right' : 'left', doorPaneProfilePx);
    if (shouldDrawDoorHinges(el)) {
      drawDoorHinges(svg, hingeStyle, hinge === 'left' ? 'left' : 'right', hinge === 'left' ? x : x + w, y, h, doorPaneProfilePx);
    }
  }
  if (pType === 'kiep' || pType === 'draaikiep') {
    svg.appendChild(svgEl('path', { d: `M ${sx} ${sy + sh} L ${sx + sw / 2} ${sy} L ${sx + sw} ${sy + sh}`, class: 'svg-op' }));
  }
  if (pType === 'schuif') {
    const ay = sy + sh / 2;
    const ax1 = sx + sw * 0.25, ax2 = sx + sw * 0.75;
    svg.appendChild(svgEl('path', { d: `M ${ax1} ${ay} L ${ax2} ${ay} M ${ax2 - 8} ${ay - 5} L ${ax2} ${ay} L ${ax2 - 8} ${ay + 5}`, class: 'svg-arrow' }));
  }
  if (pType === 'vent') {
    svg.appendChild(svgEl('rect', { x: x + 6, y: y + 6, width: w - 12, height: h - 12, fill: 'none', stroke: 'var(--draw-sash)', 'stroke-width': 1, rx: 1 }));
    const lines = Math.max(3, Math.floor((h - 12) / 8));
    for (let i = 1; i < lines; i++) {
      const ly = y + 6 + (h - 12) * (i / lines);
      svg.appendChild(svgEl('line', { x1: x + 10, y1: ly, x2: x + w - 10, y2: ly, stroke: 'var(--draw-arrow)', 'stroke-width': 1 }));
    }
  }
  if (pType === 'deur2') {
    const gap = Math.max(2, inset / 2);
    const lw = sw / 2 - gap / 2;
    const rox = sx + sw / 2 + gap / 2;
    const rw = sw - lw - gap;
    const seamX = x + w / 2;
    svg.appendChild(svgEl('rect', { x: sx,  y: sy, width: lw, height: sh, class: 'svg-sash', rx: 1 }));
    svg.appendChild(svgEl('rect', { x: rox, y: sy, width: rw, height: sh, class: 'svg-sash', rx: 1 }));
    svg.appendChild(svgEl('line', { x1: seamX, y1: y, x2: seamX, y2: y + h, class: 'svg-sash' }));
    const panels = doorPanelsFor(el, row);
    drawDoorLeafPanels(svg, sx, sy, lw, sh, panels, doorPaneProfilePx);
    drawDoorLeafPanels(svg, rox, sy, rw, sh, panels, doorPaneProfilePx);
    svg.appendChild(svgEl('path', { d: `M ${x} ${y} L ${seamX} ${y + h / 2} L ${x} ${y + h}`, class: 'svg-op' }));
    svg.appendChild(svgEl('path', { d: `M ${x + w} ${y} L ${seamX} ${y + h / 2} L ${x + w} ${y + h}`, class: 'svg-op' }));
    drawDoorHandle(svg, seamX - gap / 2, sy + sh * 0.5, 'right', doorPaneProfilePx);
    drawDoorHandle(svg, seamX + gap / 2, sy + sh * 0.5, 'left', doorPaneProfilePx);
    if (shouldDrawDoorHinges(el)) {
      drawDoorHinges(svg, hingeStyle, 'left', x, y, h, doorPaneProfilePx);
      drawDoorHinges(svg, hingeStyle, 'right', x + w, y, h, doorPaneProfilePx);
    }
  }
  if (pType === 'vast' && (isFactory || row.fill === 'glass')) {
    const cxm = x + w / 2, cym = y + h / 2;
    const sz = Math.min(w, h) * 0.05;
    svg.appendChild(svgEl('line', { x1: cxm - sz, y1: cym, x2: cxm + sz, y2: cym, stroke: 'var(--draw-mull)', 'stroke-width': 1 }));
    svg.appendChild(svgEl('line', { x1: cxm, y1: cym - sz, x2: cxm, y2: cym + sz, stroke: 'var(--draw-mull)', 'stroke-width': 1 }));
  }
}

function addColGrip(svg, cxPx, iy, ih, idx) {
  const g = svgEl('g', { class: 'grip grip-col', 'data-grip': 'col', 'data-idx': idx });
  // full-height invisible hit target
  g.appendChild(svgEl('rect', { x: cxPx - 8, y: iy, width: 16, height: ih, fill: 'transparent', style: 'cursor:ew-resize' }));
  // two visible handles top + bottom
  [iy + 16, iy + ih - 16].forEach(y => {
    g.appendChild(svgEl('circle', { cx: cxPx, cy: y, r: 8, class: 'grip-halo' }));
    g.appendChild(svgEl('circle', { cx: cxPx, cy: y, r: 5, class: 'grip-dot' }));
    g.appendChild(svgEl('line', { x1: cxPx - 2, y1: y - 4, x2: cxPx - 2, y2: y + 4, class: 'grip-bar' }));
    g.appendChild(svgEl('line', { x1: cxPx + 2, y1: y - 4, x2: cxPx + 2, y2: y + 4, class: 'grip-bar' }));
  });
  svg.appendChild(g);
}
function addRowGrip(svg, cxPx, cwPx, cyPx, colIdx, rowIdx) {
  const g = svgEl('g', { class: 'grip grip-row', 'data-grip': 'row', 'data-col': colIdx, 'data-idx': rowIdx });
  g.appendChild(svgEl('rect', { x: cxPx, y: cyPx - 8, width: cwPx, height: 16, fill: 'transparent', style: 'cursor:ns-resize' }));
  [cxPx + 16, cxPx + cwPx - 16].forEach(x => {
    g.appendChild(svgEl('circle', { cx: x, cy: cyPx, r: 8, class: 'grip-halo' }));
    g.appendChild(svgEl('circle', { cx: x, cy: cyPx, r: 5, class: 'grip-dot' }));
    g.appendChild(svgEl('line', { x1: x - 4, y1: cyPx - 2, x2: x + 4, y2: cyPx - 2, class: 'grip-bar' }));
    g.appendChild(svgEl('line', { x1: x - 4, y1: cyPx + 2, x2: x + 4, y2: cyPx + 2, class: 'grip-bar' }));
  });
  svg.appendChild(g);
}

function addTag(svg, cx, cy, text, anchor = 'middle', big = false) {
  const t = svgEl('text', { x: cx, y: cy, class: 'svg-tag-text', 'text-anchor': anchor, 'dominant-baseline': 'central' });
  if (big) t.setAttribute('font-size', '12');
  t.textContent = text;
  const w = text.length * (big ? 7 : 6) + 8;
  const h = big ? 18 : 14;
  const bx = anchor === 'middle' ? cx - w / 2 : (anchor === 'start' ? cx - 4 : cx - w + 4);
  svg.appendChild(svgEl('rect', { x: bx, y: cy - h / 2, width: w, height: h, class: 'svg-tag-bg', rx: 4 }));
  svg.appendChild(t);
}
function drawDimH(svg, x1, y, x2, y2, txt, opts = {}) {
  svg.appendChild(svgEl('line', { x1, y1: y, x2, y2, class: 'svg-dim-line' }));
  svg.appendChild(svgEl('line', { x1, y1: y - 4, x2: x1, y2: y + 4, class: 'svg-dim-line' }));
  svg.appendChild(svgEl('line', { x1: x2, y1: y - 4, x2: x2, y2: y + 4, class: 'svg-dim-line' }));
  const cx = (x1 + x2) / 2;
  const w = txt.length * 6 + 10;
  svg.appendChild(svgEl('rect', { x: cx - w / 2, y: y - 9, width: w, height: 14, class: 'svg-tag-bg', rx: 3 }));
  const t = svgEl('text', { x: cx, y, class: 'svg-dim-text', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  if (opts.compact) t.setAttribute('font-size', '10');
  t.textContent = txt;
  svg.appendChild(t);
}
function drawDimV(svg, x, y1, x2, y2, txt, opts = {}) {
  svg.appendChild(svgEl('line', { x1: x, y1, x2, y2, class: 'svg-dim-line' }));
  svg.appendChild(svgEl('line', { x1: x - 4, y1, x2: x + 4, y2: y1, class: 'svg-dim-line' }));
  svg.appendChild(svgEl('line', { x1: x - 4, y1: y2, x2: x + 4, y2, class: 'svg-dim-line' }));
  const cy = (y1 + y2) / 2;
  const w = txt.length * 6 + 10;
  svg.appendChild(svgEl('rect', { x: x - w / 2, y: cy - 7, width: w, height: 14, class: 'svg-tag-bg', rx: 3, transform: `rotate(-90 ${x} ${cy})` }));
  const t = svgEl('text', { x, y: cy, class: 'svg-dim-text', 'text-anchor': 'middle', 'dominant-baseline': 'central', transform: `rotate(-90 ${x} ${cy})` });
  if (opts.compact) t.setAttribute('font-size', '10');
  t.textContent = txt;
  svg.appendChild(t);
}

function shade(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0xff) + percent;
  let b = (num & 0xff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

function elementThumb(el) {
  const svg = svgEl('svg', { viewBox: '0 0 100 100' });
  const w = el.widthMM, h = el.heightMM;
  const aspect = w / h;
  let fw = 80, fh = fw / aspect;
  if (fh > 80) { fh = 80; fw = fh * aspect; }
  const fx = (100 - fw) / 2, fy = (100 - fh) / 2;
  const colorObj = COLORS.find(c => c.code === el.colorOutside);
  const fill = colorObj ? colorObj.hex : '#cbd5e1';
  svg.appendChild(svgEl('rect', { x: fx, y: fy, width: fw, height: fh, fill, stroke: shade(fill, -30), 'stroke-width': 1.5, rx: 1 }));
  const inset = 6;
  svg.appendChild(svgEl('rect', { x: fx + inset, y: fy + inset, width: fw - 2 * inset, height: fh - 2 * inset, fill: 'var(--draw-glass)', stroke: shade(fill, -30), 'stroke-width': .8 }));
  const cols = el.columns;
  const innerW = fw - 2 * inset;
  const colWPctSum = cols.reduce((a, c) => a + c.widthPct, 0) || 100;
  let cxc = fx + inset;
  cols.forEach((col, ci) => {
    const cw = innerW * (col.widthPct / colWPctSum);
    if (ci > 0) svg.appendChild(svgEl('line', { x1: cxc, y1: fy + inset, x2: cxc, y2: fy + fh - inset, stroke: shade(fill, -30), 'stroke-width': 1 }));
    const rowSum = col.rows.reduce((a, r) => a + (r.heightPct || 0), 0) || 100;
    let cyc = fy + inset;
    col.rows.forEach((r, ri) => {
      const rh = (fh - 2 * inset) * (r.heightPct / rowSum);
      if (ri > 0) svg.appendChild(svgEl('line', { x1: cxc, y1: cyc, x2: cxc + cw, y2: cyc, stroke: shade(fill, -30), 'stroke-width': 1 }));
      cyc += rh;
    });
    cxc += cw;
  });
  return svg;
}

// ============================================================
// DRAG INTERACTION
// ============================================================
let dragCtx = null;
function installDragHandlers() {
  const svg = document.getElementById('preview-svg');
  svg.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function svgPointToEl(ev) {
  const svg = document.getElementById('preview-svg');
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  return pt.matrixTransform(m.inverse());
}

function onPointerDown(ev) {
  const target = ev.target.closest('[data-grip], .svg-pane-hit');
  if (!target || !drawGeom) return;

  // pane click → select vak/kolom
  if (target.classList.contains('svg-pane-hit')) {
    const ci = +target.getAttribute('data-col');
    const ri = +target.getAttribute('data-row');
    const el = activeElement();
    el._activeColIdx = ci;
    el._activeRowIdx = ri;
    render();
    return;
  }

  ev.preventDefault();
  const type = target.getAttribute('data-grip');
  const p = svgPointToEl(ev);
  const el = activeElement();
  const g = drawGeom;

  if (type === 'col') {
    const idx = +target.getAttribute('data-idx');
    // neighbour widths in px
    const leftPx = g.colWPx[idx];
    const rightPx = g.colWPx[idx + 1];
    const sumPx = leftPx + rightPx;
    const leftStart = g.colXPx[idx];
    dragCtx = {
      type: 'col', idx, startX: p.x, leftStart, sumPx,
      leftPct0: el.columns[idx].widthPct, rightPct0: el.columns[idx + 1].widthPct,
    };
    document.body.classList.add('is-dragging-h');
  } else if (type === 'row') {
    const ci = +target.getAttribute('data-col');
    const idx = +target.getAttribute('data-idx');
    const col = el.columns[ci];
    const rowsGeom = g.rowsGeom[ci];
    const topPx = rowsGeom[idx].h;
    const bottomPx = rowsGeom[idx + 1].h;
    const sumPx = topPx + bottomPx;
    const topStart = rowsGeom[idx].y;
    dragCtx = {
      type: 'row', ci, idx, startY: p.y, topStart, sumPx,
      topPct0: col.rows[idx].heightPct, bottomPct0: col.rows[idx + 1].heightPct,
    };
    document.body.classList.add('is-dragging-v');
  }
}

function onPointerMove(ev) {
  if (!dragCtx || !drawGeom) return;
  const p = svgPointToEl(ev);
  const el = activeElement();
  const g = drawGeom;

  if (dragCtx.type === 'col') {
    const relPx = Math.max(20, Math.min(dragCtx.sumPx - 20, p.x - dragCtx.leftStart));
    const newLeftPct = (relPx / dragCtx.sumPx) * (dragCtx.leftPct0 + dragCtx.rightPct0);
    const newRightPct = (dragCtx.leftPct0 + dragCtx.rightPct0) - newLeftPct;
    el.columns[dragCtx.idx].widthPct = newLeftPct;
    el.columns[dragCtx.idx + 1].widthPct = newRightPct;
    render();
  } else if (dragCtx.type === 'row') {
    const relPx = Math.max(20, Math.min(dragCtx.sumPx - 20, p.y - dragCtx.topStart));
    const newTopPct = (relPx / dragCtx.sumPx) * (dragCtx.topPct0 + dragCtx.bottomPct0);
    const newBottomPct = (dragCtx.topPct0 + dragCtx.bottomPct0) - newTopPct;
    const col = el.columns[dragCtx.ci];
    col.rows[dragCtx.idx].heightPct = newTopPct;
    col.rows[dragCtx.idx + 1].heightPct = newBottomPct;
    render();
  }
}

function onPointerUp() {
  if (!dragCtx) return;
  dragCtx = null;
  document.body.classList.remove('is-dragging-h', 'is-dragging-v');
}

// ============================================================
// RENDER
// ============================================================
let _renderT;
function render() {
  cancelAnimationFrame(_renderT);
  _renderT = requestAnimationFrame(_render);
  saveState();
}
function _render() {
  state.elements.forEach(normalizeElementType);
  state.elements.forEach(applyDoorSubtypeLayout);
  renderConfig();
  renderProject();
  renderExtras();
  renderTotals();
  renderPreview();
  document.getElementById('offer-code').textContent = state.offerCode;
}

function renderDrawingOnly() {
  state.elements.forEach(normalizeElementType);
  state.elements.forEach(applyDoorSubtypeLayout);
  renderProject();
  renderTotals();
  renderPreview();
  saveState();
}

function typeIconSvg(type) {
  if (type === 'kozijn') return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="5" width="26" height="26" rx="1"/><line x1="18" y1="5" x2="18" y2="31"/><line x1="5" y1="18" x2="31" y2="18"/></svg>`;
  if (type === 'deur') return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="3" width="18" height="30" rx="1"/><circle cx="23" cy="18" r="1.2" fill="currentColor"/></svg>`;
  if (type === 'schuif') return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="30" height="22" rx="1"/><line x1="18" y1="7" x2="18" y2="29"/><path d="M9 18 L15 18 M13 16 L15 18 L13 20" stroke-linecap="round"/></svg>`;
  if (type === 'dak') return `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 30 L18 6 L31 30 Z"/><line x1="11.5" y1="18" x2="24.5" y2="18"/></svg>`;
  return '';
}

// ============================================================
// CONFIG PANEL
// ============================================================
function renderConfig() {
  const el = activeElement();
  if (!el) return;
  normalizeElementType(el);

  const root = document.getElementById('config-root');
  if (!root.dataset.built) {
    root.dataset.built = '1';
    root.innerHTML = buildConfigShell();
    bindConfigShell();
  }

  const typeGrid = root.querySelector('#type-grid');
  typeGrid.innerHTML = ELEMENT_TYPES.map(t => `
    <button class="type-card ${el.type === t.id ? 'is-active' : ''}" data-type="${t.id}">
      ${typeIconSvg(t.icon)}<span class="type-label">${t.label}</span>
    </button>`).join('');
  typeGrid.querySelectorAll('.type-card').forEach(c => {
    c.onclick = () => {
      const fresh = newElement(c.dataset.type, el.name);
      Object.assign(el, fresh, { id: el.id, name: el.name });
      render();
    };
  });

  const slideField = root.querySelector('#slide-system-field');
  slideField.style.display = el.type === 'schuifpui' ? '' : 'none';
  slideField.querySelectorAll('#slide-seg button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.v === (el.slideSystem || 'hst'));
  });

  const doorTypeField = root.querySelector('#door-type-field');
  const doorOptsField = root.querySelector('#door-options-field');
  doorTypeField.style.display = el.type === 'deur' ? '' : 'none';
  doorOptsField.style.display = el.type === 'deur' ? '' : 'none';
  if (el.type === 'deur') {
    const sub = el.doorSubtype || 'voordeur';
    doorTypeField.querySelectorAll('#door-seg button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.v === sub);
    });
    const DOOR_OPTS = {
      voordeur: [
        { key: 'epkSchuin',        label: 'EPK-1 + 16 deur (schuin)', price: 154.5 },
        { key: 'briefklep',        label: 'Briefklep',                 price: 257.5 },
        { key: 'briefbak',         label: 'Briefbak',                  price: 154.5 },
        { key: 'draadlozeBel',     label: 'Draadloze bel',             price: 103   },
        { key: 'zijlicht',         label: 'Zijlicht',                  price: 257.5 },
        { key: 'bovenlicht',       label: 'Bovenlicht',                price: 257.5 },
        { key: 'dddPaneel',        label: 'DDD Paneel',                price: 1545  },
        { key: 'paneelSierrooster',label: 'Paneel + sierrooster',      price: 2575  },
      ],
      achterdeur: [
        { key: 'zijlicht',   label: 'Zijlicht',   price: 257.5 },
        { key: 'bovenlicht', label: 'Bovenlicht',  price: 257.5 },
        { key: 'dddPaneel',  label: 'DDD Paneel',  price: 1545  },
      ],
      tuindeur: [
        { key: 'zijlichtKlein', label: 'Zijlicht tot 0,5M',    price: 515  },
        { key: 'zijlichtGroot', label: 'Zijlicht groter 0,5M', price: 1030 },
        { key: 'bovenlicht',    label: 'Bovenlicht',            price: 515  },
      ],
    };
    const opts = el.doorOptions || {};
    const optsList = root.querySelector('#door-opts-list');
    optsList.innerHTML = (DOOR_OPTS[sub] || []).map(o => `
      <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:13px;">
        <input type="checkbox" data-door-opt="${o.key}" ${opts[o.key] ? 'checked' : ''}/>
        <span style="flex:1">${o.label}</span>
        <span style="color:var(--text-muted);font-size:12px;">+${fmtEuro(o.price)}</span>
      </label>`).join('');
    optsList.querySelectorAll('[data-door-opt]').forEach(cb => {
      cb.onchange = () => {
        if (!el.doorOptions) el.doorOptions = {};
        el.doorOptions[cb.dataset.doorOpt] = cb.checked;
        render();
      };
    });
  }

  const isDoor = el.type === 'deur';
  ['#cols-count', '#col-dims', '#col-tabs', '#rows-count', '#row-dims', '#vak-tabs', '#pane-type'].forEach(sel => {
    const node = root.querySelector(sel);
    const field = node?.closest('.field');
    if (field) field.style.display = isDoor ? 'none' : '';
  });
  const normalVakDivider = root.querySelector('#vak-tabs')?.closest('.field')?.previousElementSibling;
  if (normalVakDivider?.classList?.contains('divider')) normalVakDivider.style.display = isDoor ? 'none' : '';
  root.querySelector('#door-vakken-fields').style.display = isDoor ? '' : 'none';
  if (isDoor) renderDoorPanelControls(root, el);

  if (document.activeElement?.id !== 'elem-name') root.querySelector('#elem-name').value = el.name;
  if (document.activeElement?.id !== 'elem-qty') root.querySelector('#elem-qty').value = el.qty;
  if (document.activeElement?.id !== 'width-mm') root.querySelector('#width-mm').value = el.widthMM;
  if (document.activeElement?.id !== 'height-mm') root.querySelector('#height-mm').value = el.heightMM;
  if (document.activeElement?.id !== 'cols-count') root.querySelector('#cols-count').value = el.columns.length;

  // Column widths (with drag-sync)
  const colDims = root.querySelector('#col-dims');
  colDims.innerHTML = el.columns.map((c, i) => `
    <div class="dim-row">
      <span class="dim-tag">K${i + 1}</span>
      <div class="input-wrap">
        <input class="input mono col-w" data-i="${i}" type="number" value="${Math.round(el.widthMM * c.widthPct / 100)}" step="1"/>
        <span class="input-suffix">mm</span>
      </div>
      <button class="btn btn-sm btn-ghost" data-eq="${i}" title="Verdeel gelijk">⇋</button>
    </div>`).join('');
  colDims.querySelectorAll('.col-w').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      const v = Math.max(150, +inp.value || 0);
      const others = el.columns.filter((_, j) => j !== i);
      const remPct = 100 - (v / el.widthMM) * 100;
      const otherSum = others.reduce((a, c) => a + c.widthPct, 0);
      el.columns[i].widthPct = (v / el.widthMM) * 100;
      others.forEach(c => c.widthPct = otherSum > 0 ? (c.widthPct / otherSum) * remPct : remPct / others.length);
      render();
    };
  });
  colDims.querySelectorAll('[data-eq]').forEach(b => {
    b.onclick = () => { el.columns.forEach(c => c.widthPct = 100 / el.columns.length); render(); };
  });

  // Active column tabs
  if (typeof el._activeColIdx !== 'number' || el._activeColIdx >= el.columns.length) el._activeColIdx = 0;
  const colTabs = root.querySelector('#col-tabs');
  colTabs.innerHTML = el.columns.map((c, i) => `<button class="vak-tab ${i === el._activeColIdx ? 'is-active' : ''}" data-col="${i}">K${i + 1}</button>`).join('');
  colTabs.querySelectorAll('.vak-tab').forEach(b => { b.onclick = () => { el._activeColIdx = +b.dataset.col; render(); }; });

  const activeCol = el.columns[el._activeColIdx];
  if (document.activeElement?.id !== 'rows-count') root.querySelector('#rows-count').value = activeCol.rows.length;

  // Row heights
  const rowDims = root.querySelector('#row-dims');
  rowDims.innerHTML = activeCol.rows.map((r, i) => `
    <div class="dim-row">
      <span class="dim-tag">V${i + 1}</span>
      <div class="input-wrap">
        <input class="input mono row-h" data-i="${i}" type="number" value="${Math.round(el.heightMM * r.heightPct / 100)}" step="1"/>
        <span class="input-suffix">mm</span>
      </div>
      <button class="btn btn-sm btn-ghost" data-eq="${i}">⇋</button>
    </div>`).join('');
  rowDims.querySelectorAll('.row-h').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      const v = Math.max(150, +inp.value || 0);
      const others = activeCol.rows.filter((_, j) => j !== i);
      const remPct = 100 - (v / el.heightMM) * 100;
      const otherSum = others.reduce((a, r) => a + r.heightPct, 0);
      activeCol.rows[i].heightPct = (v / el.heightMM) * 100;
      others.forEach(r => r.heightPct = otherSum > 0 ? (r.heightPct / otherSum) * remPct : remPct / others.length);
      render();
    };
  });
  rowDims.querySelectorAll('[data-eq]').forEach(b => {
    b.onclick = () => { activeCol.rows.forEach(r => r.heightPct = 100 / activeCol.rows.length); render(); };
  });

  // Vak tabs
  if (typeof el._activeRowIdx !== 'number' || el._activeRowIdx >= activeCol.rows.length) el._activeRowIdx = 0;
  const vakTabs = root.querySelector('#vak-tabs');
  vakTabs.innerHTML = activeCol.rows.map((r, i) => {
    const lbl = (PANE_TYPES[el.type] || []).find(p => p.id === r.paneType)?.label || r.paneType;
    return `<button class="vak-tab ${i === el._activeRowIdx ? 'is-active' : ''}" data-vak="${i}">V${i + 1}<span class="vak-tag">${lbl}</span></button>`;
  }).join('');
  vakTabs.querySelectorAll('.vak-tab').forEach(b => { b.onclick = () => { el._activeRowIdx = +b.dataset.vak; render(); }; });

  const activeRow = activeCol.rows[el._activeRowIdx];
  const paneSel = root.querySelector('#pane-type');
  const opts = PANE_TYPES[el.type] || PANE_TYPES.kozijn;
  paneSel.innerHTML = opts.map(o => `<option value="${o.id}" ${o.id === activeRow.paneType ? 'selected' : ''}>${o.label}</option>`).join('');

  const hingeField = root.querySelector('#hinge-field');
  const showHinge = ['draai', 'draaikiep', 'deur'].includes(activeRow.paneType);
  hingeField.style.display = showHinge ? '' : 'none';
  if (showHinge) hingeField.querySelector('select').value = activeRow.hinge || 'left';

  const hingeStyleField = root.querySelector('#hinge-style-field');
  const showHingeStyle = isDoorPaneType(activeRow.paneType);
  hingeStyleField.style.display = showHingeStyle ? '' : 'none';
  if (showHingeStyle) hingeStyleField.querySelector('select').value = activeRow.hingeStyle || 'flag';

  const fillField = root.querySelector('#fill-field');
  const showFill = ['vast', 'draai', 'draaikiep', 'kiep', 'deur', 'deur2'].includes(activeRow.paneType);
  fillField.style.display = showFill ? '' : 'none';
  if (showFill) fillField.querySelector('select').value = activeRow.fill || 'glass';

  const glassFields = root.querySelector('#glass-fields');
  const showGlass = activeRow.fill === 'glass' && activeRow.paneType !== 'vent';
  glassFields.style.display = showGlass ? '' : 'none';
  if (showGlass) {
    glassFields.querySelector('#glass-pack').value = activeRow.glassPack || 'HR++';
    glassFields.querySelector('#glass-finish').value = activeRow.glassFinish || 'clear';
  }
  if (isDoor) {
    hingeField.style.display = 'none';
    hingeStyleField.style.display = 'none';
    fillField.style.display = 'none';
    glassFields.style.display = 'none';
  }

  root.querySelector('#color-outside').value = el.colorOutside;
  root.querySelector('#color-inside').value = el.colorInside;
  root.querySelector('#finish-outside').value = el.finishOutside;
  root.querySelector('#finish-inside').value = el.finishInside;

  const swatchOut = root.querySelector('#color-outside-swatch');
  const swatchIn = root.querySelector('#color-inside-swatch');
  const co = COLORS.find(c => c.code === el.colorOutside);
  if (co) swatchOut.style.background = co.hex;
  const ciCode = el.colorInside === 'same' ? el.colorOutside : el.colorInside;
  const ciObj = COLORS.find(c => c.code === ciCode);
  if (ciObj) swatchIn.style.background = ciObj.hex;

  if (document.activeElement?.id !== 'montage') root.querySelector('#montage').value = state.montageEuro;
  if (document.activeElement?.id !== 'discount') root.querySelector('#discount').value = state.discountPct;

  ['name', 'projectName', 'address', 'postcode', 'city', 'phone', 'email', 'date', 'deliveryDate'].forEach(k => {
    const i = root.querySelector(`#cust-${k}`);
    if (i && document.activeElement !== i) i.value = state.customer[k] || '';
  });
}

function renderDoorPanelControls(root, el) {
  normalizeDoorPanels(el);
  const panels = el.doorPanels;
  const activeIdx = Math.min(el._activeDoorPanelIdx || 0, panels.length - 1);
  el._activeDoorPanelIdx = activeIdx;
  const activePanel = panels[activeIdx];
  const mainRow = el.columns?.[0]?.rows?.[0] || {};

  const hingeField = root.querySelector('#door-hinge-field');
  hingeField.style.display = (el.doorSubtype || 'voordeur') === 'tuindeur' ? 'none' : '';
  root.querySelector('#door-hinge').value = mainRow.hinge || 'left';
  const hingeStyleSelect = root.querySelector('#door-hinge-style');
  const hingeStyleWrap = hingeStyleSelect.closest('.field');
  hingeStyleWrap.style.display = (el.doorSubtype || 'voordeur') === 'voordeur' ? 'none' : '';
  hingeStyleSelect.value = mainRow.hingeStyle || 'flag';
  if (document.activeElement?.id !== 'door-panels-count') root.querySelector('#door-panels-count').value = panels.length;

  const dims = root.querySelector('#door-panel-dims');
  dims.innerHTML = panels.map((p, i) => `
    <div class="dim-row">
      <span class="dim-tag">D${i + 1}</span>
      <div class="input-wrap">
        <input class="input mono door-panel-h" data-i="${i}" type="number" value="${Math.round(el.heightMM * p.heightPct / 100)}" step="1"/>
        <span class="input-suffix">mm</span>
      </div>
      <button class="btn btn-sm btn-ghost" data-door-eq="${i}" type="button">=</button>
    </div>`).join('');
  dims.querySelectorAll('.door-panel-h').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      const v = Math.max(120, +inp.value || 0);
      const others = panels.filter((_, j) => j !== i);
      const remPct = Math.max(0, 100 - (v / el.heightMM) * 100);
      const otherSum = others.reduce((a, p) => a + p.heightPct, 0);
      panels[i].heightPct = Math.min(100, (v / el.heightMM) * 100);
      others.forEach(p => { p.heightPct = otherSum > 0 ? (p.heightPct / otherSum) * remPct : remPct / Math.max(1, others.length); });
      renderDrawingOnly();
    };
  });
  const tabs = root.querySelector('#door-panel-tabs');
  tabs.innerHTML = panels.map((p, i) => {
    const lbl = p.fill === 'glass' ? 'Glas' : 'Paneel';
    return `<button class="vak-tab ${i === activeIdx ? 'is-active' : ''}" data-door-panel="${i}">D${i + 1}<span class="vak-tag">${lbl}</span></button>`;
  }).join('');
  root.querySelector('#door-panel-fill').value = activePanel.fill || 'panel';
  const glassFields = root.querySelector('#door-glass-fields');
  glassFields.style.display = activePanel.fill === 'glass' ? '' : 'none';
  if (activePanel.fill === 'glass') {
    root.querySelector('#door-panel-glass-pack').value = activePanel.glassPack || 'HR++';
    root.querySelector('#door-panel-glass-finish').value = activePanel.glassFinish || 'clear';
  }
}

function buildConfigShell() {
  return `
    <div class="section is-open" data-sec="customer">
      <div class="section-head"><span class="section-title"><span class="step-num">1</span>Klantgegevens</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field"><label class="label">Klantnaam</label><input class="input" id="cust-name"/></div>
        <div class="field"><label class="label">Projectnaam</label><input class="input" id="cust-projectName"/></div>
        <div class="field"><label class="label">Adres</label><input class="input" id="cust-address"/></div>
        <div class="field-row">
          <div class="field"><label class="label">Postcode</label><input class="input mono" id="cust-postcode"/></div>
          <div class="field"><label class="label">Plaats</label><input class="input" id="cust-city"/></div>
        </div>
        <div class="field-row">
          <div class="field"><label class="label">Telefoon</label><input class="input mono" id="cust-phone"/></div>
          <div class="field"><label class="label">E-mail</label><input class="input" id="cust-email" type="email"/></div>
        </div>
        <div class="field-row">
          <div class="field"><label class="label">Offertedatum</label><input class="input" id="cust-date" type="date"/></div>
          <div class="field"><label class="label">Levering</label><input class="input" id="cust-deliveryDate" type="date"/></div>
        </div>
      </div>
    </div>

    <div class="section is-open" data-sec="element">
      <div class="section-head"><span class="section-title"><span class="step-num">2</span>Element</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field"><label class="label">Element type</label><div class="type-grid" id="type-grid"></div></div>
        <div class="field-row">
          <div class="field"><label class="label">Naam</label><input class="input" id="elem-name"/></div>
          <div class="field"><label class="label">Aantal</label><input class="input mono" id="elem-qty" type="number" min="1" step="1"/></div>
        </div>
        <div class="field" id="slide-system-field" style="display:none">
          <label class="label">Schuifsysteem</label>
          <div class="segmented full" id="slide-seg">
            <button data-v="hst">HST (hef-schuif)</button>
            <button data-v="psk">PSK (kiepschuif)</button>
          </div>
        </div>
        <div class="field" id="door-type-field" style="display:none">
          <label class="label">Deurtype</label>
          <div class="segmented full" id="door-seg">
            <button data-v="voordeur">Voordeur</button>
            <button data-v="achterdeur">Achterdeur</button>
            <button data-v="tuindeur">Tuindeur</button>
          </div>
        </div>
        <div id="door-options-field" style="display:none">
          <div class="field"><label class="label">Opties</label><div id="door-opts-list"></div></div>
        </div>
      </div>
    </div>

    <div class="section is-open" data-sec="dimensions">
      <div class="section-head"><span class="section-title"><span class="step-num">3</span>Maatvoering</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field-row">
          <div class="field"><label class="label">Breedte</label><div class="input-wrap"><input class="input mono with-suffix" id="width-mm" type="number" step="1"/><span class="input-suffix">mm</span></div></div>
          <div class="field"><label class="label">Hoogte</label><div class="input-wrap"><input class="input mono with-suffix" id="height-mm" type="number" step="1"/><span class="input-suffix">mm</span></div></div>
        </div>
        <div class="field"><label class="label">Aantal kolommen <span class="label-hint">(K1, K2, ...)</span></label><input class="input mono" id="cols-count" type="number" min="1" max="6" step="1"/></div>
        <div class="field"><label class="label">Kolombreedtes <span class="label-hint">· sleep ook de grepen in de tekening</span></label><div class="dim-list" id="col-dims"></div></div>
      </div>
    </div>

    <div class="section is-open" data-sec="vakken">
      <div class="section-head"><span class="section-title"><span class="step-num">4</span>Vakken</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field"><label class="label">Actieve kolom</label><div class="vak-tabs" id="col-tabs"></div></div>
        <div class="field"><label class="label">Aantal vakken in deze kolom</label><input class="input mono" id="rows-count" type="number" min="1" max="6" step="1"/></div>
        <div class="field"><label class="label">Vakhoogtes</label><div class="dim-list" id="row-dims"></div></div>
        <div class="divider"></div>
        <div class="field"><label class="label">Selecteer vak <span class="label-hint">· of klik op vak in tekening</span></label><div class="vak-tabs" id="vak-tabs"></div></div>
        <div class="field"><label class="label">Type vak</label><select class="select" id="pane-type"></select></div>
        <div class="field" id="hinge-field" style="display:none"><label class="label">Scharnierzijde</label><select class="select"><option value="left">Links</option><option value="right">Rechts</option></select></div>
        <div class="field" id="hinge-style-field" style="display:none"><label class="label">Scharnier type</label><select class="select"><option value="flag">Vlagscharnier</option><option value="roller">Rollerbandscharnier</option></select></div>
        <div class="field" id="fill-field" style="display:none"><label class="label">Vulling</label><select class="select"><option value="glass">Glas</option><option value="panel">Paneel</option></select></div>
        <div id="glass-fields" style="display:none">
          <div class="field-row">
            <div class="field"><label class="label">Beglazing</label>
              <select class="select" id="glass-pack"><option value="HR++">HR++ (Ug 1.0)</option><option value="HR+++">HR+++ (Ug 0.5)</option><option value="Triple">Triple (Ug 0.5)</option></select>
            </div>
            <div class="field"><label class="label">Afwerking</label>
              <select class="select" id="glass-finish"><option value="clear">Helder</option><option value="satinato">Satinato</option><option value="solar">Zonwerend</option></select>
            </div>
          </div>
        </div>
        <div id="door-vakken-fields" style="display:none">
          <div class="field" id="door-hinge-field"><label class="label">Scharnierzijde</label><select class="select" id="door-hinge"><option value="left">Links</option><option value="right">Rechts</option></select></div>
          <div class="field"><label class="label">Scharnier type</label><select class="select" id="door-hinge-style"><option value="flag">Vlagscharnier</option><option value="roller">Rollerbandscharnier</option></select></div>
          <div class="field"><label class="label">Aantal deurvakken</label><input class="input mono" id="door-panels-count" type="number" min="1" max="6" step="1"/></div>
          <div class="field"><label class="label">Deurvak hoogtes</label><div class="dim-list" id="door-panel-dims"></div></div>
          <div class="divider"></div>
          <div class="field"><label class="label">Selecteer deurvak</label><div class="vak-tabs" id="door-panel-tabs"></div></div>
          <div class="field"><label class="label">Vulling</label><select class="select" id="door-panel-fill"><option value="glass">Glas</option><option value="panel">Paneel</option></select></div>
          <div id="door-glass-fields" style="display:none">
            <div class="field-row">
              <div class="field"><label class="label">Beglazing</label>
                <select class="select" id="door-panel-glass-pack"><option value="HR++">HR++ (Ug 1.0)</option><option value="HR+++">HR+++ (Ug 0.5)</option><option value="Triple">Triple (Ug 0.5)</option></select>
              </div>
              <div class="field"><label class="label">Afwerking</label>
                <select class="select" id="door-panel-glass-finish"><option value="clear">Helder</option><option value="satinato">Satinato</option><option value="solar">Zonwerend</option></select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section is-open" data-sec="finish">
      <div class="section-head"><span class="section-title"><span class="step-num">5</span>Kleur & afwerking</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field-row">
          <div class="field">
            <label class="label">Kleur buiten <span id="color-outside-swatch" class="color-swatch"></span></label>
            <select class="select" id="color-outside">${COLORS.map(c => `<option value="${c.code}">${c.code} ${c.name}</option>`).join('')}</select>
          </div>
          <div class="field">
            <label class="label">Kleur binnen <span id="color-inside-swatch" class="color-swatch"></span></label>
            <select class="select" id="color-inside"><option value="same">Zelfde als buiten</option>${COLORS.map(c => `<option value="${c.code}">${c.code} ${c.name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label class="label">Afwerking buiten</label><select class="select" id="finish-outside"><option value="smooth">Glad</option><option value="woodgrain">Houtnerf</option></select></div>
          <div class="field"><label class="label">Afwerking binnen</label><select class="select" id="finish-inside"><option value="smooth">Glad</option><option value="woodgrain">Houtnerf</option></select></div>
        </div>
      </div>
    </div>

    <div class="section is-open" data-sec="pricing">
      <div class="section-head"><span class="section-title"><span class="step-num">6</span>Prijs & korting</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field-row">
          <div class="field"><label class="label">Montage</label><div class="input-wrap"><input class="input mono with-suffix" id="montage" type="number" step="50" value="0"/><span class="input-suffix">€</span></div></div>
          <div class="field"><label class="label">Korting</label><div class="input-wrap"><input class="input mono with-suffix" id="discount" type="number" step="0.5" value="0"/><span class="input-suffix">%</span></div></div>
        </div>
      </div>
    </div>`;
}

function bindConfigShell() {
  const root = document.getElementById('config-root');
  root.querySelectorAll('.section-head').forEach(h => { h.onclick = () => h.parentElement.classList.toggle('is-open'); });

  root.addEventListener('input', e => {
    const t = e.target;
    const el = activeElement();
    if (t.id === 'elem-name') { el.name = t.value; render(); return; }
    if (t.id === 'elem-qty') { el.qty = Math.max(1, +t.value || 1); render(); return; }
    if (t.id === 'width-mm') { el.widthMM = Math.max(400, +t.value || 1200); render(); return; }
    if (t.id === 'height-mm') { el.heightMM = Math.max(400, +t.value || 1400); render(); return; }
    if (t.id === 'door-panels-count') { setDoorPanelCount(el, t.value); render(); return; }
    if (t.id === 'door-hinge') {
      const row = el.columns?.[0]?.rows?.[0];
      if (row) row.hinge = t.value;
      render(); return;
    }
    if (t.id === 'door-hinge-style') {
      const row = el.columns?.[0]?.rows?.[0];
      if (row) row.hingeStyle = t.value;
      render(); return;
    }
    if (t.id === 'door-panel-fill') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].fill = t.value;
      render(); return;
    }
    if (t.id === 'door-panel-glass-pack') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].glassPack = t.value;
      render(); return;
    }
    if (t.id === 'door-panel-glass-finish') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].glassFinish = t.value;
      render(); return;
    }
    if (t.id === 'cols-count') {
      const n = Math.max(1, Math.min(6, +t.value || 1));
      while (el.columns.length < n) el.columns.push({ widthPct: 100 / n, rows: [{ paneType: 'vast', heightPct: 100, fill: 'glass' }] });
      while (el.columns.length > n) el.columns.pop();
      el.columns.forEach(c => c.widthPct = 100 / n);
      render(); return;
    }
    if (t.id === 'rows-count') {
      const c = el.columns[el._activeColIdx];
      const n = Math.max(1, Math.min(6, +t.value || 1));
      while (c.rows.length < n) c.rows.push({ paneType: 'vast', heightPct: 100 / n, fill: 'glass' });
      while (c.rows.length > n) c.rows.pop();
      c.rows.forEach(r => r.heightPct = 100 / n);
      render(); return;
    }
    if (t.id === 'pane-type') {
      el.columns[el._activeColIdx].rows[el._activeRowIdx].paneType = t.value;
      const r = el.columns[el._activeColIdx].rows[el._activeRowIdx];
      if (!r.fill) r.fill = 'glass';
      if (!r.hinge) r.hinge = 'left';
      if (isDoorPaneType(r.paneType) && !r.hingeStyle) r.hingeStyle = 'flag';
      render(); return;
    }
    if (t.id === 'color-outside') { el.colorOutside = t.value; render(); return; }
    if (t.id === 'color-inside') { el.colorInside = t.value; render(); return; }
    if (t.id === 'finish-outside') { el.finishOutside = t.value; render(); return; }
    if (t.id === 'finish-inside') { el.finishInside = t.value; render(); return; }
    if (t.id === 'glass-pack') { el.columns[el._activeColIdx].rows[el._activeRowIdx].glassPack = t.value; render(); return; }
    if (t.id === 'glass-finish') { el.columns[el._activeColIdx].rows[el._activeRowIdx].glassFinish = t.value; render(); return; }
    if (t.id === 'montage') { state.montageEuro = +t.value || 0; render(); return; }
    if (t.id === 'discount') { state.discountPct = +t.value || 0; render(); return; }
    if (t.id?.startsWith('cust-')) { state.customer[t.id.replace('cust-', '')] = t.value; render(); return; }
    if (t.closest('#hinge-field')) { el.columns[el._activeColIdx].rows[el._activeRowIdx].hinge = t.value; render(); return; }
    if (t.closest('#hinge-style-field')) { el.columns[el._activeColIdx].rows[el._activeRowIdx].hingeStyle = t.value; render(); return; }
    if (t.closest('#fill-field')) { el.columns[el._activeColIdx].rows[el._activeRowIdx].fill = t.value; render(); return; }
  });
  root.addEventListener('change', e => {
    const el = activeElement();
    if (e.target.id === 'door-hinge') {
      const row = el.columns?.[0]?.rows?.[0];
      if (row) row.hinge = e.target.value;
      render(); return;
    }
    if (e.target.id === 'door-hinge-style') {
      const row = el.columns?.[0]?.rows?.[0];
      if (row) row.hingeStyle = e.target.value;
      render(); return;
    }
    if (e.target.id === 'door-panel-fill') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].fill = e.target.value;
      render(); return;
    }
    if (e.target.id === 'door-panel-glass-pack') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].glassPack = e.target.value;
      render(); return;
    }
    if (e.target.id === 'door-panel-glass-finish') {
      normalizeDoorPanels(el);
      el.doorPanels[el._activeDoorPanelIdx || 0].glassFinish = e.target.value;
      render(); return;
    }
    if (e.target.closest('#hinge-style-field')) {
      el.columns[el._activeColIdx].rows[el._activeRowIdx].hingeStyle = e.target.value;
      render(); return;
    }
    if (['pane-type', 'color-outside', 'color-inside'].includes(e.target.id)) render();
  });
  root.addEventListener('click', e => {
    const doorPanelTab = e.target.closest('[data-door-panel]');
    if (doorPanelTab) {
      const el = activeElement();
      normalizeDoorPanels(el);
      el._activeDoorPanelIdx = Math.max(0, Math.min(el.doorPanels.length - 1, +doorPanelTab.dataset.doorPanel || 0));
      render(); return;
    }
    const doorEqual = e.target.closest('[data-door-eq]');
    if (doorEqual) {
      const el = activeElement();
      normalizeDoorPanels(el);
      el.doorPanels.forEach(p => { p.heightPct = 100 / el.doorPanels.length; });
      render(); return;
    }
    const seg = e.target.closest('#slide-seg button');
    if (seg) { activeElement().slideSystem = seg.dataset.v; render(); }
    const doorSeg = e.target.closest('#door-seg button');
    if (doorSeg) {
      const el = activeElement();
      el.doorSubtype = doorSeg.dataset.v;
      el.doorOptions = {};
      if (doorSeg.dataset.v === 'tuindeur') {
        el.columns = [{ widthPct: 100, rows: [tuindeurRowFrom(el)] }];
        el._activeColIdx = 0;
        el._activeRowIdx = 0;
      } else {
        el.columns = [{ widthPct: 100, rows: [{ paneType: 'deur', hinge: 'left', fill: 'panel', heightPct: 100 }] }];
      }
      render();
    }
  });
}

// ============================================================
// PROJECT LIST + TOTALS
// ============================================================
function renderProject() {
  const list = document.getElementById('element-list');
  list.innerHTML = '';
  state.elements.forEach((el, idx) => {
    const card = document.createElement('div');
    card.className = 'element-card' + (el.id === state.activeElementId ? ' is-active' : '');
    card.dataset.id = el.id;
    card.draggable = true;

    const thumb = document.createElement('div');
    thumb.className = 'element-thumb';
    thumb.appendChild(elementThumb(el));

    const info = document.createElement('div');
    info.className = 'element-info';
    info.innerHTML = `
      <div class="element-name">${escapeHtml(el.name)}</div>
      <div class="element-sub">${el.widthMM}×${el.heightMM} · ${el.qty}× · ${typeLabel(el.type)}</div>
      <div class="element-actions">
        <button class="btn btn-sm btn-ghost" data-act="dup" title="Dupliceer (Ctrl+D)">⧉</button>
        <button class="btn btn-sm btn-danger" data-act="del" title="Verwijder">✕</button>
      </div>`;
    const price = document.createElement('div');
    price.className = 'element-price';
    price.textContent = fmtEuro(priceElement(el));

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(price);

    card.onclick = (e) => {
      const act = e.target.closest('[data-act]');
      if (act) {
        e.stopPropagation();
        if (act.dataset.act === 'dup') duplicateElement(el.id);
        else if (act.dataset.act === 'del') deleteElement(el.id);
        return;
      }
      state.activeElementId = el.id;
      render();
    };

    // drag-reorder
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', el.id); card.classList.add('is-dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('is-dragover'); });
    card.addEventListener('dragleave', () => card.classList.remove('is-dragover'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('is-dragover');
      const srcId = e.dataTransfer.getData('text/plain');
      if (srcId === el.id) return;
      const srcIdx = state.elements.findIndex(x => x.id === srcId);
      const dstIdx = state.elements.findIndex(x => x.id === el.id);
      if (srcIdx < 0 || dstIdx < 0) return;
      const [moved] = state.elements.splice(srcIdx, 1);
      state.elements.splice(dstIdx, 0, moved);
      render();
    });

    list.appendChild(card);
  });
  document.getElementById('elem-count').textContent = state.elements.length + (state.elements.length === 1 ? ' element' : ' elementen');
}

function duplicateElement(id) {
  const el = state.elements.find(x => x.id === id);
  if (!el) return;
  const copy = JSON.parse(JSON.stringify(el));
  copy.id = uid();
  copy.name = el.name + ' (kopie)';
  const idx = state.elements.findIndex(x => x.id === id);
  state.elements.splice(idx + 1, 0, copy);
  state.activeElementId = copy.id;
  render();
  toast('Gedupliceerd');
}
function deleteElement(id) {
  if (state.elements.length === 1) { toast('Minimaal 1 element vereist'); return; }
  state.elements = state.elements.filter(x => x.id !== id);
  if (state.activeElementId === id) state.activeElementId = state.elements[0].id;
  render();
}

function typeLabel(t) { return ELEMENT_TYPES.find(e => e.id === t)?.label || t; }

function renderExtras() {
  const list = document.getElementById('extras-list');
  if (!list) return;
  if (!state.extras) state.extras = [];
  if (document.activeElement?.closest?.('#extras-list')) return;

  if (state.extras.length === 0) {
    list.innerHTML = '<div style="padding:6px 0 2px;color:var(--text-muted);font-size:12px;">Geen extra\'s toegevoegd.</div>';
    return;
  }

  list.innerHTML = state.extras.map((ex, i) => `
    <div class="extra-row" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);">
      <input class="input extra-name" data-i="${i}" placeholder="Omschrijving" value="${escapeHtml(ex.name)}" style="flex:1;min-width:0;font-size:12px;padding:4px 6px;"/>
      <input class="input mono extra-qty" data-i="${i}" type="number" min="1" step="1" value="${ex.qty}" style="width:46px;font-size:12px;padding:4px 6px;" title="Aantal"/>
      <input class="input mono extra-price" data-i="${i}" type="number" min="0" step="1" value="${ex.unitPrice}" style="width:70px;font-size:12px;padding:4px 6px;" title="Stukprijs €"/>
      <span class="extra-total mono" style="font-size:11px;color:var(--text-muted);min-width:60px;text-align:right;">${fmtEuro(ex.qty * ex.unitPrice)}</span>
      <button class="btn btn-sm btn-danger extra-del" data-i="${i}" style="padding:2px 6px;">✕</button>
    </div>`).join('');

  list.querySelectorAll('.extra-name').forEach(inp => {
    inp.oninput = () => { state.extras[+inp.dataset.i].name = inp.value; saveState(); };
  });
  list.querySelectorAll('.extra-qty').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      state.extras[i].qty = Math.max(1, +inp.value || 1);
      inp.closest('.extra-row').querySelector('.extra-total').textContent = fmtEuro(state.extras[i].qty * state.extras[i].unitPrice);
      renderTotals(); saveState();
    };
  });
  list.querySelectorAll('.extra-price').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      state.extras[i].unitPrice = Math.max(0, +inp.value || 0);
      inp.closest('.extra-row').querySelector('.extra-total').textContent = fmtEuro(state.extras[i].qty * state.extras[i].unitPrice);
      renderTotals(); saveState();
    };
  });
  list.querySelectorAll('.extra-del').forEach(btn => {
    btn.onclick = () => { state.extras.splice(+btn.dataset.i, 1); render(); };
  });
}

function renderTotals() {
  const t = projectTotals();
  const extraRows = (state.extras || []).map(ex =>
    `<div class="row muted"><span>${escapeHtml(ex.name || 'Extra')} (${ex.qty}×)</span><span class="v">${fmtEuro(ex.qty * ex.unitPrice)}</span></div>`
  ).join('');
  document.getElementById('totals-table').innerHTML = `
    <div class="row muted"><span>Materiaal (${state.elements.length} el.)</span><span class="v">${fmtEuro(t.material)}</span></div>
    ${extraRows}
    <div class="row muted"><span>Montage</span><span class="v">${fmtEuro(t.montage)}</span></div>
    <div class="row divider"><span>Subtotaal</span><span class="v">${fmtEuro(t.sub)}</span></div>
    ${t.discount > 0 ? `<div class="row muted"><span>Korting (${state.discountPct}%)</span><span class="v">−${fmtEuro(t.discount)}</span></div>` : ''}
    <div class="row muted"><span>Netto</span><span class="v">${fmtEuro(t.net)}</span></div>
    <div class="row muted"><span>BTW (21%)</span><span class="v">${fmtEuro(t.vat)}</span></div>
    <div class="row total"><span>Totaal incl.</span><span class="v">${fmtEuro(t.gross)}</span></div>`;
}

// ============================================================
// PREVIEW
// ============================================================
let previewState = { showDims: true, showFieldDims: false, showLabels: false, mode: 'sales' };

function renderPreview() {
  const el = activeElement();
  if (!el) return;
  const svg = document.getElementById('preview-svg');
  svg.dataset.mode = previewState.mode;
  drawElement(svg, el, previewState);

  document.getElementById('stat-dims').textContent = `${el.widthMM} × ${el.heightMM} mm`;
  document.getElementById('stat-area').textContent = ((el.widthMM * el.heightMM) / 1e6).toFixed(2) + ' m²';
  document.getElementById('stat-vakken').textContent = countVakken(el);
  document.getElementById('stat-price').textContent = fmtEuro(priceElement(el));
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function setSaveLabel(isDirty) {
  const lab = document.getElementById('save-label'); const dot = document.getElementById('save-dot');
  if (lab) lab.textContent = isDirty ? 'Opslaan…' : 'Opgeslagen';
  if (dot) dot.classList.toggle('dirty', !!isDirty);
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('is-show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('is-show'), 1800);
}

// ============================================================
// EXPORT JSON
// ============================================================
function exportDoorPanels(panels, fallbackFill = 'panel') {
  const src = (Array.isArray(panels) && panels.length) ? panels : [defaultDoorPanel(fallbackFill)];
  const sum = src.reduce((a, p) => a + (Number(p.heightPct) || 0), 0) || 100;
  return src.map(p => ({
    heightPct: +(((Number(p.heightPct) || 0) / sum) * 100).toFixed(2),
    fill: p.fill === 'glass' ? 'glass' : 'panel',
    glassPack: p.glassPack || 'HR++',
    glassFinish: p.glassFinish || 'clear',
  }));
}

function exportDoorPanelsForRow(el, row) {
  if (!isDoorPaneType(row?.paneType)) return undefined;
  const source = (Array.isArray(row.doorPanels) && row.doorPanels.length)
    ? row.doorPanels
    : (Array.isArray(el.doorPanels) && el.doorPanels.length ? el.doorPanels : null);
  return exportDoorPanels(source, row.fill === 'glass' ? 'glass' : 'panel');
}

function buildExportPayload() {
  state.elements.forEach(normalizeElementType);
  state.elements.forEach(applyDoorSubtypeLayout);
  const t = projectTotals();
  return {
    version: 'kozijnlab.v2', offerCode: state.offerCode, editOrderId: state.editOrderId, createdAt: new Date().toISOString(),
    customer: state.customer,
    project: { notes: state.notes, montageEuro: state.montageEuro, discountPct: state.discountPct, vatRate: state.vatRate },
    extras: (state.extras || []).map(ex => ({ id: ex.id, name: ex.name, qty: ex.qty, unitPrice: ex.unitPrice })),
    elements: state.elements.map(el => ({
      id: el.id, name: el.name, type: el.type, qty: el.qty,
      doorSubtype: el.type === 'deur' ? (el.doorSubtype || 'voordeur') : undefined,
      doorOptions: el.type === 'deur' ? (el.doorOptions || {}) : undefined,
      doorPanels: el.type === 'deur' ? exportDoorPanels(el.doorPanels, 'panel') : undefined,
      dimensions: { widthMM: el.widthMM, heightMM: el.heightMM, areaM2: +(el.widthMM * el.heightMM / 1e6).toFixed(3) },
      profile: el.profile,
      finish: { colorOutside: el.colorOutside, colorInside: el.colorInside, finishOutside: el.finishOutside, finishInside: el.finishInside },
      hardware: el.hardware,
      slideSystem: el.type === 'schuifpui' ? (el.slideSystem || 'hst') : undefined,
      columns: el.columns.map((col, ci) => ({
        index: ci + 1,
        widthMM: Math.round(el.widthMM * col.widthPct / 100),
        widthPct: +col.widthPct.toFixed(2),
        rows: col.rows.map((r, ri) => {
          const row = {
            index: ri + 1,
            heightMM: Math.round(el.heightMM * r.heightPct / 100),
            heightPct: +r.heightPct.toFixed(2),
            paneType: r.paneType, fill: r.fill, hinge: r.hinge,
            hingeStyle: r.hingeStyle || 'flag',
            glassPack: r.glassPack, glassFinish: r.glassFinish,
          };
          const doorPanels = exportDoorPanelsForRow(el, r);
          if (doorPanels) row.doorPanels = doorPanels;
          return row;
        }),
      })),
      pricePerUnit: priceElement(el) / el.qty, priceTotal: priceElement(el),
    })),
    totals: t,
  };
}
function openExport() {
  document.getElementById('json-output').textContent = JSON.stringify(buildExportPayload(), null, 2);
  document.getElementById('drawer').classList.add('is-open');
  document.getElementById('drawer-overlay').classList.add('is-open');
}
function closeExport() {
  document.getElementById('drawer').classList.remove('is-open');
  document.getElementById('drawer-overlay').classList.remove('is-open');
}

function importFromJSON(data) {
  if (!data || data.version !== 'kozijnlab.v2') { toast('Ongeldig bestand — versie niet herkend'); return; }

  const proj = data.project || {};
  const elements = (data.elements || []).map(e => {
    const dims = e.dimensions || {};
    const finish = e.finish || {};
    return {
      id: e.id || uid(),
      name: e.name || '',
      type: e.type === 'hefschuif' ? 'schuifpui' : (e.type || 'kozijn'),
      qty: e.qty || 1,
      widthMM: dims.widthMM || e.widthMM || 1200,
      heightMM: dims.heightMM || e.heightMM || 1400,
      profile: e.profile || defaultProfile(),
      colorOutside: finish.colorOutside || e.colorOutside || 'RAL7016',
      colorInside: finish.colorInside || e.colorInside || 'same',
      finishOutside: finish.finishOutside || e.finishOutside || 'smooth',
      finishInside: finish.finishInside || e.finishInside || 'smooth',
      hardware: e.hardware || 'siegenia',
      slideSystem: e.type === 'hefschuif' ? 'hst' : (e.slideSystem || 'hst'),
      doorSubtype: e.doorSubtype || 'voordeur',
      doorOptions: e.doorOptions || {},
      doorPanels: Array.isArray(e.doorPanels) ? e.doorPanels.map(p => ({
        heightPct: p.heightPct || 100,
        fill: p.fill === 'glass' ? 'glass' : 'panel',
        glassPack: p.glassPack || 'HR++',
        glassFinish: p.glassFinish || 'clear',
      })) : undefined,
      columns: (e.columns || []).map(col => ({
        widthPct: col.widthPct || 50,
        rows: (col.rows || []).map(r => ({
          paneType: r.paneType || 'vast',
          heightPct: r.heightPct || 100,
          fill: r.fill || 'glass',
          hinge: r.hinge || 'left',
          hingeStyle: r.hingeStyle || 'flag',
          glassPack: r.glassPack || 'HR++',
          glassFinish: r.glassFinish || 'clear',
          doorPanels: Array.isArray(r.doorPanels) ? r.doorPanels.map(p => ({
            heightPct: p.heightPct || 100,
            fill: p.fill === 'glass' ? 'glass' : 'panel',
            glassPack: p.glassPack || 'HR++',
            glassFinish: p.glassFinish || 'clear',
          })) : undefined,
        })),
      })),
      notes: e.notes || '',
    };
  });

  if (elements.length === 0) { toast('Geen elementen gevonden in bestand'); return; }

  state = {
    offerCode: data.offerCode || newOfferCode(),
    customer: data.customer || {},
    elements,
    activeElementId: elements[0].id,
    montageEuro: proj.montageEuro || 0,
    discountPct: proj.discountPct || 0,
    vatRate: proj.vatRate || 0.21,
    notes: proj.notes || '',
    extras: (data.extras || []).map(ex => ({ id: ex.id || uid(), name: ex.name || '', qty: ex.qty || 1, unitPrice: ex.unitPrice || 0 })),
  };

  const root = document.getElementById('config-root');
  delete root.dataset.built;
  render();
  toast('Project geladen ✓');
}

function loadProjectPayload(data) {
  importFromJSON(data);
  if (data.editOrderId) {
    state.editOrderId = data.editOrderId;
    state.editingExistingOrder = true;
  } else {
    delete state.editOrderId;
    delete state.editingExistingOrder;
  }
  render();
}

// ============================================================
// ECOPRO KOPPELING
// ============================================================
function submitToEcoPro() {
  const data = buildExportPayload();
  window.parent.postMessage({ type: 'KOZIJNLAB_SUBMIT', data }, '*');
  toast('Doorgestuurd naar EcoPro →');
}

// ============================================================
// TWEAKS
// ============================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "sky",
  "density": "comfortable"
}/*EDITMODE-END*/;

let tweaks = { ...TWEAK_DEFAULTS };
try { const saved = JSON.parse(localStorage.getItem('KL_V2_TWEAKS') || 'null'); if (saved) tweaks = { ...tweaks, ...saved }; } catch (e) {}

function applyTweaks() {
  document.documentElement.dataset.theme = tweaks.theme;
  document.documentElement.dataset.accent = tweaks.accent;
  document.documentElement.dataset.density = tweaks.density;
  localStorage.setItem('KL_V2_TWEAKS', JSON.stringify(tweaks));
  updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
  const btn = document.getElementById('btn-theme-toggle');
  if (!btn) return;
  btn.innerHTML = tweaks.theme === 'dark'
    ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
    : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  btn.title = tweaks.theme === 'dark' ? 'Licht thema' : 'Donker thema';
}

window.addEventListener('message', (e) => {
  if (e.data?.type === '__activate_edit_mode') document.getElementById('tweaks-panel').classList.add('is-open');
  if (e.data?.type === '__deactivate_edit_mode') document.getElementById('tweaks-panel').classList.remove('is-open');
  if (e.data?.type === 'KOZIJNLAB_LOAD_PROJECT') loadProjectPayload(e.data.data);
});

function bindTweaks() {
  const panel = document.getElementById('tweaks-panel');
  panel.querySelector('#tw-close').onclick = () => panel.classList.remove('is-open');
  panel.querySelectorAll('[data-theme-opt]').forEach(b => { b.onclick = () => setTweak('theme', b.dataset.themeOpt); });
  panel.querySelectorAll('[data-accent-opt]').forEach(b => { b.onclick = () => setTweak('accent', b.dataset.accentOpt); });
  panel.querySelectorAll('[data-density-opt]').forEach(b => { b.onclick = () => setTweak('density', b.dataset.densityOpt); });
  refreshTweaksUI();
}
function setTweak(k, v) { tweaks[k] = v; applyTweaks(); refreshTweaksUI(); persistTweak(); renderPreview(); }
function persistTweak() { try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: tweaks }, '*'); } catch (e) {} }
function refreshTweaksUI() {
  document.querySelectorAll('[data-theme-opt]').forEach(b => b.classList.toggle('is-active', b.dataset.themeOpt === tweaks.theme));
  document.querySelectorAll('[data-accent-opt]').forEach(b => b.classList.toggle('is-active', b.dataset.accentOpt === tweaks.accent));
  document.querySelectorAll('[data-density-opt]').forEach(b => b.classList.toggle('is-active', b.dataset.densityOpt === tweaks.density));
}

// ============================================================
// INIT
// ============================================================
function init() {
  applyTweaks();
  bindTweaks();

  document.getElementById('btn-theme-toggle').onclick = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');
  document.getElementById('btn-add-element').onclick = () => {
    const type = activeElement()?.type || 'kozijn';
    const el = newElement(type);
    state.elements.push(el);
    state.activeElementId = el.id;
    render();
    toast('Nieuw element toegevoegd');
  };
  document.getElementById('btn-export').onclick = openExport;
  document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
  document.getElementById('file-import').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        importFromJSON(imported);
        window.parent.postMessage({ type: 'KOZIJNLAB_PROJECT_STATE', editOrderId: imported.editOrderId || null }, '*');
      }
      catch (_) { toast('Kon bestand niet lezen'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  document.getElementById('btn-add-extra').onclick = () => {
    if (!state.extras) state.extras = [];
    state.extras.push({ id: uid(), name: '', qty: 1, unitPrice: 0 });
    render();
  };
  document.getElementById('btn-print').onclick = () => window.print();
  document.getElementById('btn-new-offer').onclick = () => {
    if (!confirm('Nieuwe offerte starten? Huidige wordt opgeslagen in lokale opslag.')) return;
    state = newProject();
    delete state.editOrderId;
    delete state.editingExistingOrder;
    render();
    window.parent.postMessage({ type: 'KOZIJNLAB_PROJECT_STATE', editOrderId: null }, '*');
    toast('Nieuwe offerte');
  };

  document.querySelectorAll('[data-mode-opt]').forEach(b => {
    b.onclick = () => {
      previewState.mode = b.dataset.modeOpt;
      document.querySelectorAll('[data-mode-opt]').forEach(x => x.classList.toggle('is-active', x === b));
      renderPreview();
    };
  });
  document.getElementById('toggle-dims').onclick = (e) => { previewState.showDims = !previewState.showDims; e.currentTarget.classList.toggle('is-active', previewState.showDims); renderPreview(); };
  document.getElementById('toggle-fielddims').onclick = (e) => { previewState.showFieldDims = !previewState.showFieldDims; e.currentTarget.classList.toggle('is-active', previewState.showFieldDims); renderPreview(); };
  document.getElementById('toggle-labels').onclick = (e) => { previewState.showLabels = !previewState.showLabels; e.currentTarget.classList.toggle('is-active', previewState.showLabels); renderPreview(); };

  document.getElementById('drawer-close').onclick = closeExport;
  document.getElementById('drawer-overlay').onclick = closeExport;
  document.getElementById('btn-copy-json').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('json-output').textContent).then(() => toast('JSON gekopieerd'));
  };
  document.getElementById('btn-download-json').onclick = () => {
    const txt = document.getElementById('json-output').textContent;
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kozijnlab-${state.offerCode}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('btn-toggle-config').onclick = () => document.querySelector('.col-config').classList.toggle('is-open');
  document.getElementById('btn-toggle-meta').onclick = () => document.querySelector('.col-meta').classList.toggle('is-open');

  document.getElementById('btn-to-ecopro').onclick = submitToEcoPro;
  window.addEventListener('message', e => {
    if (e.data?.type === 'REQUEST_SUBMIT') submitToEcoPro();
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateElement(state.activeElementId);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      if (e.altKey) return;
      const idx = state.elements.findIndex(x => x.id === state.activeElementId);
      const nxt = state.elements[(idx + 1) % state.elements.length];
      state.activeElementId = nxt.id; render();
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      if (e.altKey) return;
      const idx = state.elements.findIndex(x => x.id === state.activeElementId);
      const prev = state.elements[(idx - 1 + state.elements.length) % state.elements.length];
      state.activeElementId = prev.id; render();
    }
  });

  document.querySelector('[data-mode-opt="sales"]').classList.add('is-active');
  if (previewState.showDims) document.getElementById('toggle-dims').classList.add('is-active');

  installDragHandlers();
  render();

  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
}

document.addEventListener('DOMContentLoaded', init);
