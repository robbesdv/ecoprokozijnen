/* DakkapelLAB v1 — standalone configurator */
"use strict";

const STORAGE_KEY = "DL_V1_STATE";
const VAT = 0.21;

const RAL = [
  { code: "RAL9016", name: "Verkeerswit", hex: "#f6f6f3" },
  { code: "RAL9010", name: "Puur wit", hex: "#f4f4f0" },
  { code: "RAL9001", name: "Crèmewit", hex: "#f0ead6" },
  { code: "RAL7016", name: "Antraciet", hex: "#383e42" },
  { code: "RAL9005", name: "Zwart", hex: "#0a0a0d" },
  { code: "RAL7039", name: "Quartzgrijs", hex: "#6c6960" },
  { code: "RAL6009", name: "Dennegroen", hex: "#28352a" },
  { code: "GoudenEik", name: "Gouden eik", hex: "#9b7032" },
  { code: "IersEik", name: "Iers eik", hex: "#8b6743" },
  { code: "Palissander", name: "Palissander", hex: "#4a2b1a" },
  { code: "Mahonie", name: "Mahonie", hex: "#5c2d19" },
  { code: "DB703", name: "DB703", hex: "#8a8d8f" }
];
const RAL_MAP = Object.fromEntries(RAL.map(c => [c.code, c]));

const LOOKUPS = {
  material: {
    kunststof: { label: "Kunststof", pricePerM: 1680 },
    polyester: { label: "Polyester", pricePerM: 1980 },
    hout: { label: "Hout", pricePerM: 1520 },
    aluminium: { label: "Aluminium", pricePerM: 2180 }
  },
  model: {
    plat: "Plat dak",
    schuin: "Schuin dak",
    nokverhoging: "Nokverhoging",
    prefab: "Prefab dakkapel"
  },
  roofCover: {
    epdm: "EPDM",
    bitumen: "Bitumen",
    pvc: "PVC dakbedekking",
    zink: "Zink"
  },
  finishInside: {
    onafgewerkt: "Onafgewerkt",
    behangklaar: "Behangklaar",
    sausklaar: "Sausklaar",
    compleet: "Compleet afgewerkt"
  },
  bayType: {
    vast: "Vast glas",
    draaikiep: "Draai-kiep",
    draai: "Draai",
    kiep: "Kiep",
    paneel: "Paneel"
  }
};

function uid(prefix = "id") { return prefix + "_" + Math.random().toString(36).slice(2, 9); }
function clamp(n, min, max) { n = Number(n); if (!Number.isFinite(n)) return min; return Math.max(min, Math.min(max, n)); }
function euro(n) { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0); }
function mm(n) { return `${Math.round(Number(n) || 0)} mm`; }
function m2(n) { return `${(Number(n) || 0).toFixed(2).replace(".", ",")} m²`; }
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
function color(code) { return (RAL_MAP[code] || RAL_MAP.RAL7016).hex; }
function labelOf(map, key) { return map[key] || key || "-"; }

function newOfferCode() {
  const d = new Date();
  return `DK-${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*9000+1000)}`;
}

function defaultBays() {
  return [
    { id: uid("bay"), widthPct: 33.33, type: "draaikiep", hinge: "left", glassPack: "HR++", glassFinish: "clear", ventilator: true, sun: "none" },
    { id: uid("bay"), widthPct: 33.34, type: "vast", hinge: "left", glassPack: "HR++", glassFinish: "clear", ventilator: false, sun: "none" },
    { id: uid("bay"), widthPct: 33.33, type: "draaikiep", hinge: "right", glassPack: "HR++", glassFinish: "clear", ventilator: true, sun: "none" }
  ];
}

function newProject() {
  return {
    version: "dakkapellab.v1",
    offerCode: newOfferCode(),
    customer: { name: "", projectName: "Dakkapel offerte", address: "", postcode: "", city: "", phone: "", email: "", date: new Date().toISOString().slice(0, 10), deliveryDate: "" },
    dakkapel: {
      model: "plat",
      material: "kunststof",
      widthMM: 4000,
      frontHeightMM: 1250,
      depthMM: 1500,
      roofSlopeDeg: 0,
      roofCover: "epdm",
      roofInsulation: "rc6",
      sideWallInsulation: "rc6",
      colorOutside: "RAL7016",
      colorInside: "RAL9016",
      finishOutside: "houtnerf",
      finishInside: "behangklaar",
      profileSystem: "Schüco Living Variant",
      boeideelHeightMM: 250,
      overhangMM: 100,
      sillType: "kunststof lekdorpel",
      cheeks: { left: true, right: true, thicknessMM: 120, material: "kunststof", color: "same" },
      bays: defaultBays(),
      options: {
        rolluiken: false,
        screens: false,
        horren: true,
        insectScreensCount: 2,
        ventilationGlobal: true,
        insideFinish: "behangklaar",
        electricalPoints: 2,
        spots: 0,
        demolitionOld: false,
        crane: true,
        scaffold: false,
        permitSupport: false,
        transport: true,
        plastering: false,
        painting: false,
        rainPipe: false
      }
    },
    pricing: { discountPct: 0, marginPct: 0, vatRate: VAT, manualAdjustment: 0 },
    notes: "",
    internalNotes: "",
    extras: []
  };
}

let state = loadState() || newProject();
let ui = { view: "front", dims: true, labels: true, workorder: false, openSections: new Set(["customer", "base", "layout", "pricing"]) };
let saveTimer = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== "dakkapellab.v1") return null;
    parsed.dakkapel.bays = normalizeBays(parsed.dakkapel.bays || defaultBays());
    return parsed;
  } catch { return null; }
}

function saveState() {
  clearTimeout(saveTimer);
  setSaveDirty(true);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    setSaveDirty(false);
  }, 220);
}

function setSaveDirty(dirty) {
  const dot = document.getElementById("save-dot");
  const label = document.getElementById("save-label");
  if (dot) dot.classList.toggle("dirty", dirty);
  if (label) label.textContent = dirty ? "Wijzigingen" : "Opgeslagen";
}

