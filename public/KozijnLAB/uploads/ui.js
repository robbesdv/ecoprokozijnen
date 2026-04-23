function toast(message, detail){
  var box = document.getElementById("toast");
  box.innerHTML = "<b>" + escapeHtml(message) + "</b>" + (detail ? "<small>" + escapeHtml(detail) + "</small>" : "");
  box.style.display = "block";
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(function(){ box.style.display = "none"; }, 2600);
}


function setValueIfNotFocused(input, value){
  if (!input) return;
  if (document.activeElement === input) return;
  if (input.value === value) return;
  input.value = value;
}

function updateColorCardVisibility(){
  if (el.fieldColorCodeOutside){
    el.fieldColorCodeOutside.style.display = (el.selColorOutside && String(el.selColorOutside.value) === "custom") ? "" : "none";
  }
  if (el.fieldColorCodeInside){
    el.fieldColorCodeInside.style.display = (el.selColorInside && String(el.selColorInside.value) === "custom") ? "" : "none";
  }
}

function displayColorLabel(value, code, fallback){
  var v = String(value || fallback || "");
  if (v === "same") return "Gelijk aan buitenzijde";
  if (v === "custom") return code ? ("Overig / custom — " + String(code)) : "Overig / custom";
  return v;
}

var _uiDirty = false;
var _uiSaveStateTimer = null;

function setSaveStateLabel(text, isDirty){
  var label = document.getElementById("saveStateLabel");
  var dot = document.getElementById("statusDot");
  if (label) label.textContent = text || "Gereed";
  if (dot) dot.classList.toggle("isDirty", !!isDirty);
}

function markUiDirty(){
  _uiDirty = true;
  if (_uiSaveStateTimer) clearTimeout(_uiSaveStateTimer);
  setSaveStateLabel("Wijzigingen opslaan…", true);
  _uiSaveStateTimer = window.setTimeout(function(){
    _uiDirty = false;
    setSaveStateLabel("Gereed", false);
  }, 340);
}

function renderLogo(){
  if (!el.imgLogoPreview) return;
  var url = (state.customer && state.customer.logoDataUrl) ? state.customer.logoDataUrl : "";
  if (url){
    el.imgLogoPreview.src = url;
    el.imgLogoPreview.style.display = "block";
  } else {
    el.imgLogoPreview.removeAttribute("src");
    el.imgLogoPreview.style.display = "none";
  }
}


// -------------------------

// DOM references
// -------------------------
var el = {
  // Customer
  projectCode: document.getElementById("projectCode"),
  btnNewOfferNumber: document.getElementById("btnNewOfferNumber"),
  inpCustomerName: document.getElementById("inpCustomerName"),
  inpProjectName: document.getElementById("inpProjectName"),
  inpCustomerAddress: document.getElementById("inpCustomerAddress"),
  inpCustomerPostcode: document.getElementById("inpCustomerPostcode"),
  inpCustomerCity: document.getElementById("inpCustomerCity"),
  inpCustomerPhone: document.getElementById("inpCustomerPhone"),
  inpCustomerEmail: document.getElementById("inpCustomerEmail"),
  inpProjectDate: document.getElementById("inpProjectDate"),
  inpDeliveryDate: document.getElementById("inpDeliveryDate"),
  inpLogoUpload: document.getElementById("inpLogoUpload"),
  imgLogoPreview: document.getElementById("imgLogoPreview"),
  btnClearLogo: document.getElementById("btnClearLogo"),

  // Settings
  selElementType: document.getElementById("selElementType"),
  fieldSlideSystem: document.getElementById("fieldSlideSystem"),
  selSlideSystem: document.getElementById("selSlideSystem"),
  selRenderMode: document.getElementById("selRenderMode"),
  chkModeFactory: document.getElementById("chkModeFactory"),
  lblModeSales: document.getElementById("lblModeSales"),
  lblModeFactory: document.getElementById("lblModeFactory"),
  chkShowDims: document.getElementById("chkShowDims"),
  btnResetAll: document.getElementById("btnResetAll"),

  // Options
  selColorOutside: document.getElementById("selColorOutside"),
  fieldColorCodeOutside: document.getElementById("fieldColorCodeOutside"),
  inpColorCodeOutside: document.getElementById("inpColorCodeOutside"),
  selColorInside: document.getElementById("selColorInside"),
  fieldColorCodeInside: document.getElementById("fieldColorCodeInside"),
  inpColorCodeInside: document.getElementById("inpColorCodeInside"),
  selFinishOutside: document.getElementById("selFinishOutside"),
  selFinishInside: document.getElementById("selFinishInside"),
  selPremiumColor: document.getElementById("selPremiumColor"),
  chkSill: document.getElementById("chkSill"),

  inpWidth: document.getElementById("inpWidth"),
  inpHeight: document.getElementById("inpHeight"),
  inpCols: document.getElementById("inpCols"),
  selActiveCol: document.getElementById("selActiveCol"),
  selSpSideInVakken: document.getElementById("selSpSideInVakken"),
  spSideField: document.getElementById("spSideField"),

  inpRows: document.getElementById("inpRows"),
  rowTypeList: document.getElementById("rowTypeList"),

  activeColBadge: document.getElementById("activeColBadge"),

  // Right side
  overviewKv: document.getElementById("overviewKv"),
  svgPreview: document.getElementById("svgPreview"),
  pillDims: document.getElementById("pillDims"),
  pillZoom: document.getElementById("pillZoom"),
  btnZoomOut: document.getElementById("btnZoomOut"),
  btnZoomIn: document.getElementById("btnZoomIn"),
  btnZoomReset: document.getElementById("btnZoomReset"),
  btnToggleDims: document.getElementById("btnToggleDims"),
  btnToggleFieldDims: document.getElementById("btnToggleFieldDims"),

  btnAddExtra: document.getElementById("btnAddExtra"),
  extrasList: document.getElementById("extrasList"),
  // Project
  inpProjectItemName: document.getElementById("inpProjectItemName"),
  btnAddProjectItem: document.getElementById("btnAddProjectItem"),
  selProjectSet: document.getElementById("selProjectSet"),
  btnApplyProjectSet: document.getElementById("btnApplyProjectSet"),
  btnClearProject: document.getElementById("btnClearProject"),
  projectList: document.getElementById("projectList"),
  pillProjectCount: document.getElementById("pillProjectCount"),
  totalsBody: document.getElementById("totalsBody"),

  // Pricing fields stay in Instellingen
  inpMontage: document.getElementById("inpMontage"),
  inpDiscount: document.getElementById("inpDiscount"),


  // Profielmaten
  selProfilePreset: document.getElementById("selProfilePreset"),
  selProfileSystem: document.getElementById("selProfileSystem"),
  selProfileShape: document.getElementById("selProfileShape"),
  selHardwareType: document.getElementById("selHardwareType"),
  fieldSchuifpuiOptions: document.getElementById("fieldSchuifpuiOptions"),
  selSpActiveSide: document.getElementById("selSpActiveSide"),
  selSpBayCount: document.getElementById("selSpBayCount"),
  inpFrameMM: document.getElementById("inpFrameMM"),
  inpSashMM: document.getElementById("inpSashMM"),
  inpMullionMM: document.getElementById("inpMullionMM"),
  inpTransomMM: document.getElementById("inpTransomMM"),

  btnReset: document.getElementById("btnReset"),
};

// -------------------------
// Single render pipeline
// -------------------------
var redrawScheduled = false;
var totalsScheduled = false;
function scheduleRender(reason){
  
  queuePersist('render');
if (redrawScheduled) return;
  redrawScheduled = true;
  window.requestAnimationFrame(function(){
    redrawScheduled = false;
    renderAll();
  });
}


function calculateTotals(){
  // Backwards compatible helper used by the Project card
  return computeTotals(state);
}



function computeProjectTotals(){
  var items = Array.isArray(state.projectItems) ? state.projectItems : [];
  var materialSum = 0;
  for (var i=0;i<items.length;i++){
    var it = items[i];
    if (!it || !it.element) continue;
    materialSum += estimateMaterialPrice(it.element);
  }
  var montage = Number(state.montageEuro) || 0;
  var extras = extrasSubtotal(state);

  var sub = materialSum + montage + extras;
  var discount = sub * (clampNumber(state.discountPct, 0, 50) / 100);
  var net = Math.max(0, sub - discount);
  var vat = net * (Number(state.vatRate) || 0);
  var gross = net + vat;

  return {
    material: materialSum,
    montage: montage,
    extras: extras,
    subtotal: sub,
    discount: discount,
    net: net,
    vat: vat,
    gross: gross
  };
}


function scheduleTotalsOnly(reason){
  queuePersist("totals");
  if (totalsScheduled) return;
  totalsScheduled = true;
  window.requestAnimationFrame(function(){
    totalsScheduled = false;
    safeRefreshProjectUi(reason || "totals");
  });
}

function safeRefreshProjectUi(reason){
  try { renderTotals(); } catch(e){ console.error("renderTotals failed", reason, e); }
  try { renderProjectList(); } catch(e){ console.error("renderProjectList failed", reason, e); }
  try { renderOverview(); } catch(e){ console.error("renderOverview failed", reason, e); }
  try { if (el.projectCode) el.projectCode.textContent = state.projectCode || "—"; } catch(e){}
}

function ensureColumnsArrayConsistency(){
  state.columnsCount = clampNumber(state.columnsCount, 1, 6);
  if (!Array.isArray(state.columns)) state.columns = [];
  while (state.columns.length < state.columnsCount){
    state.columns.push({ rowsCount: 1, paneType: "auto", options: { hinge: "left" }, rowHeights:[100], widthPct:(100/state.columnsCount) });
  }
  while (state.columns.length > state.columnsCount){
    state.columns.pop();
  }
  for (var w=0; w<state.columns.length; w++){
    var defaultWidthPct = 100 / state.columnsCount;
    var widthPct = Number(state.columns[w] && state.columns[w].widthPct);
    if (!Number.isFinite(widthPct) || widthPct <= 0) widthPct = defaultWidthPct;
    state.columns[w].widthPct = widthPct;
  }
  var widthPctSum = 0;
  for (var ws=0; ws<state.columns.length; ws++){ widthPctSum += Number(state.columns[ws].widthPct) || 0; }
  if (widthPctSum <= 0) widthPctSum = 100;
  for (var wn=0; wn<state.columns.length; wn++){ state.columns[wn].widthPct = ((Number(state.columns[wn].widthPct) || 0) / widthPctSum) * 100; }
  for (var i=0;i<state.columns.length;i++){
    state.columns[i].rowsCount = clampNumber(state.columns[i].rowsCount, 1, 6);

    // Backwards-compat: older states stored paneType/options on column level.
    var defaultPane = state.columns[i].paneType || "auto";
    var defaultHinge = (state.columns[i].options && state.columns[i].options.hinge) ? state.columns[i].options.hinge : "left";

    if (!Array.isArray(state.columns[i].rows)){
      state.columns[i].rows = [];
    }

    // Ensure rows array length
    while (state.columns[i].rows.length < state.columns[i].rowsCount){
      state.columns[i].rows.push({ paneType: defaultPane, options: { hinge: defaultHinge } });
    }
    while (state.columns[i].rows.length > state.columns[i].rowsCount){
      state.columns[i].rows.pop();
    }

    if (!Array.isArray(state.columns[i].rowHeights)) state.columns[i].rowHeights = [];
    while (state.columns[i].rowHeights.length < state.columns[i].rowsCount){
      state.columns[i].rowHeights.push(100 / state.columns[i].rowsCount);
    }
    while (state.columns[i].rowHeights.length > state.columns[i].rowsCount){
      state.columns[i].rowHeights.pop();
    }
    var rowHeightSum = 0;
    for (var h=0; h<state.columns[i].rowHeights.length; h++){
      var rh = Number(state.columns[i].rowHeights[h]);
      if (!Number.isFinite(rh) || rh <= 0) rh = 100 / state.columns[i].rowsCount;
      state.columns[i].rowHeights[h] = rh;
      rowHeightSum += rh;
    }
    if (rowHeightSum <= 0) rowHeightSum = 100;
    for (var h2=0; h2<state.columns[i].rowHeights.length; h2++){
      state.columns[i].rowHeights[h2] = (state.columns[i].rowHeights[h2] / rowHeightSum) * 100;
    }

    // Normalize each row
    for (var r=0;r<state.columns[i].rows.length;r++){
      if (!state.columns[i].rows[r]) state.columns[i].rows[r] = { paneType: defaultPane, options: { hinge: defaultHinge } };
      if (!state.columns[i].rows[r].paneType) state.columns[i].rows[r].paneType = defaultPane;
      if (!state.columns[i].rows[r].options) state.columns[i].rows[r].options = { hinge: defaultHinge };
      if (!state.columns[i].rows[r].options.hinge) state.columns[i].rows[r].options.hinge = defaultHinge;
    }

    
  }
  state.activeColIndex = clampNumber(state.activeColIndex, 0, state.columnsCount - 1);
    var ac = state.columns[state.activeColIndex];
  state.activeRowIndex = clampNumber((state.activeRowIndex==null?0:state.activeRowIndex), 0, (ac && ac.rowsCount ? ac.rowsCount-1 : 0));
}

function equalizeRowHeightsForColumn(col){
  if (!col) return;
  var rows = Math.max(1, Number(col.rowsCount) || 1);
  col.rowHeights = [];
  for (var i=0;i<rows;i++) col.rowHeights.push(100 / rows);
}

function getRowHeightPercents(col){
  if (!col || !Array.isArray(col.rowHeights) || !col.rowHeights.length){
    return [100];
  }
  return col.rowHeights.slice();
}

function resolveVakhoogteProfileMM(){
  var prof = state.profile || {};
  if (String(state.elementType || '') === 'schuifpui'){
    var sp = prof.schuifpui || {};
    var frameMM = Number(sp.innerFrameMM);
    if (!Number.isFinite(frameMM) || frameMM <= 0) frameMM = Number(prof.frameMM) || 70;
    return { frameMM: frameMM, transomMM: 0, isSlidingFieldDims: true };
  }
  return {
    frameMM: Number(prof.frameMM) || 70,
    transomMM: Number(prof.transomMM) || 60,
    isSlidingFieldDims: false
  };
}

function getRowChainSegmentsMM(col, mmH, frameMMlocal, transomMMlocal, isSlidingFieldDims){
  var rows = Math.max(1, Number(col && col.rowsCount) || 1);
  var heightsPct = getRowHeightPercents(col);
  var innerMMH;
  var bottomMM = frameMMlocal;
  if (isSlidingFieldDims){
    var sp = ((state.profile || {}).schuifpui || {});
    bottomMM = Number(sp.sillMM) || Math.max(30, Math.round(frameMMlocal * 0.55));
    innerMMH = Math.max(50, mmH - frameMMlocal - bottomMM);
  } else {
    innerMMH = Math.max(50, mmH - frameMMlocal*2 - transomMMlocal*Math.max(0, rows-1));
  }
  var segs = [];
  var usedMM = 0;
  for (var r=0; r<rows; r++){
    var openMM = innerMMH * ((heightsPct[r] || 0) / 100);
    if (r === rows - 1) openMM = innerMMH - usedMM;
    usedMM += openMM;
    var chainMM;
    if (rows === 1){
      chainMM = mmH;
    } else if (r === 0){
      chainMM = frameMMlocal + openMM + (transomMMlocal / 2);
    } else if (r === rows - 1){
      chainMM = (transomMMlocal / 2) + openMM + bottomMM;
    } else {
      chainMM = transomMMlocal + openMM;
    }
    segs.push({ openMM: openMM, chainMM: chainMM });
  }
  return { innerMMH: innerMMH, segs: segs, bottomMM: bottomMM };
}

function setRowChainSegmentMM(col, mmH, frameMMlocal, transomMMlocal, rowIndex, targetChainMM, isSlidingFieldDims){
  if (!col) return;
  var rows = Math.max(1, Number(col.rowsCount) || 1);
  if (rows === 1){
    col.rowHeights = [100];
    return;
  }
  rowIndex = clampNumber(Number(rowIndex) || 0, 0, rows - 1);
  var mmData = getRowChainSegmentsMM(col, mmH, frameMMlocal, transomMMlocal, isSlidingFieldDims);
  var innerMMH = mmData.innerMMH;
  var minOpen = DRAG_MIN_ROW_MM;
  var openVals = [];
  for (var i=0;i<mmData.segs.length;i++) openVals.push(Number(mmData.segs[i].openMM) || minOpen);
  var targetOpen;
  if (rowIndex === 0){
    targetOpen = targetChainMM - frameMMlocal - (transomMMlocal / 2);
  } else if (rowIndex === rows - 1){
    targetOpen = targetChainMM - mmData.bottomMM - (transomMMlocal / 2);
  } else {
    targetOpen = targetChainMM - transomMMlocal;
  }
  var maxOpen = innerMMH - (rows - 1) * minOpen;
  targetOpen = clampNumber(targetOpen, minOpen, Math.max(minOpen, maxOpen));
  openVals[rowIndex] = targetOpen;
  var otherIdx = [];
  var otherCurrent = 0;
  for (var j=0;j<rows;j++){
    if (j === rowIndex) continue;
    otherIdx.push(j);
    otherCurrent += Math.max(minOpen, openVals[j]);
  }
  var remaining = innerMMH - targetOpen;
  if (otherIdx.length === 1){
    openVals[otherIdx[0]] = remaining;
  } else {
    var minTotal = minOpen * otherIdx.length;
    var extra = Math.max(0, remaining - minTotal);
    var flexBase = 0;
    for (var k=0;k<otherIdx.length;k++) flexBase += Math.max(0, openVals[otherIdx[k]] - minOpen);
    for (var k2=0;k2<otherIdx.length;k2++){
      var idx = otherIdx[k2];
      var share = flexBase > 0 ? (Math.max(0, openVals[idx] - minOpen) / flexBase) : (1 / otherIdx.length);
      openVals[idx] = minOpen + extra * share;
    }
  }
  var sumPct = 0;
  col.rowHeights = [];
  for (var p=0;p<rows;p++){
    var pct = (openVals[p] / innerMMH) * 100;
    col.rowHeights.push(pct);
    sumPct += pct;
  }
  if (sumPct > 0){
    for (var q=0;q<col.rowHeights.length;q++) col.rowHeights[q] = (col.rowHeights[q] / sumPct) * 100;
  }
}

function equalizeColumnWidths(){
  ensureColumnsArrayConsistency();
  var cols = Math.max(1, Number(state.columnsCount) || 1);
  for (var i=0;i<state.columns.length;i++) state.columns[i].widthPct = 100 / cols;
}

function getColumnWidthPercents(){
  ensureColumnsArrayConsistency();
  var arr = [];
  for (var i=0;i<state.columns.length;i++) arr.push(Number(state.columns[i].widthPct) || (100 / Math.max(1,state.columnsCount)));
  return arr;
}

function getColumnChainSegmentsMM(mmW, frameMMlocal, mullionMMlocal){
  var cols = Math.max(1, Number(state.columnsCount) || 1);
  var widthsPct = getColumnWidthPercents();
  var innerMMW = Math.max(50, mmW - frameMMlocal*2 - mullionMMlocal*Math.max(0, cols-1));
  var segs = [];
  var usedMM = 0;
  for (var c=0; c<cols; c++) {
    var openMM = innerMMW * ((widthsPct[c] || 0) / 100);
    if (c === cols - 1) openMM = innerMMW - usedMM;
    usedMM += openMM;
    var chainMM;
    if (cols === 1) chainMM = mmW;
    else if (c === 0) chainMM = frameMMlocal + openMM + (mullionMMlocal / 2);
    else if (c === cols - 1) chainMM = (mullionMMlocal / 2) + openMM + frameMMlocal;
    else chainMM = mullionMMlocal + openMM;
    segs.push({ openMM: openMM, chainMM: chainMM });
  }
  return { innerMMW: innerMMW, segs: segs };
}

function setColumnChainSegmentMM(mmW, frameMMlocal, mullionMMlocal, colIndex, targetChainMM){
  ensureColumnsArrayConsistency();
  var cols = Math.max(1, Number(state.columnsCount) || 1);
  if (cols === 1) { state.columns[0].widthPct = 100; return; }
  colIndex = clampNumber(Number(colIndex) || 0, 0, cols - 1);
  var mmData = getColumnChainSegmentsMM(mmW, frameMMlocal, mullionMMlocal);
  var innerMMW = mmData.innerMMW;
  var minOpen = DRAG_MIN_COL_MM;
  var openVals = [];
  for (var i=0;i<mmData.segs.length;i++) openVals.push(Number(mmData.segs[i].openMM) || minOpen);
  var targetOpen;
  if (colIndex === 0) targetOpen = targetChainMM - frameMMlocal - (mullionMMlocal / 2);
  else if (colIndex === cols - 1) targetOpen = targetChainMM - frameMMlocal - (mullionMMlocal / 2);
  else targetOpen = targetChainMM - mullionMMlocal;
  var maxOpen = innerMMW - (cols - 1) * minOpen;
  targetOpen = clampNumber(targetOpen, minOpen, Math.max(minOpen, maxOpen));
  openVals[colIndex] = targetOpen;
  var otherIdx = [];
  for (var j=0;j<cols;j++){ if (j !== colIndex) otherIdx.push(j); }
  var remaining = innerMMW - targetOpen;
  if (otherIdx.length === 1){
    openVals[otherIdx[0]] = remaining;
  } else {
    var minTotal = minOpen * otherIdx.length;
    var extra = Math.max(0, remaining - minTotal);
    var flexBase = 0;
    for (var k=0;k<otherIdx.length;k++) flexBase += Math.max(0, openVals[otherIdx[k]] - minOpen);
    for (var k2=0;k2<otherIdx.length;k2++){
      var idx = otherIdx[k2];
      var share = flexBase > 0 ? (Math.max(0, openVals[idx] - minOpen) / flexBase) : (1 / otherIdx.length);
      openVals[idx] = minOpen + extra * share;
    }
  }
  var pctSum = 0;
  for (var p=0;p<cols;p++){
    var pct = (openVals[p] / innerMMW) * 100;
    state.columns[p].widthPct = pct;
    pctSum += pct;
  }
  if (pctSum > 0){
    for (var q=0;q<cols;q++) state.columns[q].widthPct = (state.columns[q].widthPct / pctSum) * 100;
  }
}

