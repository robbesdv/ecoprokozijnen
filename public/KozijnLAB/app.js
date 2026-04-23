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
  { id: 'hefschuif', label: 'Hefschuif', icon: 'schuif' },
  { id: 'dakraam', label: 'Dakraam', icon: 'dak' },
];

const PANE_TYPES = {
  kozijn: [
    { id: 'vast', label: 'Vast' },
    { id: 'draai', label: 'Draai' },
    { id: 'kiep', label: 'Kiep' },
    { id: 'draaikiep', label: 'Draai-kiep' },
    { id: 'vent', label: 'Ventilatie' },
  ],
  deur: [
    { id: 'deur', label: 'Deur' },
    { id: 'vast', label: 'Bovenlicht' },
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
    base.columns = [{ widthPct: 100, rows: [{ paneType: 'deur', hinge: 'left', fill: 'panel', heightPct: 100 }] }];
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

// ============================================================
// PRICING
// ============================================================
function priceElement(el) {
  if (!el) return 0;
  let base = 0;
  const wM = el.widthMM / 1000, hM = el.heightMM / 1000;
  const m2 = wM * hM;

  if (el.type === 'kozijn') {
    const vakken = countVakken(el);
    const startTable = { 1: 1406, 2: 1568, 3: 1730, 4: 1893, 5: 2055 };
    let s = startTable[Math.min(5, vakken)] || 1406;
    const wCm = Math.ceil(el.widthMM / 10);
    const hCm = Math.ceil(el.heightMM / 10);
    const wSteps = Math.max(0, Math.ceil((wCm - 70) / 10));
    const hSteps = Math.max(0, Math.ceil((hCm - 70) / 10));
    base = s + (wSteps + hSteps) * 26;
  } else if (el.type === 'deur') base = 1494 + m2 * 288;
  else if (el.type === 'schuifpui') base = 2266 + m2 * 876;
  else if (el.type === 'hefschuif') base = 3502 + m2 * 1133;
  else if (el.type === 'dakraam') base = 597 + m2 * 227;

  let openCount = 0;
  el.columns.forEach(col => col.rows.forEach(r => {
    if (['draai', 'kiep', 'draaikiep', 'deur'].includes(r.paneType)) openCount++;
  }));
  base += openCount * 144;

  let glassUpgrade = 0;
  el.columns.forEach(col => col.rows.forEach(r => {
    if (r.fill !== 'glass') return;
    const colW = el.widthMM * (col.widthPct / 100);
    const rowH = el.heightMM * (r.heightPct / 100);
    const am2 = (colW * rowH) / 1e6;
    const pack = r.glassPack || el.glassPack || 'HR++';
    if (pack === 'HR+++') glassUpgrade += am2 * 90;
    if (pack === 'Triple') glassUpgrade += am2 * 90;
    if (r.glassFinish === 'satinato') glassUpgrade += am2 * 19;
    if (r.glassFinish === 'solar') glassUpgrade += am2 * 60;
  }));
  base += glassUpgrade;

  if (el.colorInside !== 'same' && el.colorInside !== el.colorOutside) base += 185;
  if (el.finishOutside === 'woodgrain' || el.finishInside === 'woodgrain') base += 98;

  return Math.round(base * el.qty);
}

function countVakken(el) {
  let n = 0;
  el.columns.forEach(c => n += c.rows.length);
  return Math.max(1, n);
}

function projectTotals() {
  let material = 0;
  state.elements.forEach(el => material += priceElement(el));
  const montage = Number(state.montageEuro) || 0;
  const sub = material + montage;
  const discount = sub * ((Number(state.discountPct) || 0) / 100);
  const net = Math.max(0, sub - discount);
  const vat = net * (Number(state.vatRate) || 0);
  const gross = net + vat;
  return { material, montage, sub, discount, net, vat, gross };
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

  const profile = el.profile || defaultProfile();
  const framePx = profile.frameMM * scale;
  const sashPx = profile.sashMM * scale;
  const mullPx = profile.mullionMM * scale;
  const transPx = profile.transomMM * scale;
  const isSchuif = el.type === 'schuifpui' || el.type === 'hefschuif';

  // Outer frame
  svg.appendChild(svgEl('rect', { x: fx, y: fy, width: fw, height: fh, class: 'svg-frame', rx: 2 }));
  svg.appendChild(svgEl('rect', {
    x: fx + framePx, y: fy + framePx,
    width: fw - 2 * framePx, height: fh - 2 * framePx,
    class: 'svg-frame-inner', rx: 1
  }));

  const colorObj = COLORS.find(c => c.code === el.colorOutside);
  if (!isFactory && colorObj) {
    svg.querySelectorAll('.svg-frame').forEach(r => {
      r.setAttribute('fill', colorObj.hex);
      r.setAttribute('stroke', shade(colorObj.hex, -25));
    });
  }

  const ix = fx + framePx, iy = fy + framePx;
  const iw = fw - 2 * framePx, ih = fh - 2 * framePx;

  const cols = el.columns;
  const colWPct = cols.map(c => c.widthPct);
  const sumW = colWPct.reduce((a, b) => a + b, 0) || 100;
  const innerW = iw - mullPx * (cols.length - 1);
  const colWPx = colWPct.map(p => innerW * (p / sumW));
  const colXPx = [];
  let cx = ix;
  colWPx.forEach((w, i) => { colXPx.push(cx); cx += w + mullPx; });

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
      drawPane(svg, cxPx, cyPos, cwPx, rh, r, el, sashPx, isFactory);
      cyPos += rh + transPx;
    });
    rowsGeom.push(rowGeoms);
  });

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