function normalizeBays(bays) {
  let list = Array.isArray(bays) && bays.length ? bays : defaultBays();
  list = list.slice(0, 8).map((b, i) => ({
    id: b.id || uid("bay"),
    widthPct: Math.max(1, Number(b.widthPct) || (100 / list.length)),
    type: b.type || "vast",
    hinge: b.hinge || (i % 2 ? "right" : "left"),
    glassPack: b.glassPack || "HR++",
    glassFinish: b.glassFinish || "clear",
    ventilator: !!b.ventilator,
    sun: b.sun || "none"
  }));
  const total = list.reduce((s, b) => s + b.widthPct, 0) || 100;
  list.forEach(b => b.widthPct = b.widthPct / total * 100);
  return list;
}

function renderOutputs() {
  renderPreview();
  renderTotals();
  renderWorkorder();
  renderStats();
  renderJson();
}

function setPath(path, value, rerenderConfig = false) {
  const parts = path.split(".");
  let target = state;
  while (parts.length > 1) target = target[parts.shift()];
  const key = parts[0];
  const old = target[key];
  if (typeof old === "number") value = Number(value) || 0;
  if (typeof old === "boolean") value = value === true || value === "true" || value === "on";
  target[key] = value;
  state.dakkapel.bays = normalizeBays(state.dakkapel.bays);
  if (rerenderConfig) renderAll(); else renderOutputs();
  saveState();
}

function setBay(id, key, value, rerenderConfig = false) {
  const bay = state.dakkapel.bays.find(b => b.id === id);
  if (!bay) return;
  if (key === "widthPct") value = Number(value) || 1;
  if (key === "ventilator") value = value === true || value === "true" || value === "on";
  bay[key] = value;
  state.dakkapel.bays = normalizeBays(state.dakkapel.bays);
  if (rerenderConfig) renderAll(); else renderOutputs();
  saveState();
}

function addBay() {
  state.dakkapel.bays.push({ id: uid("bay"), widthPct: 100 / (state.dakkapel.bays.length + 1), type: "vast", hinge: "left", glassPack: "HR++", glassFinish: "clear", ventilator: false, sun: "none" });
  state.dakkapel.bays = normalizeBays(state.dakkapel.bays);
  renderAll(); saveState();
}
function removeBay(id) {
  if (state.dakkapel.bays.length <= 1) return toast("Minimaal 1 vak nodig");
  state.dakkapel.bays = normalizeBays(state.dakkapel.bays.filter(b => b.id !== id));
  renderAll(); saveState();
}
function duplicateBay(id) {
  const bay = state.dakkapel.bays.find(b => b.id === id);
  if (!bay || state.dakkapel.bays.length >= 8) return;
  state.dakkapel.bays.push({ ...bay, id: uid("bay") });
  state.dakkapel.bays = normalizeBays(state.dakkapel.bays);
  renderAll(); saveState();
}
function setBayCount(count) {
  count = clamp(count, 1, 8);
  const current = state.dakkapel.bays;
  while (current.length < count) current.push({ id: uid("bay"), widthPct: 100 / count, type: "vast", hinge: "left", glassPack: "HR++", glassFinish: "clear", ventilator: false, sun: "none" });
  while (current.length > count) current.pop();
  current.forEach(b => b.widthPct = 100 / count);
  state.dakkapel.bays = normalizeBays(current);
  renderAll(); saveState();
}

function addExtra() {
  state.extras.push({ id: uid("extra"), name: "Extra post", qty: 1, unitPrice: 0 });
  renderAll(); saveState();
}
function setExtra(id, key, value) {
  const ex = state.extras.find(e => e.id === id);
  if (!ex) return;
  if (["qty", "unitPrice"].includes(key)) value = Number(value) || 0;
  ex[key] = value;
  renderOutputs(); saveState();
}
function removeExtra(id) { state.extras = state.extras.filter(e => e.id !== id); renderAll(); saveState(); }

function surfaces() {
  const d = state.dakkapel;
  const w = d.widthMM / 1000, h = d.frontHeightMM / 1000, depth = d.depthMM / 1000;
  return {
    frontM2: w * h,
    roofM2: w * depth,
    sideM2: depth * h * ((d.cheeks.left ? 1 : 0) + (d.cheeks.right ? 1 : 0)),
    glassM2: d.bays.filter(b => b.type !== "paneel").reduce((s, b) => s + (w * (b.widthPct / 100) * h * 0.74), 0)
  };
}

function priceLine(label, qty, unitIncl, category, meta = {}) {
  const q = Number(qty) || 0;
  const u = Number(unitIncl) || 0;
  return { label, qty: q, unitIncl: u, totalIncl: q * u, category, meta };
}