function getColumnSegmentsPx(innerX, innerW, mullionPx){
  var cols = Math.max(1, Number(state.columnsCount) || 1);
  var widthsPct = getColumnWidthPercents();
  var totalMullionW = mullionPx * Math.max(0, cols - 1);
  var usableW = Math.max(10, innerW - totalMullionW);
  var segs = [];
  var xCursor = innerX;
  for (var c=0; c<cols; c++) {
    var colWpx = usableW * ((widthsPct[c] || 0) / 100);
    if (c === cols - 1) colWpx = (innerX + innerW) - xCursor;
    segs.push({ x: xCursor, w: colWpx });
    xCursor += colWpx + (c < cols - 1 ? mullionPx : 0);
  }
  return segs;
}

function getColumnChainSegmentsPx(innerX, innerW, frameOuterX, outerW, mullionPx){
  var segsPx = getColumnSegmentsPx(innerX, innerW, mullionPx);
  var out = [];
  for (var i=0;i<segsPx.length;i++){
    var chainStart, chainEnd;
    if (segsPx.length === 1){
      chainStart = frameOuterX;
      chainEnd = frameOuterX + outerW;
    } else if (i === 0){
      chainStart = frameOuterX;
      chainEnd = segsPx[i].x + segsPx[i].w + (mullionPx / 2);
    } else if (i === segsPx.length - 1){
      chainStart = segsPx[i].x - (mullionPx / 2);
      chainEnd = frameOuterX + outerW;
    } else {
      chainStart = segsPx[i].x - (mullionPx / 2);
      chainEnd = segsPx[i].x + segsPx[i].w + (mullionPx / 2);
    }
    out.push({ x1: chainStart, x2: chainEnd, cx: (chainStart + chainEnd) / 2, inner: segsPx[i] });
  }
  return out;
}

function getRowChainSegmentsPx(col, innerY, innerH, outerY, outerH, transomPx){
  var segsPx = getRowSegmentsPx(col, innerY, innerH, transomPx);
  var out = [];
  for (var i=0;i<segsPx.length;i++){
    var chainStart, chainEnd;
    if (segsPx.length === 1){
      chainStart = outerY;
      chainEnd = outerY + outerH;
    } else if (i === 0){
      chainStart = outerY;
      chainEnd = segsPx[i].y + segsPx[i].h + (transomPx / 2);
    } else if (i === segsPx.length - 1){
      chainStart = segsPx[i].y - (transomPx / 2);
      chainEnd = outerY + outerH;
    } else {
      chainStart = segsPx[i].y - (transomPx / 2);
      chainEnd = segsPx[i].y + segsPx[i].h + (transomPx / 2);
    }
    out.push({ y1: chainStart, y2: chainEnd, cy: (chainStart + chainEnd) / 2, inner: segsPx[i] });
  }
  return out;
}

function getRowSegmentsPx(col, innerY, innerH, transomPx){
  var rows = Math.max(1, Number(col && col.rowsCount) || 1);
  var heightsPct = getRowHeightPercents(col);
  var totalTransomH = transomPx * Math.max(0, rows - 1);
  var usableH = Math.max(10, innerH - totalTransomH);
  var segs = [];
  var yCursor = innerY;
  for (var r=0; r<rows; r++){
    var rowH = usableH * ((heightsPct[r] || 0) / 100);
    if (r === rows - 1) rowH = (innerY + innerH) - yCursor;
    segs.push({ y: yCursor, h: rowH });
    yCursor += rowH + (r < rows - 1 ? transomPx : 0);
  }
  return segs;
}


var _dragState = null;
var _dragHover = null;
var DRAG_MIN_ROW_MM = 150;
var DRAG_MIN_COL_MM = 250;

function isInteractiveOverlayEnabled(){
  return true;
}

function dragHitKey(hit){
  if (!hit) return '';
  return String(hit.type||'') + ':' + String(hit.colIndex!=null?hit.colIndex:'') + ':' + String(hit.index!=null?hit.index:'');
}

function setDragHover(hit){
  var prev = dragHitKey(_dragHover);
  var next = dragHitKey(hit);
  if (prev === next) return;
  _dragHover = hit ? { type:hit.type, index:hit.index, colIndex:hit.colIndex } : null;
  scheduleRender('dragHover');
}

function svgPointFromEvent(evt){
  if (!el.svgPreview) return { x:0, y:0 };
  var svg = el.svgPreview;
  var pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  var ctm = svg.getScreenCTM();
  if (!ctm) return { x:0, y:0 };
  var inv = ctm.inverse();
  var p2 = pt.matrixTransform(inv);
  return { x:p2.x, y:p2.y };
}

function updateSvgDragCursor(evt){
  if (!el.svgPreview || !window.__kozynDragGeom || _dragState) return;
  var hit = getDragHit(svgPointFromEvent(evt));
  setDragHover(hit);
  el.svgPreview.style.cursor = hit ? ((hit.type === 'col') ? 'ew-resize' : 'ns-resize') : '';
}

function getDragHit(pt){
  var geom = window.__kozynDragGeom;
  if (!geom) return null;
  var tol = 10;
  var best = null;
  if (Array.isArray(geom.colCenters)){
    for (var i=0;i<geom.colCenters.length;i++){
      var x = geom.colCenters[i];
      if (Math.abs(pt.x - x) <= tol && pt.y >= geom.outerY && pt.y <= (geom.outerY + geom.outerH)){
        best = { type:'col', index:i, dist:Math.abs(pt.x - x) };
      }
    }
  }
  var activeColIndex = clampNumber(Number(state.activeColIndex)||0, 0, Math.max(0, (state.columnsCount||1)-1));
  if (Array.isArray(geom.rowCentersByCol) && Array.isArray(geom.rowCentersByCol[activeColIndex])){
    var colSeg = geom.colSegs && geom.colSegs[activeColIndex];
    for (var r=0;r<geom.rowCentersByCol[activeColIndex].length;r++){
      var y = geom.rowCentersByCol[activeColIndex][r];
      if (Math.abs(pt.y - y) <= tol && colSeg && pt.x >= colSeg.x && pt.x <= (colSeg.x + colSeg.w)){
        var cand = { type:'row', colIndex:activeColIndex, index:r, dist:Math.abs(pt.y - y) };
        if (!best || cand.dist < best.dist) best = cand;
      }
    }
  }
  return best;
}

function installSvgDragInteractions(){
  if (!el.svgPreview || el.svgPreview.__kozynDragInstalled) return;
  var svg = el.svgPreview;
  svg.__kozynDragInstalled = true;

  svg.addEventListener('pointermove', function(evt){
    if (_dragState){
      handleSvgDragMove(evt);
    } else {
      updateSvgDragCursor(evt);
    }
  });
  svg.addEventListener('pointerdown', function(evt){
    var hit = getDragHit(svgPointFromEvent(evt));
    if (!hit) return;
    evt.preventDefault();
    svg.setPointerCapture(evt.pointerId);
    _dragState = { pointerId: evt.pointerId, hit: hit };
    setDragHover(hit);
    svg.style.cursor = (hit.type === 'col') ? 'ew-resize' : 'ns-resize';
  });
  function endDrag(evt){
    if (_dragState && evt.pointerId === _dragState.pointerId){
      try { svg.releasePointerCapture(evt.pointerId); } catch(e){}
      _dragState = null;
      updateSvgDragCursor(evt);
    }
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('pointerleave', function(evt){ if (!_dragState){ svg.style.cursor = ''; setDragHover(null); } });
  svg.addEventListener('dblclick', function(evt){
    var hit = getDragHit(svgPointFromEvent(evt));
    if (!hit) return;
    evt.preventDefault();
    handleSvgDirectEdit(hit);
  });
}

function handleSvgDirectEdit(hit){
  if (!hit) return;
  if (hit.type === 'col'){
    var mmW = Number(state.widthMM) || 1200;
    var frameMMlocal = Number((state.profile||{}).frameMM) || 70;
    var mullionMMlocal = Number((state.profile||{}).mullionMM) || 60;
    var curCol = getColumnChainSegmentsMM(mmW, frameMMlocal, mullionMMlocal);
    var current = (curCol.segs[hit.index] && curCol.segs[hit.index].chainMM) ? Math.round(curCol.segs[hit.index].chainMM) : 0;
    var raw = window.prompt('Kolommaat tot hart middenstijl (mm)', String(current || ''));
    if (raw == null) return;
    var target = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(target)) return;
    setColumnChainSegmentMM(mmW, frameMMlocal, mullionMMlocal, hit.index, target);
    scheduleRender('editColMM');
    return;
  }
  if (hit.type === 'row'){
    var col = state.columns[hit.colIndex];
    if (!col) return;
    var vakCfg = resolveVakhoogteProfileMM();
    var curRow = getRowChainSegmentsMM(col, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, vakCfg.isSlidingFieldDims);
    var current2 = (curRow.segs[hit.index] && curRow.segs[hit.index].chainMM) ? Math.round(curRow.segs[hit.index].chainMM) : 0;
    var raw2 = window.prompt('Vakmaat tot hart tussenregel (mm)', String(current2 || ''));
    if (raw2 == null) return;
    var target2 = Number(String(raw2).replace(',', '.'));
    if (!Number.isFinite(target2)) return;
    setRowChainSegmentMM(col, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, hit.index, target2, vakCfg.isSlidingFieldDims);
    scheduleRender('editRowMM');
  }
}

function handleSvgDragMove(evt){
  if (!_dragState) return;
  var hit = _dragState.hit;
  var pt = svgPointFromEvent(evt);
  var geom = window.__kozynDragGeom;
  if (!geom) return;
  if (hit.type === 'col'){
    var mmW = Number(state.widthMM) || 1200;
    var frameMMlocal = Number((state.profile||{}).frameMM) || 70;
    var mullionMMlocal = Number((state.profile||{}).mullionMM) || 60;
    var x = clampNumber(pt.x, geom.outerX + 20, geom.outerX + geom.outerW - 20);
    var targetChainMM;
    if (hit.index === 0){
      targetChainMM = ((x - geom.outerX) / geom.pxPerMMX);
    } else {
      var prevX = geom.colCenters[hit.index - 1];
      targetChainMM = ((x - prevX) / geom.pxPerMMX);
    }
    setColumnChainSegmentMM(mmW, frameMMlocal, mullionMMlocal, hit.index, targetChainMM);
    var curCol = getColumnChainSegmentsMM(mmW, frameMMlocal, mullionMMlocal);
    var curMM = (curCol.segs[hit.index] && curCol.segs[hit.index].chainMM) ? curCol.segs[hit.index].chainMM : targetChainMM;
    _dragState.liveLabel = {
      text: Math.round(curMM) + ' mm',
      x: x,
      y: geom.outerY - 16,
      vertical: false
    };
    scheduleRender('dragCol');
    return;
  }
  if (hit.type === 'row'){
    var col = state.columns[hit.colIndex];
    if (!col) return;
    var vakCfg = resolveVakhoogteProfileMM();
    var y = clampNumber(pt.y, geom.outerY + 20, geom.outerY + geom.outerH - 20);
    var targetChainMM;
    if (hit.index === 0){
      targetChainMM = ((y - geom.outerY) / geom.pxPerMMY);
    } else {
      var prevY = geom.rowCentersByCol[hit.colIndex][hit.index - 1];
      targetChainMM = ((y - prevY) / geom.pxPerMMY);
    }
    setRowChainSegmentMM(col, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, hit.index, targetChainMM, vakCfg.isSlidingFieldDims);
    var curRow = getRowChainSegmentsMM(col, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, vakCfg.isSlidingFieldDims);
    var curMM2 = (curRow.segs[hit.index] && curRow.segs[hit.index].chainMM) ? curRow.segs[hit.index].chainMM : targetChainMM;
    _dragState.liveLabel = {
      text: Math.round(curMM2) + ' mm',
      x: geom.outerX + geom.outerW + 28,
      y: y,
      vertical: true
    };
    scheduleRender('dragRow');
  }
}

function deriveAutoPaneType(elementType){
  if (elementType === "deur") return "deur";
  if (elementType === "schuifpui") return "schuif";
  if (elementType === "dakraam") return "kiep";
  // kozijn default
  return "vast";
}



function buildPaneTypeOptionsHtml(elementType){
  // Pane types allowed per element-type (Chef: logisch & fabriek-proof)
  var opts = [];
  function add(v,l){ opts.push('<option value="'+v+'">'+l+'</option>'); }

  add('auto','Auto');
  if (elementType === 'kozijn'){
    add('vast','Vast glas');
    add('draai_kiep','Draai-kiep');
    add('kiep','Kiep');
    add('vent','Ventilatierooster');
  } else if (elementType === 'deur'){
    add('vast','Bovenlicht (glas)');
    add('deur','Deur');
  } else if (elementType === 'schuifpui'){
    add('schuif','Schuifdeel');
    add('vast','Vast deel');
    add('vent','Ventilatierooster');
  } else if (elementType === 'dakraam'){
    add('kiep','Dakraam (kiep)');
    add('vast','Vast');
  } else {
    // safe fallback
    add('vast','Vast');
  }
  return opts.join('');
}
// -------------------------
// UI render
// -------------------------
var UI_VISIBILITY_RULES = {
  kozijn: { slideSystem: false, schuifpuiOptions: false, schuifpuiProfiles: false, genericProfiles: true, spSideField: false },
  deur: { slideSystem: false, schuifpuiOptions: false, schuifpuiProfiles: false, genericProfiles: true, spSideField: false },
  schuifpui: { slideSystem: true, schuifpuiOptions: true, schuifpuiProfiles: true, genericProfiles: false, spSideField: true },
  dakraam: { slideSystem: false, schuifpuiOptions: false, schuifpuiProfiles: false, genericProfiles: true, spSideField: false }
};

function applyElementVisibility(){
  var cfg = UI_VISIBILITY_RULES[state.elementType] || UI_VISIBILITY_RULES.kozijn;
  if (el.fieldSlideSystem) el.fieldSlideSystem.style.display = cfg.slideSystem ? "" : "none";
  if (el.fieldSchuifpuiOptions) el.fieldSchuifpuiOptions.style.display = cfg.schuifpuiOptions ? "" : "none";
  var generic = document.getElementById("profileGenericWrap");
  var schuif = document.getElementById("profileSchuifpuiWrap");
  if (generic) generic.style.display = cfg.genericProfiles ? "" : "none";
  if (schuif) schuif.style.display = cfg.schuifpuiProfiles ? "" : "none";
  if (el.spSideField) el.spSideField.style.display = cfg.spSideField ? "" : "none";
}

function renderActiveColDropdown(){
  var html = "";
  for (var i=0;i<state.columnsCount;i++){
    var label = "K" + (i+1);
    html += "<option value=\"" + i + "\">" + label + "</option>";
  }
  el.selActiveCol.innerHTML = html;
  el.selActiveCol.value = String(state.activeColIndex);
  el.activeColBadge.textContent = "K" + (state.activeColIndex + 1);
}