function drawPane(svg, x, y, w, h, row, el, sashPx, isFactory) {
  if (row.fill === 'panel') {
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

  const pType = row.paneType;
  const inset = Math.max(4, Math.min(sashPx, Math.min(w, h) * 0.12));
  const isOpenable = ['draai', 'kiep', 'draaikiep', 'deur', 'schuif'].includes(pType);
  if (isOpenable) {
    svg.appendChild(svgEl('rect', {
      x: x + inset, y: y + inset, width: w - 2 * inset, height: h - 2 * inset,
      class: 'svg-sash', rx: 1
    }));
  }

  const sx = x + inset, sy = y + inset, sw = w - 2 * inset, sh = h - 2 * inset;
  const hinge = row.hinge || 'left';

  if (pType === 'draai' || pType === 'draaikiep' || pType === 'deur') {
    const hx = hinge === 'left' ? sx : sx + sw;
    const handleX = hinge === 'left' ? sx + sw : sx;
    svg.appendChild(svgEl('path', { d: `M ${hx} ${sy} L ${handleX} ${sy + sh / 2} L ${hx} ${sy + sh}`, class: 'svg-op' }));
    if (pType === 'deur') {
      const hdy = sy + sh * 0.5;
      const hdx = hinge === 'left' ? sx + sw - 8 : sx + 8;
      svg.appendChild(svgEl('rect', { x: hdx - 2, y: hdy - 6, width: 4, height: 12, fill: 'var(--draw-sash)', rx: 1 }));
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
  renderConfig();
  renderProject();
  renderTotals();
  renderPreview();
  document.getElementById('offer-code').textContent = state.offerCode;
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
  slideField.style.display = (el.type === 'schuifpui' || el.type === 'hefschuif') ? '' : 'none';
  slideField.querySelectorAll('#slide-seg button').forEach(b => {
    b.classList.toggle('is-active', b.dataset.v === (el.slideSystem || 'hst'));
  });

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
        <input class="input mono col-w" data-i="${i}" type="number" value="${Math.round(el.widthMM * c.widthPct / 100)}" step="10"/>
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
        <input class="input mono row-h" data-i="${i}" type="number" value="${Math.round(el.heightMM * r.heightPct / 100)}" step="10"/>
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

  const fillField = root.querySelector('#fill-field');
  const showFill = ['vast', 'draai', 'draaikiep', 'kiep', 'deur'].includes(activeRow.paneType);
  fillField.style.display = showFill ? '' : 'none';
  if (showFill) fillField.querySelector('select').value = activeRow.fill || 'glass';

  const glassFields = root.querySelector('#glass-fields');
  const showGlass = activeRow.fill === 'glass' && activeRow.paneType !== 'vent';
  glassFields.style.display = showGlass ? '' : 'none';
  if (showGlass) {
    glassFields.querySelector('#glass-pack').value = activeRow.glassPack || 'HR++';
    glassFields.querySelector('#glass-finish').value = activeRow.glassFinish || 'clear';
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
      </div>
    </div>

    <div class="section is-open" data-sec="dimensions">
      <div class="section-head"><span class="section-title"><span class="step-num">3</span>Maatvoering</span><span class="section-chev">▾</span></div>
      <div class="section-body">
        <div class="field-row">
          <div class="field"><label class="label">Breedte</label><div class="input-wrap"><input class="input mono with-suffix" id="width-mm" type="number" step="10"/><span class="input-suffix">mm</span></div></div>
          <div class="field"><label class="label">Hoogte</label><div class="input-wrap"><input class="input mono with-suffix" id="height-mm" type="number" step="10"/><span class="input-suffix">mm</span></div></div>
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
    if (t.closest('#fill-field')) { el.columns[el._activeColIdx].rows[el._activeRowIdx].fill = t.value; render(); return; }
  });
  root.addEventListener('change', e => {
    if (['pane-type', 'color-outside', 'color-inside'].includes(e.target.id)) render();
  });
  root.addEventListener('click', e => {
    const seg = e.target.closest('#slide-seg button');
    if (seg) { activeElement().slideSystem = seg.dataset.v; render(); }
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

function renderTotals() {
  const t = projectTotals();
  document.getElementById('totals-table').innerHTML = `
    <div class="row muted"><span>Materiaal (${state.elements.length} el.)</span><span class="v">${fmtEuro(t.material)}</span></div>
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
function buildExportPayload() {
  const t = projectTotals();
  return {
    version: 'kozijnlab.v2', offerCode: state.offerCode, createdAt: new Date().toISOString(),
    customer: state.customer,
    project: { notes: state.notes, montageEuro: state.montageEuro, discountPct: state.discountPct, vatRate: state.vatRate },
    elements: state.elements.map(el => ({
      id: el.id, name: el.name, type: el.type, qty: el.qty,
      dimensions: { widthMM: el.widthMM, heightMM: el.heightMM, areaM2: +(el.widthMM * el.heightMM / 1e6).toFixed(3) },
      profile: el.profile,
      finish: { colorOutside: el.colorOutside, colorInside: el.colorInside, finishOutside: el.finishOutside, finishInside: el.finishInside },
      hardware: el.hardware,
      slideSystem: (el.type === 'schuifpui' || el.type === 'hefschuif') ? el.slideSystem : undefined,
      columns: el.columns.map((col, ci) => ({
        index: ci + 1,
        widthMM: Math.round(el.widthMM * col.widthPct / 100),
        widthPct: +col.widthPct.toFixed(2),
        rows: col.rows.map((r, ri) => ({
          index: ri + 1,
          heightMM: Math.round(el.heightMM * r.heightPct / 100),
          heightPct: +r.heightPct.toFixed(2),
          paneType: r.paneType, fill: r.fill, hinge: r.hinge,
          glassPack: r.glassPack, glassFinish: r.glassFinish,
        })),
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
  document.getElementById('btn-print').onclick = () => window.print();
  document.getElementById('btn-new-offer').onclick = () => {
    if (!confirm('Nieuwe offerte starten? Huidige wordt opgeslagen in lokale opslag.')) return;
    state = newProject();
    render();
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