function calculate() {
  const d = state.dakkapel;
  const s = surfaces();
  const wM = d.widthMM / 1000;
  const hM = d.frontHeightMM / 1000;
  const depthM = d.depthMM / 1000;
  const material = LOOKUPS.material[d.material] || LOOKUPS.material.kunststof;
  const lines = [];

  let base = Math.max(2850, wM * material.pricePerM);
  if (d.model === "schuin") base *= 1.08;
  if (d.model === "nokverhoging") base *= 1.32;
  if (d.model === "prefab") base *= 0.94;
  lines.push(priceLine(`Basis ${labelOf(LOOKUPS.model, d.model)} ${material.label}`, 1, base, "basis"));

  if (depthM > 1.5) lines.push(priceLine("Diepte toeslag boven 1500 mm", wM * (depthM - 1.5), 420, "basis"));
  if (hM > 1.25) lines.push(priceLine("Hoogte toeslag boven 1250 mm", wM * (hM - 1.25), 380, "basis"));

  const roofUnit = d.roofCover === "zink" ? 165 : d.roofCover === "pvc" ? 105 : d.roofCover === "bitumen" ? 95 : 115;
  lines.push(priceLine(`Dakbedekking ${labelOf(LOOKUPS.roofCover, d.roofCover)}`, s.roofM2, roofUnit, "dak"));
  const insulationUnit = d.roofInsulation === "rc7" ? 155 : d.roofInsulation === "rc6" ? 130 : d.roofInsulation === "rc4" ? 95 : 0;
  if (insulationUnit) lines.push(priceLine(`Dakisolatie ${String(d.roofInsulation).toUpperCase()}`, s.roofM2, insulationUnit, "dak"));
  lines.push(priceLine("Boeidelen en dakrandafwerking", wM, Math.max(210, d.boeideelHeightMM * 0.78), "dak"));
  if (d.overhangMM > 80) lines.push(priceLine("Overstek afwerking", wM, d.overhangMM * 0.72, "dak"));

  const sideUnit = d.material === "hout" ? 185 : d.material === "aluminium" ? 260 : d.material === "polyester" ? 230 : 205;
  if (s.sideM2) lines.push(priceLine("Zijwangen geïsoleerd en afgewerkt", s.sideM2, sideUnit, "zijwangen"));

  d.bays.forEach((b, idx) => {
    const bw = d.widthMM * b.widthPct / 100 / 1000;
    const bayM2 = bw * hM * 0.74;
    const typeBase = { vast: 310, draai: 520, kiep: 470, draaikiep: 640, paneel: 260 }[b.type] || 310;
    lines.push(priceLine(`Vak ${idx + 1}: ${labelOf(LOOKUPS.bayType, b.type)}`, 1, typeBase + bw * 80, "voorzijde", { bay: idx + 1 }));
    if (b.type !== "paneel") {
      if (b.glassPack === "HR+++") lines.push(priceLine(`Vak ${idx + 1}: triple glas toeslag`, bayM2, 105, "glas"));
      if (b.glassFinish === "solar") lines.push(priceLine(`Vak ${idx + 1}: zonwerend glas`, bayM2, 70, "glas"));
      if (b.glassFinish === "satinato") lines.push(priceLine(`Vak ${idx + 1}: melkglas`, bayM2, 25, "glas"));
      if (b.ventilator) lines.push(priceLine(`Vak ${idx + 1}: ventilatierooster`, bw * 100, 3.25, "ventilatie"));
      if (b.sun === "screen") lines.push(priceLine(`Vak ${idx + 1}: screen`, bw, 390, "zonwering"));
      if (b.sun === "rolluik") lines.push(priceLine(`Vak ${idx + 1}: rolluik`, bw, 510, "zonwering"));
    }
  });

  if (d.options.rolluiken) lines.push(priceLine("Rolluiken volledige voorzijde", wM, 485, "zonwering"));
  if (d.options.screens) lines.push(priceLine("Screens volledige voorzijde", wM, 365, "zonwering"));
  if (d.options.horren) lines.push(priceLine("Horren", d.options.insectScreensCount || openableBayCount(), 85, "comfort"));
  if (d.options.electricalPoints) lines.push(priceLine("Elektrapunten", d.options.electricalPoints, 95, "afwerking"));
  if (d.options.spots) lines.push(priceLine("Inbouwspots", d.options.spots, 85, "afwerking"));
  if (d.options.insideFinish === "behangklaar") lines.push(priceLine("Binnenafwerking behangklaar", wM, 360, "afwerking"));
  if (d.options.insideFinish === "sausklaar") lines.push(priceLine("Binnenafwerking sausklaar", wM, 520, "afwerking"));
  if (d.options.insideFinish === "compleet") lines.push(priceLine("Binnenafwerking compleet", wM, 690, "afwerking"));
  if (d.options.plastering) lines.push(priceLine("Stucwerk dagkanten", wM, 180, "afwerking"));
  if (d.options.painting) lines.push(priceLine("Schilderwerk binnenzijde", wM, 145, "afwerking"));
  if (d.options.rainPipe) lines.push(priceLine("Hemelwaterafvoer aanpassen", 1, 245, "montage"));
  if (d.options.demolitionOld) lines.push(priceLine("Verwijderen oude dakkapel", 1, 850, "montage"));
  if (d.options.crane) lines.push(priceLine("Kraan / hijswerk", 1, 750, "montage"));
  if (d.options.scaffold) lines.push(priceLine("Steigerwerk", 1, 680, "montage"));
  if (d.options.permitSupport) lines.push(priceLine("Vergunningsbegeleiding", 1, 395, "service"));
  if (d.options.transport) lines.push(priceLine("Transport en logistiek", 1, 325, "montage"));

  state.extras.filter(e => String(e.name || "").trim() || Number(e.unitPrice) > 0).forEach(e => {
    lines.push(priceLine(`Extra: ${e.name || "Project extra"}`, e.qty || 1, e.unitPrice || 0, "extra"));
  });

  if (state.pricing.manualAdjustment) lines.push(priceLine("Handmatige correctie", 1, state.pricing.manualAdjustment, "correctie"));

  const subtotalIncl = lines.reduce((s, l) => s + l.totalIncl, 0);
  const discount = subtotalIncl * ((Number(state.pricing.discountPct) || 0) / 100);
  const afterDiscountIncl = subtotalIncl - discount;
  const margin = afterDiscountIncl * ((Number(state.pricing.marginPct) || 0) / 100);
  const gross = Math.round((afterDiscountIncl + margin) * 100) / 100;
  const net = Math.round((gross / (1 + VAT)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;

  return { lines, subtotalIncl, discount, margin, gross, net, vat, surfaces: s };
}

function openableBayCount() { return state.dakkapel.bays.filter(b => ["draai", "kiep", "draaikiep"].includes(b.type)).length || 1; }

function buildPayload() {
  const totals = calculate();
  const c = state.customer;
  return {
    version: "dakkapellab.v1",
    offerCode: state.offerCode,
    customer: { ...c },
    project: { notes: state.notes, internalNotes: state.internalNotes, discountPct: state.pricing.discountPct, vatRate: VAT },
    dakkapel: JSON.parse(JSON.stringify(state.dakkapel)),
    extras: JSON.parse(JSON.stringify(state.extras)),
    totals: { net: totals.net, vat: totals.vat, gross: totals.gross, discount: totals.discount, margin: totals.margin, subtotalIncl: totals.subtotalIncl, surfaces: totals.surfaces },
    lineItems: totals.lines.map((l, idx) => ({
      sortOrder: idx,
      description: l.label,
      quantity: l.qty,
      unitPriceIncl: Math.round(l.unitIncl * 100) / 100,
      unitPriceExVat: Math.round((l.unitIncl / (1 + VAT)) * 100) / 100,
      totalIncl: Math.round(l.totalIncl * 100) / 100,
      category: l.category,
      meta: l.meta || null
    }))
  };
}

function renderAll() {
  document.getElementById("offer-code").textContent = state.offerCode;
  renderConfig();
  renderPreview();
  renderTotals();
  renderWorkorder();
  renderStats();
  renderJson();
}

function renderConfig() {
  const root = document.getElementById("config-root");
  const d = state.dakkapel;
  const c = state.customer;
  root.innerHTML = [
    section("customer", "1", "Klant en project", customerFields(c)),
    section("base", "2", "Basis dakkapel", baseFields(d)),
    section("material", "3", "Materiaal en kleuren", materialFields(d)),
    section("layout", "4", "Voorzijde en vakken", layoutFields(d)),
    section("glass", "5", "Glas, ventilatie en zonwering", glassFields(d)),
    section("roof", "6", "Dak, boeideel en zijwangen", roofFields(d)),
    section("finish", "7", "Montage en afwerking", finishFields(d)),
    section("extras", "8", "Extra posten", extrasFields()),
    section("pricing", "9", "Prijsinstellingen", pricingFields()),
    section("notes", "10", "Opmerkingen", notesFields())
  ].join("");
  root.querySelectorAll(".section-head").forEach(head => head.addEventListener("click", () => {
    const key = head.parentElement.dataset.section;
    if (ui.openSections.has(key)) ui.openSections.delete(key); else ui.openSections.add(key);
    renderConfig();
  }));
}

function section(key, n, title, body) {
  const open = ui.openSections.has(key) ? " is-open" : "";
  return `<div class="section${open}" data-section="${key}"><div class="section-head"><div class="section-title"><span class="step-num">${n}</span>${title}</div><div class="section-chev">⌄</div></div><div class="section-body">${body}</div></div>`;
}
function input(label, path, value, suffix = "", type = "number", attrs = "") {
  return `<label class="field"><span class="label">${label}</span><span class="input-wrap"><input class="input" data-bind="${path}" type="${type}" value="${esc(value)}" ${attrs}/>${suffix ? `<span class="input-suffix">${suffix}</span>` : ""}</span></label>`;
}
function textInput(label, path, value, attrs = "") { return input(label, path, value, "", "text", attrs); }
function select(label, path, value, opts) {
  return `<label class="field"><span class="label">${label}</span><select class="select" data-bind="${path}">${opts.map(o => `<option value="${esc(o[0])}" ${String(value)===String(o[0])?"selected":""}>${esc(o[1])}</option>`).join("")}</select></label>`;
}
function checkbox(label, path, checked) {
  return `<label class="check-label"><input type="checkbox" data-bind="${path}" ${checked ? "checked" : ""}/> ${label}</label>`;
}
function segmented(path, value, opts) {
  return `<div class="segmented">${opts.map(o => `<button type="button" data-set="${path}" data-value="${esc(o[0])}" class="${String(value)===String(o[0])?"is-active":""}">${esc(o[1])}</button>`).join("")}</div>`;
}

function customerFields(c) {
  return `<div class="field-row">${textInput("Naam", "customer.name", c.name)}${textInput("Projectnaam", "customer.projectName", c.projectName)}</div>
  ${textInput("Adres", "customer.address", c.address)}
  <div class="field-row three">${textInput("Postcode", "customer.postcode", c.postcode)}${textInput("Plaats", "customer.city", c.city)}${textInput("Telefoon", "customer.phone", c.phone)}</div>
  <div class="field-row">${textInput("E-mail", "customer.email", c.email)}${input("Offertedatum", "customer.date", c.date, "", "date")}</div>`;
}
function baseFields(d) {
  return `${segmented("dakkapel.model", d.model, [["plat","Plat"],["schuin","Schuin"],["nokverhoging","Nokverhoging"],["prefab","Prefab"]])}
  <div class="field-row three">${input("Breedte", "dakkapel.widthMM", d.widthMM, "mm", "number", "min='1000' max='12000' step='10'")}${input("Hoogte voorzijde", "dakkapel.frontHeightMM", d.frontHeightMM, "mm", "number", "min='700' max='2600' step='10'")}${input("Diepte", "dakkapel.depthMM", d.depthMM, "mm", "number", "min='600' max='3500' step='10'")}</div>
  <div class="field-row">${input("Dakhelling", "dakkapel.roofSlopeDeg", d.roofSlopeDeg, "°", "number", "min='0' max='60' step='1'")}${input("Overstek", "dakkapel.overhangMM", d.overhangMM, "mm", "number", "min='0' max='400' step='10'")}</div>
  <div class="hint">Richtmodel: dakkapelbreedte en diepte bepalen de basis, dakoppervlakte, montage en hijswerk. Alle prijzen zijn indicatief en incl. BTW in de configurator.</div>`;
}
function materialFields(d) {
  return `${select("Materiaal casco/gevel", "dakkapel.material", d.material, Object.entries(LOOKUPS.material).map(([k,v]) => [k, v.label]))}
  <div class="field-row">${textInput("Profielsysteem voorzijde", "dakkapel.profileSystem", d.profileSystem)}${select("Afwerking buiten", "dakkapel.finishOutside", d.finishOutside, [["glad","Glad"],["houtnerf","Houtnerf"],["structuur","Structuur"]])}</div>
  <div class="field"><span class="label">Kleur buitenzijde</span><div class="color-grid">${RAL.map(c => `<button type="button" class="color-btn ${d.colorOutside===c.code?"is-active":""}" data-set="dakkapel.colorOutside" data-value="${c.code}"><span class="swatch" style="background:${c.hex}"></span>${c.name}</button>`).join("")}</div></div>
  <div class="field"><span class="label">Kleur binnenzijde</span><div class="color-grid">${RAL.slice(0,8).map(c => `<button type="button" class="color-btn ${d.colorInside===c.code?"is-active":""}" data-set="dakkapel.colorInside" data-value="${c.code}"><span class="swatch" style="background:${c.hex}"></span>${c.name}</button>`).join("")}</div></div>`;
}
function layoutFields(d) {
  return `<div class="field-row">${input("Aantal vakken", "__bayCount", d.bays.length, "", "number", "min='1' max='8' step='1'")}${input("Boeideel hoogte", "dakkapel.boeideelHeightMM", d.boeideelHeightMM, "mm", "number", "min='120' max='600' step='10'")}</div>
  <div class="bay-list">${d.bays.map((b, idx) => bayCard(b, idx)).join("")}</div>
  <button type="button" class="btn btn-primary btn-full" data-action="add-bay">＋ Vak toevoegen</button>`;
}
function bayCard(b, idx) {
  return `<div class="bay-card" data-bay="${b.id}">
    <div class="bay-head"><div class="bay-title">Vak ${idx + 1}</div><div class="mini-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="duplicate-bay" data-id="${b.id}">Dupliceer</button><button type="button" class="btn btn-sm btn-danger" data-action="remove-bay" data-id="${b.id}">Verwijder</button></div></div>
    <div class="range-row"><input type="range" min="5" max="100" step="1" value="${Math.round(b.widthPct)}" data-bay-bind="widthPct" data-id="${b.id}"/><input class="input" type="number" value="${Math.round(b.widthPct)}" data-bay-bind="widthPct" data-id="${b.id}"/></div>
    <div class="field-row">${selectBay(b, "type", LOOKUPS.bayType)}${selectBay(b, "hinge", { left: "Scharnier links", right: "Scharnier rechts" })}</div>
    <div class="field-row">${selectBay(b, "glassPack", { "HR++": "HR++", "HR+++": "HR+++ Triple" })}${selectBay(b, "glassFinish", { clear: "Helder", satinato: "Melkglas", solar: "Zonwerend" })}</div>
    <div class="field-row">${selectBay(b, "sun", { none: "Geen zonwering", screen: "Screen", rolluik: "Rolluik" })}<label class="check-label"><input type="checkbox" data-bay-bind="ventilator" data-id="${b.id}" ${b.ventilator ? "checked" : ""}/> Ventilatierooster</label></div>
  </div>`;
}
function selectBay(b, key, map) {
  return `<label class="field"><span class="label">${key === "type" ? "Type" : key === "hinge" ? "Draairichting" : key === "glassPack" ? "Glaspakket" : key === "glassFinish" ? "Glasafwerking" : "Zonwering"}</span><select class="select" data-bay-bind="${key}" data-id="${b.id}">${Object.entries(map).map(([k,v]) => `<option value="${k}" ${String(b[key])===String(k)?"selected":""}>${esc(v)}</option>`).join("")}</select></label>`;
}
function glassFields(d) {
  return `<div class="field-row">${checkbox("Globale ventilatie opnemen", "dakkapel.options.ventilationGlobal", d.options.ventilationGlobal)}${checkbox("Horren opnemen", "dakkapel.options.horren", d.options.horren)}</div>
  <div class="field-row">${input("Aantal horren", "dakkapel.options.insectScreensCount", d.options.insectScreensCount, "st", "number", "min='0' max='12'")}${select("Lekdorpel", "dakkapel.sillType", d.sillType, [["kunststof lekdorpel","Kunststof lekdorpel"],["aluminium lekdorpel","Aluminium lekdorpel"],["waterslag","Waterslag op maat"]])}</div>
  <div class="field-row">${checkbox("Rolluiken volledige voorzijde", "dakkapel.options.rolluiken", d.options.rolluiken)}${checkbox("Screens volledige voorzijde", "dakkapel.options.screens", d.options.screens)}</div>`;
}
function roofFields(d) {
  return `<div class="field-row">${select("Dakbedekking", "dakkapel.roofCover", d.roofCover, Object.entries(LOOKUPS.roofCover))}${select("Dakisolatie", "dakkapel.roofInsulation", d.roofInsulation, [["rc4","RC 4"],["rc6","RC 6"],["rc7","RC 7"]])}</div>
  <div class="field-row">${checkbox("Zijwang links", "dakkapel.cheeks.left", d.cheeks.left)}${checkbox("Zijwang rechts", "dakkapel.cheeks.right", d.cheeks.right)}</div>
  <div class="field-row">${input("Dikte zijwang", "dakkapel.cheeks.thicknessMM", d.cheeks.thicknessMM, "mm", "number", "min='60' max='220'")}${select("Zijwang isolatie", "dakkapel.sideWallInsulation", d.sideWallInsulation, [["rc4","RC 4"],["rc6","RC 6"],["rc7","RC 7"]])}</div>`;
}
function finishFields(d) {
  return `${select("Binnenafwerking", "dakkapel.options.insideFinish", d.options.insideFinish, Object.entries(LOOKUPS.finishInside))}
  <div class="field-row">${input("Elektrapunten", "dakkapel.options.electricalPoints", d.options.electricalPoints, "st", "number", "min='0' max='20'")}${input("Inbouwspots", "dakkapel.options.spots", d.options.spots, "st", "number", "min='0' max='30'")}</div>
  <div class="field-row">${checkbox("Kraan/hijswerk", "dakkapel.options.crane", d.options.crane)}${checkbox("Transport", "dakkapel.options.transport", d.options.transport)}</div>
  <div class="field-row">${checkbox("Oude dakkapel verwijderen", "dakkapel.options.demolitionOld", d.options.demolitionOld)}${checkbox("Steigerwerk", "dakkapel.options.scaffold", d.options.scaffold)}</div>
  <div class="field-row">${checkbox("Vergunningsbegeleiding", "dakkapel.options.permitSupport", d.options.permitSupport)}${checkbox("Hemelwaterafvoer aanpassen", "dakkapel.options.rainPipe", d.options.rainPipe)}</div>
  <div class="field-row">${checkbox("Stucwerk dagkanten", "dakkapel.options.plastering", d.options.plastering)}${checkbox("Schilderwerk binnenzijde", "dakkapel.options.painting", d.options.painting)}</div>`;
}
function extrasFields() {
  return `<div class="extra-list">${state.extras.map(ex => `<div class="extra-card" data-extra="${ex.id}">
    <div class="extra-head"><div class="extra-title">${esc(ex.name || "Extra post")}</div><button type="button" class="btn btn-sm btn-danger" data-action="remove-extra" data-id="${ex.id}">Verwijder</button></div>
    ${textInput("Omschrijving", `extra.${ex.id}.name`, ex.name || "")}
    <div class="field-row">${input("Aantal", `extra.${ex.id}.qty`, ex.qty || 1, "", "number", "min='0' step='0.01'")}${input("Prijs incl. BTW", `extra.${ex.id}.unitPrice`, ex.unitPrice || 0, "€", "number", "step='0.01'")}</div>
  </div>`).join("")}</div><button type="button" class="btn btn-primary btn-full" data-action="add-extra">＋ Extra post toevoegen</button>`;
}
function pricingFields() {
  return `<div class="field-row three">${input("Korting", "pricing.discountPct", state.pricing.discountPct, "%", "number", "min='0' max='80' step='0.1'")}${input("Marge opslag", "pricing.marginPct", state.pricing.marginPct, "%", "number", "min='0' max='80' step='0.1'")}${input("Correctie", "pricing.manualAdjustment", state.pricing.manualAdjustment, "€", "number", "step='0.01'")}</div>
  <div class="hint">Gebruik correctie voor maatwerk dat buiten het standaardmodel valt. Negatief bedrag mag ook.</div>`;
}
function notesFields() {
  return `<label class="field"><span class="label">Offerte-opmerking</span><textarea class="textarea" data-bind="notes">${esc(state.notes)}</textarea></label>
  <label class="field"><span class="label">Interne werkbonnotitie</span><textarea class="textarea" data-bind="internalNotes">${esc(state.internalNotes)}</textarea></label>`;
}

function renderPreview() {
  const svg = document.getElementById("preview-svg");
  if (ui.view === "side") svg.innerHTML = sideSvg();
  else if (ui.view === "top") svg.innerHTML = topSvg();
  else if (ui.view === "3d") svg.innerHTML = perspectiveSvg();
  else svg.innerHTML = frontSvg();
  svg.setAttribute("viewBox", ui.view === "3d" ? "0 0 1000 640" : "0 0 1000 640");
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("is-active", b.dataset.view === ui.view));
  document.getElementById("toggle-dims").classList.toggle("is-active", ui.dims);
  document.getElementById("toggle-labels").classList.toggle("is-active", ui.labels);
  document.getElementById("toggle-workorder").classList.toggle("is-active", ui.workorder);
}

function baseScale() {
  const d = state.dakkapel;
  const maxW = 820, maxH = 350;
  const scale = Math.min(maxW / d.widthMM, maxH / (d.frontHeightMM + d.boeideelHeightMM + 220));
  return { scale, x: 90, y: 125, w: d.widthMM * scale, h: d.frontHeightMM * scale, boei: d.boeideelHeightMM * scale };
}
function dim(x1,y1,x2,y2,text, off=0) { if (!ui.dims) return ""; return `<line class="svg-dim" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="svg-dim-text" x="${(x1+x2)/2}" y="${(y1+y2)/2 + off}" text-anchor="middle">${esc(text)}</text>`; }
function tag(x,y,text) { if (!ui.labels) return ""; const w = Math.max(54, String(text).length * 7 + 12); return `<rect class="svg-label-bg" x="${x}" y="${y-16}" width="${w}" height="22" rx="6"/><text class="svg-label" x="${x+6}" y="${y}">${esc(text)}</text>`; }

function frontSvg() {
  const d = state.dakkapel, b = baseScale();
  const frame = color(d.colorOutside), inside = color(d.colorInside);
  const roofY = b.y, boeiY = b.y + 46, frameY = boeiY + b.boei;
  let x = b.x;
  let bays = "";
  d.bays.forEach((bay, idx) => {
    const bw = b.w * bay.widthPct / 100;
    const pad = 14;
    const gx = x + pad, gy = frameY + pad, gw = bw - pad * 2, gh = b.h - pad * 2;
    const fill = bay.type === "paneel" ? `<rect class="svg-panel" x="${gx}" y="${gy}" width="${gw}" height="${gh}"/>` : `<rect class="svg-glass" x="${gx}" y="${gy}" width="${gw}" height="${gh}"/>`;
    const open = bay.type === "draaikiep" || bay.type === "draai" ? `<path class="svg-open" d="M ${bay.hinge === "left" ? gx : gx+gw} ${gy} L ${bay.hinge === "left" ? gx+gw : gx} ${gy+gh/2} L ${bay.hinge === "left" ? gx : gx+gw} ${gy+gh}"/>` : bay.type === "kiep" ? `<path class="svg-open" d="M ${gx} ${gy} L ${gx+gw/2} ${gy+gh} L ${gx+gw} ${gy}"/>` : "";
    const vent = bay.ventilator ? `<rect class="svg-vent" x="${gx+8}" y="${gy+8}" width="${Math.max(20, gw-16)}" height="12" rx="2"/>` : "";
    const sun = bay.sun === "screen" || d.options.screens ? `<rect class="svg-sunshade" x="${x+4}" y="${frameY-18}" width="${bw-8}" height="12" rx="2"/>` : bay.sun === "rolluik" || d.options.rolluiken ? `<rect class="svg-sunshade" x="${x+4}" y="${frameY-30}" width="${bw-8}" height="24" rx="2"/>` : "";
    bays += `${sun}<rect class="svg-frame" x="${x}" y="${frameY}" width="${bw}" height="${b.h}" fill="${frame}"/><rect class="svg-frame-inner" x="${x+8}" y="${frameY+8}" width="${bw-16}" height="${b.h-16}" fill="${inside}"/>${fill}${open}${vent}${tag(gx, gy+gh+20, `${idx+1}: ${labelOf(LOOKUPS.bayType, bay.type)}`)}`;
    x += bw;
  });
  return `<rect class="svg-bg" x="0" y="0" width="1000" height="640"/>
  <rect class="svg-wall" x="50" y="${frameY + b.h}" width="900" height="82" rx="4"/>
  <rect class="svg-roof-cover" x="${b.x-28}" y="${roofY}" width="${b.w+56}" height="46" rx="4"/>
  <rect class="svg-roof" x="${b.x-18}" y="${boeiY}" width="${b.w+36}" height="${b.boei}" rx="3"/>
  ${bays}
  ${dim(b.x, frameY+b.h+48, b.x+b.w, frameY+b.h+48, mm(d.widthMM), 18)}
  ${dim(b.x+b.w+40, frameY, b.x+b.w+40, frameY+b.h, mm(d.frontHeightMM), 5)}
  ${tag(b.x, roofY-18, `${labelOf(LOOKUPS.model, d.model)} • ${LOOKUPS.material[d.material].label}`)}
  ${tag(b.x, frameY+b.h+34, `${d.profileSystem} • ${d.glassPack || "HR++"}`)}`;
}
function sideSvg() {
  const d = state.dakkapel;
  const scale = Math.min(620/d.depthMM, 350/(d.frontHeightMM+d.boeideelHeightMM+180));
  const x=170,y=130,depth=d.depthMM*scale,h=d.frontHeightMM*scale,boei=d.boeideelHeightMM*scale,roof=60;
  const slope = d.model === "schuin" ? d.roofSlopeDeg * 2.2 : d.model === "nokverhoging" ? 90 : 0;
  return `<rect class="svg-bg" x="0" y="0" width="1000" height="640"/>
  <rect class="svg-wall" x="90" y="${y+boei+h}" width="820" height="84" rx="4"/>
  <path class="svg-side" d="M ${x} ${y+boei} L ${x+depth} ${y+boei-slope} L ${x+depth} ${y+boei+h} L ${x} ${y+boei+h} Z"/>
  <path class="svg-roof" d="M ${x-20} ${y} L ${x+depth+34} ${y-slope} L ${x+depth+20} ${y+boei-slope} L ${x} ${y+boei} Z"/>
  <rect class="svg-panel" x="${x+18}" y="${y+boei+18}" width="${Math.max(20,depth-36)}" height="${h-36}"/>
  ${dim(x, y+boei+h+48, x+depth, y+boei+h+48, mm(d.depthMM), 18)}
  ${dim(x+depth+48, y+boei-slope, x+depth+48, y+boei+h, mm(d.frontHeightMM), 5)}
  ${tag(x, y-24, `Dak: ${labelOf(LOOKUPS.roofCover,d.roofCover)} • ${String(d.roofInsulation).toUpperCase()}`)}
  ${tag(x+18, y+boei+h+34, `Zijwang ${d.cheeks.thicknessMM} mm`)}`;
}
function topSvg() {
  const d = state.dakkapel;
  const scale = Math.min(720/d.widthMM, 340/d.depthMM);
  const w=d.widthMM*scale, dep=d.depthMM*scale, x=120,y=150;
  return `<rect class="svg-bg" x="0" y="0" width="1000" height="640"/>
  <rect class="svg-wall" x="${x-55}" y="${y+dep+38}" width="${w+110}" height="80" rx="4"/>
  <rect class="svg-roof" x="${x}" y="${y}" width="${w}" height="${dep}" rx="8"/>
  <rect class="svg-roof-cover" x="${x+18}" y="${y+18}" width="${w-36}" height="${dep-36}" rx="6" opacity=".84"/>
  <line class="svg-dim" x1="${x}" y1="${y+dep}" x2="${x+w}" y2="${y+dep}"/>
  <line class="svg-dim" x1="${x}" y1="${y}" x2="${x}" y2="${y+dep}"/>
  ${dim(x, y+dep+54, x+w, y+dep+54, mm(d.widthMM), 18)}
  ${dim(x+w+50, y, x+w+50, y+dep, mm(d.depthMM), 5)}
  ${tag(x+22, y+42, `Dakoppervlak ${m2(surfaces().roofM2)}`)}
  ${tag(x+22, y+72, `${labelOf(LOOKUPS.roofCover,d.roofCover)} • overstek ${mm(d.overhangMM)}`)}`;
}
function perspectiveSvg() {
  const d = state.dakkapel;
  const scale = Math.min(540/d.widthMM, 270/d.frontHeightMM);
  const w=d.widthMM*scale,h=d.frontHeightMM*scale,dep=d.depthMM*scale*0.48,x=160,y=210;
  const frame=color(d.colorOutside), roof="#1f2937";
  return `<rect class="svg-bg" x="0" y="0" width="1000" height="640"/>
  <polygon class="svg-wall" points="90,430 850,430 880,510 60,510"/>
  <polygon fill="#d6d3d1" stroke="#78716c" points="${x+w},${y} ${x+w+dep},${y-dep*.45} ${x+w+dep},${y+h-dep*.45} ${x+w},${y+h}"/>
  <polygon fill="${roof}" stroke="#111827" points="${x-26},${y-58} ${x+w+dep+36},${y-58-dep*.45} ${x+w+dep+14},${y-dep*.45} ${x},${y}"/>
  <rect class="svg-frame" x="${x}" y="${y}" width="${w}" height="${h}" fill="${frame}"/>
  ${d.bays.map((bay, idx) => {
    const left = x + d.bays.slice(0,idx).reduce((s,b)=>s+b.widthPct,0)/100*w;
    const bw = w*bay.widthPct/100;
    const gx=left+10, gy=y+12, gw=bw-20, gh=h-24;
    return bay.type === "paneel" ? `<rect class="svg-panel" x="${gx}" y="${gy}" width="${gw}" height="${gh}"/>` : `<rect class="svg-glass" x="${gx}" y="${gy}" width="${gw}" height="${gh}"/>`;
  }).join("")}
  ${tag(x, y-76, `3D impressie • ${mm(d.widthMM)} breed`)}
  ${tag(x+w+dep-120, y+h-dep*.45+32, `Diepte ${mm(d.depthMM)}`)}`;
}

function renderTotals() {
  const t = calculate();
  const el = document.getElementById("totals-table");
  el.innerHTML = [
    row("Subtotaal incl. BTW", euro(t.subtotalIncl)),
    row("Korting", `-${euro(t.discount)}`),
    row("Marge/opslag", euro(t.margin)),
    row("Netto excl. BTW", euro(t.net)),
    row("BTW 21%", euro(t.vat)),
    row("Totaal incl. BTW", euro(t.gross), true)
  ].join("");
  document.getElementById("project-sub").textContent = `${state.dakkapel.bays.length} vakken • ${m2(t.surfaces.roofM2)} dak`;
}
function row(a,b,grand=false){ return `<div class="total-row ${grand?"grand":""}"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`; }
function renderWorkorder() {
  const d = state.dakkapel, t = calculate();
  const list = [
    ["Maatvoering", `${mm(d.widthMM)} breed × ${mm(d.frontHeightMM)} hoog × ${mm(d.depthMM)} diep`],
    ["Model", `${labelOf(LOOKUPS.model,d.model)} in ${LOOKUPS.material[d.material].label}`],
    ["Dak", `${labelOf(LOOKUPS.roofCover,d.roofCover)}, isolatie ${String(d.roofInsulation).toUpperCase()}`],
    ["Voorzijde", `${d.bays.length} vakken, ${openableBayCount()} bedienbare delen`],
    ["Zijwangen", `${d.cheeks.left ? "links" : ""}${d.cheeks.left && d.cheeks.right ? " + " : ""}${d.cheeks.right ? "rechts" : "" || "geen"}`],
    ["Montage", `${d.options.crane ? "kraan" : "geen kraan"}, ${d.options.scaffold ? "steiger" : "geen steiger"}, ${d.options.demolitionOld ? "sloop oude dakkapel" : "geen sloop"}`],
    ["Totaal", euro(t.gross)]
  ];
  document.getElementById("workorder-summary").innerHTML = list.map(([a,b]) => `<div class="summary-item"><span class="pill">${esc(a)}</span><strong>${esc(b)}</strong></div>`).join("");
}
function renderStats() {
  const d = state.dakkapel, t = calculate();
  document.getElementById("stat-width").textContent = mm(d.widthMM);
  document.getElementById("stat-depth").textContent = mm(d.depthMM);
  document.getElementById("stat-roof").textContent = m2(t.surfaces.roofM2);
  document.getElementById("stat-price").textContent = euro(t.gross);
}
function renderJson() {
  const out = document.getElementById("json-output");
  if (out) out.textContent = JSON.stringify(buildPayload(), null, 2);
}

function openDrawer(){ document.getElementById("drawer").classList.add("is-open"); document.getElementById("drawer-overlay").classList.add("is-open"); renderJson(); }
function closeDrawer(){ document.getElementById("drawer").classList.remove("is-open"); document.getElementById("drawer-overlay").classList.remove("is-open"); }
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("is-show"); setTimeout(()=>t.classList.remove("is-show"),2400); }
function downloadJson(){ const blob=new Blob([JSON.stringify(buildPayload(), null, 2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${state.offerCode}.json`; a.click(); URL.revokeObjectURL(a.href); }
async function copyJson(){ await navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2)); toast("JSON gekopieerd"); }
function newOffer(){ if(!confirm("Nieuwe dakkapel starten? Je huidige configuratie wordt vervangen.")) return; state=newProject(); renderAll(); saveState(); toast("Nieuwe dakkapel gestart"); }
function importJson(file){ const reader=new FileReader(); reader.onload=()=>{ try{ const p=JSON.parse(reader.result); if(p.version!=="dakkapellab.v1") throw new Error("Geen DakkapelLAB v1 bestand"); state=p; state.dakkapel.bays=normalizeBays(state.dakkapel.bays); renderAll(); saveState(); toast("Project geïmporteerd"); }catch(e){ toast("Import mislukt: "+e.message); } }; reader.readAsText(file); }
function closeConfirm(){
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;
  modal.hidden = true;
}
function showConfirm(){
  const p=buildPayload();
  document.getElementById("confirm-meta").innerHTML = `<strong>${esc(p.offerCode)}</strong><br>${esc(p.customer.name || "Onbekende klant")}<br>${euro(p.totals.gross)} incl. BTW`;
  document.getElementById("confirm-modal").hidden=false;
}
function submitToEcoPro(){
  const payload=buildPayload();
  window.parent.postMessage({ type:"DAKKAPELLAB_SUBMIT", data:payload }, "*");
  window.parent.postMessage({ type:"DAKKAPELLAB_PROJECT_STATE", data:payload }, "*");
  closeConfirm();
  toast("Doorgestuurd naar EcoPro");
}

function bindEvents() {
  document.body.addEventListener("input", e => {
    const b = e.target.dataset.bind;
    const bb = e.target.dataset.bayBind;
    if (b) {
      if (b === "__bayCount") setBayCount(e.target.value);
      else if (b.startsWith("extra.")) {
        const [, id, key] = b.split("."); setExtra(id, key, e.target.value);
      } else setPath(b, e.target.type === "checkbox" ? e.target.checked : e.target.value);
    }
    if (bb) setBay(e.target.dataset.id, bb, e.target.type === "checkbox" ? e.target.checked : e.target.value);
  });
  document.body.addEventListener("change", e => {
    const b = e.target.dataset.bind, bb = e.target.dataset.bayBind;
    if (b) {
      if (b === "__bayCount") setBayCount(e.target.value);
      else if (b.startsWith("extra.")) { const [, id, key] = b.split("."); setExtra(id, key, e.target.value); }
      else setPath(b, e.target.type === "checkbox" ? e.target.checked : e.target.value);
    }
    if (bb) setBay(e.target.dataset.id, bb, e.target.type === "checkbox" ? e.target.checked : e.target.value);
  });
  document.body.addEventListener("click", e => {
    const set = e.target.closest("[data-set]");
    if (set) return setPath(set.dataset.set, set.dataset.value, true);
    const view = e.target.closest("[data-view]");
    if (view) { ui.view = view.dataset.view; renderPreview(); return; }
    const action = e.target.closest("[data-action]");
    if (action) {
      const a = action.dataset.action, id = action.dataset.id;
      if (a === "add-bay") addBay();
      if (a === "remove-bay") removeBay(id);
      if (a === "duplicate-bay") duplicateBay(id);
      if (a === "add-extra") addExtra();
      if (a === "remove-extra") removeExtra(id);
    }
  });
  document.getElementById("btn-toggle-config").addEventListener("click", () => document.getElementById("app-shell").classList.toggle("config-collapsed"));
  document.getElementById("btn-theme-toggle").addEventListener("click", () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; });
  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-new-offer").addEventListener("click", newOffer);
  document.getElementById("btn-import").addEventListener("click", () => document.getElementById("file-import").click());
  document.getElementById("file-import").addEventListener("change", e => { if(e.target.files[0]) importJson(e.target.files[0]); e.target.value=""; });
  document.getElementById("btn-export").addEventListener("click", openDrawer);
  document.getElementById("btn-open-drawer").addEventListener("click", openDrawer);
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("drawer-overlay").addEventListener("click", closeDrawer);
  document.getElementById("btn-download-json").addEventListener("click", downloadJson);
  document.getElementById("btn-copy-json").addEventListener("click", copyJson);
  document.getElementById("toggle-dims").addEventListener("click", () => { ui.dims=!ui.dims; renderPreview(); });
  document.getElementById("toggle-labels").addEventListener("click", () => { ui.labels=!ui.labels; renderPreview(); });
  document.getElementById("toggle-workorder").addEventListener("click", () => { ui.workorder=!ui.workorder; renderWorkorder(); toast(ui.workorder ? "Werkbonmodus actief" : "Werkbonmodus uit"); });
  document.getElementById("btn-to-ecopro").addEventListener("click", showConfirm);
  document.getElementById("confirm-cancel").addEventListener("click", closeConfirm);
  document.getElementById("confirm-submit").addEventListener("click", submitToEcoPro);
  document.getElementById("confirm-modal").addEventListener("click", e => { if (e.target.id === "confirm-modal") closeConfirm(); });
  window.addEventListener("keydown", e => { if (e.key === "Escape") closeConfirm(); });
  window.addEventListener("message", e => {
    if (e.data?.type === "REQUEST_DAKKAPELLAB_SUBMIT") showConfirm();
    if (e.data?.type === "DAKKAPELLAB_LOAD_PROJECT" && e.data.data) { state = e.data.data; renderAll(); saveState(); }
  });
}

bindEvents();
renderAll();
saveState();