function renderControlsFromState(){
  // Do not clobber fields while user is typing (prevents cursor jumps).
  setValueIfNotFocused(el.selElementType, state.elementType);
  applyElementVisibility();
  if (el.selSlideSystem){
    setValueIfNotFocused(el.selSlideSystem, state.slideSystem || "hst");
  }
  if (el.selRenderMode){
    setValueIfNotFocused(el.selRenderMode, state.renderMode || "sales");
  }
  if (el.chkModeFactory){
    el.chkModeFactory.checked = ((state.renderMode||"sales") === "factory");
  }
  if (el.lblModeSales && el.lblModeFactory){
    el.lblModeSales.classList.toggle("inactive", (state.renderMode||"sales") === "factory");
    el.lblModeFactory.classList.toggle("inactive", (state.renderMode||"sales") !== "factory");
  }
  syncDrawButtons();
  // Options
  if (el.selColorOutside) setValueIfNotFocused(el.selColorOutside, (state.elementOptions && state.elementOptions.colorOutside) ? state.elementOptions.colorOutside : "RAL7016");
  if (el.inpColorCodeOutside) setValueIfNotFocused(el.inpColorCodeOutside, (state.elementOptions && state.elementOptions.colorCodeOutside) ? state.elementOptions.colorCodeOutside : "");
  if (el.selColorInside) setValueIfNotFocused(el.selColorInside, (state.elementOptions && state.elementOptions.colorInside) ? state.elementOptions.colorInside : "same");
  if (el.inpColorCodeInside) setValueIfNotFocused(el.inpColorCodeInside, (state.elementOptions && state.elementOptions.colorCodeInside) ? state.elementOptions.colorCodeInside : "");
  if (el.selFinishOutside) setValueIfNotFocused(el.selFinishOutside, (state.elementOptions && state.elementOptions.finishOutside) ? state.elementOptions.finishOutside : "smooth");
  if (el.selFinishInside) setValueIfNotFocused(el.selFinishInside, (state.elementOptions && state.elementOptions.finishInside) ? state.elementOptions.finishInside : "smooth");
  if (el.selPremiumColor) setValueIfNotFocused(el.selPremiumColor, (state.elementOptions && state.elementOptions.premiumColor) ? state.elementOptions.premiumColor : "no");
  updateColorCardVisibility();
  if (el.chkSill) el.chkSill.checked = !!(state.elementOptions && state.elementOptions.sill);
  if (el.chkShowDims) el.chkShowDims.checked = !!state.showDims;

  setValueIfNotFocused(el.inpWidth, String(state.widthMM));
  setValueIfNotFocused(el.inpHeight, String(state.heightMM));
  setValueIfNotFocused(el.inpCols, String(state.columnsCount));

  // Schuifpui: extra opties in Kolom instellingen
  var isSchuifpui = (String(state.elementType) === "schuifpui");
  if (isSchuifpui && el.selSpSideInVakken){
    el.selSpSideInVakken.value = (state.schuifpuiActiveSide || "left");
  }

  renderActiveColDropdown();

  var col = state.columns[state.activeColIndex];
  setValueIfNotFocused(el.inpRows, String(col.rowsCount));

  // Per-vak types (Chef: eerst vak kiezen -> dan vulling -> dan opties)
  if (el.rowTypeList){
    el.rowTypeList.innerHTML = "";

    // Helpers
    function ensureRow(colObj, rowIndex){
      if (!colObj.rows) colObj.rows = [];
      if (!colObj.rows[rowIndex]) colObj.rows[rowIndex] = { paneType:"auto", options:{hinge:"left"} };
      if (!colObj.rows[rowIndex].options) colObj.rows[rowIndex].options = { hinge:"left" };
      return colObj.rows[rowIndex];
    }
    function resolvedPaneType(rowObj){
      return (rowObj.paneType === "auto") ? deriveAutoPaneType(state.elementType) : rowObj.paneType;
    }
    function supportsFill(elementType, paneResolved){
      if (elementType === "kozijn"){
        // Vast/DK/Kiep: kan glas of paneel (Chef-wens)
        return (paneResolved === "vast" || paneResolved === "draai_kiep" || paneResolved === "kiep");
      }
      if (elementType === "deur"){
        // Alleen deurvleugel: glas/paneel; bovenlicht is altijd glas
        return (paneResolved === "deur");
      }
      return false;
    }
    function isGlassOnly(elementType, paneResolved){
      if (elementType === "deur" && paneResolved === "vast") return true; // bovenlicht
      // kozijn 'vast' kan paneel -> niet glass only
      return false;
    }

    var col2 = state.columns[state.activeColIndex];
    var activeRowIndex = clampNumber((state.activeRowIndex==null?0:state.activeRowIndex), 0, (col2.rowsCount||1)-1);
    state.activeRowIndex = activeRowIndex;

    // Row navigator (Vak 1..n)
    var nav = document.createElement("div");
    nav.style.display = "flex";
    nav.style.flexWrap = "wrap";
    nav.style.gap = "8px";
    nav.style.marginTop = "6px";

    for (var r=0;r<col2.rowsCount;r++){
      (function(ri){
        var b = document.createElement("button");
        b.type = "button";
        b.className = "miniBtn";
        var rowObj = ensureRow(col2, ri);
        var label = resolvedPaneType(rowObj);
        // short label
        var short = (label==="draai_kiep")?"DK":(label==="kiep")?"KIEP":(label==="deur")?"DEUR":(label==="schuif")?"SCHUIF":"VAST";
        b.textContent = "Vak " + (ri+1) + " • " + short;
        if (ri === activeRowIndex){
          b.style.borderColor = "rgba(140,170,255,0.60)";
          b.style.boxShadow = "0 0 0 2px rgba(140,170,255,0.12) inset";
        }
        b.addEventListener("click", function(){
          state.activeRowIndex = ri;
          scheduleRender("activeRow");
        });
        nav.appendChild(b);
      })(r);
    }
    el.rowTypeList.appendChild(nav);

    // Divider
    var hr = document.createElement("div");
    hr.style.height = "1px";
    hr.style.background = "var(--line2)";
    hr.style.margin = "12px 0";
    el.rowTypeList.appendChild(hr);

    // Vakhoogtes in mm (per actieve kolom)
    var vakCfg = resolveVakhoogteProfileMM();
    var rowChain = getRowChainSegmentsMM(col2, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, vakCfg.isSlidingFieldDims);
    var vhBox = document.createElement("div");
    vhBox.style.marginBottom = "12px";
    vhBox.style.padding = "10px";
    vhBox.style.borderRadius = "12px";
    vhBox.style.border = "1px solid var(--line2)";
    vhBox.style.background = "rgba(10,16,26,0.20)";

    var vhHead = document.createElement("div");
    vhHead.style.display = "flex";
    vhHead.style.alignItems = "center";
    vhHead.style.justifyContent = "space-between";
    vhHead.style.gap = "10px";
    vhHead.style.marginBottom = "10px";
    vhHead.innerHTML = '<div style="font-weight:900;">Vakhoogtes</div>'; 

    var btnEq = document.createElement("button");
    btnEq.type = "button";
    btnEq.className = "miniBtn";
    btnEq.textContent = "Gelijk verdelen";
    btnEq.addEventListener("click", function(){
      var activeCol = state.columns[state.activeColIndex];
      equalizeRowHeightsForColumn(activeCol);
      scheduleRender("equalVakhoogtes");
    });
    vhHead.appendChild(btnEq);
    vhBox.appendChild(vhHead);

    var vhGrid = document.createElement("div");
    vhGrid.className = "grid";
    for (var vr=0; vr<rowChain.segs.length; vr++){
      (function(vrIndex){
        var field = document.createElement("div");
        field.className = "field";
        field.innerHTML = '<div class="label">Hoogte (mm)</div>'; 
        var inpMM = document.createElement("input");
        inpMM.type = "number";
        inpMM.className = "input mono";
        inpMM.min = String(DRAG_MIN_ROW_MM);
        inpMM.step = "1";
        inpMM.value = String(Math.round((rowChain.segs[vrIndex] && rowChain.segs[vrIndex].chainMM) || 0));
        inpMM.addEventListener("input", function(){
          var activeCol = state.columns[state.activeColIndex];
          if (!activeCol) return;
          var maxMM = Math.max(DRAG_MIN_ROW_MM, Number(state.heightMM) || 1400);
          var targetMM = clampNumber(Number(inpMM.value || 0), DRAG_MIN_ROW_MM, maxMM);
          setRowChainSegmentMM(activeCol, Number(state.heightMM) || 1400, vakCfg.frameMM, vakCfg.transomMM, vrIndex, targetMM, vakCfg.isSlidingFieldDims);
          scheduleRender("vakhoogteMM");
        });
        field.appendChild(inpMM);
        vhGrid.appendChild(field);
      })(vr);
    }
    vhBox.appendChild(vhGrid);
    var vhHelp = document.createElement("div");
    vhHelp.className = "help";
    vhHelp.textContent = "";
    vhBox.appendChild(vhHelp);
    el.rowTypeList.appendChild(vhBox);

    if (Number(state.columnsCount || 1) > 1){
      var colBox = document.createElement("div");
      colBox.style.marginBottom = "12px";
      colBox.style.padding = "10px";
      colBox.style.borderRadius = "12px";
      colBox.style.border = "1px solid var(--line2)";
      colBox.style.background = "rgba(10,16,26,0.20)";
      var colHead = document.createElement("div");
      colHead.style.display = "flex";
      colHead.style.alignItems = "center";
      colHead.style.justifyContent = "space-between";
      colHead.style.gap = "10px";
      colHead.style.marginBottom = "10px";
      colHead.innerHTML = '<div style="font-weight:900;">Kolombreedtes</div>'; 
      var btnEqCols = document.createElement("button");
      btnEqCols.type = "button";
      btnEqCols.className = "miniBtn";
      btnEqCols.textContent = "Gelijk verdelen";
      btnEqCols.addEventListener("click", function(){ equalizeColumnWidths(); scheduleRender("equalCols"); });
      colHead.appendChild(btnEqCols);
      colBox.appendChild(colHead);
      var colGrid = document.createElement("div");
      colGrid.className = "grid";
      var colChain = getColumnChainSegmentsMM(Number(state.widthMM) || 1200, Number((state.profile||{}).frameMM) || 70, Number((state.profile||{}).mullionMM) || 60);
      for (var cc=0; cc<colChain.segs.length; cc++) {
        (function(colIndex){
          var field = document.createElement("div");
          field.className = "field";
          field.innerHTML = '';
          var inp = document.createElement("input");
          inp.type = "number";
          inp.className = "input mono";
          inp.min = String(DRAG_MIN_COL_MM);
          inp.step = "1";
          inp.value = String(Math.round((colChain.segs[colIndex] && colChain.segs[colIndex].chainMM) || 0));
          inp.addEventListener("input", function(){
            var target = clampNumber(Number(inp.value || 0), DRAG_MIN_COL_MM, Number(state.widthMM) || 1200);
            setColumnChainSegmentMM(Number(state.widthMM) || 1200, Number((state.profile||{}).frameMM) || 70, Number((state.profile||{}).mullionMM) || 60, colIndex, target);
            scheduleRender("colWidthMM");
          });
          field.appendChild(inp);
          colGrid.appendChild(field);
        })(cc);
      }
      colBox.appendChild(colGrid);
      var colHelp = document.createElement("div");
      colHelp.className = "help";
      colHelp.textContent = "";
      colBox.appendChild(colHelp);
      el.rowTypeList.appendChild(colBox);
    }

    // Active row controls
    var row = ensureRow(col2, activeRowIndex);
    var resolved = resolvedPaneType(row);

    var typeBox = document.createElement("div");
    typeBox.style.marginTop = "10px";
    typeBox.style.marginBottom = "10px";
    typeBox.style.boxSizing = "border-box";
    typeBox.style.padding = "10px";
    typeBox.style.borderRadius = "12px";
    typeBox.style.border = "1px solid var(--line2)";
    typeBox.style.background = "rgba(10,16,26,0.20)";

    var typeHead = document.createElement("div");
    typeHead.style.display = "flex";
    typeHead.style.alignItems = "center";
    typeHead.style.justifyContent = "space-between";
    typeHead.style.gap = "10px";
    typeHead.style.marginBottom = "10px";
    typeHead.innerHTML = '<div style="font-weight:900;">Type vak</div>';
    typeBox.appendChild(typeHead);

    var controls = document.createElement("div");
    controls.className = "grid";
    controls.style.alignItems = "start";
    controls.style.gridTemplateColumns = "1fr 1fr";

    function normalizeVakField(fieldEl){
      if (!fieldEl) return fieldEl;
      fieldEl.className = "field";
      fieldEl.style.margin = "0";
      fieldEl.style.alignSelf = "start";
      fieldEl.style.display = "flex";
      fieldEl.style.flexDirection = "column";
      fieldEl.style.justifyContent = "flex-start";
      return fieldEl;
    }

    // Vak type select
    var fType = document.createElement("div");
    normalizeVakField(fType);
    fType.innerHTML = '<div class="label">Type</div>';
    var selType = document.createElement("select");
    selType.className = "input";
    selType.innerHTML = buildPaneTypeOptionsHtml(state.elementType);
    selType.value = row.paneType || "auto";
    selType.addEventListener("change", function(){
      var colX = state.columns[state.activeColIndex];
      var rX = ensureRow(colX, state.activeRowIndex);
      rX.paneType = selType.value;

      // defaults when type changes
      var resX = resolvedPaneType(rX);
      if (supportsFill(state.elementType, resX)){
        if (!rX.options.fill) rX.options.fill = "glass";
      } else if (isGlassOnly(state.elementType, resX)){
        rX.options.fill = "glass";
      } else {
        // clear irrelevant
        delete rX.options.fill;
        delete rX.options.panelType;
        delete rX.options.panelStyle;
        delete rX.options.panelColorOutside;
        delete rX.options.panelColorInside;
        delete rX.options.panelFinish;
        delete rX.options.panelInsulation;
        delete rX.options.glassFinish;
        delete rX.options.glassPack;
        delete rX.options.glassBuild;
        delete rX.options.acousticGlass;
        delete rX.options.spacerColor;
        delete rX.options.roedes;
        delete rX.options.roedeType;
        delete rX.options.roedeColor;
        delete rX.options.roedeDivision;
        delete rX.options.inlineVent;
        delete rX.options.safetyGlass;
      }
      scheduleRender("vakType");
    });
    fType.appendChild(selType);
    controls.appendChild(fType);

    // Scharnier (alleen bij deur/draai-kiep)
    var showHinge = (resolved === "draai_kiep" || resolved === "deur");
    var fHinge = document.createElement("div");
    normalizeVakField(fHinge);
    fHinge.style.display = showHinge ? "flex" : "none";
    fHinge.innerHTML = '<div class="label">Scharnierzijde</div>';
    var selHinge = document.createElement("select");
    selHinge.className = "input";
    selHinge.innerHTML = '<option value="left">Links</option><option value="right">Rechts</option>';
    selHinge.value = (row.options && row.options.hinge) ? row.options.hinge : "left";
    selHinge.addEventListener("change", function(){
      var colX = state.columns[state.activeColIndex];
      var rX = ensureRow(colX, state.activeRowIndex);
      rX.options.hinge = selHinge.value;
      scheduleRender("hinge");
    });
    fHinge.appendChild(selHinge);
    controls.appendChild(fHinge);

    // Vulling (glas/paneel) indien logisch
    var showFill = supportsFill(state.elementType, resolved) || isGlassOnly(state.elementType, resolved);
    var fFill = document.createElement("div");
    normalizeVakField(fFill);
    fFill.style.display = showFill ? "flex" : "none";
    fFill.innerHTML = '<div class="label">Vulling</div>';
    var selFill = document.createElement("select");
    selFill.className = "input";
    if (isGlassOnly(state.elementType, resolved)){
      selFill.innerHTML = '<option value="glass">Glas</option>';
      selFill.value = "glass";
    } else {
      selFill.innerHTML = '<option value="glass">Glas</option><option value="panel">Paneel</option>';
      selFill.value = (row.options && row.options.fill) ? row.options.fill : "glass";
    }
    selFill.addEventListener("change", function(){
      var colX = state.columns[state.activeColIndex];
      var rX = ensureRow(colX, state.activeRowIndex);
      rX.options.fill = selFill.value;
      scheduleRender("fill");
    });
    fFill.appendChild(selFill);
    controls.appendChild(fFill);

    typeBox.appendChild(controls);
    el.rowTypeList.appendChild(typeBox);

    // Context opties blok (pas NA type+vulling)
    var optBox = document.createElement("div");
    optBox.style.marginTop = "10px";
    optBox.style.padding = "10px";
    optBox.style.borderRadius = "12px";
    optBox.style.border = "1px solid var(--line2)";
    optBox.style.background = "rgba(10,16,26,0.20)";
    optBox.style.boxSizing = "border-box";

    function currentFill(){
      var colX = state.columns[state.activeColIndex];
      var rX = ensureRow(colX, state.activeRowIndex);
      var resX = resolvedPaneType(rX);
      if (isGlassOnly(state.elementType, resX)) return "glass";
      return (rX.options && rX.options.fill) ? rX.options.fill : (supportsFill(state.elementType, resX) ? "glass" : null);
    }

    var fillKind = currentFill();

    if (fillKind === "glass"){
      optBox.innerHTML = '<div style="font-weight:900; margin-bottom:8px;">Glas opties</div>'; 
      var gGrid = document.createElement("div");
      gGrid.className = "grid";

      var currentGlassPack = (row.options && row.options.glassPack) ? row.options.glassPack : "HR++";
      if (currentGlassPack === "HR+++" || currentGlassPack === "Triple") currentGlassPack = "Triple";

      var currentGlassFinish = (row.options && row.options.glassFinish) ? row.options.glassFinish : "clear";
      if (currentGlassFinish === "mat") currentGlassFinish = "satinato";

      var currentGlassBuild = (row.options && row.options.glassBuild) ? row.options.glassBuild : "";
      if (!currentGlassBuild){
        var legacySafety = (row.options && row.options.safetyGlass) ? row.options.safetyGlass : "none";
        currentGlassBuild = ({
          none: "standard",
          inside: "laminated_inside",
          outside: "laminated_outside",
          both: "laminated_both"
        }[legacySafety] || "standard");
      }

      var currentAcousticGlass = (row.options && row.options.acousticGlass) ? row.options.acousticGlass : "no";
      var currentSpacerColor = (row.options && row.options.spacerColor) ? row.options.spacerColor : "black";
      var currentRoedes = (row.options && row.options.roedes) ? row.options.roedes : "no";
      var currentRoedeType = (row.options && row.options.roedeType) ? row.options.roedeType : "between_glass";
      var currentRoedeColor = (row.options && row.options.roedeColor) ? row.options.roedeColor : "profile";
      var currentRoedeDivision = (row.options && row.options.roedeDivision) ? row.options.roedeDivision : "2x2";

      var fg1 = document.createElement("div");
      fg1.className = "field";
      fg1.innerHTML = '<div class="label">Glaspakket</div>';
      var selGP = document.createElement("select");
      selGP.className = "input";
      selGP.innerHTML = '<option value="HR++">HR++</option><option value="Triple">Triple (HR+++)</option>';
      selGP.value = currentGlassPack;
      selGP.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.glassPack = selGP.value;
        state.elementOptions.glassPack = (selGP.value === 'Triple' ? 'HR+++' : selGP.value);
        scheduleTotalsOnly("glassPack");
        scheduleRender("glassPack");
      });
      fg1.appendChild(selGP);
      gGrid.appendChild(fg1);

      var fg2 = document.createElement("div");
      fg2.className = "field";
      fg2.innerHTML = '<div class="label">Glasuitvoering</div>';
      var selGF = document.createElement("select");
      selGF.className = "input";
      selGF.innerHTML = '<option value="clear">Helder</option><option value="satinato">Mat / Satinato</option><option value="ornament">Ornament</option><option value="solar">Zonwerend</option>';
      selGF.value = currentGlassFinish;
      selGF.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.glassFinish = selGF.value;
        scheduleTotalsOnly("glassFinish");
      });
      fg2.appendChild(selGF);
      gGrid.appendChild(fg2);

      var fg3 = document.createElement("div");
      fg3.className = "field";
      fg3.innerHTML = '<div class="label">Glasopbouw</div>';
      var selGB = document.createElement("select");
      selGB.className = "input";
      selGB.innerHTML = '<option value="standard">Standaard</option><option value="laminated_inside">Gelaagd binnen</option><option value="laminated_outside">Gelaagd buiten</option><option value="laminated_both">Gelaagd beide zijden</option>';
      selGB.value = currentGlassBuild;
      selGB.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.glassBuild = selGB.value;
        delete rX.options.safetyGlass;
        scheduleTotalsOnly("glassBuild");
      });
      fg3.appendChild(selGB);
      gGrid.appendChild(fg3);

      var fg4 = document.createElement("div");
      fg4.className = "field";
      fg4.innerHTML = '<div class="label">Akoestisch glas</div>';
      var selAG = document.createElement("select");
      selAG.className = "input";
      selAG.innerHTML = '<option value="no">Nee</option><option value="yes">Ja</option>';
      selAG.value = currentAcousticGlass;
      selAG.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.acousticGlass = selAG.value;
        scheduleTotalsOnly("acousticGlass");
      });
      fg4.appendChild(selAG);
      gGrid.appendChild(fg4);

      var fg5 = document.createElement("div");
      fg5.className = "field";
      fg5.innerHTML = '<div class="label">Spacer kleur</div>';
      var selSC = document.createElement("select");
      selSC.className = "input";
      selSC.innerHTML = '<option value="black">Zwart</option><option value="gray">Grijs</option><option value="white">Wit</option>';
      selSC.value = currentSpacerColor;
      selSC.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.spacerColor = selSC.value;
        scheduleTotalsOnly("spacerColor");
      });
      fg5.appendChild(selSC);
      gGrid.appendChild(fg5);

      var fg6 = document.createElement("div");
      fg6.className = "field";
      fg6.innerHTML = '<div class="label">Roedes</div>';
      var selRD = document.createElement("select");
      selRD.className = "input";
      selRD.innerHTML = '<option value="no">Nee</option><option value="yes">Ja</option>';
      selRD.value = currentRoedes;
      selRD.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.roedes = selRD.value;
        var showRoedeFields = (selRD.value === "yes");
        fg7.style.display = showRoedeFields ? "" : "none";
        fg8.style.display = showRoedeFields ? "" : "none";
        fg9.style.display = showRoedeFields ? "" : "none";
        scheduleTotalsOnly("roedes");
        scheduleRender("roedes");
      });
      fg6.appendChild(selRD);
      gGrid.appendChild(fg6);

      var fg7 = document.createElement("div");
      fg7.className = "field";
      fg7.innerHTML = '<div class="label">Roedetype</div>';
      var selRT = document.createElement("select");
      selRT.className = "input";
      selRT.innerHTML = '<option value="between_glass">Tussen de ruit</option><option value="wiener">Wiener sprosse</option><option value="applied">Opplak</option>';
      selRT.value = currentRoedeType;
      selRT.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.roedeType = selRT.value;
        scheduleTotalsOnly("roedeType");
        scheduleRender("roedeType");
      });
      fg7.appendChild(selRT);
      fg7.style.display = currentRoedes === "yes" ? "" : "none";
      gGrid.appendChild(fg7);

      var fg8 = document.createElement("div");
      fg8.className = "field";
      fg8.innerHTML = '<div class="label">Roedekleur</div>';
      var selRC = document.createElement("select");
      selRC.className = "input";
      selRC.innerHTML = '<option value="profile">Gelijk aan profielkleur</option><option value="white">Wit</option><option value="cream">Crème</option><option value="black">Zwart</option><option value="gray">Grijs</option><option value="custom">Overig / later</option>';
      selRC.value = currentRoedeColor;
      selRC.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.roedeColor = selRC.value;
        scheduleTotalsOnly("roedeColor");
        scheduleRender("roedeColor");
      });
      fg8.appendChild(selRC);
      fg8.style.display = currentRoedes === "yes" ? "" : "none";
      gGrid.appendChild(fg8);

      var fg9 = document.createElement("div");
      fg9.className = "field";
      fg9.innerHTML = '<div class="label">Roedeverdeling</div>';
      var selRV = document.createElement("select");
      selRV.className = "input";
      selRV.innerHTML = '<option value="1x2">1 x 2</option><option value="1x3">1 x 3</option><option value="2x2">2 x 2</option><option value="2x3">2 x 3</option><option value="3x2">3 x 2</option><option value="3x3">3 x 3</option>';
      selRV.value = currentRoedeDivision;
      selRV.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.roedeDivision = selRV.value;
        scheduleTotalsOnly("roedeDivision");
        scheduleRender("roedeDivision");
      });
      fg9.appendChild(selRV);
      fg9.style.display = currentRoedes === "yes" ? "" : "none";
      gGrid.appendChild(fg9);

      if (resolved === "vast"){
        var fg10 = document.createElement("div");
        fg10.className = "field";
        fg10.innerHTML = '<div class="label">Ventilatierooster</div>';
        var selIV = document.createElement("select");
        selIV.className = "input";
        selIV.innerHTML = '<option value="no">Nee</option><option value="yes">Ja</option>';
        selIV.value = (row.options && row.options.inlineVent) ? row.options.inlineVent : "no";
        selIV.addEventListener("change", function(){
          var colX = state.columns[state.activeColIndex];
          var rX = ensureRow(colX, state.activeRowIndex);
          rX.options.inlineVent = selIV.value;
          scheduleRender("inlineVentGlass");
        });
        fg10.appendChild(selIV);
        gGrid.appendChild(fg10);
      }

      optBox.appendChild(gGrid);
    } else if (fillKind === "panel"){
      optBox.innerHTML = '<div style="font-weight:900; margin-bottom:8px;">Paneel opties</div>';
      var pGrid = document.createElement("div");
      pGrid.className = "grid";

      var currentPanelType = (row.options && row.options.panelType) ? row.options.panelType : "smooth";
      if (currentPanelType === "decor") currentPanelType = "sandwich";
      if (currentPanelType === "model") currentPanelType = "decorative";
      var currentPanelStyle = (row.options && row.options.panelStyle) ? row.options.panelStyle : "flat";
      var currentPanelColorOutside = (row.options && row.options.panelColorOutside) ? row.options.panelColorOutside : "profile";
      var currentPanelColorInside = (row.options && row.options.panelColorInside) ? row.options.panelColorInside : "profile";
      var currentPanelFinish = (row.options && row.options.panelFinish) ? row.options.panelFinish : "smooth";
      var currentPanelInsulation = (row.options && row.options.panelInsulation) ? row.options.panelInsulation : "no";

      var fp1 = document.createElement("div");
      fp1.className = "field";
      fp1.innerHTML = '<div class="label">Paneeltype</div>';
      var selPT = document.createElement("select");
      selPT.className = "input";
      selPT.innerHTML = '<option value="smooth">Glad</option><option value="sandwich">Sandwich</option><option value="decorative">Sierpaneel</option>';
      selPT.value = currentPanelType;
      selPT.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelType = selPT.value;
        scheduleTotalsOnly("panelType");
      });
      fp1.appendChild(selPT);
      pGrid.appendChild(fp1);

      var fp2 = document.createElement("div");
      fp2.className = "field";
      fp2.innerHTML = '<div class="label">Paneelstijl</div>';
      var selPS = document.createElement("select");
      selPS.className = "input";
      selPS.innerHTML = '<option value="flat">Vlak</option><option value="cassette">Cassette</option><option value="grooved">Siergroef</option>';
      selPS.value = currentPanelStyle;
      selPS.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelStyle = selPS.value;
        scheduleTotalsOnly("panelStyle");
      });
      fp2.appendChild(selPS);
      pGrid.appendChild(fp2);

      var fp3 = document.createElement("div");
      fp3.className = "field";
      fp3.innerHTML = '<div class="label">Paneelkleur buiten</div>';
      var selPCO = document.createElement("select");
      selPCO.className = "input";
      selPCO.innerHTML = '<option value="profile">Gelijk aan profielkleur</option><option value="white">Wit</option><option value="cream">Crème</option><option value="anthracite">Antraciet</option><option value="black">Zwart</option><option value="custom">Overig / later</option>';
      selPCO.value = currentPanelColorOutside;
      selPCO.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelColorOutside = selPCO.value;
        scheduleTotalsOnly("panelColorOutside");
      });
      fp3.appendChild(selPCO);
      pGrid.appendChild(fp3);

      var fp4 = document.createElement("div");
      fp4.className = "field";
      fp4.innerHTML = '<div class="label">Paneelkleur binnen</div>';
      var selPCI = document.createElement("select");
      selPCI.className = "input";
      selPCI.innerHTML = '<option value="profile">Gelijk aan profielkleur</option><option value="white">Wit</option><option value="cream">Crème</option><option value="anthracite">Antraciet</option><option value="black">Zwart</option><option value="custom">Overig / later</option>';
      selPCI.value = currentPanelColorInside;
      selPCI.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelColorInside = selPCI.value;
        scheduleTotalsOnly("panelColorInside");
      });
      fp4.appendChild(selPCI);
      pGrid.appendChild(fp4);

      var fp5 = document.createElement("div");
      fp5.className = "field";
      fp5.innerHTML = '<div class="label">Afwerking</div>';
      var selPF = document.createElement("select");
      selPF.className = "input";
      selPF.innerHTML = '<option value="smooth">Glad</option><option value="woodgrain">Houtnerf</option>';
      selPF.value = currentPanelFinish;
      selPF.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelFinish = selPF.value;
        scheduleTotalsOnly("panelFinish");
      });
      fp5.appendChild(selPF);
      pGrid.appendChild(fp5);

      var fp6 = document.createElement("div");
      fp6.className = "field";
      fp6.innerHTML = '<div class="label">Extra isolerend</div>';
      var selPI = document.createElement("select");
      selPI.className = "input";
      selPI.innerHTML = '<option value="no">Nee</option><option value="yes">Ja</option>';
      selPI.value = currentPanelInsulation;
      selPI.addEventListener("change", function(){
        var colX = state.columns[state.activeColIndex];
        var rX = ensureRow(colX, state.activeRowIndex);
        rX.options.panelInsulation = selPI.value;
        scheduleTotalsOnly("panelInsulation");
      });
      fp6.appendChild(selPI);
      pGrid.appendChild(fp6);

      if (resolved === "vast"){
        var fp7 = document.createElement("div");
        fp7.className = "field";
        fp7.innerHTML = '<div class="label">Ventilatierooster</div>';
        var selIVP = document.createElement("select");
        selIVP.className = "input";
        selIVP.innerHTML = '<option value="no">Nee</option><option value="yes">Ja</option>';
        selIVP.value = (row.options && row.options.inlineVent) ? row.options.inlineVent : "no";
        selIVP.addEventListener("change", function(){
          var colX = state.columns[state.activeColIndex];
          var rX = ensureRow(colX, state.activeRowIndex);
          rX.options.inlineVent = selIVP.value;
          scheduleRender("inlineVentPanel");
        });
        fp7.appendChild(selIVP);
        pGrid.appendChild(fp7);
      }

      optBox.appendChild(pGrid);
    } else {
      optBox.innerHTML = '<div style="opacity:0.7">Geen vak-opties beschikbaar voor dit vaktype.</div>';
    }

    el.rowTypeList.appendChild(optBox);
  }// Customer
  if (el.projectCode) el.projectCode.textContent = state.projectCode || "—";
  var c = state.customer || {};
  setValueIfNotFocused(el.inpCustomerName, String(c.name || ""));
  setValueIfNotFocused(el.inpProjectName, String(c.projectName || ""));
  setValueIfNotFocused(el.inpCustomerAddress, String(c.address || ""));
  setValueIfNotFocused(el.inpCustomerPostcode, String(c.postcode || ""));
  setValueIfNotFocused(el.inpCustomerCity, String(c.city || ""));
  setValueIfNotFocused(el.inpCustomerPhone, String(c.phone || ""));
  setValueIfNotFocused(el.inpCustomerEmail, String(c.email || ""));
  setValueIfNotFocused(el.inpProjectDate, String(c.projectDate || ""));
  setValueIfNotFocused(el.inpDeliveryDate, String(c.deliveryDate || ""));

  renderLogo();

  // Pricing (keep in Instellingen like V54)
  setValueIfNotFocused(el.inpMontage, String(Number(state.montageEuro) || 0));
  setValueIfNotFocused(el.inpDiscount, String(Number(state.discountPct) || 0));
  // Profielmaten (per type)
