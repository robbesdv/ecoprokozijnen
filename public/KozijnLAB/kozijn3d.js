(function () {
  "use strict";

  var CSS = "\
.kl3d-host{width:100%;height:100%;min-height:420px;display:flex;min-width:0;}\
.kl3d-viewer{width:100%;min-height:420px;display:flex;flex-direction:column;border:1px solid rgba(148,163,184,.28);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));overflow:hidden;box-shadow:0 14px 34px rgba(15,23,42,.12);}\
.kl3d-in-card .kl3d-viewer{border:0;border-radius:0;background:transparent;box-shadow:none;}\
.kl3d-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.22);background:rgba(255,255,255,.04);}\
.kl3d-title{display:flex;flex-direction:column;gap:2px;min-width:0;}\
.kl3d-title strong{font-size:12px;font-weight:700;color:var(--text,#0f172a);line-height:1.1;}\
.kl3d-title span{font-size:11px;color:var(--text-muted,var(--muted,#64748b));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\
.kl3d-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;}\
.kl3d-segment{display:inline-flex;gap:2px;padding:3px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:rgba(15,23,42,.04);}\
.kl3d-photo-tools{display:none;align-items:center;gap:8px;}\
.kl3d-viewer.is-photo .kl3d-photo-tools{display:inline-flex;}\
.kl3d-viewer.is-photo [data-kl3d-spin]{display:none;}\
.kl3d-btn{border:0;border-radius:6px;background:transparent;color:var(--text-muted,var(--muted,#64748b));font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer;white-space:nowrap;}\
.kl3d-btn:hover{background:rgba(148,163,184,.18);color:var(--text,#0f172a);}\
.kl3d-btn.is-active{background:var(--bg-elev,rgba(255,255,255,.12));color:var(--text,#0f172a);box-shadow:0 1px 2px rgba(15,23,42,.12);}\
.kl3d-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;}\
.kl3d-canvas-wrap{position:relative;flex:1;min-height:360px;overflow:hidden;background:linear-gradient(180deg,#dbeafe 0%,#eef6ff 44%,#d8e2ee 100%);cursor:grab;touch-action:none;}\
.kl3d-canvas-wrap.is-dragging{cursor:grabbing;}\
.kl3d-viewer.is-photo .kl3d-canvas-wrap{cursor:move;}\
.kl3d-canvas{width:100%;height:100%;display:block;}\
.kl3d-empty{position:absolute;inset:0;display:grid;place-items:center;color:rgba(100,116,139,.82);font-weight:700;font-size:12px;pointer-events:none;}\
.preview-stage.is-3d #preview-svg,.preview-stage.is-house #preview-svg{display:none;}\
.preview-stage.is-2d #preview-3d{display:none;}\
#preview-3d{width:100%;height:100%;max-width:1200px;max-height:800px;min-height:520px;}\
@media(max-width:720px){.kl3d-host{min-height:360px}.kl3d-viewer{min-height:360px}.kl3d-head{align-items:flex-start;flex-direction:column}.kl3d-actions{width:100%;justify-content:space-between}.kl3d-canvas-wrap{min-height:300px}#preview-3d{min-height:420px}}\
@media print{.kl3d-host{display:none!important}}";

  var RAL = {
    RAL9016: "#f6f6f3",
    RAL9001: "#f0ead6",
    RAL7016: "#383e42",
    RAL7039: "#6c6960",
    RAL7012: "#51565a",
    RAL7038: "#b2b4b3",
    RAL9005: "#0a0a0d",
    Wit: "#f6f6f3",
    white: "#f6f6f3",
    zwart: "#0a0a0d"
  };

  var instances = new Map();
  var cssInjected = false;
  var DEFAULT_PHOTO_URL = "assets/house-facade.jpg";

  function injectCss() {
    if (cssInjected) return;
    cssInjected = true;
    var style = document.createElement("style");
    style.id = "kozijn3d-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function numberOr(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function resolveHost(hostOrId) {
    if (!hostOrId) return null;
    if (typeof hostOrId === "string") return document.getElementById(hostOrId) || document.querySelector(hostOrId);
    return hostOrId;
  }

  function normalizePaneType(type, raw, colIndex) {
    var p = String(raw || "auto").toLowerCase();
    if (p === "draai_kiep") p = "draaikiep";
    if (p === "auto") {
      if (type === "deur") return "deur";
      if (type === "dakraam") return "kiep";
      if (type === "schuifpui" || type === "hefschuif") return colIndex === 0 ? "schuif" : "vast";
      return "vast";
    }
    return p;
  }

  function normalizeRows(source, col, type, colIndex) {
    var rows = [];
    var srcRows = Array.isArray(col && col.rows) ? col.rows : [];
    var rowHeights = Array.isArray(col && col.rowHeights) ? col.rowHeights : [];
    var count = Math.max(1, Math.round(numberOr((col && col.rowsCount) || srcRows.length, srcRows.length || 1)));

    if (srcRows.length) count = srcRows.length;
    for (var i = 0; i < count; i++) {
      var row = srcRows[i] || {};
      var options = row.options || (col && col.options) || {};
      var bayRole = source && Array.isArray(source.schuifpuiBays) ? source.schuifpuiBays[colIndex] : "";
      var paneRaw = row.paneType || (col && col.paneType) || (bayRole === "slide" ? "schuif" : bayRole === "fixed" ? "vast" : "auto");
      var paneType = normalizePaneType(type, paneRaw, colIndex);
      var heightPct = numberOr(row.heightPct, numberOr(rowHeights[i], 100 / count));
      rows.push({
        paneType: paneType,
        heightPct: heightPct,
        fill: row.fill || (paneType === "deur" ? "panel" : "glass"),
        hinge: row.hinge || options.hinge || "left",
        glassFinish: row.glassFinish || options.glassFinish || "clear",
        glassPack: row.glassPack || options.glassPack || source.glassPack || "HR++"
      });
    }

    var total = rows.reduce(function (sum, row) { return sum + Math.max(0, numberOr(row.heightPct, 0)); }, 0) || 100;
    rows.forEach(function (row) { row.heightPct = Math.max(1, row.heightPct) / total * 100; });
    return rows;
  }

  function normalizeColumns(source, type) {
    var raw = Array.isArray(source && source.columns) ? source.columns : [];
    var count = Math.max(1, Math.round(numberOr(source && source.columnsCount, raw.length || 1)));
    while (raw.length < count) raw.push({});

    var cols = raw.slice(0, count).map(function (col, index) {
      return {
        widthPct: numberOr(col && col.widthPct, 100 / count),
        rows: normalizeRows(source, col || {}, type, index)
      };
    });

    var total = cols.reduce(function (sum, col) { return sum + Math.max(0, numberOr(col.widthPct, 0)); }, 0) || 100;
    cols.forEach(function (col) { col.widthPct = Math.max(1, col.widthPct) / total * 100; });
    return cols;
  }

  function colorFrom(source) {
    var opts = (source && source.elementOptions) || {};
    var raw = source && (source.colorOutside || opts.colorOutside || opts.color || "RAL7016");
    var custom = opts.colorCodeOutside || source.colorCodeOutside;
    if (String(raw).toLowerCase() === "custom" && custom) return "#475569";
    return RAL[raw] || RAL[String(raw).replace(/\s+/g, "")] || "#383e42";
  }

  function normalizeElement(source) {
    source = source || {};
    if (source.element && !source.widthMM) source = source.element;
    var type = String(source.type || source.elementType || "kozijn").toLowerCase();
    var profile = source.profile || {};
    var options = source.elementOptions || {};
    var slidingProfile = profile.schuifpui || {};
    var isSliding = type === "schuifpui" || type === "hefschuif";
    var frameMM = numberOr(isSliding ? slidingProfile.outerFrameMM : profile.frameMM, numberOr(profile.frameMM, 70));
    var sashMM = numberOr(isSliding ? slidingProfile.sashMM : profile.sashMM, numberOr(profile.sashMM, 60));
    var mullionMM = numberOr(profile.mullionMM, 60);
    var transomMM = numberOr(profile.transomMM, 60);
    var profileSystem = String(options.profileSystem || source.profileSystem || "living_variant");
    var profileShape = String(options.profileShape || source.profileShape || "15deg");
    var contourAngle = profileShape === "straight" ? 0 : (profileShape === "6deg" ? 6 : 15);
    var depthMM = numberOr(profile.depthMM, profileSystem === "living_variant" ? 120 : 82);
    var sashDepthMM = numberOr(profile.sashDepthMM, profileSystem === "living_variant" ? 85 : 82);

    return {
      type: type,
      widthMM: clamp(source.widthMM, 300, 14000),
      heightMM: clamp(source.heightMM, 300, 14000),
      profile: {
        frameMM: clamp(frameMM, 25, 220),
        sashMM: clamp(sashMM, 20, 200),
        mullionMM: clamp(mullionMM, 15, 180),
        transomMM: clamp(transomMM, 15, 180),
        depthMM: clamp(depthMM, 70, 180),
        sashDepthMM: clamp(sashDepthMM, 60, 140),
        system: profileSystem,
        shape: profileShape,
        contourAngle: contourAngle,
        hvl: profileSystem === "living_variant",
        gasketCount: 2
      },
      color: colorFrom(source),
      columns: normalizeColumns(source, type)
    };
  }

  function hexToRgb(hex) {
    hex = String(hex || "#64748b");
    if (hex.indexOf("rgb") === 0) {
      var match = hex.match(/\d+(\.\d+)?/g) || [];
      return {
        r: clamp(Number(match[0] || 100), 0, 255),
        g: clamp(Number(match[1] || 116), 0, 255),
        b: clamp(Number(match[2] || 139), 0, 255)
      };
    }
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function shade(hex, factor) {
    var c = hexToRgb(hex);
    var mix = factor >= 1 ? 255 : 0;
    var amt = Math.abs(factor - 1);
    var r = Math.round(c.r + (mix - c.r) * amt);
    var g = Math.round(c.g + (mix - c.g) * amt);
    var b = Math.round(c.b + (mix - c.b) * amt);
    return "rgb(" + clamp(r, 0, 255) + "," + clamp(g, 0, 255) + "," + clamp(b, 0, 255) + ")";
  }

  function rectPoints(x1, y1, x2, y2, z) {
    return [
      { x: x1, y: y1, z: z },
      { x: x2, y: y1, z: z },
      { x: x2, y: y2, z: z },
      { x: x1, y: y2, z: z }
    ];
  }

  function addFace(scene, points, color, alpha, stroke, weight) {
    scene.faces.push({
      points: points,
      color: color,
      alpha: alpha == null ? 1 : alpha,
      stroke: stroke || "rgba(15,23,42,.18)",
      weight: weight || 1
    });
    points.forEach(function (p) {
      scene.minX = Math.min(scene.minX, p.x);
      scene.maxX = Math.max(scene.maxX, p.x);
      scene.minY = Math.min(scene.minY, p.y);
      scene.maxY = Math.max(scene.maxY, p.y);
    });
  }

  function addLine(scene, points, color, width, alpha) {
    scene.lines.push({
      points: points,
      color: color || "rgba(15,23,42,.7)",
      width: width || 2,
      alpha: alpha == null ? 1 : alpha
    });
  }

  function addProfileGrooves(scene, x1, y1, x2, y2, z, color, inset) {
    if (x2 <= x1 || y2 <= y1) return;
    inset = Math.max(8, inset || 16);
    var hi = "rgba(255,255,255,.46)";
    var lo = "rgba(15,23,42,.28)";
    addLine(scene, [{ x: x1 + inset, y: y2 - inset, z: z }, { x: x2 - inset, y: y2 - inset, z: z }], hi, 1.3, .82);
    addLine(scene, [{ x: x1 + inset, y: y1 + inset, z: z }, { x: x2 - inset, y: y1 + inset, z: z }], lo, 1.3, .72);
    addLine(scene, [{ x: x1 + inset, y: y1 + inset, z: z }, { x: x1 + inset, y: y2 - inset, z: z }], hi, 1.1, .62);
    addLine(scene, [{ x: x2 - inset, y: y1 + inset, z: z }, { x: x2 - inset, y: y2 - inset, z: z }], lo, 1.1, .62);
    if (Math.abs(x2 - x1) > inset * 3 && Math.abs(y2 - y1) > inset * 3) {
      addLine(scene, [{ x: x1 + inset * 1.8, y: y2 - inset * 1.8, z: z }, { x: x2 - inset * 1.8, y: y2 - inset * 1.8, z: z }], shade(color, 1.18), 1, .55);
      addLine(scene, [{ x: x1 + inset * 1.8, y: y1 + inset * 1.8, z: z }, { x: x2 - inset * 1.8, y: y1 + inset * 1.8, z: z }], shade(color, .66), 1, .48);
    }
  }

  function addHvlCornerJoints(scene, x1, y1, x2, y2, rail, z, color) {
    rail = Math.max(12, rail || 36);
    var seam = "rgba(15,23,42,.34)";
    var hi = "rgba(255,255,255,.32)";
    addLine(scene, [{ x: x1 + rail, y: y2, z: z }, { x: x1 + rail, y: y2 - rail, z: z }], seam, 1.6, .78);
    addLine(scene, [{ x: x2 - rail, y: y2, z: z }, { x: x2 - rail, y: y2 - rail, z: z }], seam, 1.6, .78);
    addLine(scene, [{ x: x1 + rail, y: y1, z: z }, { x: x1 + rail, y: y1 + rail, z: z }], seam, 1.6, .78);
    addLine(scene, [{ x: x2 - rail, y: y1, z: z }, { x: x2 - rail, y: y1 + rail, z: z }], seam, 1.6, .78);
    addLine(scene, [{ x: x1 + 6, y: y2 - rail + 4, z: z + .3 }, { x: x1 + rail - 6, y: y2 - rail + 4, z: z + .3 }], hi, 1, .55);
    addLine(scene, [{ x: x2 - rail + 6, y: y2 - rail + 4, z: z + .3 }, { x: x2 - 6, y: y2 - rail + 4, z: z + .3 }], hi, 1, .55);
  }

  function addGasket(scene, x1, y1, x2, y2, z, inset) {
    inset = inset || 0;
    var gx1 = x1 - inset;
    var gx2 = x2 + inset;
    var gy1 = y1 - inset;
    var gy2 = y2 + inset;
    var c = "rgba(16,20,24,.82)";
    addLine(scene, [{ x: gx1, y: gy1, z: z }, { x: gx2, y: gy1, z: z }, { x: gx2, y: gy2, z: z }, { x: gx1, y: gy2, z: z }, { x: gx1, y: gy1, z: z }], c, 3, .9);
  }

  function addGlassPocket(scene, x1, y1, x2, y2, z1, z2, color) {
    if (x2 <= x1 || y2 <= y1) return;
    var pocket = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) * .08;
    pocket = clamp(pocket, 10, 28);
    addBox(scene, x1 - pocket, y1 - pocket, x2 + pocket, y1, z1, z2, shade(color, .78), { alpha: .68, stroke: "rgba(15,23,42,.16)" });
    addBox(scene, x1 - pocket, y2, x2 + pocket, y2 + pocket, z1, z2, shade(color, 1.08), { alpha: .72, stroke: "rgba(15,23,42,.14)" });
    addBox(scene, x1 - pocket, y1, x1, y2, z1, z2, shade(color, .88), { alpha: .68, stroke: "rgba(15,23,42,.14)" });
    addBox(scene, x2, y1, x2 + pocket, y2, z1, z2, shade(color, .72), { alpha: .68, stroke: "rgba(15,23,42,.14)" });
  }

  function glassLayerCount(pack) {
    var p = String(pack || "").toLowerCase();
    if (p.indexOf("triple") >= 0 || p.indexOf("hr+++") >= 0 || p.indexOf("trippel") >= 0) return 3;
    if (p.indexOf("dubbel") >= 0 || p.indexOf("hr++") >= 0 || p.indexOf("hr+") >= 0) return 2;
    return 2;
  }

  function addGlassUnit(scene, x1, y1, x2, y2, zCenter, row) {
    var layers = glassLayerCount(row.glassPack);
    var spacing = layers === 3 ? 18 : 22;
    var glassColor = row.glassFinish === "satinato" ? "#d9e4ec" : "#a9d8f5";
    for (var i = 0; i < layers; i++) {
      var z = zCenter + (i - (layers - 1) / 2) * spacing;
      var alpha = i === 0 ? .42 : (layers === 3 && i === 1 ? .28 : .36);
      addFace(scene, rectPoints(x1, y1, x2, y2, z), glassColor, alpha, "rgba(59,130,246,.32)");
      addLine(scene, [
        { x: x1, y: y2, z: z + .2 },
        { x: x2, y: y2, z: z + .2 }
      ], "rgba(255,255,255,.48)", 1, .72);
      addLine(scene, [
        { x: x2, y: y1, z: z + .2 },
        { x: x2, y: y2, z: z + .2 }
      ], "rgba(15,23,42,.18)", 1, .55);
    }
    addLine(scene, [
      { x: x2 + 10, y: y1, z: zCenter - spacing * .55 },
      { x: x2 + 10, y: y1, z: zCenter + spacing * .55 },
      { x: x2 + 10, y: y2, z: zCenter + spacing * .55 },
      { x: x2 + 10, y: y2, z: zCenter - spacing * .55 }
    ], "rgba(30,41,59,.34)", 1, .65);
    addFace(scene, rectPoints(x1 + 18, y1 + 18, x2 - 18, y2 - 18, zCenter + spacing * .55 + 2), "#e7f6ff", .2, "rgba(255,255,255,.28)");
  }

  function addHandle(scene, x1, y1, x2, y2, row, z, scale) {
    var p = row.paneType;
    if (["draai", "kiep", "draaikiep", "deur"].indexOf(p) < 0) return;
    scale = scale || 1;
    var cy = (y1 + y2) / 2;
    var handleX = row.hinge === "right" ? x1 + 26 * scale : x2 - 26 * scale;
    var knobW = 12 * scale;
    var baseH = 84 * scale;
    var lever = 62 * scale;
    addBox(scene, handleX - knobW / 2, cy - baseH / 2, handleX + knobW / 2, cy + baseH / 2, z, z + 16 * scale, "#151922", { alpha: .98, stroke: "rgba(0,0,0,.28)" });
    var dir = row.hinge === "right" ? 1 : -1;
    addBox(scene, handleX - knobW / 2, cy - 8 * scale, handleX + dir * lever, cy + 8 * scale, z + 12 * scale, z + 28 * scale, "#202633", { alpha: .98, stroke: "rgba(0,0,0,.28)" });
  }

  function addBox(scene, x1, y1, x2, y2, z1, z2, color, options) {
    options = options || {};
    if (x2 <= x1 || y2 <= y1 || z2 <= z1) return;
    var alpha = options.alpha == null ? 1 : options.alpha;
    var stroke = options.stroke || "rgba(15,23,42,.22)";
    addFace(scene, rectPoints(x1, y1, x2, y2, z2), shade(color, 1.06), alpha, stroke);
    addFace(scene, rectPoints(x2, y1, x1, y2, z1), shade(color, .72), alpha, stroke);
    addFace(scene, [
      { x: x1, y: y1, z: z1 }, { x: x1, y: y1, z: z2 },
      { x: x1, y: y2, z: z2 }, { x: x1, y: y2, z: z1 }
    ], shade(color, .82), alpha, stroke);
    addFace(scene, [
      { x: x2, y: y1, z: z2 }, { x: x2, y: y1, z: z1 },
      { x: x2, y: y2, z: z1 }, { x: x2, y: y2, z: z2 }
    ], shade(color, .9), alpha, stroke);
    addFace(scene, [
      { x: x1, y: y2, z: z2 }, { x: x2, y: y2, z: z2 },
      { x: x2, y: y2, z: z1 }, { x: x1, y: y2, z: z1 }
    ], shade(color, 1.13), alpha, stroke);
    addFace(scene, [
      { x: x1, y: y1, z: z1 }, { x: x2, y: y1, z: z1 },
      { x: x2, y: y1, z: z2 }, { x: x1, y: y1, z: z2 }
    ], shade(color, .62), alpha, stroke);
  }

  function addHouse(scene, model, depth) {
    var w = model.widthMM;
    var h = model.heightMM;
    var wallW = Math.max(w * 1.72, w + 760);
    var wallH = Math.max(h * 1.28, h + 560);
    var wallBottom = -h / 2 - Math.max(240, h * .16);
    var wallTop = wallBottom + wallH;
    var z = -depth * 1.25;
    var roofPeak = wallTop + Math.max(280, wallH * .26);

    addFace(scene, rectPoints(-wallW / 2, wallBottom, wallW / 2, wallTop, z), "#e7dfd3", 1, "rgba(91,74,56,.26)");
    addFace(scene, [
      { x: -wallW / 2 - 80, y: wallTop, z: z - 18 },
      { x: 0, y: roofPeak, z: z - 18 },
      { x: wallW / 2 + 80, y: wallTop, z: z - 18 }
    ], "#9f463e", 1, "rgba(92,28,24,.32)");
    addFace(scene, rectPoints(-w / 2 - 80, -h / 2 - 80, w / 2 + 80, h / 2 + 80, z + 1), "#272f3a", .78, "rgba(15,23,42,.25)");
    addFace(scene, rectPoints(-wallW * .62, wallBottom - 16, wallW * .62, wallBottom - 180, z + 80), "#94a3b8", .9, "rgba(15,23,42,.15)");

    var step = Math.max(145, Math.round(h / 8));
    for (var y = wallBottom + step; y < wallTop - 10; y += step) {
      addLine(scene, [
        { x: -wallW / 2, y: y, z: z + 2 },
        { x: wallW / 2, y: y, z: z + 2 }
      ], "rgba(112,92,69,.2)", 1, .75);
    }
  }

  function addPaneDetails(scene, cell, row, depth, colors) {
    var x1 = cell.x1;
    var x2 = cell.x2;
    var y1 = cell.y1;
    var y2 = cell.y2;
    var p = row.paneType;
    var cx = (x1 + x2) / 2;
    var cy = (y1 + y2) / 2;
    var z = depth / 2 + 18;

    if (p === "draai" || p === "draaikiep" || p === "deur") {
      var hx = row.hinge === "right" ? x2 : x1;
      var tx = row.hinge === "right" ? x1 : x2;
      addLine(scene, [
        { x: hx, y: y2, z: z },
        { x: tx, y: cy, z: z },
        { x: hx, y: y1, z: z }
      ], colors.motion, 2.4, .95);
    }
    if (p === "kiep" || p === "draaikiep" || modelTypeIsRoof(row)) {
      addLine(scene, [
        { x: x1, y: y1, z: z + 2 },
        { x: cx, y: y2, z: z + 2 },
        { x: x2, y: y1, z: z + 2 }
      ], colors.motion, 2.1, .8);
    }
    if (p === "schuif") {
      addLine(scene, [
        { x: x1 + 36, y: cy, z: z + 4 },
        { x: x2 - 36, y: cy, z: z + 4 }
      ], colors.motion, 2.4, .9);
      var head = row.hinge === "right" ? x1 + 44 : x2 - 44;
      addLine(scene, [
        { x: head, y: cy - 26, z: z + 4 },
        { x: row.hinge === "right" ? head - 34 : head + 34, y: cy, z: z + 4 },
        { x: head, y: cy + 26, z: z + 4 }
      ], colors.motion, 2.4, .9);
    }
    if (p === "vast") {
      var s = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) * .13;
      addLine(scene, [
        { x: cx - s, y: cy, z: z },
        { x: cx + s, y: cy, z: z }
      ], "rgba(30,41,59,.46)", 1.7, .8);
      addLine(scene, [
        { x: cx, y: cy - s, z: z },
        { x: cx, y: cy + s, z: z }
      ], "rgba(30,41,59,.46)", 1.7, .8);
    }
  }

  function modelTypeIsRoof(row) {
    return row && row.paneType === "dakraam";
  }

  function buildScene(model, mode) {
    var scene = {
      faces: [],
      lines: [],
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity
    };
    var w = model.widthMM;
    var h = model.heightMM;
    var p = model.profile;
    var frame = Math.min(p.frameMM, w * .22, h * .22);
    var sash = Math.min(p.sashMM, w * .15, h * .15);
    var mull = Math.min(p.mullionMM, w * .2);
    var trans = Math.min(p.transomMM, h * .2);
    var depth = clamp(p.depthMM || 120, 80, 180);
    var sashDepth = clamp(p.sashDepthMM || 85, 60, depth);
    var zBack = -depth / 2;
    var zFront = depth / 2;
    var zBevel = zFront + Math.max(10, depth * .12);
    var zSashBack = zFront - sashDepth;
    var zSashFront = zFront + Math.max(16, sashDepth * .2);
    var color = model.color;
    var colors = { motion: "#e11d48" };

    if (mode === "house") addHouse(scene, model, depth);

    addBox(scene, -w / 2, -h / 2, -w / 2 + frame, h / 2, zBack, zFront, color);
    addBox(scene, w / 2 - frame, -h / 2, w / 2, h / 2, zBack, zFront, color);
    addBox(scene, -w / 2, h / 2 - frame, w / 2, h / 2, zBack, zFront, color);
    addBox(scene, -w / 2, -h / 2, w / 2, -h / 2 + frame, zBack, zFront, color);
    addProfileGrooves(scene, -w / 2, -h / 2, w / 2, h / 2, zBevel, color, Math.max(12, frame * .28));
    addHvlCornerJoints(scene, -w / 2, -h / 2, w / 2, h / 2, frame, zBevel + 1, color);

    var innerX1 = -w / 2 + frame;
    var innerX2 = w / 2 - frame;
    var innerY1 = -h / 2 + frame;
    var innerY2 = h / 2 - frame;
    var innerW = Math.max(1, innerX2 - innerX1);
    var innerH = Math.max(1, innerY2 - innerY1);

    var x = innerX1;
    model.columns.forEach(function (col, colIndex) {
      var colW = innerW * col.widthPct / 100;
      var cellX1 = x;
      var cellX2 = x + colW;
      if (colIndex > 0) {
        addBox(scene, x - mull / 2, innerY1, x + mull / 2, innerY2, zBack, zFront, color);
        addProfileGrooves(scene, x - mull / 2, innerY1, x + mull / 2, innerY2, zBevel + 1, color, Math.max(8, mull * .22));
        cellX1 += mull / 2;
      }
      if (colIndex < model.columns.length - 1) cellX2 -= mull / 2;

      var yTop = innerY2;
      col.rows.forEach(function (row, rowIndex) {
        var rowH = innerH * row.heightPct / 100;
        var y2 = yTop;
        var y1 = yTop - rowH;
        if (rowIndex > 0) {
          addBox(scene, cellX1, y2 - trans / 2, cellX2, y2 + trans / 2, zBack, zFront, color);
          addProfileGrooves(scene, cellX1, y2 - trans / 2, cellX2, y2 + trans / 2, zBevel + 1, color, Math.max(8, trans * .22));
          y2 -= trans / 2;
        }
        if (rowIndex < col.rows.length - 1) y1 += trans / 2;

        var isPanel = row.fill === "panel" || row.paneType === "deur";
        var paneInset = isPanel ? Math.max(6, Math.min(22, sash * .14)) : Math.max(14, Math.min(46, sash * .28));
        var px1 = cellX1 + paneInset;
        var px2 = cellX2 - paneInset;
        var py1 = y1 + paneInset;
        var py2 = y2 - paneInset;
        var openable = ["draai", "kiep", "draaikiep", "deur", "schuif"].indexOf(row.paneType) >= 0;
        var sashW = openable ? Math.max(24, Math.min(70, sash * .48)) : Math.max(16, Math.min(46, sash * .28));

        if (openable) {
          addBox(scene, cellX1 + paneInset * .36, y1 + paneInset * .36, cellX2 - paneInset * .36, y1 + paneInset * .36 + sashW, zSashBack, zSashFront, color);
          addBox(scene, cellX1 + paneInset * .36, y2 - paneInset * .36 - sashW, cellX2 - paneInset * .36, y2 - paneInset * .36, zSashBack, zSashFront, color);
          addBox(scene, cellX1 + paneInset * .36, y1 + paneInset * .36, cellX1 + paneInset * .36 + sashW, y2 - paneInset * .36, zSashBack, zSashFront, color);
          addBox(scene, cellX2 - paneInset * .36 - sashW, y1 + paneInset * .36, cellX2 - paneInset * .36, y2 - paneInset * .36, zSashBack, zSashFront, color);
          addProfileGrooves(scene, cellX1 + paneInset * .36, y1 + paneInset * .36, cellX2 - paneInset * .36, y2 - paneInset * .36, zSashFront + 5, color, Math.max(8, sashW * .35));
          addHvlCornerJoints(scene, cellX1 + paneInset * .36, y1 + paneInset * .36, cellX2 - paneInset * .36, y2 - paneInset * .36, sashW, zSashFront + 6, color);
        }

        if (px2 > px1 && py2 > py1) {
          if (isPanel) {
            addGasket(scene, px1, py1, px2, py2, zSashFront + 7, 3);
            addBox(scene, px1, py1, px2, py2, zSashBack + 8, zSashFront + 3, shade(color, 1.2), { alpha: .98, stroke: "rgba(15,23,42,.2)" });
            addProfileGrooves(scene, px1 + 14, py1 + 14, px2 - 14, py2 - 14, zSashFront + 9, color, 14);
          } else {
            addGasket(scene, px1, py1, px2, py2, zSashFront + 7, 2);
            addGlassPocket(scene, px1, py1, px2, py2, zSashBack + 8, zSashBack + 24, color);
            addGlassUnit(scene, px1, py1, px2, py2, zFront - 16, row);
          }
          addPaneDetails(scene, { x1: px1, x2: px2, y1: py1, y2: py2 }, row, depth, colors);
          addHandle(scene, px1, py1, px2, py2, row, zSashFront + 7, 1);
        }

        yTop -= rowH;
      });
      x += colW;
    });

    if (!Number.isFinite(scene.minX)) {
      scene.minX = -w / 2;
      scene.maxX = w / 2;
      scene.minY = -h / 2;
      scene.maxY = h / 2;
    }
    return scene;
  }

  function avgZ(points, project) {
    var sum = 0;
    for (var i = 0; i < points.length; i++) sum += project(points[i]).z;
    return sum / points.length;
  }

  function drawCoverImage(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width || 1;
    var ih = img.naturalHeight || img.height || 1;
    var scale = Math.max(w / iw, h / ih);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (iw - sw) / 2;
    var sy = (ih - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawPhotoBackdrop(ctx, w, h, image) {
    if (image && image.complete && image.naturalWidth) {
      drawCoverImage(ctx, image, 0, 0, w, h);
      ctx.fillStyle = "rgba(15,23,42,.08)";
      ctx.fillRect(0, 0, w, h);
      return;
    }

    var sky = ctx.createLinearGradient(0, 0, 0, h * .24);
    sky.addColorStop(0, "#d9ecfb");
    sky.addColorStop(1, "#edf5fb");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * .24);

    var wallTop = h * .13;
    var wall = ctx.createLinearGradient(0, wallTop, w, h);
    wall.addColorStop(0, "#d9c4aa");
    wall.addColorStop(.55, "#c9ad90");
    wall.addColorStop(1, "#b99476");
    ctx.fillStyle = wall;
    ctx.fillRect(0, wallTop, w, h * .76);

    var brickH = Math.max(24, h * .045);
    var brickW = Math.max(92, w * .13);
    ctx.strokeStyle = "rgba(83,63,44,.18)";
    ctx.lineWidth = 1;
    for (var y = wallTop + brickH; y < h * .9; y += brickH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      var offset = Math.round((y / brickH) % 2) ? brickW / 2 : 0;
      for (var x = -offset; x < w; x += brickW) {
        ctx.beginPath();
        ctx.moveTo(x, y - brickH);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "rgba(255,255,255,.09)";
    for (var i = 0; i < 900; i++) {
      var nx = (i * 73) % Math.max(1, Math.round(w));
      var ny = wallTop + ((i * 151) % Math.max(1, Math.round(h * .73)));
      ctx.fillRect(nx, ny, 1, 1);
    }

    var path = ctx.createLinearGradient(0, h * .78, 0, h);
    path.addColorStop(0, "#a5a899");
    path.addColorStop(1, "#737c70");
    ctx.fillStyle = path;
    ctx.fillRect(0, h * .78, w, h * .22);

    ctx.fillStyle = "rgba(21,78,52,.34)";
    for (var p = 0; p < 18; p++) {
      var px = (p * 97) % Math.max(1, Math.round(w));
      var py = h * (.78 + ((p * 13) % 12) / 100);
      ctx.beginPath();
      ctx.ellipse(px, py, 38 + (p % 4) * 11, 18 + (p % 3) * 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(30,41,59,.16)";
    ctx.fillRect(w * .08, wallTop + h * .1, w * .18, h * .22);
    ctx.fillStyle = "rgba(226,241,252,.58)";
    ctx.fillRect(w * .095, wallTop + h * .115, w * .15, h * .19);
  }

  function drawGlass(ctx, x, y, w, h, pack) {
    var layers = glassLayerCount(pack);
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "rgba(207,236,255,.78)");
    g.addColorStop(.45, "rgba(126,181,218,.36)");
    g.addColorStop(1, "rgba(235,248,255,.68)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(255,255,255,.62)";
    ctx.lineWidth = 1.2;
    for (var i = 1; i < layers; i++) {
      var off = i * 4;
      ctx.strokeRect(x + off, y + off, Math.max(1, w - off * 2), Math.max(1, h - off * 2));
    }
    ctx.strokeStyle = "rgba(30,41,59,.22)";
    ctx.lineWidth = layers === 3 ? 3 : 2;
    ctx.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
    ctx.fillStyle = "rgba(255,255,255,.34)";
    ctx.beginPath();
    ctx.moveTo(x + w * .08, y + h * .1);
    ctx.lineTo(x + w * .34, y + h * .1);
    ctx.lineTo(x + w * .17, y + h * .9);
    ctx.lineTo(x + w * .02, y + h * .9);
    ctx.closePath();
    ctx.fill();
  }

  function drawCanvasGasket(ctx, x, y, w, h, width) {
    ctx.save();
    ctx.strokeStyle = "rgba(12,16,20,.86)";
    ctx.lineWidth = width || 3;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawCanvasHvlJoints(ctx, x, y, w, h, rail) {
    rail = Math.max(8, rail || 20);
    ctx.save();
    ctx.strokeStyle = "rgba(10,14,18,.32)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + rail, y);
    ctx.lineTo(x + rail, y + rail);
    ctx.moveTo(x + w - rail, y);
    ctx.lineTo(x + w - rail, y + rail);
    ctx.moveTo(x + rail, y + h);
    ctx.lineTo(x + rail, y + h - rail);
    ctx.moveTo(x + w - rail, y + h);
    ctx.lineTo(x + w - rail, y + h - rail);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.beginPath();
    ctx.moveTo(x + rail + 2, y + rail - 4);
    ctx.lineTo(x + rail * 1.8, y + rail - 4);
    ctx.moveTo(x + w - rail * 1.8, y + rail - 4);
    ctx.lineTo(x + w - rail - 2, y + rail - 4);
    ctx.stroke();
    ctx.restore();
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCanvasHandle(ctx, x, y, w, h, row) {
    if (["draai", "kiep", "draaikiep", "deur"].indexOf(row.paneType) < 0) return;
    var cy = y + h / 2;
    var handleX = row.hinge === "right" ? x + 18 : x + w - 18;
    var dir = row.hinge === "right" ? 1 : -1;
    ctx.save();
    ctx.fillStyle = "#151922";
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundedRectPath(ctx, handleX - 4, cy - 26, 8, 52, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    roundedRectPath(ctx, dir > 0 ? handleX - 3 : handleX - 39, cy - 5, 42, 10, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFrontElement(ctx, model, x, y, w, h) {
    var color = model.color || "#383e42";
    var frame = Math.max(10, Math.min(w, h) * (model.profile.frameMM / Math.min(model.widthMM, model.heightMM)));
    frame = clamp(frame, 14, Math.min(w, h) * .16);
    var mull = clamp(frame * .78, 10, 34);
    var trans = clamp(frame * .74, 10, 34);

    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,.35)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x - 18, y - 18, w + 36, h + 36);
    ctx.shadowColor = "transparent";

    ctx.fillStyle = shade(color, .72);
    ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
    ctx.fillStyle = shade(color, 1.03);
    ctx.fillRect(x, y, w, h);
    drawCanvasHvlJoints(ctx, x, y, w, h, frame);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + frame * .28, y + frame * .28, Math.max(1, w - frame * .56), Math.max(1, h - frame * .56));
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x + frame, y + frame, w - frame * 2, h - frame * 2);

    var ix = x + frame;
    var iy = y + frame;
    var iw = w - frame * 2;
    var ih = h - frame * 2;
    var cx = ix;
    model.columns.forEach(function (col, ci) {
      var colW = iw * col.widthPct / 100;
      var cellX = cx;
      if (ci > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(cx - mull / 2, iy, mull, ih);
        cellX += mull / 2;
      }
      var cellW = colW - (ci > 0 ? mull / 2 : 0) - (ci < model.columns.length - 1 ? mull / 2 : 0);
      var rowY = iy;
      col.rows.forEach(function (row, ri) {
        var rowH = ih * row.heightPct / 100;
        var drawY = rowY;
        if (ri > 0) {
          ctx.fillStyle = color;
          ctx.fillRect(cellX, rowY - trans / 2, cellW, trans);
          drawY += trans / 2;
        }
        var drawH = rowH - (ri > 0 ? trans / 2 : 0) - (ri < col.rows.length - 1 ? trans / 2 : 0);
        var isPanel = row.fill === "panel" || row.paneType === "deur";
        var openable = ["draai", "kiep", "draaikiep", "deur", "schuif"].indexOf(row.paneType) >= 0;
        var inset = isPanel ? Math.max(2, frame * .07) : Math.max(7, frame * .28);
        var px = cellX + inset;
        var py = drawY + inset;
        var pw = Math.max(1, cellW - inset * 2);
        var ph = Math.max(1, drawH - inset * 2);

        if (openable) {
          var sx = cellX + inset * .35;
          var sy = drawY + inset * .35;
          var sw = Math.max(1, cellW - inset * .7);
          var sh = Math.max(1, drawH - inset * .7);
          var sashBar = clamp(frame * .46, 8, 24);
          ctx.fillStyle = shade(color, 1.05);
          ctx.fillRect(sx, sy, sw, sashBar);
          ctx.fillRect(sx, sy + sh - sashBar, sw, sashBar);
          ctx.fillRect(sx, sy, sashBar, sh);
          ctx.fillRect(sx + sw - sashBar, sy, sashBar, sh);
          drawCanvasHvlJoints(ctx, sx, sy, sw, sh, sashBar);
          px = sx + sashBar * .85;
          py = sy + sashBar * .85;
          pw = Math.max(1, sw - sashBar * 1.7);
          ph = Math.max(1, sh - sashBar * 1.7);
        }

        if (row.fill === "panel" || row.paneType === "deur") {
          drawCanvasGasket(ctx, px - 2, py - 2, pw + 4, ph + 4, 2.5);
          ctx.fillStyle = shade(color, 1.24);
          ctx.fillRect(px, py, pw, ph);
          drawCanvasHvlJoints(ctx, px, py, pw, ph, Math.max(10, frame * .45));
          ctx.strokeStyle = "rgba(15,23,42,.16)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 7, py + 7, Math.max(1, pw - 14), Math.max(1, ph - 14));
          ctx.strokeStyle = "rgba(255,255,255,.2)";
          ctx.strokeRect(px + 14, py + 14, Math.max(1, pw - 28), Math.max(1, ph - 28));
        } else {
          drawCanvasGasket(ctx, px - 2, py - 2, pw + 4, ph + 4, 2.5);
          drawGlass(ctx, px, py, pw, ph, row.glassPack);
        }

        if (["draai", "draaikiep", "deur"].indexOf(row.paneType) >= 0) {
          ctx.strokeStyle = "rgba(225,29,72,.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          var hx = row.hinge === "right" ? px + pw : px;
          var tx = row.hinge === "right" ? px : px + pw;
          ctx.beginPath();
          ctx.moveTo(hx, py);
          ctx.lineTo(tx, py + ph / 2);
          ctx.lineTo(hx, py + ph);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (row.paneType === "kiep" || row.paneType === "draaikiep") {
          ctx.strokeStyle = "rgba(225,29,72,.75)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, py + ph);
          ctx.lineTo(px + pw / 2, py);
          ctx.lineTo(px + pw, py + ph);
          ctx.stroke();
        }
        if (row.paneType === "schuif") {
          ctx.strokeStyle = "rgba(14,165,233,.88)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px + 20, py + ph * .5);
          ctx.lineTo(px + pw - 20, py + ph * .5);
          ctx.stroke();
        }
        drawCanvasHandle(ctx, px, py, pw, ph, row);
        rowY += rowH;
      });
      cx += colW;
    });
    ctx.restore();
  }

  function drawPhotoOpening(ctx, x, y, w, h) {
    var reveal = Math.max(14, Math.min(w, h) * .08);
    ctx.save();
    ctx.shadowColor = "rgba(2,6,23,.42)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "rgba(10,16,24,.5)";
    ctx.fillRect(x - reveal, y - reveal, w + reveal * 2, h + reveal * 2);
    ctx.shadowColor = "transparent";

    var side = ctx.createLinearGradient(x - reveal, y, x + w + reveal, y);
    side.addColorStop(0, "rgba(222,226,222,.92)");
    side.addColorStop(.18, "rgba(111,118,119,.85)");
    side.addColorStop(.5, "rgba(24,31,40,.9)");
    side.addColorStop(.82, "rgba(118,124,124,.85)");
    side.addColorStop(1, "rgba(232,234,230,.9)");
    ctx.fillStyle = side;
    ctx.fillRect(x - reveal, y - reveal, w + reveal * 2, h + reveal * 2);

    ctx.fillStyle = "rgba(9,14,20,.88)";
    ctx.fillRect(x - reveal * .25, y - reveal * .25, w + reveal * .5, h + reveal * .5);

    var sill = ctx.createLinearGradient(x - reveal * 1.6, y + h, x - reveal * 1.6, y + h + reveal * 1.15);
    sill.addColorStop(0, "rgba(236,236,232,.96)");
    sill.addColorStop(1, "rgba(152,157,154,.96)");
    ctx.fillStyle = sill;
    ctx.fillRect(x - reveal * 1.5, y + h + reveal * .15, w + reveal * 3, reveal);
    ctx.strokeStyle = "rgba(15,23,42,.24)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - reveal * 1.5, y + h + reveal * .15, w + reveal * 3, reveal);
    ctx.restore();
  }

  function drawPhotoPreview(viewer, ctx, w, h) {
    drawPhotoBackdrop(ctx, w, h, viewer.photoImage);
    var model = viewer.model;
    if (!model) return;
    var placement = viewer.photoPlacement;
    var aspect = model.widthMM / model.heightMM;
    var targetH = h * .46 * placement.scale;
    var targetW = targetH * aspect;
    var maxW = w * .76 * placement.scale;
    if (targetW > maxW) {
      targetW = maxW;
      targetH = targetW / aspect;
    }
    var x = w * placement.x - targetW / 2;
    var y = h * placement.y - targetH / 2;
    drawPhotoOpening(ctx, x, y, targetW, targetH);
    drawFrontElement(ctx, model, x, y, targetW, targetH);
  }

  function Viewer(host, options) {
    injectCss();
    this.host = host;
    this.options = options || {};
    this.mode = this.options.mode === "house" ? "house" : "free";
    this.showModeControls = this.options.showModeControls !== false;
    this.yaw = -0.62;
    this.pitch = 0.28;
    this.zoom = 1;
    this.model = null;
    this.drag = null;
    this.spin = false;
    this.spinFrame = 0;
    this.photoImage = null;
    this.photoUrl = "";
    this.photoPlacement = { x: .52, y: .54, scale: 1 };
    this.buildDom();
    this.bind();
    this.loadDefaultPhoto();
    this.resize();
  }

  Viewer.prototype.buildDom = function () {
    this.host.classList.add("kl3d-host");
    this.host.innerHTML = '\
      <div class="kl3d-viewer">\
        <div class="kl3d-head">\
          <div class="kl3d-title"><strong>3D stand</strong><span data-kl3d-meta>-</span></div>\
          <div class="kl3d-actions">\
            <div class="kl3d-segment" data-kl3d-mode-group>\
              <button class="kl3d-btn" type="button" data-kl3d-mode="free">3D</button>\
              <button class="kl3d-btn" type="button" data-kl3d-mode="house">In huis</button>\
            </div>\
            <div class="kl3d-photo-tools" data-kl3d-photo-tools>\
              <label class="kl3d-btn" data-kl3d-photo-label>Foto laden<input class="kl3d-file" type="file" accept="image/*" data-kl3d-photo></label>\
            </div>\
            <button class="kl3d-btn" type="button" data-kl3d-spin>360</button>\
            <button class="kl3d-btn" type="button" data-kl3d-reset>Reset</button>\
          </div>\
        </div>\
        <div class="kl3d-canvas-wrap">\
          <canvas class="kl3d-canvas"></canvas>\
          <div class="kl3d-empty" data-kl3d-empty></div>\
        </div>\
      </div>';
    this.canvas = this.host.querySelector("canvas");
    this.wrap = this.host.querySelector(".kl3d-canvas-wrap");
    this.meta = this.host.querySelector("[data-kl3d-meta]");
    this.empty = this.host.querySelector("[data-kl3d-empty]");
    this.modeGroup = this.host.querySelector("[data-kl3d-mode-group]");
    this.viewer = this.host.querySelector(".kl3d-viewer");
    this.photoInput = this.host.querySelector("[data-kl3d-photo]");
    this.spinButton = this.host.querySelector("[data-kl3d-spin]");
    if (!this.showModeControls && this.modeGroup) this.modeGroup.style.display = "none";
    this.refreshButtons();
  };

  Viewer.prototype.loadDefaultPhoto = function () {
    var self = this;
    var img = new Image();
    img.onload = function () {
      if (!self.photoImage) {
        self.photoImage = img;
        if (self.mode === "house") self.draw();
      }
    };
    img.src = DEFAULT_PHOTO_URL;
  };

  Viewer.prototype.bind = function () {
    var self = this;
    this.host.querySelectorAll("[data-kl3d-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        self.setMode(btn.getAttribute("data-kl3d-mode"));
      });
    });
    var reset = this.host.querySelector("[data-kl3d-reset]");
    if (reset) reset.addEventListener("click", function () { self.resetView(); });
    if (this.spinButton) {
      this.spinButton.addEventListener("click", function () {
        self.setSpin(!self.spin);
      });
    }
    if (this.photoInput) {
      this.photoInput.addEventListener("change", function () {
        var file = self.photoInput.files && self.photoInput.files[0];
        if (!file) return;
        if (self.photoUrl) URL.revokeObjectURL(self.photoUrl);
        self.photoUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          self.photoImage = img;
          self.setMode("house");
          self.draw();
        };
        img.src = self.photoUrl;
      });
    }

    this.canvas.addEventListener("pointerdown", function (ev) {
      self.setSpin(false);
      if (self.mode === "house") {
        self.drag = {
          type: "photo",
          x: ev.clientX,
          y: ev.clientY,
          px: self.photoPlacement.x,
          py: self.photoPlacement.y
        };
      } else {
        self.drag = { type: "orbit", x: ev.clientX, y: ev.clientY, yaw: self.yaw, pitch: self.pitch };
      }
      self.wrap.classList.add("is-dragging");
      self.canvas.setPointerCapture(ev.pointerId);
    });
    this.canvas.addEventListener("pointermove", function (ev) {
      if (!self.drag) return;
      var dx = ev.clientX - self.drag.x;
      var dy = ev.clientY - self.drag.y;
      if (self.drag.type === "photo") {
        var rect = self.canvas.getBoundingClientRect();
        self.photoPlacement.x = clamp(self.drag.px + dx / Math.max(1, rect.width), .08, .92);
        self.photoPlacement.y = clamp(self.drag.py + dy / Math.max(1, rect.height), .16, .9);
      } else {
        self.yaw = self.drag.yaw + dx * .016;
        self.pitch = clamp(self.drag.pitch + dy * .009, -1.22, 1.22);
      }
      self.draw();
    });
    this.canvas.addEventListener("pointerup", function (ev) {
      self.drag = null;
      self.wrap.classList.remove("is-dragging");
      try { self.canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
    });
    this.canvas.addEventListener("pointercancel", function () {
      self.drag = null;
      self.wrap.classList.remove("is-dragging");
    });
    this.canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      if (self.mode === "house") {
        self.photoPlacement.scale = clamp(self.photoPlacement.scale * (ev.deltaY > 0 ? .94 : 1.06), .45, 1.85);
      } else {
        self.zoom = clamp(self.zoom * (ev.deltaY > 0 ? .92 : 1.08), .55, 1.9);
      }
      self.draw();
    }, { passive: false });

    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(function () { self.resize(); });
      this.ro.observe(this.host);
    } else {
      window.addEventListener("resize", function () { self.resize(); });
    }
  };

  Viewer.prototype.setMode = function (mode) {
    this.mode = mode === "house" ? "house" : "free";
    if (this.mode === "house") this.setSpin(false);
    this.refreshButtons();
    this.draw();
  };

  Viewer.prototype.setSpin = function (enabled) {
    var self = this;
    this.spin = !!enabled && this.mode !== "house";
    if (this.spinButton) this.spinButton.classList.toggle("is-active", this.spin);
    if (!this.spin) {
      if (this.spinFrame) cancelAnimationFrame(this.spinFrame);
      this.spinFrame = 0;
      return;
    }
    if (this.spinFrame) return;
    var last = 0;
    function tick(ts) {
      if (!self.spin) {
        self.spinFrame = 0;
        return;
      }
      var dt = last ? Math.min(32, ts - last) : 16;
      last = ts;
      self.yaw += dt * .0012;
      self.draw();
      self.spinFrame = requestAnimationFrame(tick);
    }
    this.spinFrame = requestAnimationFrame(tick);
  };

  Viewer.prototype.resetView = function () {
    this.setSpin(false);
    this.yaw = -0.62;
    this.pitch = .28;
    this.zoom = 1;
    this.photoPlacement = { x: .52, y: .54, scale: 1 };
    this.draw();
  };

  Viewer.prototype.refreshButtons = function () {
    var self = this;
    this.host.querySelectorAll("[data-kl3d-mode]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-kl3d-mode") === self.mode);
    });
    if (this.viewer) this.viewer.classList.toggle("is-photo", this.mode === "house");
    if (this.spinButton) this.spinButton.classList.toggle("is-active", this.spin);
  };

  Viewer.prototype.update = function (data, options) {
    options = options || {};
    if (options.mode) {
      this.mode = options.mode === "house" ? "house" : "free";
      if (this.mode === "house") this.setSpin(false);
    }
    if (typeof options.showModeControls === "boolean") {
      this.showModeControls = options.showModeControls;
      if (this.modeGroup) this.modeGroup.style.display = this.showModeControls ? "" : "none";
    }
    this.model = normalizeElement(data);
    this.meta.textContent = this.model.widthMM + " x " + this.model.heightMM + " mm";
    this.empty.textContent = "";
    this.refreshButtons();
    this.resize();
  };

  Viewer.prototype.resize = function () {
    var rect = this.wrap.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
    }
    this.dpr = dpr;
    this.draw();
  };

  Viewer.prototype.projector = function (scene, cw, ch) {
    var yaw = this.yaw;
    var pitch = this.pitch;
    var cy = Math.cos(yaw);
    var sy = Math.sin(yaw);
    var cp = Math.cos(pitch);
    var sp = Math.sin(pitch);
    var sceneW = Math.max(1, scene.maxX - scene.minX);
    var sceneH = Math.max(1, scene.maxY - scene.minY);
    var base = Math.min(cw / (sceneW * 1.42), ch / (sceneH * 1.46)) * this.zoom;
    var camera = Math.max(sceneW, sceneH) * 2.35;
    var cx = cw / 2;
    var centerY = ch / 2 + ch * .04;

    return function (p) {
      var x1 = p.x * cy + p.z * sy;
      var z1 = -p.x * sy + p.z * cy;
      var y1 = p.y * cp - z1 * sp;
      var z2 = p.y * sp + z1 * cp;
      var perspective = camera / Math.max(100, camera - z2);
      return {
        x: cx + x1 * base * perspective,
        y: centerY - y1 * base * perspective,
        z: z2
      };
    };
  };

  Viewer.prototype.draw = function () {
    if (!this.canvas) return;
    var ctx = this.canvas.getContext("2d");
    var cw = this.canvas.width;
    var ch = this.canvas.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    var w = cw / this.dpr;
    var h = ch / this.dpr;
    ctx.clearRect(0, 0, w, h);
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#e0f2fe");
    bg.addColorStop(.55, "#eef6ff");
    bg.addColorStop(1, "#d5dee9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (!this.model) {
      ctx.restore();
      return;
    }

    if (this.mode === "house") {
      drawPhotoPreview(this, ctx, w, h);
      ctx.restore();
      return;
    }

    var scene = buildScene(this.model, this.mode);
    var project = this.projector(scene, w, h);
    var faces = scene.faces.slice().sort(function (a, b) { return avgZ(a.points, project) - avgZ(b.points, project); });
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var pts = face.points.map(project);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
      ctx.closePath();
      ctx.globalAlpha = face.alpha;
      ctx.fillStyle = face.color;
      ctx.fill();
      ctx.globalAlpha = Math.min(1, face.alpha + .08);
      ctx.strokeStyle = face.stroke;
      ctx.lineWidth = face.weight;
      ctx.stroke();
    }

    var lines = scene.lines.slice().sort(function (a, b) { return avgZ(a.points, project) - avgZ(b.points, project); });
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (var k = 0; k < lines.length; k++) {
      var line = lines[k];
      var lpts = line.points.map(project);
      ctx.beginPath();
      ctx.moveTo(lpts[0].x, lpts[0].y);
      for (var m = 1; m < lpts.length; m++) ctx.lineTo(lpts[m].x, lpts[m].y);
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  function mount(hostOrId, options) {
    var host = resolveHost(hostOrId);
    if (!host) return null;
    if (!instances.has(host)) instances.set(host, new Viewer(host, options || {}));
    return instances.get(host);
  }

  function render(hostOrId, data, options) {
    var viewer = mount(hostOrId, options || {});
    if (!viewer) return null;
    viewer.update(data, options || {});
    return viewer;
  }

  window.Kozijn3D = {
    mount: mount,
    render: render,
    normalizeElement: normalizeElement
  };
})();