if (!state.profile) state.profile = {};
if (!state.profile.schuifpui) state.profile.schuifpui = {};
setValueIfNotFocused(el.selProfilePreset, state.profile.preset || "standard70");
if (el.selProfileSystem) setValueIfNotFocused(el.selProfileSystem, (state.elementOptions && state.elementOptions.profileSystem) ? state.elementOptions.profileSystem : 'living_variant');
if (el.selProfileShape) setValueIfNotFocused(el.selProfileShape, (state.elementOptions && state.elementOptions.profileShape) ? state.elementOptions.profileShape : '15deg');
if (el.selHardwareType) setValueIfNotFocused(el.selHardwareType, (state.elementOptions && state.elementOptions.hardwareType) ? state.elementOptions.hardwareType : 'type2_siegenia');

var isSP = (state.elementType === "schuifpui");
if (el.profileGenericWrap) el.profileGenericWrap.style.display = isSP ? "none" : "";
if (el.profileSchuifpuiWrap) el.profileSchuifpuiWrap.style.display = isSP ? "" : "none";

// Schuifpui opties UI (bay count + side + per-bay roles)
if (isSP){
normalizeSchuifpuiBays();
if (el.selSpActiveSide) setValueIfNotFocused(el.selSpActiveSide, String(state.schuifpuiActiveSide || "left"));
if (el.selSpBayCount) setValueIfNotFocused(el.selSpBayCount, String(state.schuifpuiBayCount || state.columnsCount || 2));
renderSpBayRolesUI();
} else {
var wrapRoles = document.getElementById("spBayRoles");
if (wrapRoles) wrapRoles.innerHTML = "";
}


// Generic (kozijn/deur)
setValueIfNotFocused(el.inpFrameMM, String(state.profile.frameMM || 70));
setValueIfNotFocused(el.inpSashMM, String(state.profile.sashMM || 60));
setValueIfNotFocused(el.inpMullionMM, String(state.profile.mullionMM || 62));
setValueIfNotFocused(el.inpTransomMM, String(state.profile.transomMM || 62));

// Schuifpui (los)
if (isSP){
var sp = state.profile.schuifpui;
var outer = Number(sp.outerFrameMM); if (!isFinite(outer) || outer<=0) outer = Number(state.profile.frameMM||70);
var inner = Number(sp.innerFrameMM); if (!isFinite(inner) || inner<=0) inner = Math.max(20, Math.round(outer * 0.85));
var sill  = Number(sp.sillMM);       if (!isFinite(sill)  || sill<=0)  sill  = Math.max(30, Math.round(outer * 0.55));
var sash  = Number(sp.sashMM);       if (!isFinite(sash)  || sash<=0)  sash  = Number(state.profile.sashMM||60);
var gins  = Number(sp.glassInsetMM); if (!isFinite(gins)  || gins<=0)  gins  = Math.max(8, Math.round(sash * 0.35));
var mgap  = Number(sp.meetingGapMM); if (!isFinite(mgap)  || mgap<0)   mgap  = 0;

setValueIfNotFocused(el.inpSpOuterFrameMM, String(outer));
setValueIfNotFocused(el.inpSpInnerFrameMM, String(inner));
setValueIfNotFocused(el.inpSpSillMM, String(sill));
setValueIfNotFocused(el.inpSpSashMM, String(sash));
setValueIfNotFocused(el.inpSpGlassInsetMM, String(gins));
setValueIfNotFocused(el.inpSpMeetingGapMM, String(mgap));
}}


function labelProfileSystem(v){
  return ({ living_variant:'Living Variant', blokkader:'Blokkader', standard:'Standaard profiel' })[String(v||'living_variant')] || 'Living Variant';
}

function labelProfileShape(v){
  return ({ '15deg':'15 graden profiel', straight:'Recht profiel' })[String(v||'15deg')] || '15 graden profiel';
}

function labelHardwareType(v){
  return String(v||'type2_siegenia') === 'type1_hidden' ? 'Type 1: verdekt liggend' : 'Type 2: standaard (Siegenia)';
}

function getPrimaryGlassInfo(element){
  if (window.KL && KL.core && KL.core.getElementGlassInfo) return KL.core.getElementGlassInfo(element || state);
  return { primaryPack:'HR++', ug:'1.0', lines:[] };
}

function getProfileInfoForElement(element){
  if (window.KL && KL.core && KL.core.getProfileDescriptor) return KL.core.getProfileDescriptor(element || state);
  return { fullLabel:'Living Variant, 15 graden profiel', sections:[] };
}

function renderOverview(){
  var useProject = Array.isArray(state.projectItems) && state.projectItems.length > 0;
  var totals = useProject ? computeProjectTotals() : computeTotals(state);
  var rowsSum = 0;
  for (var i=0;i<state.columns.length;i++){ rowsSum += state.columns[i].rowsCount; }

  var html = "";
  var opt = state.elementOptions || {};
  var glassInfo = getPrimaryGlassInfo(state);
  var profileInfo = getProfileInfoForElement(state);
  var glassLabel = labelGlassPack(glassInfo.primaryPack || opt.glassPack || 'HR++') + ' · Ug ' + (glassInfo.ug || '1.0');
  html += "<div><span class='muted'>Type</span></div><div><b>" + labelElementType(state.elementType) + (state.elementType === "schuifpui" ? " (" + ((state.slideSystem||"hst")==="hst" ? "HST" : "PSK") + ")" : "") + "</b></div>";
  html += "<div><span class='muted'>Profiel</span></div><div><b>" + escapeHtml(profileInfo.fullLabel) + "</b></div>";
  html += "<div><span class='muted'>Hang- en sluitwerk</span></div><div><b>" + escapeHtml(labelHardwareType(opt.hardwareType)) + "</b></div>";
  if (state.projectCode){
    html += "<div><span class='muted'>Offerte</span></div><div><b class='mono'>" + escapeHtml(state.projectCode) + "</b></div>";
  }
  if (state.customer && (state.customer.name || state.customer.projectName)){
    html += "<div><span class='muted'>Klant</span></div><div><b>" + escapeHtml(state.customer.name || "—") + "</b></div>";
    html += "<div><span class='muted'>Project</span></div><div><b>" + escapeHtml(state.customer.projectName || "—") + "</b></div>";
  }

  html += "<div><span class='muted'>Afmetingen</span></div><div><b class='mono'>" + state.widthMM + " × " + state.heightMM + " mm</b></div>";
  html += "<div><span class='muted'>Kolommen</span></div><div><b class='mono'>" + state.columnsCount + "</b></div>";
  html += "<div><span class='muted'>Totaal vakken</span></div><div><b class='mono'>" + rowsSum + "</b></div>";
  html += "<div><span class='muted'>Glas</span></div><div><b>" + escapeHtml(glassLabel) + "</b></div>";
  html += "<div><span class='muted'>Kozijn profiel</span></div><div><b>Uf 1.0 W/m²K</b></div>";
  if (opt.roedes === "yes"){
    html += "<div><span class='muted'>Roedes</span></div><div><b>" + escapeHtml(String(opt.roedeType||"between_glass")) + "</b></div>";
  }
  html += "<div><span class='muted'>Kleur</span></div><div><b>" + escapeHtml(displayColorLabel(opt.colorOutside||"RAL7016", opt.colorCodeOutside||"", "RAL7016")) + " / " + escapeHtml(displayColorLabel(opt.colorInside||"same", opt.colorCodeInside||"", "same")) + "</b></div>";
  html += "<div><span class='muted'>Afwerking</span></div><div><b>" + escapeHtml((opt.finishOutside === "woodgrain" ? "Houtnerf" : "Glad") + " / " + (opt.finishInside === "woodgrain" ? "Houtnerf" : "Glad")) + "</b></div>";
  html += "<div><span class='muted'>Premium kleur</span></div><div><b>" + escapeHtml(opt.premiumColor === "yes" ? "Ja" : "Nee") + "</b></div>";
  html += "<div><span class='muted'>Materiaal (indicatie)</span></div><div><b class='mono'>" + euro(totals.material) + "</b></div>";
  el.overviewKv.innerHTML = html;

  el.pillDims.textContent = state.widthMM + " × " + state.heightMM + " mm";
}


function addExtraRow(){
  if (!Array.isArray(state.projectExtras)) state.projectExtras = [];
  var id = "x" + String(Date.now()) + String(Math.floor(Math.random()*1000));
  state.projectExtras.push({ id:id, type:"overig", name:"", qty:1, unitEuro:0 });
}

function removeExtraRow(id){
  if (!Array.isArray(state.projectExtras)) state.projectExtras = [];
  state.projectExtras = state.projectExtras.filter(function(r){ return r.id !== id; });
}

function extraTypeOptionsHtml(selected){
  var opts = [
    ["kraan", "Kraan"],
    ["vuilcontainer", "Vuilcontainer"],
    ["steiger", "Steiger"],
    ["montage-extra", "Montage extra"],
    ["transport-extra", "Transport extra"],
    ["overig", "Overig"]
  ];
  return opts.map(function(opt){
    return '<option value="' + opt[0] + '"' + (selected===opt[0] ? ' selected' : '') + '>' + opt[1] + '</option>';
  }).join('');
}

function extraLabelForType(type){
  return ({
    "kraan":"Kraan",
    "vuilcontainer":"Vuilcontainer",
    "steiger":"Steiger",
    "montage-extra":"Montage extra",
    "transport-extra":"Transport extra",
    "overig":"Overig"
  })[type] || "Overig";
}

function renderExtras(){
  if (!(el && el.extrasList)) return;
  var rows = Array.isArray(state.projectExtras) ? state.projectExtras : [];
  if (!rows.length){
    el.extrasList.innerHTML = '<div class="extraEmpty">Nog geen project extra opties toegevoegd.</div>';
    return;
  }
  var html = '';
  for (var i=0;i<rows.length;i++){
    var row = rows[i] || {};
    var qty = clampNumber(row.qty, 0, 999, 1);
    var unitEuro = Number(row.unitEuro) || 0;
    var total = qty * unitEuro;
    html += '<div class="extraRow" data-extra-id="' + escapeHtml(row.id || '') + '">';
    html +=   '<div class="field"><div class="label">Soort</div><select class="select" data-extra-field="type">' + extraTypeOptionsHtml(row.type || 'overig') + '</select></div>';
    html +=   '<div class="field"><div class="label">Omschrijving</div><input class="input" data-extra-field="name" type="text" placeholder="Bijv. kraan 4 uur" value="' + escapeHtml(row.name || '') + '"></div>';
    html +=   '<div class="field"><div class="label">Aantal</div><input class="input mono" data-extra-field="qty" type="number" min="0" step="1" value="' + escapeHtml(String(qty)) + '"></div>';
    html +=   '<div class="field"><div class="label">Prijs (€)</div><input class="input mono" data-extra-field="unitEuro" type="number" min="0" step="0.01" value="' + escapeHtml(String(unitEuro)) + '"></div>';
    html +=   '<div class="extraRowTotal mono">' + euro(total) + '</div>';
    html +=   '<button class="btn btnGhost" data-extra-action="remove" type="button">Verwijder</button>';
    html += '</div>';
  }
  el.extrasList.innerHTML = html;
}

function renderTotals(){
  var useProject = Array.isArray(state.projectItems) && state.projectItems.length > 0;
  var t = useProject ? computeProjectTotals() : computeTotals(state);

  function tr(label, valueHtml){
    return "<tr><td class=\"muted\">" + escapeHtml(label) + "</td><td style=\"text-align:right;\">" + valueHtml + "</td></tr>";
  }

  function showIfPositive(amount){
    return Number(amount) > 0.0001;
  }

  var rows = "";
  rows += tr("Materiaal", "<b class=\"mono\">" + euro(t.material) + "</b>");

  if (showIfPositive(t.montage)){
    rows += tr("Montage", "<span class=\"mono\">" + euro(t.montage) + "</span>");
  }
  if (showIfPositive(t.extras)){
    rows += tr("Extra’s", "<span class=\"mono\">" + euro(t.extras) + "</span>");
  }

  rows += tr("Subtotaal", "<b class=\"mono\">" + euro(t.subtotal) + "</b>");

  if (showIfPositive(t.discount)){
    rows += tr("Korting", "<span class=\"mono\">-" + euro(t.discount) + "</span>");
  }

  rows += tr("Totaal excl. btw", "<b class=\"mono\">" + euro(t.net) + "</b>");
  rows += tr("Btw (" + Math.round(state.vatRate*100) + "%)", "<span class=\"mono\">" + euro(t.vat) + "</span>");
  rows += tr("Totaal incl. btw", "<b class=\"mono\">" + euro(t.gross) + "</b>");

  el.totalsBody.innerHTML = rows;
}

function labelElementType(t){
  var map = {
    kozijn:"Kozijn",
    deur:"Deur",
    schuifpui:"Schuifpui",
    dakraam:"Dakraam"
  };
  return map[t] || "Kozijn";
}

function labelGlassPack(v){
  var map = {
    "HR++":"HR++",
    "Triple":"Triple (HR+++)",
    "HR+++":"Triple (HR+++)"
  };
  return map[String(v || "HR++")] || String(v || "HR++");
}

function labelRoedeType(v){
  var map = {
    between_glass:"Tussen de ruit",
    wiener:"Wiener sprosse",
    applied:"Opplak"
  };
  return map[String(v || "between_glass")] || String(v || "between_glass");
}

function labelRoedeDivision(v){
  var raw = String(v || "2x2");
  return /^\d+x\d+$/i.test(raw) ? raw.replace(/x/i, " x ") : raw;
}

function formatRoedeSummary(type, division){
  return labelRoedeType(type) + " – " + labelRoedeDivision(division);
}

function collectElementRoedeSummaries(element){
  var out = [];
  var seen = {};
  var cols = Array.isArray(element && element.columns) ? element.columns : [];
  for (var ci=0; ci<cols.length; ci++){
    var rows = Array.isArray(cols[ci] && cols[ci].rows) ? cols[ci].rows : [];
    for (var ri=0; ri<rows.length; ri++){
      var opt = rows[ri] && rows[ri].options ? rows[ri].options : null;
      if (!opt || opt.roedes !== "yes") continue;
      var key = String(opt.roedeType || "between_glass") + "|" + String(opt.roedeDivision || "2x2");
      if (seen[key]) continue;
      seen[key] = true;
      out.push(formatRoedeSummary(opt.roedeType, opt.roedeDivision));
    }
  }
  return out;
}

// Helpers (compat)
function formatEuro(amount){ return euro(amount); }

// Legacy map used by some project snapshot helpers
var ELEMENT_TYPES = {
  kozijn:{label:"Kozijn"},
  deur:{label:"Deur"},
  schuifpui:{label:"Schuifpui"},
  dakraam:{label:"Dakraam"}
};


// -------------------------
// Drawing (simple, predictable, extendable)
// -------------------------
function svgEl(tag, attrs){
  var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs){
    // Support semantic part ids for profile-linking
    if (attrs.partId){ el.setAttribute('data-part', attrs.partId); delete attrs.partId; }
    Object.keys(attrs).forEach(function(k){
      if (attrs[k] === undefined || attrs[k] === null) return;
      el.setAttribute(k, String(attrs[k]));
    });
  }
  return el;
}


function addRect(x, y, w, h, style){
var attrs = { x:x, y:y, width:w, height:h };
var r = svgEl("rect", attrs);
// defaults
r.setAttribute("fill", "none");
if (style){
  if (style.fill != null) r.setAttribute("fill", style.fill);
  if (style.stroke != null) r.setAttribute("stroke", style.stroke);
  if (style.strokeWidth != null) r.setAttribute("stroke-width", style.strokeWidth);
  if (style.rx != null) r.setAttribute("rx", style.rx);
  if (style.linecap != null) r.setAttribute("stroke-linecap", style.linecap);
  if (style.linejoin != null) r.setAttribute("stroke-linejoin", style.linejoin);
  if (style.dash != null) r.setAttribute("stroke-dasharray", style.dash);
  if (style.opacity != null) r.setAttribute("opacity", style.opacity);
}
el.svgPreview.appendChild(r);
return r;
}

// === SCHUIFPUI (STYLE-CONSISTENT REBUILD) ===
// Chef: losse schuifpui-illustratie, maar wél in dezelfde stijl/palette als de rest (sales/factory).
function drawSchuifpuiClean(x, y, w, h, opts){
opts = opts || {};
// stage: 1=alleen basis, 2=+ vaste vleugel (C), 3=+ schuifvleugel, 4=+ pijl
var stage = Number(opts.stage || 2);
// activeSide: "left" (standaard) of "right"
var activeSide = (opts.activeSide || "left").toLowerCase();
var colors  = opts.colors || {};
var framePx = Number(opts.framePx)||0;
var sashPx  = Number(opts.sashPx)||0;

// Palette fallbacks (never disappear)
var cFrame = colors.frameStroke || "#0f172a";
var cInner = colors.innerStroke || cFrame;
var cSash  = colors.sashStroke  || cFrame;
var cArrow = colors.arrowStroke || cFrame;

// Stroke widths in KozynLAB language
var swOuter = 3;
var swInner = 2;
var swLeaf  = 2;
var swArrow = 3;

// Insets (clamped to keep style consistent across sizes)
var inset   = (typeof opts.insetPx === "number") ? Number(opts.insetPx) : clampNumber(Math.round(framePx*0.85), 18, 90);
var leafPad = clampNumber(Math.round(sashPx*0.70), 14, 38);

// 1) Basis opening (Chef screenshot 1)
// Schuifpui-outer: bovendorpel + zijstijlen stoppen op de dorpel.
// Dorpel is een eigen rechthoek-object onderin (geen doorlopende onderregel).
// Dorpelhoogte als apart object (liefst uit Profielmaten); fallback = afgeleid van inset
var thrOff = clampNumber(Math.round(inset*0.55), 10, 26);
var sillH  = (typeof opts.sillPx === 'number') ? Number(opts.sillPx) : thrOff;
var sillTop = y + h - sillH;

// Outer frame (3-zijdig) tot bovenzijde dorpel
addPath(`M ${x} ${sillTop} L ${x} ${y} L ${x+w} ${y} L ${x+w} ${sillTop}`, { partId:'outerFrame3Sides',
  stroke: cFrame, strokeWidth: swOuter, linecap:"square", linejoin:"miter"
});

// Dorpel (apart object)
addRect(x, sillTop, w, sillH, { partId:'sillBlock',
  fill: colors.frameFill, stroke: cFrame, strokeWidth: swOuter, linecap:"square", linejoin:"miter"
});

var ix0 = x + inset, iy0 = y + inset, iw0 = w - inset*2, ih = h - inset*2;

// Threshold / dorpel: aparte lijn BOVEN de buiten-onderkant (dus geen 4e binnenframe-zijde)
// Belangrijk: de 2 binnen-stijlen (links/rechts) moeten exact aansluiten op de dorpel-lijn.
var thrY0  = sillTop;

// Pixel-snapping om "net niet doorgetrokken" lijnen door anti-aliasing te voorkomen
function snapCoord(v, sw){
  var w = Math.round(sw);
  var r = Math.round(v);
  return (w % 2 === 1) ? (r + 0.5) : r;
}

var ix  = snapCoord(ix0, swInner);
var iy  = snapCoord(iy0, swInner);
var ix2 = snapCoord(ix0 + iw0, swInner);
var thrY = snapCoord(thrY0, swInner);
var iw  = ix2 - ix;

// Inner frame: links + boven + rechts, tot op de dorpel (geen onderregel)
addPath(`M ${ix} ${thrY} L ${ix} ${iy} L ${ix+iw} ${iy} L ${ix+iw} ${thrY}`, { partId:'innerFrame3Sides',
  stroke: cInner, strokeWidth: swInner, linecap:"square", linejoin:"miter"
});

// Dorpel-lijn (zelfde dikte als binnenframe, zodat boven/onder gelijk ogen)
addPath(`M ${ix} ${thrY} L ${ix+iw} ${thrY}`, { partId:'innerSillLine', stroke: cInner, strokeWidth: swInner, linecap:"square", linejoin:"miter" });

// Geometry output for downstream overlays (maat/veldmaten, labels)
var geom = { x:x, y:y, w:w, h:h, ix:ix, iy:iy, iw:iw, innerH:(thrY-iy), sillTop:sillTop, sillH:sillH, inset:inset, bayCount: Math.max(2, Number(opts.bayCount || 2)) };

if (stage <= 1){
  return opts.returnGeom ? geom : undefined;
}

// 2) Vleugels (Chef screenshot 2)
// Banen (bays) – schuifpui kan 2/3/4/... vakken hebben
// Voor nu: 1 schuifblad + 1 vast blad naast elkaar; overige vakken (indien aanwezig) renderen als vaste ruiten.
var bayCount = Math.max(2, Number(opts.bayCount || 2));
var activeBay = (typeof opts.activeBay === "number") ? Math.max(0, Math.min(bayCount-1, opts.activeBay)) : (activeSide === "right" ? bayCount-1 : 0);
// Vast blad naast het schuifblad (naar binnen toe)
var fixedBay  = (typeof opts.fixedBay === "number") ? Math.max(0, Math.min(bayCount-1, opts.fixedBay)) : (activeSide === "right" ? Math.max(0, activeBay-1) : Math.min(bayCount-1, activeBay+1));
// Meeting boundary tussen activeBay en fixedBay (we nemen de grens aan de fixedBay-zijde)
var bayW  = iw / bayCount;
geom.bayW = bayW;
geom.activeBay = activeBay;
geom.fixedBay = fixedBay;
var splitX = ix + bayW * (Math.min(activeBay, fixedBay) + 1);

// Meeting-lijn X (pixel-snapped) – referentie voor vaste/ schuif delen
var meetX = snapCoord(splitX, swInner);
geom.meetX = meetX;
// Leaf box (hoogte tot aan dorpel/thrY, niet tot aan onderkant binnenkader)
var availH = Math.max(10, (thrY - iy));
var fy = iy + leafPad;
var fh = Math.max(10, availH - leafPad*2);

// Dunne binnen-C in vaste vleugel (glas-/sponninglijn)
// Afgeleid van profielmaten (sashPx), dus consistent met Profielmaten-kaart.
var glassInset = (typeof opts.glassInsetPx === "number") ? Number(opts.glassInsetPx) : clampNumber(Math.round(sashPx * 0.35), 8, 18);
var swGlass = Math.max(1, Math.round(swLeaf * 0.75));


// Multiple bays: per-bay roles ("slide" / "fixed")
var bays = Array.isArray(opts.bays) ? opts.bays.slice(0, bayCount) : null;
if (!bays || bays.length !== bayCount){
  // Local default if caller didn't provide bays[]
  bays = new Array(bayCount).fill("fixed");
  if (bayCount === 2){
    bays = (activeSide === "right") ? ["fixed","slide"] : ["slide","fixed"];
  } else if (bayCount === 3){
    bays = (activeSide === "right") ? ["fixed","fixed","slide"] : ["slide","fixed","fixed"];
  } else {
    for (var bi=0; bi<bayCount; bi++){
      var isSlide = (activeSide === "left") ? (bi%2===0) : (bi%2===1);
      bays[bi] = isSlide ? "slide" : "fixed";
    }
  }
} else {
  for (var bi=0; bi<bays.length; bi++){
    bays[bi] = (String(bays[bi]).toLowerCase() === "slide") ? "slide" : "fixed";
  }
}

// Precompute snapped bay boundaries (meeting references)
var bayX = [];
for (var bi=0; bi<=bayCount; bi++){
  bayX[bi] = snapCoord(ix + bayW * bi, swInner);
}

// Draw meeting lines where a slide meets a fixed (or slide meets slide)
for (var bi=1; bi<bayCount; bi++){
  var L = bays[bi-1], R = bays[bi];
  if (L !== R){
    addPath(`M ${bayX[bi]} ${iy} L ${bayX[bi]} ${thrY}`, { partId:'meetingLine',
      stroke: cInner, strokeWidth: swInner, linecap:"square", linejoin:"miter"
    });
  }
}

// Draw per-bay leaves
for (var bi=0; bi<bayCount; bi++){
  var role = bays[bi];
  var bayStart = ix + bayW*bi;
  var bayEnd   = ix + bayW*(bi+1);

  // Leaf usable box inside the bay
  var leafX1 = bayStart + leafPad;
  var leafX2 = bayEnd - leafPad;
  var leafW  = Math.max(10, leafX2 - leafX1);

  if (role === "slide"){
    // Full frame (outer + thin inner)
    addRect(leafX1, fy, leafW, fh, { partId:'slidingLeaf.outer', fill:"none",
      stroke: cSash, strokeWidth: swLeaf, linecap:"round", linejoin:"round"
    });
    var sgx = leafX1 + glassInset;
    var sgy = fy + glassInset;
    var sgw = Math.max(10, leafW - glassInset*2);
    var sgh = Math.max(10, fh - glassInset*2);
    addRect(sgx, sgy, sgw, sgh, { partId:'slidingLeaf.inner', fill:"none",
      stroke: cSash, strokeWidth: swGlass, linecap:"round", linejoin:"round"
    });
    continue;
  }

  // FIXED: C frame (open toward neighboring slide if present)
  var openLeft  = (bi>0 && bays[bi-1]==="slide");
  var openRight = (bi<bayCount-1 && bays[bi+1]==="slide");
  if (!openLeft && !openRight){
    // No adjacent slide -> draw closed frame for clarity
    addRect(leafX1, fy, leafW, fh, { partId:'fixedLeaf.outer', fill:"none",
      stroke: cSash, strokeWidth: swLeaf, linecap:"round", linejoin:"round"
    });
    // thin inner
    addRect(leafX1+glassInset, fy+glassInset, Math.max(10, leafW-glassInset*2), Math.max(10, fh-glassInset*2), {
      partId:'fixedLeaf.inner', fill:"none", stroke:cSash, strokeWidth: swGlass, linecap:"round", linejoin:"round"
    });
    continue;
  }

  if (openLeft && !openRight){
    // open on left: start at bay boundary (meeting line), draw to right
    var startX = bayX[bi]; // boundary between (bi-1) and bi
    var endX   = leafX2;
    addPath(`M ${startX} ${fy} L ${endX} ${fy} L ${endX} ${fy+fh} L ${startX} ${fy+fh}`, {
      partId:'fixedLeaf.outer', stroke:cSash, strokeWidth: swLeaf, linecap:"round", linejoin:"round"
    });
    // thin inner C extended to meeting line
    var gx = leafX1 + glassInset;
    var gy = fy + glassInset;
    var endXi = leafX2 - glassInset;
    var startXi = bayX[bi]; // extend to meeting
    addPath(`M ${startXi} ${gy} L ${endXi} ${gy} L ${endXi} ${gy+(fh-glassInset*2)} L ${startXi} ${gy+(fh-glassInset*2)}`, {
      partId:'fixedLeaf.inner', stroke:cSash, strokeWidth: swGlass, linecap:"round", linejoin:"round"
    });
  } else if (openRight && !openLeft){
    // open on right: draw left vertical, top/bottom to meeting boundary
    var startX = leafX1;
    var endX   = bayX[bi+1]; // boundary between bi and (bi+1)
    addPath(`M ${startX} ${fy} L ${endX} ${fy} M ${startX} ${fy} L ${startX} ${fy+fh} L ${endX} ${fy+fh}`, {
      partId:'fixedLeaf.outer', stroke:cSash, strokeWidth: swLeaf, linecap:"round", linejoin:"round"
    });
    var gx = leafX1 + glassInset;
    var gy = fy + glassInset;
    var startXi = gx;
    var endXi = bayX[bi+1]; // extend to meeting
    var gh = Math.max(10, fh - glassInset*2);
    addPath(`M ${startXi} ${gy} L ${endXi} ${gy} L ${endXi} ${gy+gh} L ${startXi} ${gy+gh}`, {
      partId:'fixedLeaf.inner', stroke:cSash, strokeWidth: swGlass, linecap:"round", linejoin:"round"
    });
  } else {
    // Slide on both sides: keep closed
    addRect(leafX1, fy, leafW, fh, { partId:'fixedLeaf.outer', fill:"none",
      stroke: cSash, strokeWidth: swLeaf, linecap:"round", linejoin:"round"
    });
    addRect(leafX1+glassInset, fy+glassInset, Math.max(10, leafW-glassInset*2), Math.max(10, fh-glassInset*2), {
      partId:'fixedLeaf.inner', fill:"none", stroke:cSash, strokeWidth: swGlass, linecap:"round", linejoin:"round"
    });
  }
}



// 4) Richting (rode pijl in het midden)
if (stage >= 3){
var arrowColor = "#ef4444"; // rood
// Arrow marker
if (!el.svgPreview.querySelector("#klArrowHeadRed")){
  var defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
  var marker = document.createElementNS("http://www.w3.org/2000/svg","marker");
  marker.setAttribute("id","klArrowHeadRed");
  marker.setAttribute("markerWidth","4");
  marker.setAttribute("markerHeight","4");
  marker.setAttribute("refX","3.2");
  marker.setAttribute("refY","2");
  marker.setAttribute("orient","auto");
  var arrowPath = document.createElementNS("http://www.w3.org/2000/svg","path");
  arrowPath.setAttribute("d","M0,0 L4,2 L0,4 Z");
  arrowPath.setAttribute("fill", arrowColor);
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  el.svgPreview.appendChild(defs);
}
var _mh = el.svgPreview.querySelector('#klArrowHeadRed path');
if (_mh) _mh.setAttribute('fill', arrowColor);

// L-arrow: start in schuifblad, naar vaste vak
var ax1 = sx + sw * 0.38;
var ay1 = fy + fh * 0.66;
var ax2 = ax1;
var ay2 = fy + fh * 0.44;

var targetX = (activeSide === "right") ? (splitX - bayW * 0.28) : (splitX + bayW * 0.28);
var ax3 = targetX;
var ay3 = ay2;

var p = document.createElementNS("http://www.w3.org/2000/svg","path");
p.setAttribute("d", "M "+ax1+" "+ay1+" L "+ax2+" "+ay2+" L "+ax3+" "+ay3);
p.setAttribute("fill","none");
p.setAttribute("stroke", arrowColor);
p.setAttribute("stroke-width", 1.2);
p.setAttribute("stroke-linecap","round");
p.setAttribute("stroke-linejoin","round");
p.setAttribute("marker-end","url(#klArrowHeadRed)");
el.svgPreview.appendChild(p);
}

if (stage <= 3){ return opts.returnGeom ? geom : undefined; }
}




function addLine(x1, y1, x2, y2, style){
  var l = svgEl("line", { x1:x1, y1:y1, x2:x2, y2:y2 });
  if (style){
    if (style.stroke) l.setAttribute("stroke", style.stroke);
    if (style.strokeWidth) l.setAttribute("stroke-width", style.strokeWidth);
    if (style.dash) l.setAttribute("stroke-dasharray", style.dash);
    if (style.linecap) l.setAttribute("stroke-linecap", style.linecap);
  }
  el.svgPreview.appendChild(l);
  return l;
}

function addText(x, y, txt, style){
  var t = svgEl("text", { x:x, y:y });
  t.textContent = String(txt);
  if (style){
    if (style.fill) t.setAttribute("fill", style.fill);
    if (style.size) t.setAttribute("font-size", style.size);
    if (style.weight) t.setAttribute("font-weight", style.weight);
    if (style.anchor) t.setAttribute("text-anchor", style.anchor);
    if (style.baseline) t.setAttribute("dominant-baseline", style.baseline);
    if (style.family) t.setAttribute("font-family", style.family);
  }
  el.svgPreview.appendChild(t);
  return t;
}

function addPath(d, style){
  var p = svgEl("path", { d:d, fill:"none" });
  if (style){
    if (style.fill) p.setAttribute("fill", style.fill);
    if (style.stroke) p.setAttribute("stroke", style.stroke);
    if (style.strokeWidth) p.setAttribute("stroke-width", style.strokeWidth);
    if (style.dash) p.setAttribute("stroke-dasharray", style.dash);
    if (style.linecap) p.setAttribute("stroke-linecap", style.linecap);
    if (style.linejoin) p.setAttribute("stroke-linejoin", style.linejoin);
  }
  el.svgPreview.appendChild(p);
  return p;
}


function addFrame3Sides(x,y,w,h,style){
  // left, top, right (no bottom)
  addPath(`M ${x} ${y+h} L ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h}`, style);
}

function draw(){
  var prof = state.profile || {};
  var frameMM = Number(prof.frameMM) || 70;
  var sashMM = Number(prof.sashMM) || 60;
  var mullionMM = Number(prof.mullionMM) || 60;
  var transomMM = Number(prof.transomMM) || 60;

  var svg = el.svgPreview;
  // Zoom via viewBox
  var z = (state.view && Number(state.view.zoom)) ? Number(state.view.zoom) : 1;
  z = clampNumber(z, 0.5, 2.5);
  var baseW = 1100, baseH = 520;
  var vbW = baseW / z, vbH = baseH / z;
  var vbX = (baseW - vbW) / 2, vbY = (baseH - vbH) / 2;
  svg.setAttribute("viewBox", vbX + " " + vbY + " " + vbW + " " + vbH);
  while (svg.firstChild) svg.removeChild(svg.firstChild);


  // Geometry in mm (sales model). We only use this for aspect ratio.
  var mmW = Number(state.widthMM) || 1200;
  var mmH = Number(state.heightMM) || 1400;
  var aspect = mmW / mmH;

  // Fit the element into the base drawing space and center it
  // IMPORTANT: Zoom is handled by the SVG viewBox only. We must NOT "refit" to the zoomed viewbox,
  // otherwise zoom will feel inverted / cancelled out.
  var margin = 56;
  var availW = baseW - margin * 2;
  var availH = baseH - margin * 2;

  var fw = availW;
  var fh = fw / aspect;
  if (fh > availH){
    fh = availH;
    fw = fh * aspect;
  }

  var fx = (baseW - fw) / 2;
  var fy = (baseH - fh) / 2;

// Profile thickness (driven by Profielmaten)
  var scale = fw / mmW; // px per mm in our drawing space
  var framePx = frameMM * scale;
  var sashPx = sashMM * scale;
  var mullion = mullionMM * scale;
  var transom = transomMM * scale;


  
  // Render mode palette (sales vs factory)
  var mode = state.renderMode || "sales";
  var isFactory = (mode === "factory");
  var colors = {
    bg:          isFactory ? "#ffffff" : "transparent",
    frameFill:   isFactory ? "#ffffff" : "rgba(255,255,255,.03)",
    frameStroke: isFactory ? "#0f172a" : "rgba(233,238,246,.85)",
    innerFill:   isFactory ? "none"    : "rgba(255,255,255,.01)",
    innerStroke: isFactory ? "#334155" : "rgba(233,238,246,.35)",
    mullFill:    isFactory ? "none"    : "rgba(255,255,255,.03)",
    mullStroke:  isFactory ? "#475569" : "rgba(233,238,246,.35)",
    paneFill:    isFactory ? "none"    : "rgba(96,165,250,.06)",
    paneStroke:  isFactory ? "#94a3b8" : "rgba(96,165,250,.18)",
    sashStroke:  isFactory ? "#0f172a" : "rgba(233,238,246,.55)",
    opStroke:    isFactory ? "#0f172a" : "rgba(251,113,133,.85)",
    arrowStroke: isFactory ? "#0f172a" : "rgba(52,211,153,.85)",
    labelFill:   isFactory ? "#0f172a" : "#ffffff"
  };

  // Background (factory mode = white sheet)
  if (isFactory){
    addRect(vbX, vbY, vbW, vbH, { fill: colors.bg, stroke: "transparent", strokeWidth: 0 });
  }

// Outer frame
var isSliding = (String(state.elementType||"") === "schuifpui");
if (isSliding){
// Chef: schuifpui is een eigen tekenmodule. Maar overlays (maat/veldmaten) moeten wél blijven werken.
if (!state.profile) state.profile = {};
if (!state.profile.schuifpui) state.profile.schuifpui = {};
var sp = state.profile.schuifpui;

// Schuifpui-profielen (los): kader ≠ dorpel
var spOuterMM = Number(sp.outerFrameMM); if (!isFinite(spOuterMM) || spOuterMM<=0) spOuterMM = frameMM;
var spInnerMM = Number(sp.innerFrameMM); if (!isFinite(spInnerMM) || spInnerMM<=0) spInnerMM = Math.max(20, Math.round(spOuterMM * 0.85));
var spSillMM  = Number(sp.sillMM);       if (!isFinite(spSillMM)  || spSillMM<=0)  spSillMM  = Math.max(30, Math.round(spOuterMM * 0.55));
var spSashMM  = Number(sp.sashMM);       if (!isFinite(spSashMM)  || spSashMM<=0)  spSashMM  = sashMM;
var spGlassInsetMM = Number(sp.glassInsetMM); if (!isFinite(spGlassInsetMM) || spGlassInsetMM<=0) spGlassInsetMM = Math.max(8, Math.round(spSashMM * 0.35));
var spMeetingGapMM = Number(sp.meetingGapMM); if (!isFinite(spMeetingGapMM) || spMeetingGapMM<0) spMeetingGapMM = 0;

var outerFramePx = spOuterMM * scale;
var innerFramePx = spInnerMM * scale;
var sillPx       = spSillMM  * scale;
var sashPxSP     = spSashMM  * scale;
var glassInsetPx = spGlassInsetMM * scale;
var meetingGapPx = spMeetingGapMM * scale;

var bayCount = Math.max(2, Number(state.schuifpuiBayCount || state.columnsCount || 2));
var activeSide = (state.schuifpuiActiveSide || 'left');
normalizeSchuifpuiBays();
bayCount = Math.max(2, Number(state.schuifpuiBayCount || state.columnsCount || 2));


// Draw schuifpui and capture geometry for dims/labels
var geom = drawSchuifpuiClean(fx, fy, fw, fh, {
  colors: colors,
  framePx: outerFramePx,
  sashPx: sashPxSP,
  insetPx: innerFramePx,
  sillPx: sillPx,
  glassInsetPx: glassInsetPx,
  meetingGapPx: meetingGapPx,
  stage: 3,
  activeSide: activeSide,
  bayCount: bayCount,
  bays: state.schuifpuiBays,
  returnGeom: true
}) || {};

// Provide the variables expected by the dimension/field label routines
var cols = Math.max(2, Number(bayCount) || 2);
var innerX = geom.ix || (fx + innerFramePx);
var innerY = geom.iy || (fy + innerFramePx);
var innerW = geom.iw || (fw - innerFramePx*2);
var innerH = geom.innerH || Math.max(10, (fy + fh - sillPx) - innerY);
var colW = (geom.bayW) ? geom.bayW : (innerW / cols);
var mullionMM = 0;
var transomMM = 0;
var mullion = 0;
var transom = 0;

// Override drawFieldDims behaviour for schuifpui: 1 rij per bay (veldmaten per vak)
var _origColsArr = state.columns;
var synthCols = [];
for (var i=0;i<cols;i++) synthCols.push({ rowsCount: 1, rows: [{ paneType: 'vast' }] });
state.columns = synthCols;
// Draw overlays
    if (state.showDims) drawDims();
    if (state.showFieldDims) {
      // For schuifpui, use net opening height above sill: mmH - frameMM - sillMM
      // Patch the numbers locally by temporarily swapping state.heightMM-derived innerMMH calc via a flag.
      state.__isSlidingForFieldDims = true;
      state.__sillMM_forDims = spSillMM;
      state.__frameMM_forDims = spInnerMM;
      state.__sashMM_forDims = spSashMM;
      drawFieldDims();
      state.__isSlidingForFieldDims = false;
    }

    // restore columns
    state.columns = _origColsArr;
    return;
  }

  var mullionGap = isSliding ? 0 : mullion;
  // Sill/threshold height (visual, px) for sliding systems: small "latje" like factory drawings
  var sillPx = isSliding ? Math.max(6, Math.round(framePx*0.18)) : 0;

  if (isSliding){
    // Schuifpui — CLEAN base opening (Stap 1): alleen sparing met dubbele lijn.
    // Geen drempel/rails/kozijnlogica hier; dat komt in volgende stappen.
    var inset = Math.max(10, Math.round(framePx * 0.55)); // afstand tussen de 2 lijnen
    // Outer (opening)
    addRect(fx, fy, fw, fh, { fill:"transparent", stroke:colors.frameStroke, strokeWidth:4, linecap:"square", linejoin:"miter" });
    // Inner (opening)
    addRect(fx + inset, fy + inset, fw - inset*2, fh - inset*2, { fill:"transparent", stroke:colors.frameStroke, strokeWidth:3, linecap:"square", linejoin:"miter" });

    var cols = Math.max(1, Number(state.columnsCount) || 1);
    var innerX = fx + inset, innerY = fy + inset, innerW = fw - inset*2, innerH = fh - inset*2;
  } else {
    addRect(fx, fy, fw, fh, { fill:colors.frameFill, stroke:colors.frameStroke, strokeWidth:3 });
    addRect(fx + framePx, fy + framePx, fw - framePx*2, fh - framePx*2, { fill:colors.innerFill, stroke:colors.innerStroke, strokeWidth:2 });
    var cols = Math.max(1, Number(state.columnsCount) || 1);
    var innerX = fx + framePx, innerY = fy + framePx, innerW = fw - framePx*2, innerH = fh - framePx*2;
  }

  // Allocate space for vertical mullions between columns (variable widths supported)
  var colSegs = getColumnSegmentsPx(innerX, innerW, mullionGap);
  var colW = colSegs.length ? colSegs[0].w : innerW;
  window.__kozynDragGeom = {
    outerX: fx,
    outerY: fy,
    outerW: fw,
    outerH: fh,
    innerX: innerX,
    innerY: innerY,
    innerW: innerW,
    innerH: innerH,
    pxPerMMX: fw / Math.max(1, mmW),
    pxPerMMY: fh / Math.max(1, mmH),
    colSegs: colSegs,
    colCenters: [],
    rowCentersByCol: []
  };
  for (var dc=0; dc<colSegs.length-1; dc++){
    window.__kozynDragGeom.colCenters.push(colSegs[dc].x + colSegs[dc].w + (mullionGap / 2));
  }

  // Draw each column
  // For schuifpui: draw rear first, then front (sliding) so overlap reads correctly.
  var colOrder = [];
  var frontIdxGlobal = null;
  if (isSliding && cols === 2){
    // detect which column is the sliding sash (paneType 'schuif' in first row)
    var c0 = state.columns[0] && state.columns[0].rows && state.columns[0].rows[0] ? state.columns[0].rows[0] : null;
    var c1 = state.columns[1] && state.columns[1].rows && state.columns[1].rows[0] ? state.columns[1].rows[0] : null;
    var p0 = c0 ? ((c0.paneType === "auto") ? deriveAutoPaneType(state.elementType) : c0.paneType) : null;
    var p1 = c1 ? ((c1.paneType === "auto") ? deriveAutoPaneType(state.elementType) : c1.paneType) : null;
    var frontIdx = (p0 === "schuif") ? 0 : ((p1 === "schuif") ? 1 : 0);
    frontIdxGlobal = frontIdx;
    var rearIdx  = (frontIdx === 0) ? 1 : 0;
    colOrder = [rearIdx, frontIdx];
  } else {
    for (var ci=0; ci<cols; ci++) colOrder.push(ci);
  }

  for (var oi=0; oi<colOrder.length; oi++){
    var c = colOrder[oi];
    var col = state.columns[c];
    var cSeg = colSegs[c] || { x: innerX, w: innerW };
    var cx = cSeg.x;
    var colWCurrent = cSeg.w;

    // Middle style between columns:
    // - normal elements: visible mullion
    // - schuifpui: no fixed middle style (overlap of sashes defines the meeting line)
    if (!isSliding && c > 0){
      addRect(cx - mullionGap, innerY, mullionGap, innerH, {
        fill:colors.mullFill,
        stroke:colors.mullStroke,
        strokeWidth:1
      });
    }

    // Rows (transoms) inside the column
    var rows = Math.max(1, Number(col.rowsCount) || 1);
    var rowSegs = getRowSegmentsPx(col, innerY, innerH, transom);
    window.__kozynDragGeom.rowCentersByCol[c] = [];
    for (var dr=0; dr<rowSegs.length-1; dr++){
      window.__kozynDragGeom.rowCentersByCol[c].push(rowSegs[dr].y + rowSegs[dr].h + (transom / 2));
    }

    for (var r=0;r<rows;r++){
      var seg = rowSegs[r] || { y: innerY, h: innerH };
      var ry = seg.y;
      var rowH = seg.h;

      // Horizontal style between rows
      if (r > 0){
        addRect(cx, ry - transom, colWCurrent, transom, {
          fill:colors.mullFill,
          stroke:colors.mullStroke,
          strokeWidth:1
        });
      }

      // Pane area
      var paneX = cx, paneY = ry, paneW = colWCurrent, paneH = rowH;
      // Schuifpui overlap (front sash covers rear): remove visible middenstijl by overlapping panes
      if (isSliding && cols === 2 && frontIdxGlobal !== null){
        var overlapPx = Math.max(14, Math.round(Math.min(colW, innerH) * 0.05));
        if (c === frontIdxGlobal){
          paneW += overlapPx;
        } else {
          paneX -= overlapPx;
          paneW += overlapPx;
        }
        // clamp within inner opening
        var minX = innerX;
        var maxX = innerX + innerW;
        if (paneX < minX){ paneW -= (minX - paneX); paneX = minX; }
        if (paneX + paneW > maxX){ paneW = Math.max(10, maxX - paneX); }
      }

      addRect(paneX + 2, paneY + 2, paneW - 4, paneH - 4, { fill:colors.paneFill, stroke:colors.paneStroke, strokeWidth:1 });

      var cell = (col.rows && col.rows[r]) ? col.rows[r] : { paneType:"auto", options:{hinge:"left"} };

      var pType = (cell.paneType === "auto") ? deriveAutoPaneType(state.elementType) : cell.paneType;
      var hingeSide = (cell.options && cell.options.hinge) ? cell.options.hinge : "left";

      // Sash indication (factory-ish logic)
      // NOTE: We keep this sales preview, but correct the movement lines:
      // - Draai / Deur / Draai-kiep: dashed line from hinge corner to handle (klink) mid-height
      // - Kiep: dashed "tilt" triangle from bottom corners to top center
      var sashInset = Math.max(4, Math.min(Math.round(sashPx * 0.75), Math.floor(Math.min(paneW, paneH) * 0.18)));
      var lineInset = Math.max(8, sashInset + 4);
      var sashStroke = colors.sashStroke;
      var opStroke   = colors.opStroke;

      function drawSashRect(extraBottom, clipRight, clipLeft){
        var eb = extraBottom || 0;
        var cr = clipRight || 0;
        var cl = clipLeft || 0;
        var x  = paneX + sashInset + cl;
        var y  = paneY + sashInset;
        var w  = paneW - (sashInset*2) - cl - cr;
        var h  = (paneH - sashInset*2) + eb;
        addRect(x, y, w, h, { fill:"transparent", stroke:sashStroke, strokeWidth:2 });
      }
      // Draw sash with selected sides only (used for schuifpui rear fixed leaf, where the meeting stile is hidden behind the front sash)
      function drawSashSides(sides, extraBottom){
        var eb = extraBottom || 0;
        var sx = paneX + sashInset;
        var sy = paneY + sashInset;
        var sw = paneW - sashInset*2;
        var sh = (paneH - sashInset*2) + eb;
        var x1 = sx, y1 = sy, x2 = sx + sw, y2 = sy + sh;
        if (sides.indexOf("top") !== -1)    addLine(x1, y1, x2, y1, { stroke:sashStroke, strokeWidth:2, linecap:"square" });
        if (sides.indexOf("right") !== -1)  addLine(x2, y1, x2, y2, { stroke:sashStroke, strokeWidth:2, linecap:"square" });
        if (sides.indexOf("bottom") !== -1) addLine(x1, y2, x2, y2, { stroke:sashStroke, strokeWidth:2, linecap:"square" });
        if (sides.indexOf("left") !== -1)   addLine(x1, y1, x1, y2, { stroke:sashStroke, strokeWidth:2, linecap:"square" });
      }
      function drawTurnLine(){
        // Draai-stand (fabriek-norm): horizontale V vanaf boven+onder scharnier naar de klink
        // Default: scharnier links, klink rechts (later instelbaar per vak)
        // Lijnen altijd uitlijnen op de vleugel (sash), niet op het vak (pane)
        var sx = paneX + sashInset;
        var sy = paneY + sashInset;
        var sw = paneW - sashInset*2;
        var sh = paneH - sashInset*2;
        var inset = 6;

        // hingeSide is per vak (cell)


        var hingeX = (hingeSide === "right") ? (sx + sw - inset) : (sx + inset);
        var hingeTopY = sy + inset;
        var hingeBotY = sy + sh - inset;

        var handleX = (hingeSide === "right") ? (sx + inset) : (sx + sw - inset);
        var handleY = sy + (sh/2);

        // V-vorm: boven scharnier -> klink, onder scharnier -> klink
        addLine(hingeX, hingeTopY, handleX, handleY, { stroke:opStroke, strokeWidth:2, dash:"6 6" });
        addLine(hingeX, hingeBotY, handleX, handleY, { stroke:opStroke, strokeWidth:2, dash:"6 6" });
      }
      function drawTiltTriangle(){
        // Kiepstand: van onderhoeken vleugel → boven midden
        var sx = paneX + sashInset;
        var sy = paneY + sashInset;
        var sw = paneW - sashInset*2;
        var sh = paneH - sashInset*2;
        var inset = 6;

        var xL = sx + inset;
        var xR = sx + sw - inset;
        var yB = sy + sh - inset;
        var xC = sx + (sw/2);
        var yT = sy + inset;
        addLine(xL, yB, xC, yT, { stroke:opStroke, strokeWidth:2, dash:"6 6" });
        addLine(xR, yB, xC, yT, { stroke:opStroke, strokeWidth:2, dash:"6 6" });
      }

      
      function drawFixedPlus(){
        var sx = paneX + sashInset;
        var sy = paneY + sashInset;
        var sw = paneW - sashInset*2;
        var sh = paneH - sashInset*2;
        var cxm = sx + sw/2;
        var cym = sy + sh/2;
        var len = Math.min(sw, sh) * 0.10;
        var pStroke = isFactory ? "#0f172a" : "rgba(233,238,246,.55)";
        addLine(cxm - len, cym, cxm + len, cym, { stroke:pStroke, strokeWidth:2, linecap:"round" });
        addLine(cxm, cym - len, cxm, cym + len, { stroke:pStroke, strokeWidth:2, linecap:"round" });
      }

      function drawVentGrille(){
        // Ventilatierooster: horizontale lamellen (fabriek-symbool)
        var gx = paneX + sashInset;
        var gy = paneY + sashInset;
        var gw = paneW - sashInset*2;
        var gh = paneH - sashInset*2;
        // subtle inner frame
        addRect(gx, gy, gw, gh, { fill:"transparent", stroke:colors.sashStroke, strokeWidth:2 });
        var lines = 6;
        for (var i=1;i<lines;i++){
          var yy = gy + (gh/lines) * i;
          addLine(gx + 6, yy, gx + gw - 6, yy, { stroke:colors.opStroke, strokeWidth:2, linecap:"round" });
        }
      }

      function drawInlineTopVent(){
        var ventH = Math.max(16, Math.round(Math.min(paneW, paneH) * 0.10));
        var vx = paneX + 3;
        var vy = paneY + 3;
        var vw = Math.max(24, paneW - 6);
        var vh = Math.max(12, ventH);
        addRect(vx, vy, vw, vh, { fill:"transparent", stroke:colors.sashStroke, strokeWidth:2, rx:2 });
        var lamels = 4;
        for (var li=1; li<=lamels; li++){
          var yy2 = vy + (vh / (lamels + 1)) * li;
          addLine(vx + 8, yy2, vx + vw - 8, yy2, { stroke:colors.opStroke, strokeWidth:2, linecap:"round" });
        }
      }


      function getRoedeStroke(){
        var rc = (cell.options && cell.options.roedeColor) ? String(cell.options.roedeColor) : "profile";
        if (rc === "white") return "#f8fafc";
        if (rc === "cream") return "#f1e7c9";
        if (rc === "black") return "#0f172a";
        if (rc === "gray") return "#94a3b8";
        return colors.frameStroke;
      }

      function drawRoedesOverlay(){
        if (!(cell && cell.options && cell.options.roedes === "yes")) return;
        if (pType === "vent") return;

        var sx = paneX + sashInset;
        var sy = paneY + sashInset;
        var sw = paneW - sashInset*2;
        var sh = paneH - sashInset*2;
        if (sw < 30 || sh < 30) return;

        var stroke = getRoedeStroke();
        var roedeType = (cell.options && cell.options.roedeType) ? String(cell.options.roedeType) : "between_glass";
        var division = (cell.options && cell.options.roedeDivision) ? String(cell.options.roedeDivision) : "2x2";
        var parts = division.split("x");
        var divCols = Math.max(1, parseInt(parts[0], 10) || 2);
        var divRows = Math.max(1, parseInt(parts[1], 10) || 2);
        var pad = Math.max(4, Math.round(Math.min(sw, sh) * 0.03));
        var x1 = sx + pad;
        var x2 = sx + sw - pad;
        var y1 = sy + pad;
        var y2 = sy + sh - pad;
        var innerW = x2 - x1;
        var innerH = y2 - y1;

        function drawSingleVertical(xx, style){
          if (style === "wiener"){
            var off = Math.max(3, Math.round(Math.min(sw, sh) * 0.012));
            addLine(xx - off, y1, xx - off, y2, { stroke: stroke, strokeWidth: 2, linecap:"round" });
            addLine(xx + off, y1, xx + off, y2, { stroke: stroke, strokeWidth: 2, linecap:"round" });
          } else if (style === "applied"){
            addLine(xx, y1, xx, y2, { stroke: stroke, strokeWidth: 4, linecap:"round" });
          } else {
            addLine(xx, y1, xx, y2, { stroke: stroke, strokeWidth: 2, linecap:"round" });
          }
        }

        function drawSingleHorizontal(yy, style){
          if (style === "wiener"){
            var off = Math.max(3, Math.round(Math.min(sw, sh) * 0.012));
            addLine(x1, yy - off, x2, yy - off, { stroke: stroke, strokeWidth: 2, linecap:"round" });
            addLine(x1, yy + off, x2, yy + off, { stroke: stroke, strokeWidth: 2, linecap:"round" });
          } else if (style === "applied"){
            addLine(x1, yy, x2, yy, { stroke: stroke, strokeWidth: 4, linecap:"round" });
          } else {
            addLine(x1, yy, x2, yy, { stroke: stroke, strokeWidth: 2, linecap:"round" });
          }
        }

        for (var vc = 1; vc < divCols; vc++){
          drawSingleVertical(x1 + (innerW / divCols) * vc, roedeType);
        }
        for (var hr = 1; hr < divRows; hr++){
          drawSingleHorizontal(y1 + (innerH / divRows) * hr, roedeType);
        }
      }


      if (pType === "vent"){
        drawVentGrille();
      }

      if (pType === "vast"){
        var hasInlineVent = !!(cell && cell.options && cell.options.inlineVent === "yes");

        // Vast deel: bij schuifpui ook kader tekenen (1:1) + vast-symbool
        if (state.elementType === "schuifpui"){
          // Rear fixed leaf: hide the meeting stile that is covered by the front sliding sash.
          var ebFix = 0;

          // Determine which column is the front sliding sash (only for 2-panel schuifpui)
          var frontIdx2 = null;
          if (isSliding && cols === 2){
            var c0r = state.columns[0] && state.columns[0].rows && state.columns[0].rows[r] ? state.columns[0].rows[r] : null;
            var c1r = state.columns[1] && state.columns[1].rows && state.columns[1].rows[r] ? state.columns[1].rows[r] : null;
            var t0 = c0r ? ((c0r.paneType === "auto") ? deriveAutoPaneType(state.elementType) : c0r.paneType) : null;
            var t1 = c1r ? ((c1r.paneType === "auto") ? deriveAutoPaneType(state.elementType) : c1r.paneType) : null;
            frontIdx2 = (t0 === "schuif") ? 0 : ((t1 === "schuif") ? 1 : 0);
          }

          if (frontIdx2 !== null && cols === 2){
            // Fixed leaf is behind: remove the side facing the sliding sash
            var hideLeft = (c > frontIdx2); // fixed is right of front -> hide left
            var hideRight = (c < frontIdx2); // fixed is left of front -> hide right
            var sides = ["top","bottom"];
            if (!hideLeft) sides.push("left");
            if (!hideRight) sides.push("right");
            drawSashSides(sides, ebFix);
          } else {
            drawSashRect(ebFix);
          }
          if (hasInlineVent) drawInlineTopVent();
          else drawFixedPlus();
        } else {
          if (hasInlineVent) drawInlineTopVent();
          else if (isFactory) drawFixedPlus();
        }
      }
if (pType === "draai_kiep" || pType === "deur"){
        drawSashRect();
        drawTurnLine();
        // draai-kiep krijgt ook kiep-indicatie (zoals jij bedoelt)
        if (pType === "draai_kiep") drawTiltTriangle();
      }
      if (pType === "kiep"){
        drawSashRect();
        drawTiltTriangle();
      }

      drawRoedesOverlay();
      if (pType === "schuif"){
        // Schuifvleugel moet binnen het eigen vak blijven.
        // Bij schuifpui clippen we aan de meeting-zijde een klein stukje (profiel-afgeleid),
        // zodat het kader niet over het vaste vak lijkt te vallen.
        var clipR = 0, clipL = 0;
        if (state.elementType === "schuifpui" && cols === 2){
          var meetClip = Math.max(2, Math.round(sashInset * 0.8)) + sashInset;// stronger clip so sliding leaf stays clearly inside its own bay
          if (c === 0) clipR = meetClip; else clipL = meetClip;
        }
        drawSashRect(0, clipR, clipL);

        var sys = (state.slideSystem || "hst");
        var aStroke = colors.arrowStroke;
        var trackStroke = colors.sashStroke;

        if (sys === "psk"){
          // PSK (kiepschuif): duidelijke zware L-pijl (omgedraaid zoals gevraagd)
          var sx2 = paneX + paneW*0.30;
          var sy2 = paneY + paneH*0.40;
          var drop = Math.min(paneW, paneH) * 0.18;
          var run  = Math.min(paneW, paneH) * 0.30;
          var midY = sy2 + drop;
          var endX = sx2 + run;

          addPath("M " + sx2 + " " + sy2 + " L " + sx2 + " " + midY + " L " + endX + " " + midY, {
            fill:"transparent",
            stroke:aStroke,
            strokeWidth: isFactory ? 7 : 5,
            linejoin:"miter",
            linecap:"butt"
          });
          addPath("M " + (endX-14) + " " + (midY-10) + " L " + endX + " " + midY + " L " + (endX-14) + " " + (midY+10), {
            fill:"transparent",
            stroke:aStroke,
            strokeWidth: isFactory ? 7 : 5,
            linejoin:"miter",
            linecap:"butt"
          });
        } else {
          // HST (hef-schuif): subtiele hoekpijl (omgedraaid zoals gevraagd)
          var sx = paneX + paneW*0.42;
          var sy = paneY + paneH*0.52;
          var leg = Math.min(paneW, paneH) * 0.12;
          var ex = sx + leg;
          var ey = sy;
          var dy = sy + leg;

          addPath("M " + sx + " " + dy + " L " + sx + " " + sy + " L " + ex + " " + ey, {
            fill:"transparent",
            stroke:aStroke,
            strokeWidth: isFactory ? 3 : 2,
            linejoin:"round",
            linecap:"round"
          });
          // arrow head
          addPath("M " + (ex-10) + " " + (ey-6) + " L " + ex + " " + ey + " L " + (ex-10) + " " + (ey+6), {
            fill:"transparent",
            stroke:aStroke,
            strokeWidth: isFactory ? 3 : 2,
            linejoin:"round",
            linecap:"round"
          });
        }
      }
}
  }

  // -------------------------
  // Factory-only technical labels (K1/K2/... and Cx-Sy)
  // -------------------------
  function tagLabel(x, y, txt, opt){
    opt = opt || {};
    var fill = isFactory ? "#0f172a" : "#ffffff";
    var t = addText(x, y, txt, { fill:fill, size:11, weight:700, anchor:(opt.anchor || "start"), baseline:"central" });
    var bb = t.getBBox();
    var padX = 6, padY = 4;
    var bg = svgEl("rect", { x:bb.x-padX, y:bb.y-padY, width:bb.width+padX*2, height:bb.height+padY*2, rx:7 });
    bg.setAttribute("fill", isFactory ? "rgba(255,255,255,.95)" : "rgba(15,23,42,.65)");
    bg.setAttribute("stroke", isFactory ? "#cbd5e1" : "rgba(255,255,255,.08)");
    bg.setAttribute("stroke-width", 1);
    svg.insertBefore(bg, t);
    return t;
  }

  function drawTechLabels(){
    if (!isFactory) return;

    // Column labels (K1, K2, ...)
    for (var c=0;c<cols;c++){
      var colTagSeg = colSegs[c] || { x: innerX, w: innerW };
      var lx = colTagSeg.x + colTagSeg.w/2;
      var ly = innerY + 14;
      tagLabel(lx, ly, "K" + (c+1), { anchor:"middle" });
    }

    // Field labels (C{col}-S{row}) inside each pane (top-left)
    for (var c=0;c<cols;c++){
      var col = state.columns[c];
      var rows = Math.max(1, Number(col.rowsCount) || 1);

      var totalTransomH = transom * (rows - 1);
      var usableHpx = Math.max(10, innerH - totalTransomH);
      var rowHpx = usableHpx / rows;

      var cSeg2 = colSegs[c] || { x: innerX, w: innerW };
      var cxBase = cSeg2.x;
      var rowSegsPx = getRowSegmentsPx(col, innerY, innerH, transom);
      for (var r=0;r<rows;r++){
        var segPx = rowSegsPx[r] || { y: innerY, h: innerH };
        var paneX = cxBase, paneY = segPx.y;
        tagLabel(paneX + 14, paneY + 14, "C" + (c+1) + "-S" + (r+1), { anchor:"start" });
      }
    }
  }


  // Sliding sill rail (only for schuifpui) — drawn inside the low threshold
  if (isSliding){
    var sillTop = (fy + fh - sillPx);
    var sys2 = (state.slideSystem || "hst");
    var railInset = Math.max(10, Math.round(framePx*0.20));
    var railX1 = fx + railInset;
    var railX2 = fx + fw - railInset;
    if (sys2 === "psk"){
      // PSK: 1 subtiele rail-lijn
      var y = sillTop + Math.round(sillPx * 0.55);
      addLine(railX1, y, railX2, y, { stroke: colors.sashStroke, strokeWidth: isFactory ? 2 : 2, linecap:"round" });
    } else {
      // HST: 2 lijnen (loopvlak + geleiding)
      var yA = sillTop + Math.round(sillPx * 0.35);
      var yB = sillTop + Math.round(sillPx * 0.70);
      addLine(railX1, yA, railX2, yA, { stroke: colors.sashStroke, strokeWidth: isFactory ? 2 : 2, linecap:"round" });
      addLine(railX1, yB, railX2, yB, { stroke: colors.sashStroke, strokeWidth: isFactory ? 2 : 2, linecap:"round" });
    }
  }

  drawTechLabels();

  function drawDragHandlesOverlay(){
    if (!isInteractiveOverlayEnabled()) return;
    var geom = window.__kozynDragGeom;
    if (!geom) return;
    var hover = _dragState ? _dragState.hit : _dragHover;
    var activeStroke = isFactory ? '#0f172a' : '#60a5fa';
    var softStroke = isFactory ? '#64748b' : 'rgba(96,165,250,.65)';
    var softFill = isFactory ? '#ffffff' : 'rgba(11,15,20,.85)';

    function addGrip(cx, cy, isActive, vertical){
      var radius = isActive ? 7 : 5;
      var ring = svgEl('circle', { cx:cx, cy:cy, r: radius + 3 });
      ring.setAttribute('fill', isActive ? 'rgba(96,165,250,.18)' : 'rgba(255,255,255,.06)');
      ring.setAttribute('stroke', 'transparent');
      ring.setAttribute('class', 'kl-interactive');
      svg.appendChild(ring);
      var c = svgEl('circle', { cx:cx, cy:cy, r: radius });
      c.setAttribute('fill', softFill);
      c.setAttribute('stroke', isActive ? activeStroke : softStroke);
      c.setAttribute('stroke-width', isActive ? 2.4 : 1.6);
      c.setAttribute('class', 'kl-interactive');
      svg.appendChild(c);
      if (vertical){
        addLine(cx, cy-6, cx, cy+6, { stroke:isActive ? activeStroke : softStroke, strokeWidth:1.5, linecap:'round' });
      } else {
        addLine(cx-6, cy, cx+6, cy, { stroke:isActive ? activeStroke : softStroke, strokeWidth:1.5, linecap:'round' });
      }
    }

    if (Array.isArray(geom.colCenters)) {
      for (var i=0; i<geom.colCenters.length; i++){
        var xh = geom.colCenters[i];
        var isActiveCol = hover && hover.type === 'col' && hover.index === i;
        if (isActiveCol){
          addLine(xh, geom.outerY, xh, geom.outerY + geom.outerH, { stroke:activeStroke, strokeWidth:2.2, dash:'8 6', linecap:'round' });
        }
        addGrip(xh, geom.outerY + 18, isActiveCol, true);
        addGrip(xh, geom.outerY + geom.outerH - 18, isActiveCol, true);
      }
    }

    var activeColIndex2 = clampNumber(Number(state.activeColIndex)||0, 0, Math.max(0, (state.columnsCount||1)-1));
    var activeColSeg = geom.colSegs && geom.colSegs[activeColIndex2];
    var rowCenters = Array.isArray(geom.rowCentersByCol) ? geom.rowCentersByCol[activeColIndex2] : null;
    if (activeColSeg && Array.isArray(rowCenters)) {
      for (var j=0; j<rowCenters.length; j++){
        var yh = rowCenters[j];
        var isActiveRow = hover && hover.type === 'row' && hover.index === j && hover.colIndex === activeColIndex2;
        if (isActiveRow){
          addLine(activeColSeg.x, yh, activeColSeg.x + activeColSeg.w, yh, { stroke:activeStroke, strokeWidth:2.2, dash:'8 6', linecap:'round' });
        }
        addGrip(activeColSeg.x + 18, yh, isActiveRow, false);
        addGrip(activeColSeg.x + activeColSeg.w - 18, yh, isActiveRow, false);
      }
    }

    if (_dragState && _dragState.liveLabel){
      var dl = _dragState.liveLabel;
      if (dl.vertical){
        var g = svgEl('g');
        g.setAttribute('class', 'kl-interactive');
        g.setAttribute('transform', 'rotate(90 '+dl.x+' '+dl.y+')');
        svg.appendChild(g);
        var t = addText(dl.x, dl.y, dl.text, { fill:(isFactory ? '#0f172a' : '#ffffff'), size:12, weight:900, anchor:'middle', baseline:'central' });
        t.setAttribute('class', 'kl-interactive');
        g.appendChild(t);
        var bb = t.getBBox();
        var pad = 6;
        var bg = svgEl('rect', { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:8 });
        bg.setAttribute('class', 'kl-interactive');
        bg.setAttribute('fill', isFactory ? '#ffffff' : 'rgba(15,23,42,.88)');
        bg.setAttribute('stroke', isFactory ? '#cbd5e1' : 'rgba(96,165,250,.35)');
        bg.setAttribute('stroke-width', 1);
        g.insertBefore(bg, t);
      } else {
        var t = addText(dl.x, dl.y, dl.text, { fill:(isFactory ? '#0f172a' : '#ffffff'), size:12, weight:900, anchor:'middle', baseline:'central' });
        t.setAttribute('class', 'kl-interactive');
        var bb = t.getBBox();
        var pad = 6;
        var bg = svgEl('rect', { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:8 });
        bg.setAttribute('class', 'kl-interactive');
        bg.setAttribute('fill', isFactory ? '#ffffff' : 'rgba(15,23,42,.88)');
        bg.setAttribute('stroke', isFactory ? '#cbd5e1' : 'rgba(96,165,250,.35)');
        bg.setAttribute('stroke-width', 1);
        svg.insertBefore(bg, t);
      }
    }
  }

  drawDragHandlesOverlay();

// -------------------------
// Dimensioning (V52-style basics)
// -------------------------
function addArrowMarker(){
// Create a single arrow marker for dimension lines
var defs = svg.querySelector("defs");
if (!defs){
  defs = svgEl("defs");
  svg.appendChild(defs);
}
if (svg.querySelector("#dimArrow")) return;
var marker = svgEl("marker", { id:"dimArrow", markerWidth:8, markerHeight:8, refX:4, refY:4, orient:"auto" });
var tri = svgEl("path", { d:"M0,0 L8,4 L0,8 Z", fill: colors.frameStroke });
marker.appendChild(tri);
defs.appendChild(marker);
}

function dimLine(x1,y1,x2,y2,txt,orientation,labelDy){
addArrowMarker();
var stroke = colors.frameStroke;
// extension offsets
var ext = 10;
if (orientation === "h"){
  // extension lines down to object
  addLine(x1, y1+ext, x1, y1+ext*2, { stroke:stroke, strokeWidth:1 });
  addLine(x2, y2+ext, x2, y2+ext*2, { stroke:stroke, strokeWidth:1 });
} else if (orientation === "v"){
  addLine(x1+ext, y1, x1+ext*2, y1, { stroke:stroke, strokeWidth:1 });
  addLine(x2+ext, y2, x2+ext*2, y2, { stroke:stroke, strokeWidth:1 });
}
var l = svgEl("line", { x1:x1, y1:y1, x2:x2, y2:y2, stroke:stroke, "stroke-width":1 });
l.setAttribute("marker-start","url(#dimArrow)");
l.setAttribute("marker-end","url(#dimArrow)");
svg.appendChild(l);

var tx = (x1+x2)/2, ty = (y1+y2)/2;
if (typeof labelDy === "number") ty += labelDy;
if (orientation === "v"){
  var g = svgEl("g", { transform:'rotate(90 '+tx+' '+ty+')' });
  svg.appendChild(g);
  var t = addText(tx, ty, txt, { fill:stroke, size:12, weight:700, anchor:"middle", baseline:"central" });
  g.appendChild(t);
  var bb = t.getBBox();
  var pad = 4;
  var bg = svgEl("rect", { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:6 });
  bg.setAttribute("fill", isFactory ? "#ffffff" : "rgba(15,23,42,.65)");
  bg.setAttribute("stroke", "transparent");
  g.insertBefore(bg, t);
} else {
  var t = addText(tx, ty, txt, { fill:stroke, size:12, weight:700, anchor:"middle", baseline:"central" });
  // text background box (simple)
  var bb = t.getBBox();
  var pad = 4;
  var bg = svgEl("rect", { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:6 });
  bg.setAttribute("fill", isFactory ? "#ffffff" : "rgba(15,23,42,.65)");
  bg.setAttribute("stroke", "transparent");
  // place bg behind text
  svg.insertBefore(bg, t);
}
}

function drawDims(){
var mmW = Number(state.widthMM) || 1200;
var mmH = Number(state.heightMM) || 1400;
var colsSafe = Math.max(1, Number(cols) || 1);

var _fMM = (state.__isSlidingForFieldDims ? (Number(state.__frameMM_forDims) || frameMM) : frameMM);
var _mMM = (state.__isSlidingForFieldDims ? 0 : mullionMM);
var _tMM = (state.__isSlidingForFieldDims ? 0 : transomMM);
var vakProfile = resolveVakhoogteProfileMM();

// total width above
var yTop = fy - 28;
dimLine(fx, yTop, fx+fw, yTop, Math.round(mmW) + " mm", "h");

// total height only on right
var xRight = fx + fw + 32;
dimLine(xRight, fy, xRight, fy+fh, Math.round(mmH) + " mm", "v");

// centerline-based top chain for columns
var xSeg = fy - 54;
var colChainMM = getColumnChainSegmentsMM(mmW, _fMM, _mMM);
var colChainPx = getColumnChainSegmentsPx(innerX, innerW, fx, fw, mullion);
for (var c=0; c<colChainMM.segs.length; c++){
  var mmSeg = colChainMM.segs[c];
  var pxSeg = colChainPx[c];
  if (!pxSeg) continue;
  dimLine(pxSeg.x1, xSeg, pxSeg.x2, xSeg, Math.round(mmSeg.chainMM) + " mm", "h");
}

// Right side: one vak chain line for active column only
var xChain = fx + fw + 62;
addLine(xChain, fy, xChain, fy + fh, { stroke:colors.frameStroke, strokeWidth:1, linecap:'round' });
var activeColIndex = clampNumber(Number(state.activeColIndex)||0, 0, colsSafe-1);
var activeCol = (state.columns && state.columns[activeColIndex]) ? state.columns[activeColIndex] : { rowsCount:1, rowHeights:[100] };
var chainMMData = getRowChainSegmentsMM(activeCol, mmH, vakProfile.frameMM, vakProfile.transomMM, vakProfile.isSlidingFieldDims);
var chainPxData = getRowChainSegmentsPx(activeCol, innerY, innerH, fy, fh, transom);
for (var r=0; r<chainMMData.segs.length; r++){
  var mmSegV = chainMMData.segs[r];
  var pxSegV = chainPxData[r];
  if (!pxSegV) continue;
  addLine(xChain - 8, pxSegV.y1, xChain + 8, pxSegV.y1, { stroke:colors.frameStroke, strokeWidth:1 });
  addLine(xChain - 8, pxSegV.y2, xChain + 8, pxSegV.y2, { stroke:colors.frameStroke, strokeWidth:1 });
  var tx = xChain + 18;
  var ty = pxSegV.cy;
  var g = svgEl('g', { transform:'rotate(90 '+tx+' '+ty+')' });
  svg.appendChild(g);
  var t = addText(tx, ty, Math.round(mmSegV.chainMM) + ' mm', { fill:(isFactory ? '#0f172a' : '#ffffff'), size:12, weight:800, anchor:'middle', baseline:'central' });
  g.appendChild(t);
  var bb = t.getBBox();
  var pad = 4;
  var bg = svgEl('rect', { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:6 });
  bg.setAttribute('fill', isFactory ? 'rgba(255,255,255,.95)' : 'rgba(15,23,42,.65)');
  bg.setAttribute('stroke', isFactory ? '#cbd5e1' : 'rgba(255,255,255,.08)');
  bg.setAttribute('stroke-width', 1);
  g.insertBefore(bg, t);
}
}

function fieldLabel(cx, cy, txt){
var t = addText(cx, cy, txt, { fill: (isFactory ? "#0f172a" : "#ffffff"), size:12, weight:800, anchor:"middle", baseline:"central" });
var bb = t.getBBox();
var pad = 6;
var bg = svgEl("rect", { x:bb.x-pad, y:bb.y-pad, width:bb.width+pad*2, height:bb.height+pad*2, rx:8 });
bg.setAttribute("fill", isFactory ? "rgba(255,255,255,.95)" : "rgba(15,23,42,.65)");
bg.setAttribute("stroke", isFactory ? "#cbd5e1" : "rgba(255,255,255,.08)");
bg.setAttribute("stroke-width", 1);
svg.insertBefore(bg, t);
}

function drawFieldDims(){
// Veld = alleen netto veldmaten in de vakken zelf.
// Geen centerline-ketting boven/rechts; die hoort onder Maat.
var mmW = Number(state.widthMM) || 1200;
var mmH = Number(state.heightMM) || 1400;
var colsSafe = Math.max(1, Number(cols) || 1);
var _fMM = (state.__isSlidingForFieldDims ? (Number(state.__frameMM_forDims) || frameMM) : frameMM);
var _mMM = (state.__isSlidingForFieldDims ? 0 : mullionMM);
var vakProfile = resolveVakhoogteProfileMM();

var colSegsPx = getColumnSegmentsPx(innerX, innerW, mullion);
var colChainMM = getColumnChainSegmentsMM(mmW, _fMM, _mMM);

for (var c=0; c<colsSafe; c++){
  var col = (state.columns && state.columns[c]) ? state.columns[c] : { rowsCount:1, rowHeights:[100] };
  var colPx = colSegsPx[c];
  var colMM = (colChainMM.segs[c] && Number(colChainMM.segs[c].openMM)) || 0;
  if (!colPx) continue;

  var rowSegsPx = getRowSegmentsPx(col, innerY, innerH, transom);
  var rowChainMM = getRowChainSegmentsMM(col, mmH, vakProfile.frameMM, vakProfile.transomMM, vakProfile.isSlidingFieldDims);

  for (var r=0; r<rowSegsPx.length; r++){
    var rowPx = rowSegsPx[r];
    var rowMM = (rowChainMM.segs[r] && Number(rowChainMM.segs[r].openMM)) || 0;
    if (!rowPx) continue;

    var cx = colPx.x + (colPx.w / 2);
    var cy = rowPx.y + (rowPx.h / 2);
    var txt = Math.round(colMM) + ' × ' + Math.round(rowMM) + ' mm';
    fieldLabel(cx, cy, txt);
  }
}
}

if (state.showDims) drawDims();
if (state.showFieldDims) drawFieldDims();
}

// -------------------------
// Main render
// -------------------------
function renderAll(){
  ensureColumnsArrayConsistency();
  installSvgDragInteractions();
  renderControlsFromState();
  renderOverview();
  renderProjectList();
  renderExtras();
  renderTotals();
  syncDrawButtons();
  setSaveStateLabel(_uiDirty ? 'Wijzigingen opslaan…' : 'Gereed', _uiDirty);
  draw();
}

// -------------------------
// Actions
// -------------------------
function addExtra(){
  if (!Array.isArray(state.projectExtras)) state.projectExtras = [];
  var id = "x_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  state.projectExtras.push({ id:id, type:"overig", name:"", qty:1, unitEuro:0 });
  scheduleRender("addExtra");
}

function removeExtraById(extraId){
  state.projectExtras = state.projectExtras.filter(function(e){ return e.id !== extraId; });
  scheduleRender("removeExtra");
}

function resetAll(){
  state = createDefaultState();
  scheduleRender("reset");
  toast("Reset", "Alles terug naar standaard.");
}


// -------------------------
// Event wiring (single, clean)
// -------------------------

function bindInput(input, fn){
  if (!input) return;
  input.addEventListener("input", fn);
  input.addEventListener("change", fn);
}

// Customer bindings
bindInput(el.inpCustomerName, function(){ state.customer.name = el.inpCustomerName.value; scheduleTotalsOnly("cust"); });
bindInput(el.inpProjectName, function(){ state.customer.projectName = el.inpProjectName.value; scheduleTotalsOnly("cust"); });
bindInput(el.inpCustomerAddress, function(){ state.customer.address = el.inpCustomerAddress.value; });
bindInput(el.inpCustomerPostcode, function(){ state.customer.postcode = el.inpCustomerPostcode.value; });
bindInput(el.inpCustomerCity, function(){ state.customer.city = el.inpCustomerCity.value; });
bindInput(el.inpCustomerPhone, function(){ state.customer.phone = el.inpCustomerPhone.value; });
bindInput(el.inpCustomerEmail, function(){ state.customer.email = el.inpCustomerEmail.value; });
bindInput(el.inpProjectDate, function(){ state.customer.projectDate = el.inpProjectDate.value; scheduleTotalsOnly("date"); });
bindInput(el.inpDeliveryDate, function(){ state.customer.deliveryDate = el.inpDeliveryDate.value; });

if (el.btnNewOfferNumber){
  el.btnNewOfferNumber.addEventListener("click", function(){
    var previous = state.projectCode;
    do { state.projectCode = generateProjectCode(); } while (state.projectCode === previous);
    if (el.projectCode) el.projectCode.textContent = state.projectCode || "—";
    queuePersist("newOffer");
    safeRefreshProjectUi("newOffer-immediate");
    scheduleRender("newOffer");
    toast("Nieuw offerternummer", state.projectCode);
  });
}

if (el.inpLogoUpload){
  el.inpLogoUpload.addEventListener("change", function(){
    var file = el.inpLogoUpload.files && el.inpLogoUpload.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      state.customer.logoDataUrl = String(reader.result || "");
      renderLogo();
      toast("Logo geladen");
    };
    reader.readAsDataURL(file);
  });
}
if (el.btnClearLogo){
  el.btnClearLogo.addEventListener("click", function(){
    state.customer.logoDataUrl = "";
    if (el.inpLogoUpload) el.inpLogoUpload.value = "";
    renderLogo();
    toast("Logo verwijderd");
  });
}

// Settings bindings
bindInput(el.selElementType, function(){
  state.elementType = el.selElementType.value;

  // Schuifpui: kolommen sturen bays. Zet defaults en sync meteen.
  if (String(state.elementType) === "schuifpui"){
    state.schuifpuiActiveSide = state.schuifpuiActiveSide || "left";
    state.schuifpuiBayCount = Math.max(2, Number(state.columnsCount || 2));
    normalizeSchuifpuiBays();
    // schuifpui = 1 rij per kolom (vak) als basis
    ensureColumnsArrayConsistency();
    for (var ci=0; ci<state.columns.length; ci++){
      if (!state.columns[ci]) state.columns[ci] = { rowsCount:1, paneType:"auto", options:{} };
      state.columns[ci].rowsCount = 1;
    }
  }

  ensureColumnsArrayConsistency();
  scheduleRender("elementTypeChange");
});


// Schuifsysteem (basis keuze aan tafel)
if (el.selSlideSystem){
  el.selSlideSystem.addEventListener("change", function(){
    state.slideSystem = el.selSlideSystem.value === "psk" ? "psk" : "hst";
    scheduleRender("slideSystem");
  });
}




function applyRenderMode(mode){
  state.renderMode = (mode === "factory") ? "factory" : "sales";
  if (el.selRenderMode) el.selRenderMode.value = state.renderMode;
  if (el.chkModeFactory) el.chkModeFactory.checked = (state.renderMode === "factory");
  if (el.lblModeSales && el.lblModeFactory){
    el.lblModeSales.classList.toggle("inactive", state.renderMode === "factory");
    el.lblModeFactory.classList.toggle("inactive", state.renderMode !== "factory");
  }
}

if (el.chkModeFactory){
  el.chkModeFactory.addEventListener("change", function(){
    applyRenderMode(el.chkModeFactory.checked ? "factory" : "sales");
    scheduleRender("renderModeToggle");
  });
}

if (el.selRenderMode){
  // fallback (hidden)
  el.selRenderMode.addEventListener("change", function(){
    applyRenderMode((el.selRenderMode.value === "factory") ? "factory" : "sales");
    scheduleRender("renderModeSelect");
  });
}


bindInput(el.inpWidth, function(){
  state.widthMM = clampNumber(Number(el.inpWidth.value || state.widthMM || 1200), 400, 12000);
  scheduleRender("width");
});
bindInput(el.inpHeight, function(){
  state.heightMM = clampNumber(Number(el.inpHeight.value || state.heightMM || 1400), 400, 12000);
  scheduleRender("height");
});
bindInput(el.inpCols, function(){
  var prev = state.columnsCount;
  state.columnsCount = clampNumber(Number(el.inpCols.value || state.columnsCount || 1), 1, 6);
  ensureColumnsArrayConsistency();
  if (state.columnsCount !== prev) equalizeColumnWidths();
  scheduleRender("cols");
});
bindInput(el.selColorOutside, function(){ state.elementOptions.colorOutside = el.selColorOutside.value; updateColorCardVisibility(); scheduleTotalsOnly("colorOut"); scheduleRender("colorOut"); });
bindInput(el.inpColorCodeOutside, function(){ state.elementOptions.colorCodeOutside = (el.inpColorCodeOutside.value || "").trim(); scheduleTotalsOnly("colorCodeOut"); scheduleRender("colorCodeOut"); });
bindInput(el.selColorInside, function(){ state.elementOptions.colorInside = el.selColorInside.value; updateColorCardVisibility(); scheduleTotalsOnly("colorIn"); scheduleRender("colorIn"); });
bindInput(el.inpColorCodeInside, function(){ state.elementOptions.colorCodeInside = (el.inpColorCodeInside.value || "").trim(); scheduleTotalsOnly("colorCodeIn"); scheduleRender("colorCodeIn"); });
bindInput(el.selFinishOutside, function(){ state.elementOptions.finishOutside = el.selFinishOutside.value; scheduleTotalsOnly("finishOut"); scheduleRender("finishOut"); });
bindInput(el.selFinishInside, function(){ state.elementOptions.finishInside = el.selFinishInside.value; scheduleTotalsOnly("finishIn"); scheduleRender("finishIn"); });
bindInput(el.selPremiumColor, function(){ state.elementOptions.premiumColor = el.selPremiumColor.value; scheduleTotalsOnly("premiumColor"); scheduleRender("premiumColor"); });
bindInput(el.selProfileSystem, function(){ state.elementOptions.profileSystem = el.selProfileSystem.value; scheduleTotalsOnly('profileSystem'); scheduleRender('profileSystem'); });
bindInput(el.selProfileShape, function(){ state.elementOptions.profileShape = el.selProfileShape.value; scheduleTotalsOnly('profileShape'); scheduleRender('profileShape'); });
bindInput(el.selHardwareType, function(){ state.elementOptions.hardwareType = el.selHardwareType.value; scheduleTotalsOnly('hardwareType'); scheduleRender('hardwareType'); });
bindInput(el.inpMontage, function(){ state.montageEuro = Math.max(0, Number(el.inpMontage.value) || 0); scheduleTotalsOnly("montage"); });
bindInput(el.inpDiscount, function(){ state.discountPct = clampNumber(Number(el.inpDiscount.value) || 0, 0, 50); scheduleTotalsOnly("discount"); });
bindInput(el.selProfilePreset, function(){
  var preset = el.selProfilePreset.value || 'standard70';
  state.profile.preset = preset;
  if (preset === 'standard70'){ state.profile.frameMM = 70; state.profile.sashMM = 60; state.profile.mullionMM = 60; state.profile.transomMM = 60; }
  else if (preset === 'slim60'){ state.profile.frameMM = 60; state.profile.sashMM = 52; state.profile.mullionMM = 50; state.profile.transomMM = 50; }
  else if (preset === 'heavy90'){ state.profile.frameMM = 90; state.profile.sashMM = 72; state.profile.mullionMM = 82; state.profile.transomMM = 82; }
  scheduleRender("profilePreset");
});
bindInput(el.inpFrameMM, function(){ state.profile.frameMM = clampNumber(Number(el.inpFrameMM.value) || state.profile.frameMM || 70, 30, 160); scheduleRender("frameMM"); });
bindInput(el.inpSashMM, function(){ state.profile.sashMM = clampNumber(Number(el.inpSashMM.value) || state.profile.sashMM || 60, 30, 160); scheduleRender("sashMM"); });
bindInput(el.inpMullionMM, function(){ state.profile.mullionMM = clampNumber(Number(el.inpMullionMM.value) || state.profile.mullionMM || 60, 20, 140); scheduleRender("mullionMM"); });
bindInput(el.inpTransomMM, function(){ state.profile.transomMM = clampNumber(Number(el.inpTransomMM.value) || state.profile.transomMM || 60, 20, 140); scheduleRender("transomMM"); });

// Active selection bindings (mini-patch V203b)
if (el.selActiveCol){
  bindInput(el.selActiveCol, function(){
    ensureColumnsArrayConsistency();
    state.activeColIndex = clampNumber(Number(el.selActiveCol.value || 0), 0, Math.max(0, state.columnsCount - 1));
    var col = state.columns[state.activeColIndex] || { rowsCount: 1 };
    state.activeRowIndex = clampNumber(Number(state.activeRowIndex == null ? 0 : state.activeRowIndex), 0, Math.max(0, Number(col.rowsCount || 1) - 1));
    scheduleRender("activeColChange");
  });
}

if (el.inpRows){
  bindInput(el.inpRows, function(){
    ensureColumnsArrayConsistency();
    var col = state.columns[state.activeColIndex];
    if (!col) return;
    col.rowsCount = clampNumber(Number(el.inpRows.value || col.rowsCount || 1), 1, 6);
    equalizeRowHeightsForColumn(col);
    ensureColumnsArrayConsistency();
    var col2 = state.columns[state.activeColIndex] || { rowsCount: 1 };
    state.activeRowIndex = clampNumber(Number(state.activeRowIndex == null ? 0 : state.activeRowIndex), 0, Math.max(0, Number(col2.rowsCount || 1) - 1));
    scheduleRender("rowsCountChange");
  });
}

function applyZoom(nextZoom){
  if (!state.view) state.view = { zoom: 1 };
  state.view.zoom = clampNumber(Number(nextZoom || 1), 0.25, 4);
  if (el.pillZoom) el.pillZoom.textContent = Math.round((state.view.zoom || 1) * 100) + "%";
  draw();
  queuePersist("zoom");
}

if (el.btnZoomOut){
  el.btnZoomOut.addEventListener("click", function(){
    applyZoom((state.view && state.view.zoom ? state.view.zoom : 1) / 1.15);
  });
}
if (el.btnZoomIn){
  el.btnZoomIn.addEventListener("click", function(){
    applyZoom((state.view && state.view.zoom ? state.view.zoom : 1) * 1.15);
  });
}
if (el.btnZoomReset){
  el.btnZoomReset.addEventListener("click", function(){
    applyZoom(1);
  });
}
// Drawing toggles
if (el.chkShowDims){
  el.chkShowDims.addEventListener("change", function(){
    state.showDims = !!el.chkShowDims.checked;
    scheduleRender("showDims");
  });
}


// Draw overlay toggles (maatvoering/veldmaten) — keep state in sync with hidden checkboxes
function syncDrawButtons(){
  if (el.chkShowDims) el.chkShowDims.checked = !!state.showDims;
  if (el.btnToggleDims){
    el.btnToggleDims.classList.toggle("isOn", !!state.showDims);
    el.btnToggleDims.setAttribute("aria-pressed", !!state.showDims);
    el.btnToggleDims.textContent = "Maat";
  }
  if (el.btnToggleFieldDims){
    el.btnToggleFieldDims.classList.toggle("isOn", !!state.showFieldDims);
    el.btnToggleFieldDims.setAttribute("aria-pressed", !!state.showFieldDims);
    el.btnToggleFieldDims.textContent = "Veld";
  }
}


if (el.btnToggleDims){
  el.btnToggleDims.addEventListener("click", function(){
    state.showDims = !state.showDims;
    syncDrawButtons();
    draw();
    scheduleRender("showDimsBtn");
  });
}
if (el.btnToggleFieldDims){
  el.btnToggleFieldDims.addEventListener("click", function(){
    state.showFieldDims = !state.showFieldDims;
    syncDrawButtons();
    scheduleRender("showFieldDimsBtn");
  });
}

// -------------------------
// Project (meerdere elementen)

// -------------------------
function cloneElementState(){
  return {
    elementType: state.elementType,
    widthMM: state.widthMM,
    heightMM: state.heightMM,
    columnsCount: state.columnsCount,
    activeColIndex: state.activeColIndex,
    columns: JSON.parse(JSON.stringify(state.columns)),
    profile: JSON.parse(JSON.stringify(state.profile)),
    elementOptions: JSON.parse(JSON.stringify(state.elementOptions||{}))
  };
}

function elementSnapshotTextFromElement(element){
  var typeLabel = labelElementType(element.elementType);
  var dims = element.widthMM + "×" + element.heightMM + " mm";
  var cols = element.columnsCount + " kolom" + (element.columnsCount === 1 ? "" : "men");
  var rowsTotal = 0;
  for (var i=0;i<element.columns.length;i++){ rowsTotal += Number(element.columns[i].rowsCount || 1); }
  var vakken = rowsTotal + " vak" + (rowsTotal === 1 ? "" : "ken");

  var opt = element.elementOptions || {};
  var glassInfo = getPrimaryGlassInfo(element);
  var glass = labelGlassPack(glassInfo.primaryPack || opt.glassPack || 'HR++') + ' · Ug ' + (glassInfo.ug || '1.0');
  var colOut = displayColorLabel(opt.colorOutside || "RAL7016", opt.colorCodeOutside || "", "RAL7016");
  var colIn = displayColorLabel(opt.colorInside || "same", opt.colorCodeInside || "", "same");
  var extras = collectElementRoedeSummaries(element);

  var profileInfo = getProfileInfoForElement(element);
  var hardware = labelHardwareType(opt.hardwareType);
  var optTxt = 'Glas ' + glass + ' • ' + profileInfo.fullLabel + ' • ' + hardware + ' • ' + colOut + '/' + colIn + (extras.length ? (' • ' + extras.join(', ')) : '');
  return typeLabel + " • " + dims + " • " + cols + " • " + vakken + " • " + optTxt;
}

function addProjectItem(){
  if (!Array.isArray(state.projectItems)) state.projectItems = [];
  ensureColumnsArrayConsistency();
  var name = (el.inpProjectItemName && el.inpProjectItemName.value || "").trim();
  if (!name){ name = "Element " + (state.projectItems.length + 1); }
  var element = cloneElementState();
  var snapshot = elementSnapshotTextFromElement(element);
  var priceIncl = 0;
  try { priceIncl = estimateElementGross(element); } catch(e){ console.error("estimateElementGross failed", e); }
  state.projectItems.push({
    id: "pi_" + Date.now() + "_" + Math.floor(Math.random()*1000),
    name: name,
    element: element,
    snapshot: snapshot,
    priceIncl: priceIncl
  });
  if (el.inpProjectItemName){ el.inpProjectItemName.value = ""; }
  queuePersist("addProjectItem");
  safeRefreshProjectUi("addProjectItem-immediate");
  toast("Toegevoegd aan project", name + " (" + state.projectItems.length + ")");
}

function applyProjectItemToState(item){
  state.elementType = item.element.elementType;
  state.widthMM = item.element.widthMM;
  state.heightMM = item.element.heightMM;
  state.columnsCount = item.element.columnsCount;
  state.activeColIndex = 0;
  state.columns = JSON.parse(JSON.stringify(item.element.columns));
  state.profile = JSON.parse(JSON.stringify(item.element.profile));
  state.elementOptions = JSON.parse(JSON.stringify(item.element.elementOptions || state.elementOptions || { colorOutside:'RAL7016', colorInside:'same', colorCodeOutside:'', colorCodeInside:'', finishOutside:'smooth', finishInside:'smooth', premiumColor:'no', sill:false, profileSystem:'living_variant', profileShape:'15deg', hardwareType:'type2_siegenia' }));
  ensureColumnsArrayConsistency();
  scheduleRender("openProjectItem");
}

function updateProjectItem(id){
  var items = Array.isArray(state.projectItems) ? state.projectItems : [];
  var it = items.find(function(x){ return x.id === id; });
  if (!it) return;
  var element = cloneElementState();
  var priceIncl = estimateElementGross(element);
  it.element = element;
  it.snapshot = elementSnapshotTextFromElement(element);
  it.priceIncl = priceIncl;
  scheduleTotalsOnly("updateProjectItem");
  toast("Item geüpdatet", it.name || "");
}

function duplicateProjectItem(id){
  var items = Array.isArray(state.projectItems) ? state.projectItems : [];
  var it = items.find(function(x){ return x.id === id; });
  if (!it) return;
  var clone = JSON.parse(JSON.stringify(it));
  clone.id = "pi_" + Date.now() + "_" + Math.floor(Math.random()*1000);
  clone.name = (it.name || "Element") + " (kopie)";
  items.push(clone);
  state.projectItems = items;
  scheduleTotalsOnly("dupProjectItem");
  toast("Gekopieerd", clone.name);
}

function deleteProjectItem(id){
  state.projectItems = (state.projectItems || []).filter(function(x){ return x.id !== id; });
  scheduleTotalsOnly("delProjectItem");
}

function renameProjectItem(id){
  var items = Array.isArray(state.projectItems) ? state.projectItems : [];
  var it = items.find(function(x){ return x.id === id; });
  if (!it) return;
  var newName = window.prompt("Nieuwe naam", it.name || "");
  if (newName === null) return;
  it.name = String(newName).trim() || it.name;
  scheduleTotalsOnly("renameProjectItem");
}

function renderProjectList(){
  if (!el.projectList) return;
  var items = Array.isArray(state.projectItems) ? state.projectItems : [];
  var extrasRows = Array.isArray(state.projectExtras) ? state.projectExtras : [];
  var extrasCount = extrasRows.length;
  var extrasTotal = extrasSubtotal(state);
  var montage = Number(state.montageEuro) || 0;
  var discount = Number(computeProjectTotals().discount) || 0;

  var html = "";

  if (extrasCount > 0){
    html += "<div class='projectItem projectItemPassive projectItemExtras'>";
    html += "  <div class='projectThumb'>+</div>";
    html += "  <div class='projectMeta'>";
    html += "    <div class='projectTitleRow'>";
    html += "      <div class='projectName'>Extra opties</div>";
    html += "      <span class='badge'>Project</span>";
    html += "      <span class='priceTag mono'>" + formatEuro(extrasTotal || 0) + "</span>";
    html += "    </div>";
    html += "    <div class='projectSub'>" + extrasCount + (extrasCount === 1 ? " extra regel" : " extra regels") + " toegevoegd</div>";
    html += "  </div>";
    html += "</div>";
  }

  if (montage > 0){
    html += "<div class='projectItem projectItemPassive projectItemExtras'>";
    html += "  <div class='projectThumb'>€</div>";
    html += "  <div class='projectMeta'>";
    html += "    <div class='projectTitleRow'>";
    html += "      <div class='projectName'>Montage</div>";
    html += "      <span class='badge'>Project</span>";
    html += "      <span class='priceTag mono'>" + formatEuro(montage) + "</span>";
    html += "    </div>";
    html += "    <div class='projectSub'>Toegevoegd vanuit totaalinstellingen</div>";
    html += "  </div>";
    html += "</div>";
  }

  if (discount > 0){
    html += "<div class='projectItem projectItemPassive projectItemExtras'>";
    html += "  <div class='projectThumb'>%</div>";
    html += "  <div class='projectMeta'>";
    html += "    <div class='projectTitleRow'>";
    html += "      <div class='projectName'>Korting</div>";
    html += "      <span class='badge'>Project</span>";
    html += "      <span class='priceTag mono'>-" + formatEuro(discount) + "</span>";
    html += "    </div>";
    html += "    <div class='projectSub'>Automatisch berekend op basis van korting (%)</div>";
    html += "  </div>";
    html += "</div>";
  }

  if (items.length === 0 && !html){
    el.projectList.innerHTML = "<div class='muted'>Nog geen elementen toegevoegd.</div>";
    if (el.pillProjectCount) el.pillProjectCount.textContent = "0 items";
    return;
  }

  for (var i=0;i<items.length;i++){
    var it = items[i];
    html += "<div class='projectItem' data-project-id='" + escapeHtml(it.id) + "'>";
    html += "  <div class='projectThumb'>" + escapeHtml(String.fromCharCode(65 + (i%26))) + "</div>";
    html += "  <div class='projectMeta'>";
    html += "    <div class='projectTitleRow'>";
    html += "      <div class='projectName'>" + escapeHtml(it.name || "Element") + "</div>";
    html += "      <span class='badge'>" + escapeHtml(labelElementType((it.element && it.element.elementType) || state.elementType)) + "</span>";
    html += "      <span class='badge'>incl. btw</span>";
    html += "      <span class='priceTag mono'>" + formatEuro(it.priceIncl || 0) + "</span>";
    html += "    </div>";
    html += "    <div class='projectSub'>" + escapeHtml(it.snapshot || "") + "</div>";
    html += "  </div>";
    html += "  <div class='projectActions'>";
    html += "    <button class='miniBtn' data-action='open' type='button'>Open</button>";
    html += "    <button class='miniBtn' data-action='update' type='button'>Update</button>";
    html += "    <button class='miniBtn' data-action='rename' type='button'>Hernoemen</button>";
    html += "    <button class='miniBtn' data-action='duplicate' type='button'>Dupliceren</button>";
    html += "    <button class='miniBtn danger' data-action='delete' type='button'>Verwijderen</button>";
    html += "  </div>";
    html += "</div>";
  }

  el.projectList.innerHTML = html;
  if (el.pillProjectCount){
    var count = items.length;
    el.pillProjectCount.textContent = count + (count === 1 ? ' item' : ' items');
  }
}

if (el.btnAddExtra){
  el.btnAddExtra.addEventListener("click", addExtra);
}

if (el.extrasList){
  el.extrasList.addEventListener("click", function(ev){
    var row = ev.target && ev.target.closest && ev.target.closest('[data-extra-id]');
    if (!row) return;
    var id = row.getAttribute('data-extra-id');
    var actionBtn = ev.target.closest('[data-extra-action]');
    if (!actionBtn) return;
    var action = actionBtn.getAttribute('data-extra-action');
    if (action === 'remove') removeExtraById(id);
  });

  el.extrasList.addEventListener("input", function(ev){
    var row = ev.target && ev.target.closest && ev.target.closest('[data-extra-id]');
    if (!row) return;
    var id = row.getAttribute('data-extra-id');
    var field = ev.target.getAttribute('data-extra-field');
    if (!field) return;
    var item = (state.projectExtras || []).find(function(x){ return x.id === id; });
    if (!item) return;
    if (field === 'qty') item.qty = clampNumber(ev.target.value, 0, 999, 1);
    else if (field === 'unitEuro') item.unitEuro = Math.max(0, Number(ev.target.value) || 0);
    else if (field === 'type') {
      item.type = String(ev.target.value || 'overig');
      if (!String(item.name || '').trim()) item.name = extraLabelForType(item.type);
    }
    else item.name = String(ev.target.value || '');
    scheduleTotalsOnly('projectExtraEdit');
    renderExtras();
  });

  el.extrasList.addEventListener("change", function(ev){
    var field = ev.target.getAttribute('data-extra-field');
    if (!field) return;
    ev.target.dispatchEvent(new Event('input', { bubbles:true }));
  });
}

if (el.projectList){
  el.projectList.addEventListener("click", function(ev){
    var itemEl = ev.target && ev.target.closest && ev.target.closest("[data-project-id]");
    if (!itemEl) return;
    var id = itemEl.getAttribute("data-project-id");
    var actionBtn = ev.target.closest("[data-action]");
    if (!actionBtn) return;
    var action = actionBtn.getAttribute("data-action");

    var it = (state.projectItems || []).find(function(x){ return x.id === id; });
    if (!it) return;

    if (action === "open") applyProjectItemToState(it);
    if (action === "update") updateProjectItem(id);
    if (action === "rename") renameProjectItem(id);
    if (action === "duplicate") duplicateProjectItem(id);
    if (action === "delete") deleteProjectItem(id);
  });
}

if (el.btnClearProject){
  el.btnClearProject.addEventListener("click", function(){
    state.projectItems = [];
    scheduleTotalsOnly("clearProject");
    toast("Project geleegd");
  });
}

// Minimal project sets (placeholder)
var PROJECT_SETS = {
  rijtjeshuis: [
    { name:"Kozijn voor", elementType:"kozijn", tpl:"kz_2x1" },
    { name:"Achterdeur", elementType:"deur", tpl:"dr_1" }
  ],
  achterpui: [
    { name:"Schuifpui", elementType:"schuifpui", tpl:"sp_2delig" }
  ],
  dakkapel: [
    { name:"Kozijn dakkapel", elementType:"kozijn", tpl:"kz_3x1" }
  ]
};

function applyProjectSet(setId){
  var set = PROJECT_SETS[setId];
  if (!set) return;
  if (!Array.isArray(state.projectItems)) state.projectItems = [];
  var added = 0;
  for (var i=0;i<set.length;i++){
    var def = set[i];
    var s2 = createDefaultState();
    s2.elementType = def.elementType;
    var tplArr = getTemplatesForElementType(def.elementType) || [];
    var tpl = tplArr.find(function(x){ return x.id === def.tpl; }) || tplArr[0] || null;
    if (tpl && typeof tpl.apply === "function") tpl.apply(s2);
    if (typeof normalizeLoadedStateShape === "function") s2 = normalizeLoadedStateShape(s2);
    var tmp = {
      elementType: s2.elementType,
      widthMM: s2.widthMM,
      heightMM: s2.heightMM,
      columnsCount: s2.columnsCount,
      activeColIndex: s2.activeColIndex || 0,
      columns: JSON.parse(JSON.stringify(s2.columns || [])),
      profile: JSON.parse(JSON.stringify(s2.profile || state.profile || {})),
      elementOptions: JSON.parse(JSON.stringify(s2.elementOptions || {}))
    };
    var gross = 0;
    try { gross = estimateElementGross(tmp); } catch(e){ console.error("applyProjectSet price failed", e); }
    state.projectItems.push({
      id: "pi_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      name: def.name,
      element: tmp,
      snapshot: elementSnapshotTextFromElement(tmp),
      priceIncl: gross
    });
    added++;
  }
  queuePersist("applySet");
  safeRefreshProjectUi("applySet-immediate");
  toast("Set toegevoegd", String(added) + " regel(s)");
}

if (el.btnApplyProjectSet){
  el.btnApplyProjectSet.addEventListener("click", function(){
    var setId = el.selProjectSet ? el.selProjectSet.value : "";
    if (!setId) return toast("Kies eerst een set");
    applyProjectSet(setId);
  });
}


// -------------------------

// -------------------------
// Public API
// -------------------------
KL.ui.renderAll = renderAll;

// -------------------------
// Init
// -------------------------
// Init
// -------------------------
setSaveStateLabel('Gereed', false);
scheduleRender("init");
// Initial zoom pill
if (el.pillZoom) el.pillZoom.textContent = Math.round((state.view.zoom||1)*100) + "%";
hardBindCriticalActions();



function hardBindCriticalActions(){
  try{
    var btn;

    btn = document.getElementById("btnNewOfferNumber");
    if (btn && !btn.__kozynHardboundOffer){
      btn.onclick = function(){
        var previous = state.projectCode;
        do { state.projectCode = generateProjectCode(); } while (state.projectCode === previous);
        if (el.projectCode) el.projectCode.textContent = state.projectCode || "—";
        queuePersist("newOffer");
        safeRefreshProjectUi("newOffer-hardbind");
        scheduleRender("newOffer-hardbind");
        toast("Nieuw offerternummer", state.projectCode);
      };
      btn.__kozynHardboundOffer = true;
    }


    btn = document.getElementById("btnAddProjectItem");
    if (btn && !btn.__kozynHardboundProjectAdd){
      btn.onclick = function(){ addProjectItem(); };
      btn.__kozynHardboundProjectAdd = true;
    }

    btn = document.getElementById("btnApplyProjectSet");
    if (btn && !btn.__kozynHardboundProjectSet){
      btn.onclick = function(){
        var setId = el.selProjectSet ? el.selProjectSet.value : "";
        if (!setId) return toast("Kies eerst een set");
        applyProjectSet(setId);
      };
      btn.__kozynHardboundProjectSet = true;
    }
  } catch(e){ console.error("hardBindCriticalActions failed", e); }
}

// -------------------------
// Schuifpui: per-vak rol select (UI only)
// -------------------------
function renderSpBayRolesUI(){
  var wrap = document.getElementById("spBayRoles");
  if (!wrap) return;

  if ((state.elementType || state.type) !== "schuifpui"){
    wrap.innerHTML = "";
    return;
  }

  // Ensure arrays are sane
  if (KL && KL.core && typeof KL.core.normalizeSchuifpuiBays === "function"){
    KL.core.normalizeSchuifpuiBays();
  } else if (typeof normalizeSchuifpuiBays === "function"){
    normalizeSchuifpuiBays();
  }

  var bays = state.schuifpuiBays || [];
  var html = '<div class="hint" style="margin-bottom:6px;">Vakrollen</div>' +
             '<div style="display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px;">';

  for (var i=0;i<bays.length;i++){
    var label = "Vak " + (i+1);
    var val = String(bays[i] || "fixed").toLowerCase();
    html += '<label style="display:block;">' +
            '<div class="hint" style="margin:0 0 4px 0;">'+label+'</div>' +
            '<select class="select spBayRole" data-bay="'+i+'">' +
              '<option value="fixed" '+(val==="fixed"?"selected":"")+'>Vast</option>' +
              '<option value="slide" '+(val==="slide"?"selected":"")+'>Schuifblad</option>' +
            '</select></label>';
  }
  html += '</div>';
  wrap.innerHTML = html;

  var selects = wrap.querySelectorAll("select.spBayRole");
  selects.forEach(function(sel){
    sel.addEventListener("change", function(){
      var idx = Number(sel.getAttribute("data-bay")||0);
      var v = String(sel.value||"fixed").toLowerCase();

      if (KL && KL.core && typeof KL.core.normalizeSchuifpuiBays === "function"){
        KL.core.normalizeSchuifpuiBays();
      } else if (typeof normalizeSchuifpuiBays === "function"){
        normalizeSchuifpuiBays();
      }

      if (!Array.isArray(state.schuifpuiBays)) state.schuifpuiBays = [];
      state.schuifpuiBays[idx] = (v === "slide") ? "slide" : "fixed";

      // keep cols in sync
      state.columnsCount = Math.max(2, Number(state.schuifpuiBayCount || 2));

      queuePersist("spBayRole");
      if (typeof draw === "function") draw();
    });
  });
}
