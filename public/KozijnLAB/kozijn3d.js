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
.kl3d-btn.is-active{background:var(--bg-elev,rgba(255,255,255,.9));color:var(--text,#0f172a);box-shadow:0 1px 3px rgba(15,23,42,.15);}\
.kl3d-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;}\
.kl3d-canvas-wrap{position:relative;flex:1;min-height:360px;overflow:hidden;background:linear-gradient(170deg,#bfdbfe 0%,#dbeafe 35%,#e0ecf8 100%);cursor:grab;touch-action:none;}\
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
    RAL9016: "#f1f1ee", RAL9001: "#f0ead6",
    RAL7016: "#383e42", RAL7039: "#6c6960",
    RAL7012: "#51565a", RAL7038: "#b2b4b3",
    RAL9005: "#0a0a0d",
    Wit: "#f1f1ee", white: "#f1f1ee", zwart: "#0a0a0d"
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
    var total = rows.reduce(function (s, r) { return s + Math.max(0, numberOr(r.heightPct, 0)); }, 0) || 100;
    rows.forEach(function (r) { r.heightPct = Math.max(1, r.heightPct) / total * 100; });
    return rows;
  }

  function normalizeColumns(source, type) {
    var raw = Array.isArray(source && source.columns) ? source.columns : [];
    var count = Math.max(1, Math.round(numberOr(source && source.columnsCount, raw.length || 1)));
    while (raw.length < count) raw.push({});
    var cols = raw.slice(0, count).map(function (col, index) {
      return { widthPct: numberOr(col && col.widthPct, 100 / count), rows: normalizeRows(source, col || {}, type, index) };
    });
    var total = cols.reduce(function (s, c) { return s + Math.max(0, numberOr(c.widthPct, 0)); }, 0) || 100;
    cols.forEach(function (c) { c.widthPct = Math.max(1, c.widthPct) / total * 100; });
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
    // Schüco Living Variant defaults: 85mm visible frame, 120mm depth
    var frameMM = numberOr(isSliding ? slidingProfile.outerFrameMM : profile.frameMM, numberOr(profile.frameMM, 85));
    var sashMM  = numberOr(isSliding ? slidingProfile.sashMM : profile.sashMM, numberOr(profile.sashMM, 68));
    var mullionMM = numberOr(profile.mullionMM, 60);
    var transomMM = numberOr(profile.transomMM, 60);
    var profileSystem = String(options.profileSystem || source.profileSystem || "living_variant");
    var profileShape  = String(options.profileShape  || source.profileShape  || "15deg");
    var contourAngle  = profileShape === "straight" ? 0 : (profileShape === "6deg" ? 6 : 15);
    var depthMM     = numberOr(profile.depthMM,     profileSystem === "living_variant" ? 120 : 82);
    var sashDepthMM = numberOr(profile.sashDepthMM, profileSystem === "living_variant" ?  80 : 70);
    var srcPanels = Array.isArray(source.doorPanels) ? source.doorPanels : null;
    var doorPanels3d = null;
    if (srcPanels && srcPanels.length) {
      var dpSum = srcPanels.reduce(function(s,p){ return s + Math.max(0, numberOr(p.heightPct,0)); }, 0) || 100;
      doorPanels3d = srcPanels.map(function(p) {
        return {
          heightPct: Math.max(0.5, numberOr(p.heightPct, 100/srcPanels.length)) / dpSum * 100,
          fill: p.fill === 'glass' ? 'glass' : 'panel',
          glassPack: String(p.glassPack || 'HR++'),
          glassFinish: String(p.glassFinish || 'clear')
        };
      });
    }
    return {
      type: type,
      widthMM:  clamp(source.widthMM,  300, 14000),
      heightMM: clamp(source.heightMM, 300, 14000),
      profile: {
        frameMM: clamp(frameMM, 25, 220), sashMM: clamp(sashMM, 20, 200),
        mullionMM: clamp(mullionMM, 15, 180), transomMM: clamp(transomMM, 15, 180),
        depthMM: clamp(depthMM, 70, 180), sashDepthMM: clamp(sashDepthMM, 60, 140),
        system: profileSystem, shape: profileShape, contourAngle: contourAngle,
        hvl: profileSystem === "living_variant", gasketCount: 2
      },
      color: colorFrom(source),
      columns: normalizeColumns(source, type),
      doorPanels: doorPanels3d
    };
  }

  // ─── colour helpers ─────────────────────────────────────────────────────────

  function hexToRgb(hex) {
    hex = String(hex || "#64748b");
    if (hex.indexOf("rgb") === 0) {
      var m = hex.match(/\d+(\.\d+)?/g) || [];
      return { r: clamp(Number(m[0]||100),0,255), g: clamp(Number(m[1]||116),0,255), b: clamp(Number(m[2]||139),0,255) };
    }
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function(c){return c+c;}).join("");
    var n = parseInt(hex, 16);
    return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
  }

  function shade(hex, factor) {
    var c = hexToRgb(hex);
    var mix = factor >= 1 ? 255 : 0;
    var amt = Math.abs(factor - 1);
    return "rgb("+clamp(Math.round(c.r+(mix-c.r)*amt),0,255)+","+clamp(Math.round(c.g+(mix-c.g)*amt),0,255)+","+clamp(Math.round(c.b+(mix-c.b)*amt),0,255)+")";
  }

  function isLight(hex) {
    var c = hexToRgb(hex);
    return (0.299*c.r + 0.587*c.g + 0.114*c.b) > 140;
  }

  // ─── 3D scene primitives ─────────────────────────────────────────────────────

  function rectPoints(x1, y1, x2, y2, z) {
    return [{x:x1,y:y1,z:z},{x:x2,y:y1,z:z},{x:x2,y:y2,z:z},{x:x1,y:y2,z:z}];
  }

  function addFace(scene, points, color, alpha, stroke, weight) {
    scene.faces.push({ points: points, color: color, alpha: alpha==null?1:alpha, stroke: stroke||"rgba(15,23,42,.14)", weight: weight||1 });
    points.forEach(function(p){
      scene.minX = Math.min(scene.minX,p.x); scene.maxX = Math.max(scene.maxX,p.x);
      scene.minY = Math.min(scene.minY,p.y); scene.maxY = Math.max(scene.maxY,p.y);
    });
  }

  function addLine(scene, points, color, width, alpha) {
    scene.lines.push({ points: points, color: color||"rgba(15,23,42,.7)", width: width||1.5, alpha: alpha==null?1:alpha });
  }

  // Schüco Living profile groove — single clean inset line, no clutter
  function addProfileGroove(scene, x1, y1, x2, y2, z, color) {
    if (x2 <= x1 || y2 <= y1) return;
    var inset = Math.max(10, Math.min(18, Math.min(x2-x1, y2-y1) * 0.14));
    var hi = "rgba(255,255,255,.42)";
    var lo = "rgba(15,23,42,.22)";
    // bottom highlight / top shadow — typical chamfer look
    addLine(scene, [{x:x1+inset,y:y2-inset,z:z},{x:x2-inset,y:y2-inset,z:z}], hi, 1.1, .75);
    addLine(scene, [{x:x1+inset,y:y1+inset,z:z},{x:x2-inset,y:y1+inset,z:z}], lo, 1.1, .65);
    addLine(scene, [{x:x1+inset,y:y1+inset,z:z},{x:x1+inset,y:y2-inset,z:z}], hi, 0.9, .60);
    addLine(scene, [{x:x2-inset,y:y1+inset,z:z},{x:x2-inset,y:y2-inset,z:z}], lo, 0.9, .58);
  }

  // Corner seam lines (weld/mitre joints visible on PVC profile)
  function addCornerJoints(scene, x1, y1, x2, y2, rail, z) {
    rail = Math.max(14, rail || 38);
    var seam = "rgba(15,23,42,.28)";
    var hi   = "rgba(255,255,255,.26)";
    [[x1+rail,y2,x1+rail,y2-rail],[x2-rail,y2,x2-rail,y2-rail],
     [x1+rail,y1,x1+rail,y1+rail],[x2-rail,y1,x2-rail,y1+rail]].forEach(function(seg){
      addLine(scene,[{x:seg[0],y:seg[1],z:z},{x:seg[2],y:seg[3],z:z}], seam, 1.4, .72);
    });
    addLine(scene,[{x:x1+8,y:y2-rail+5,z:z+.2},{x:x1+rail-8,y:y2-rail+5,z:z+.2}],hi,0.8,.48);
    addLine(scene,[{x:x2-rail+8,y:y2-rail+5,z:z+.2},{x:x2-8,y:y2-rail+5,z:z+.2}],hi,0.8,.48);
  }

  // Gasket (rubber seal strip between frame and sash)
  function addGasket(scene, x1, y1, x2, y2, z) {
    addLine(scene, [{x:x1,y:y1,z:z},{x:x2,y:y1,z:z},{x:x2,y:y2,z:z},{x:x1,y:y2,z:z},{x:x1,y:y1,z:z}], "rgba(10,14,18,.88)", 3.2, .94);
  }

  function addGlassPocket(scene, x1, y1, x2, y2, z1, z2, color) {
    if (x2 <= x1 || y2 <= y1) return;
    var pocket = clamp(Math.min(x2-x1,y2-y1)*.07, 6, 20);
    addBox(scene, x1-pocket,y1-pocket,x2+pocket,y1, z1,z2, shade(color,.76), {alpha:.55, stroke:"rgba(15,23,42,.12)"});
    addBox(scene, x1-pocket,y2,x2+pocket,y2+pocket, z1,z2, shade(color,1.10), {alpha:.60, stroke:"rgba(15,23,42,.10)"});
    addBox(scene, x1-pocket,y1,x1,y2, z1,z2, shade(color,.86), {alpha:.55, stroke:"rgba(15,23,42,.10)"});
    addBox(scene, x2,y1,x2+pocket,y2, z1,z2, shade(color,.70), {alpha:.55, stroke:"rgba(15,23,42,.10)"});
  }

  function glassLayerCount(pack) {
    var p = String(pack||"").toLowerCase();
    if (/triple|hr\+\+\+|trippel/.test(p)) return 3;
    return 2;
  }

  // Glass unit — insulating glass with spacer bars and sky reflection
  function addGlassUnit(scene, x1, y1, x2, y2, zCenter, row) {
    var layers  = glassLayerCount(row.glassPack);
    var spacing = layers === 3 ? 14 : 18;   // mm between pane faces
    var isSatin = row.glassFinish === "satinato";
    var glassBase = isSatin ? "#cfdce6" : "#8fcce8";

    // Outdoor pane (highest z in the unit = closest to viewer)
    var zOuter = zCenter + spacing * (layers - 1) * 0.5;
    var zInner = zCenter - spacing * (layers - 1) * 0.5;

    for (var i = 0; i < layers; i++) {
      var z = zInner + i * spacing;
      // outdoor pane slightly more opaque, inner panes more transparent
      var a = (i === layers - 1) ? .40 : .22;
      addFace(scene, rectPoints(x1,y1,x2,y2,z), glassBase, a, "rgba(96,165,250,.22)");
      addLine(scene,[{x:x1,y:y2,z:z+.2},{x:x2,y:y2,z:z+.2}],"rgba(255,255,255,.48)",0.9,.76);
      addLine(scene,[{x:x2,y:y1,z:z+.2},{x:x2,y:y2,z:z+.2}],"rgba(15,23,42,.14)",0.7,.50);
    }

    // Aluminium spacer bar lines visible on the right and top edges (IGU edge)
    var spacerColor = "rgba(30,41,59,.36)";
    if (layers >= 2) {
      addLine(scene,[{x:x2+4,y:y1,z:zInner},{x:x2+4,y:y1,z:zOuter},{x:x2+4,y:y2,z:zOuter},{x:x2+4,y:y2,z:zInner}], spacerColor, 1.2, .65);
      addLine(scene,[{x:x1,y:y2+4,z:zInner},{x:x1,y:y2+4,z:zOuter},{x:x2,y:y2+4,z:zOuter},{x:x2,y:y2+4,z:zInner}], spacerColor, 1.2, .58);
    }

    // Sky reflection diagonal stripe on the outdoor pane
    addFace(scene, [
      {x:x1+Math.max(10,(x2-x1)*.07), y:y2-Math.max(10,(y2-y1)*.07), z:zOuter+1},
      {x:x1+Math.max(28,(x2-x1)*.20), y:y2-Math.max(10,(y2-y1)*.07), z:zOuter+1},
      {x:x1+Math.max(12,(x2-x1)*.09), y:y2-Math.max(50,(y2-y1)*.52), z:zOuter+1},
      {x:x1+Math.max(2,  (x2-x1)*.01), y:y2-Math.max(50,(y2-y1)*.52), z:zOuter+1}
    ], "#cee8ff", .30, "transparent");
  }

  // Tilt-turn / handle (suppressed in house mode)
  function addHandle(scene, x1, y1, x2, y2, row, z, scale) {
    var p = row.paneType;
    if (["draai","kiep","draaikiep","deur"].indexOf(p) < 0) return;
    scale = scale || 1;
    var cy = (y1+y2)/2;
    var handleX = row.hinge === "right" ? x1+28*scale : x2-28*scale;
    var knobW = 11*scale, baseH = 82*scale, lever = 58*scale;
    // backplate
    addBox(scene, handleX-knobW/2, cy-baseH/2, handleX+knobW/2, cy+baseH/2, z, z+14*scale, "#1a1f2a", {alpha:.96, stroke:"rgba(0,0,0,.3)"});
    // lever
    var dir = row.hinge === "right" ? 1 : -1;
    addBox(scene, handleX-knobW/2, cy-7*scale, handleX+dir*lever, cy+7*scale, z+10*scale, z+24*scale, "#232840", {alpha:.96, stroke:"rgba(0,0,0,.26)"});
  }

  function addBox(scene, x1, y1, x2, y2, z1, z2, color, options) {
    options = options || {};
    if (x2<=x1||y2<=y1||z2<=z1) return;
    var alpha  = options.alpha  == null ? 1 : options.alpha;
    var stroke = options.stroke || "rgba(15,23,42,.18)";
    // face brightness based on light direction (top-left-front)
    addFace(scene, rectPoints(x1,y1,x2,y2,z2), shade(color,1.08), alpha, stroke);        // front (brightest)
    addFace(scene, rectPoints(x2,y1,x1,y2,z1), shade(color,.68),  alpha, stroke);        // back
    addFace(scene, [{x:x1,y:y1,z:z1},{x:x1,y:y1,z:z2},{x:x1,y:y2,z:z2},{x:x1,y:y2,z:z1}], shade(color,.84), alpha, stroke); // left
    addFace(scene, [{x:x2,y:y1,z:z2},{x:x2,y:y1,z:z1},{x:x2,y:y2,z:z1},{x:x2,y:y2,z:z2}], shade(color,.92), alpha, stroke); // right
    addFace(scene, [{x:x1,y:y2,z:z2},{x:x2,y:y2,z:z2},{x:x2,y:y2,z:z1},{x:x1,y:y2,z:z1}], shade(color,1.18), alpha, stroke); // top (lit)
    addFace(scene, [{x:x1,y:y1,z:z1},{x:x2,y:y1,z:z1},{x:x2,y:y1,z:z2},{x:x1,y:y1,z:z2}], shade(color,.55),  alpha, stroke); // bottom (shadow)
  }

  // Chamfered edge strip (the 15° angled Schüco Living Variant face)
  // Adds an angled transition face between zInner (flat frame face) and zOuter (outer wall plane)
  function addChamferFace(scene, x1, y1, x2, y2, zOuter, zInner, chamferW, color) {
    var c = shade(color, 1.14); // angled face catches more light
    var a = "rgba(15,23,42,.12)";
    // top chamfer: frame top outer edge → inner
    addFace(scene, [
      {x:x1,y:y2,z:zOuter},{x:x2,y:y2,z:zOuter},
      {x:x2-chamferW,y:y2-chamferW,z:zInner},{x:x1+chamferW,y:y2-chamferW,z:zInner}
    ], c, 1, a);
    // bottom chamfer
    addFace(scene, [
      {x:x1+chamferW,y:y1+chamferW,z:zInner},{x:x2-chamferW,y:y1+chamferW,z:zInner},
      {x:x2,y:y1,z:zOuter},{x:x1,y:y1,z:zOuter}
    ], shade(color,.58), 1, a);
    // left chamfer
    addFace(scene, [
      {x:x1,y:y1,z:zOuter},{x:x1,y:y2,z:zOuter},
      {x:x1+chamferW,y:y2-chamferW,z:zInner},{x:x1+chamferW,y:y1+chamferW,z:zInner}
    ], shade(color,.90), 1, a);
    // right chamfer
    addFace(scene, [
      {x:x2-chamferW,y:y1+chamferW,z:zInner},{x:x2-chamferW,y:y2-chamferW,z:zInner},
      {x:x2,y:y2,z:zOuter},{x:x2,y:y1,z:zOuter}
    ], shade(color,.82), 1, a);
  }

  // Simple wall scene for 3D mode
  function addHouse(scene, model, depth) {
    var w = model.widthMM, h = model.heightMM;
    var wallW = Math.max(w*1.80, w+900);
    var wallH = Math.max(h*1.35, h+640);
    var wallBottom = -h/2 - Math.max(260, h*.18);
    var wallTop    = wallBottom + wallH;
    var z = -depth*1.3;
    var roofPeak = wallTop + Math.max(320, wallH*.28);

    // wall (render/plaster — light warm grey)
    addFace(scene, rectPoints(-wallW/2, wallBottom, wallW/2, wallTop, z), "#ddd6cc", 1, "rgba(90,75,58,.22)");
    // roof
    addFace(scene, [
      {x:-wallW/2-90,y:wallTop,z:z-20},{x:0,y:roofPeak,z:z-20},{x:wallW/2+90,y:wallTop,z:z-20}
    ], "#8a3830", 1, "rgba(80,22,18,.28)");
    // dark opening behind frame
    addFace(scene, rectPoints(-w/2-90, -h/2-90, w/2+90, h/2+90, z+2), "#1e2330", .82, "rgba(15,23,42,.22)");
    // ground strip
    addFace(scene, rectPoints(-wallW*.65, wallBottom-14, wallW*.65, wallBottom-180, z+90), "#8fa38f", .92, "rgba(15,23,42,.14)");
    // horizontal brick courses
    var brickStep = Math.max(150, Math.round(h/7));
    for (var yb = wallBottom+brickStep; yb < wallTop-10; yb += brickStep) {
      addLine(scene,[{x:-wallW/2,y:yb,z:z+2},{x:wallW/2,y:yb,z:z+2}],"rgba(120,100,78,.18)",0.9,.72);
    }
    // windowsill (stone, projects from wall)
    var sillH = Math.max(48, h*.038);
    var sillW = w + 120;
    addBox(scene, -sillW/2, -h/2-sillH, sillW/2, -h/2, z, z+depth*.42, "#ccc8c0", {alpha:1,stroke:"rgba(60,55,48,.2)"});
  }

  function addPaneDetails(scene, cell, row, depth, colors) {
    var x1=cell.x1, x2=cell.x2, y1=cell.y1, y2=cell.y2;
    var p = row.paneType;
    var cx=(x1+x2)/2, cy=(y1+y2)/2;
    var z = depth/2 + 20;
    if (p==="draai"||p==="draaikiep"||p==="deur") {
      var hx = row.hinge==="right" ? x2 : x1;
      var tx = row.hinge==="right" ? x1 : x2;
      addLine(scene,[{x:hx,y:y2,z:z},{x:tx,y:cy,z:z},{x:hx,y:y1,z:z}], colors.motion, 2.2, .92);
    }
    if (p==="kiep"||p==="draaikiep") {
      addLine(scene,[{x:x1,y:y1,z:z+2},{x:cx,y:y2,z:z+2},{x:x2,y:y1,z:z+2}], colors.motion, 2.0, .78);
    }
    if (p==="schuif") {
      var dir2 = row.hinge==="right" ? -1 : 1;
      var head = row.hinge==="right" ? x2-48 : x1+48;
      addLine(scene,[{x:x1+40,y:cy,z:z+4},{x:x2-40,y:cy,z:z+4}], colors.motion, 2.2, .88);
      addLine(scene,[{x:head,y:cy-24,z:z+4},{x:head+dir2*36,y:cy,z:z+4},{x:head,y:cy+24,z:z+4}], colors.motion, 2.2, .88);
    }
    if (p==="vast") {
      var s = Math.min(x2-x1, y2-y1)*.11;
      addLine(scene,[{x:cx-s,y:cy,z:z},{x:cx+s,y:cy,z:z}],"rgba(30,41,59,.38)",1.4,.75);
      addLine(scene,[{x:cx,y:cy-s,z:z},{x:cx,y:cy+s,z:z}],"rgba(30,41,59,.38)",1.4,.75);
    }
  }

  // ─── Door panel sections helper ─────────────────────────────────────────────

  function renderDoorPanelsInArea(scene, x1, y1, x2, y2, panels, zGlassCtr, zSashBack, zSashFront, color) {
    // panels ordered top→bottom; y increases upward in 3D so panels[0] = highest y
    var totalH = y2 - y1;
    var yTop   = y2;
    for (var pi = 0; pi < panels.length; pi++) {
      var panel = panels[pi];
      var panH  = totalH * panel.heightPct / 100;
      var panY2 = yTop;
      var panY1 = pi === panels.length - 1 ? y1 : yTop - panH;
      if (panY1 >= panY2) { yTop = panY1; continue; }

      if (pi > 0) {
        addLine(scene,[{x:x1,y:panY2,z:zSashFront},{x:x2,y:panY2,z:zSashFront}],"rgba(15,23,42,.44)",1.8,.90);
      }

      if (panel.fill === 'glass') {
        addGlassPocket(scene, x1,panY1,x2,panY2, zGlassCtr-14, zGlassCtr+14, color);
        addGlassUnit(scene, x1, panY1, x2, panY2, zGlassCtr, {glassPack:panel.glassPack, glassFinish:panel.glassFinish});
      } else {
        var inset2 = Math.max(8, Math.min((panY2-panY1)*.10, (x2-x1)*.07));
        addBox(scene, x1, panY1, x2, panY2, zSashBack+4, zSashFront-2, shade(color,1.16), {alpha:.96, stroke:"rgba(15,23,42,.16)"});
        if ((panY2-panY1) > 36 && (x2-x1) > 36) {
          addProfileGroove(scene, x1+inset2, panY1+inset2, x2-inset2, panY2-inset2, zSashFront, color);
        }
      }
      yTop = panY1;
    }
  }

  // ─── Main scene builder ──────────────────────────────────────────────────────

  function buildScene(model, mode) {
    var scene = { faces:[], lines:[], minX:Infinity, maxX:-Infinity, minY:Infinity, maxY:-Infinity };
    var w = model.widthMM, h = model.heightMM;
    var p = model.profile;
    var frame = Math.min(p.frameMM, w*.20, h*.20);
    var sash  = Math.min(p.sashMM,  w*.13, h*.13);
    var mull  = Math.min(p.mullionMM, w*.18);
    var trans = Math.min(p.transomMM, h*.18);
    var depth     = clamp(p.depthMM     || 120, 80, 180);
    var sashDepth = clamp(p.sashDepthMM ||  80, 40, depth - 20);
    var chamferW  = frame * .18;

    // z convention: zFront = OUTDOOR face (highest z, closest to viewer from outside)
    //               zBack  = INDOOR  face (lowest  z, away from viewer)
    var zFront = depth/2;
    var zBack  = -depth/2;
    var zChamfer = zFront + 2;  // just in front of outdoor face for painter's sort

    // Sash recessed from outdoor face — correct Schüco behavior, sash sits inside frame
    var sashRecess = Math.max(8, depth * 0.09);
    var zSashFront = zFront - sashRecess;                           // sash outdoor face (z2 in addBox)
    var zSashBack  = Math.max(zBack + 6, zSashFront - sashDepth);  // sash indoor  face (z1 in addBox)
    var zGlassCtr  = (zSashFront + zSashBack) * 0.5;               // glass unit center

    var color  = model.color;
    var colors = { motion: "#e11d48" };
    var isHouse   = mode === "house";
    var isSliding = model.type === "schuifpui" || model.type === "hefschuif";
    var showHandles = !isHouse;

    if (isHouse) addHouse(scene, model, depth);

    // ── Outer frame ──────────────────────────────────────────────────────────
    addBox(scene, -w/2,-h/2, -w/2+frame, h/2, zBack,zFront, color);
    addBox(scene,  w/2-frame,-h/2,  w/2, h/2, zBack,zFront, color);
    addBox(scene, -w/2, h/2-frame,  w/2, h/2, zBack,zFront, color);
    addBox(scene, -w/2,-h/2,  w/2,-h/2+frame, zBack,zFront, color);

    // Schüco Living Variant: chamfer on outdoor face
    addChamferFace(scene, -w/2,-h/2, w/2,h/2, zFront, zFront-chamferW*2, chamferW, shade(color,1.04));
    addProfileGroove(scene, -w/2,-h/2, w/2,h/2, zChamfer, color);
    addCornerJoints(scene, -w/2,-h/2, w/2,h/2, frame, zChamfer+1);

    // Schuifpui: horizontal track rails instead of vertical mullion
    if (isSliding) {
      var railH = Math.max(10, frame * 0.16);
      addBox(scene, -w/2+frame, -h/2+frame, w/2-frame, -h/2+frame+railH, zBack, zFront, shade(color,.84));
      addBox(scene, -w/2+frame,  h/2-frame-railH, w/2-frame,  h/2-frame, zBack, zFront, shade(color,.90));
    }

    // ── Inner area (columns / rows) ──────────────────────────────────────────
    var innerX1 = -w/2+frame, innerX2 = w/2-frame;
    var innerY1 = -h/2+frame, innerY2 = h/2-frame;
    var innerW  = Math.max(1, innerX2-innerX1);
    var innerH  = Math.max(1, innerY2-innerY1);

    var x = innerX1;
    model.columns.forEach(function (col, colIndex) {
      var colW   = innerW * col.widthPct/100;
      var cellX1 = x;
      var cellX2 = x + colW;

      if (colIndex > 0) {
        if (isSliding) {
          // Schuifpui: slim track divider line, no structural mullion
          addLine(scene,[{x:x,y:innerY1,z:zSashFront+2},{x:x,y:innerY2,z:zSashFront+2}],"rgba(15,23,42,.28)",1.2,.72);
        } else {
          addBox(scene, x-mull/2,innerY1, x+mull/2,innerY2, zBack,zFront, color);
          addProfileGroove(scene, x-mull/2,innerY1, x+mull/2,innerY2, zChamfer+1, color);
          cellX1 += mull/2;
        }
      }
      if (colIndex < model.columns.length-1 && !isSliding) cellX2 -= mull/2;

      var yTop = innerY2;
      col.rows.forEach(function (row, rowIndex) {
        var rowH = innerH * row.heightPct/100;
        var y2   = yTop;
        var y1   = yTop - rowH;

        if (rowIndex > 0) {
          addBox(scene, cellX1,y2-trans/2, cellX2,y2+trans/2, zBack,zFront, color);
          addProfileGroove(scene, cellX1,y2-trans/2, cellX2,y2+trans/2, zChamfer+1, color);
          y2 -= trans/2;
        }
        if (rowIndex < col.rows.length-1) y1 += trans/2;

        var isDoor2  = row.paneType === "deur2";
        var openable = ["draai","kiep","draaikiep","deur","deur2","schuif"].indexOf(row.paneType) >= 0;
        // Vast panels in a schuifpui also show a visible sash frame (both tracks)
        var drawSash = openable || (row.paneType === "vast" && isSliding);
        var isPanel  = row.fill === "panel" || row.paneType === "deur" || isDoor2;

        var paneInset = drawSash ? Math.max(4,Math.min(18,sash*.10)) : Math.max(8,Math.min(28,sash*.16));
        var sashBar   = drawSash ? Math.max(18,Math.min(60,sash*.42)) : Math.max(8,Math.min(24,sash*.16));

        // ── Sash frame ────────────────────────────────────────────────────
        var sx1, sx2, sy1, sy2;
        if (drawSash) {
          sx1 = cellX1 + paneInset * .32;
          sx2 = cellX2 - paneInset * .32;
          sy1 = y1     + paneInset * .32;
          sy2 = y2     - paneInset * .32;

          if (isDoor2) {
            var seamX = (sx1 + sx2) / 2;
            // Shared top and bottom rails
            addBox(scene, sx1,sy2-sashBar,sx2,sy2, zSashBack,zSashFront, color);
            addBox(scene, sx1,sy1,sx2,sy1+sashBar, zSashBack,zSashFront, color);
            // Left leaf stiles
            addBox(scene, sx1,sy1,sx1+sashBar,sy2, zSashBack,zSashFront, color);
            addBox(scene, seamX-sashBar*.5,sy1, seamX+sashBar*.5,sy2, zSashBack,zSashFront, color);
            // Right leaf outer stile
            addBox(scene, sx2-sashBar,sy1,sx2,sy2, zSashBack,zSashFront, color);
            // Center seam detail
            addLine(scene,[{x:seamX,y:sy1,z:zSashFront+1},{x:seamX,y:sy2,z:zSashFront+1}],"rgba(15,23,42,.38)",1.4,.88);
            addGasket(scene, sx1,sy1,sx2,sy2, zSashFront);
            // Opening arrows for each leaf
            addLine(scene,[{x:sx1,y:sy2,z:zGlassCtr},{x:sx1*0.35+seamX*0.65,y:(sy1+sy2)/2,z:zGlassCtr},{x:sx1,y:sy1,z:zGlassCtr}], colors.motion, 2, .85);
            addLine(scene,[{x:sx2,y:sy2,z:zGlassCtr},{x:sx2*0.35+seamX*0.65,y:(sy1+sy2)/2,z:zGlassCtr},{x:sx2,y:sy1,z:zGlassCtr}], colors.motion, 2, .85);
          } else if (row.paneType === "schuif") {
            // Sliding panel: offset in z to suggest separate track (slightly in front)
            var szF = zSashFront + 7, szB = zSashBack + 7;
            addBox(scene, sx1,sy1,sx2,sy1+sashBar, szB,szF, color);
            addBox(scene, sx1,sy2-sashBar,sx2,sy2, szB,szF, color);
            addBox(scene, sx1,sy1,sx1+sashBar,sy2, szB,szF, color);
            addBox(scene, sx2-sashBar,sy1,sx2,sy2, szB,szF, color);
            addProfileGroove(scene, sx1,sy1,sx2,sy2, szF+2, color);
            addGasket(scene, sx1,sy1,sx2,sy2, szF);
          } else {
            // Standard sash (draai, kiep, draaikiep, deur, vast in schuifpui)
            addBox(scene, sx1,sy1,sx2,sy1+sashBar, zSashBack,zSashFront, color);
            addBox(scene, sx1,sy2-sashBar,sx2,sy2, zSashBack,zSashFront, color);
            addBox(scene, sx1,sy1,sx1+sashBar,sy2, zSashBack,zSashFront, color);
            addBox(scene, sx2-sashBar,sy1,sx2,sy2, zSashBack,zSashFront, color);
            addProfileGroove(scene, sx1,sy1,sx2,sy2, zSashFront+2, color);
            addCornerJoints(scene, sx1,sy1,sx2,sy2, sashBar, zSashFront+3);
            addGasket(scene, sx1,sy1,sx2,sy2, zSashFront);
          }
        }

        // ── Glass / panel area ────────────────────────────────────────────
        var px1, px2, py1, py2;
        if (drawSash) {
          var ob = sashBar * .85;
          px1 = cellX1 + paneInset*.32 + ob; px2 = cellX2 - paneInset*.32 - ob;
          py1 = y1     + paneInset*.32 + ob; py2 = y2     - paneInset*.32 - ob;
        } else {
          px1 = cellX1 + paneInset; px2 = cellX2 - paneInset;
          py1 = y1     + paneInset; py2 = y2     - paneInset;
        }

        if (px2 <= px1 || py2 <= py1) { yTop -= rowH; return; }

        var doorPanels = model.doorPanels;
        var usePanels  = isPanel && doorPanels && doorPanels.length > 0;

        if (isDoor2) {
          // Double door: split glass/panel area into two leaves
          var leafMidX = (px1 + px2) / 2;
          var leafGap  = Math.max(1, sashBar * 0.10);
          var sides    = [[px1, leafMidX - leafGap], [leafMidX + leafGap, px2]];
          sides.forEach(function(side) {
            var lx1 = side[0], lx2 = side[1];
            if (lx2 <= lx1) return;
            if (usePanels) {
              renderDoorPanelsInArea(scene, lx1, py1, lx2, py2, doorPanels, zGlassCtr, zSashBack, zSashFront, color);
            } else if (isPanel) {
              addBox(scene, lx1,py1,lx2,py2, zSashBack+4,zSashFront-2, shade(color,1.18), {alpha:.97,stroke:"rgba(15,23,42,.16)"});
              addProfileGroove(scene, lx1+10,py1+8,lx2-10,py2-8, zSashFront, color);
            } else {
              addGlassPocket(scene, lx1,py1,lx2,py2, zGlassCtr-14, zGlassCtr+14, color);
              addGlassUnit(scene, lx1, py1, lx2, py2, zGlassCtr, row);
            }
          });
          // Handles for double door
          if (showHandles) {
            var lRow = { paneType:"deur", hinge:"left",  glassPack:row.glassPack, glassFinish:row.glassFinish };
            var rRow = { paneType:"deur", hinge:"right", glassPack:row.glassPack, glassFinish:row.glassFinish };
            var lx2h = leafMidX - leafGap;
            var rx1h = leafMidX + leafGap;
            addHandle(scene, px1, py1, lx2h, py2, lRow, zSashFront+2, 0.85);
            addHandle(scene, rx1h, py1, px2, py2, rRow, zSashFront+2, 0.85);
          }
        } else if (usePanels) {
          renderDoorPanelsInArea(scene, px1, py1, px2, py2, doorPanels, zGlassCtr, zSashBack, zSashFront, color);
          if (showHandles) addHandle(scene, px1,py1,px2,py2, row, zSashFront+2, 1);
        } else if (isPanel) {
          addGasket(scene, px1,py1,px2,py2, zSashFront-1);
          addBox(scene, px1,py1,px2,py2, zSashBack+4,zSashFront-2, shade(color,1.18), {alpha:.97,stroke:"rgba(15,23,42,.18)"});
          addProfileGroove(scene, px1+12,py1+10,px2-12,py2-10, zSashFront, color);
          if (showHandles) addHandle(scene, px1,py1,px2,py2, row, zSashFront+2, 1);
        } else {
          // Glass
          addGasket(scene, px1,py1,px2,py2, zGlassCtr+16);
          addGlassPocket(scene, px1,py1,px2,py2, zGlassCtr-14, zGlassCtr+14, color);
          addGlassUnit(scene, px1, py1, px2, py2, zGlassCtr, row);
          addPaneDetails(scene, {x1:px1,x2:px2,y1:py1,y2:py2}, row, depth, colors);
          if (showHandles) addHandle(scene, px1,py1,px2,py2, row, zSashFront+2, 1);
        }

        yTop -= rowH;
      });
      x += colW;
    });

    if (!Number.isFinite(scene.minX)) {
      scene.minX = -w/2; scene.maxX = w/2;
      scene.minY = -h/2; scene.maxY = h/2;
    }
    return scene;
  }

  // ─── Projection & painter's-sort ────────────────────────────────────────────

  function avgZ(points, project) {
    var sum = 0;
    for (var i = 0; i < points.length; i++) sum += project(points[i]).z;
    return sum / points.length;
  }

  // ─── House / photo-placement mode (2D canvas render) ────────────────────────

  function drawCoverImage(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth||img.width||1, ih = img.naturalHeight||img.height||1;
    var scale = Math.max(w/iw, h/ih);
    var sw = w/scale, sh = h/scale;
    ctx.drawImage(img, (iw-sw)/2,(ih-sh)/2,sw,sh, x,y,w,h);
  }

  // Photorealistic house facade backdrop (when no photo is uploaded)
  function drawPhotoBackdrop(ctx, w, h, image) {
    if (image && image.complete && image.naturalWidth) {
      drawCoverImage(ctx, image, 0, 0, w, h);
      ctx.fillStyle = "rgba(10,18,30,.05)";
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // ── Sky ──────────────────────────────────────────────────────────────────
    var skyH = h * .28;
    var sky = ctx.createLinearGradient(0, 0, 0, skyH);
    sky.addColorStop(0,   "#4a90d9");
    sky.addColorStop(.55, "#7bbae8");
    sky.addColorStop(1,   "#b8d8f0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, skyH);

    // Few soft clouds
    ctx.save();
    ctx.globalAlpha = .78;
    [[w*.12,skyH*.35,90,26],[w*.44,skyH*.22,130,30],[w*.72,skyH*.48,80,22]].forEach(function(c){
      var cg = ctx.createRadialGradient(c[0],c[1],2,c[0],c[1],c[2]);
      cg.addColorStop(0,"rgba(255,255,255,.88)"); cg.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(c[0],c[1],c[2],c[3],0,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // ── Wall (white render/stucco) ───────────────────────────────────────────
    var wallTop    = h * .22;
    var wallBottom = h * .80;
    var wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallBottom);
    wallGrad.addColorStop(0,   "#f0ece6");
    wallGrad.addColorStop(.50, "#ece6de");
    wallGrad.addColorStop(1,   "#ddd8cf");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, wallTop, w, wallBottom - wallTop);

    // Subtle horizontal render lines (texture)
    ctx.save();
    ctx.strokeStyle = "rgba(190,180,168,.22)";
    ctx.lineWidth = 0.8;
    var lineStep = Math.max(18, h * .032);
    for (var yl = wallTop + lineStep; yl < wallBottom; yl += lineStep) {
      ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(w, yl); ctx.stroke();
    }
    ctx.restore();

    // Subtle noise grain for render texture
    ctx.save();
    ctx.globalAlpha = .048;
    ctx.fillStyle = "#7a6e60";
    for (var gi = 0; gi < 1800; gi++) {
      var nx = (gi*73) % w;
      var ny = wallTop + ((gi*151) % (wallBottom-wallTop));
      ctx.fillRect(nx, ny, 1, 1);
    }
    ctx.restore();

    // ── Fascia / cornice ─────────────────────────────────────────────────────
    var fascia = ctx.createLinearGradient(0, wallTop-22, 0, wallTop+10);
    fascia.addColorStop(0, "#d8d2ca"); fascia.addColorStop(1, "#ece6de");
    ctx.fillStyle = fascia;
    ctx.fillRect(0, wallTop-22, w, 32);
    ctx.strokeStyle = "rgba(140,130,118,.32)"; ctx.lineWidth = 1;
    ctx.strokeRect(0, wallTop-22, w, 32);

    // ── Ground / path ────────────────────────────────────────────────────────
    var groundTop = wallBottom;
    var pathGrad = ctx.createLinearGradient(0, groundTop, 0, h);
    pathGrad.addColorStop(0, "#b8bdb5"); pathGrad.addColorStop(.6,"#9ea59a"); pathGrad.addColorStop(1,"#8a9286");
    ctx.fillStyle = pathGrad;
    ctx.fillRect(0, groundTop, w, h - groundTop);

    // Path tiles
    ctx.save();
    ctx.strokeStyle = "rgba(90,96,88,.18)"; ctx.lineWidth = 1;
    var tileH = Math.max(28, h*.06), tileW = Math.max(80, w*.14);
    for (var ty = groundTop+tileH; ty < h; ty += tileH) {
      ctx.beginPath(); ctx.moveTo(0,ty); ctx.lineTo(w,ty); ctx.stroke();
      var toff = ((Math.round((ty-groundTop)/tileH))%2) * tileW/2;
      for (var tx = -toff; tx < w; tx += tileW) {
        ctx.beginPath(); ctx.moveTo(tx, ty-tileH); ctx.lineTo(tx, ty); ctx.stroke();
      }
    }
    ctx.restore();

    // ── Garden strip (low hedge/shrubs) ───────────────────────────────────────
    var gardenY = groundTop - Math.max(32, h*.06);
    ctx.save();
    ctx.fillStyle = "#3d6b3a";
    for (var si = 0; si < 22; si++) {
      var sx = (si * 97) % w;
      var srad = Math.max(24, (14+si%5)*6);
      var sy2  = gardenY + ((si*17)%28);
      var sg = ctx.createRadialGradient(sx,sy2,2,sx,sy2+srad*.3,srad);
      sg.addColorStop(0,"#5a9455"); sg.addColorStop(.6,"#3d6b3a"); sg.addColorStop(1,"#2a5028");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.ellipse(sx,sy2,srad,srad*.55,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Shadow cast downward from fascia
    var fascShadow = ctx.createLinearGradient(0, wallTop+10, 0, wallTop+55);
    fascShadow.addColorStop(0,"rgba(30,24,18,.14)"); fascShadow.addColorStop(1,"rgba(30,24,18,0)");
    ctx.fillStyle = fascShadow;
    ctx.fillRect(0, wallTop+10, w, 45);
  }

  // Realistic glass for house mode (sky reflection, interior hint)
  function drawGlass(ctx, x, y, w, h, pack) {
    var layers = glassLayerCount(pack);

    // Main glass — slightly blue-green, semi-transparent
    var g = ctx.createLinearGradient(x, y, x+w, y+h);
    g.addColorStop(0,   "rgba(185,220,245,.72)");
    g.addColorStop(.42, "rgba(110,175,215,.38)");
    g.addColorStop(.85, "rgba(210,240,255,.60)");
    g.addColorStop(1,   "rgba(165,205,230,.68)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // Interior (dark room hint through glass)
    var interior = ctx.createLinearGradient(x+w*.12, y+h*.1, x+w*.88, y+h*.9);
    interior.addColorStop(0,   "rgba(30,38,52,.18)");
    interior.addColorStop(.5,  "rgba(20,26,38,.10)");
    interior.addColorStop(1,   "rgba(30,38,52,.18)");
    ctx.fillStyle = interior;
    ctx.fillRect(x+3, y+3, w-6, h-6);

    // Sky reflection stripe (upper-left to lower-right diagonal)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    var rx = x+w*.04, rw = w*.26, rh = h;
    var refl = ctx.createLinearGradient(rx, y, rx+rw, y+rh);
    refl.addColorStop(0,   "rgba(255,255,255,0)");
    refl.addColorStop(.35, "rgba(220,238,252,.52)");
    refl.addColorStop(.65, "rgba(200,228,248,.34)");
    refl.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = refl;
    ctx.beginPath();
    ctx.moveTo(rx, y); ctx.lineTo(rx+rw*.7, y); ctx.lineTo(rx+rw, y+rh); ctx.lineTo(rx+rw*.3, y+rh);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Specular highlight — top-left corner
    var hl = ctx.createLinearGradient(x, y, x+w*.32, y+h*.28);
    hl.addColorStop(0, "rgba(255,255,255,.48)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, w*.32, h*.28);

    // Frame for multi-layer glass (spacer bars from edge)
    ctx.strokeStyle = "rgba(25,35,50,.24)";
    ctx.lineWidth = layers===3 ? 2.5 : 2;
    ctx.strokeRect(x+1, y+1, w-2, h-2);
    if (layers >= 2) {
      ctx.strokeStyle = "rgba(25,35,50,.14)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x+4, y+4, w-8, h-8);
    }
    if (layers === 3) {
      ctx.strokeRect(x+7, y+7, w-14, h-14);
    }
  }

  function drawCanvasGasket(ctx, x, y, w, h, width) {
    ctx.save();
    ctx.strokeStyle = "rgba(8,10,14,.90)";
    ctx.lineWidth = width || 3;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  function drawCanvasCornerJoints(ctx, x, y, w, h, rail) {
    rail = Math.max(8, rail || 22);
    ctx.save();
    ctx.strokeStyle = "rgba(10,14,18,.28)"; ctx.lineWidth = 1.2;
    [[x+rail,y,x+rail,y+rail],[x+w-rail,y,x+w-rail,y+rail],
     [x+rail,y+h,x+rail,y+h-rail],[x+w-rail,y+h,x+w-rail,y+h-rail]].forEach(function(seg){
      ctx.beginPath(); ctx.moveTo(seg[0],seg[1]); ctx.lineTo(seg[2],seg[3]); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,.20)";
    [[x+rail+2,y+rail-4,x+rail*1.8,y+rail-4],[x+w-rail*1.8,y+rail-4,x+w-rail-2,y+rail-4]].forEach(function(seg){
      ctx.beginPath(); ctx.moveTo(seg[0],seg[1]); ctx.lineTo(seg[2],seg[3]); ctx.stroke();
    });
    ctx.restore();
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  // Handle draw — used only in normal 2D view, NOT in house mode
  function drawCanvasHandle(ctx, x, y, w, h, row) {
    if (["draai","kiep","draaikiep","deur"].indexOf(row.paneType) < 0) return;
    var cy = y + h/2;
    var handleX = row.hinge==="right" ? x+20 : x+w-20;
    var dir = row.hinge==="right" ? 1 : -1;
    ctx.save();
    ctx.fillStyle = "#151922"; ctx.strokeStyle = "rgba(255,255,255,.26)"; ctx.lineWidth = 1;
    ctx.beginPath(); roundedRectPath(ctx, handleX-5, cy-28, 10, 56, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); roundedRectPath(ctx, dir>0?handleX-4:handleX-42, cy-6, 46, 12, 5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 2D front-elevation rendering (used for house mode)
  function drawFrontElement(ctx, model, x, y, w, h, isHouseMode) {
    var color  = model.color || "#383e42";
    var light2 = isLight(color);
    var frameRatio = model.profile.frameMM / Math.min(model.widthMM, model.heightMM);
    var frame  = clamp(frameRatio * Math.min(w, h), 14, Math.min(w, h)*.17);
    var mull   = clamp(frame*.72, 8, 30);
    var trans  = clamp(frame*.68, 8, 28);

    ctx.save();

    // ── Drop shadow ──────────────────────────────────────────────────────────
    ctx.shadowColor   = "rgba(10,18,30,.55)";
    ctx.shadowBlur    = isHouseMode ? 42 : 26;
    ctx.shadowOffsetX = isHouseMode ?  6 :  3;
    ctx.shadowOffsetY = isHouseMode ? 16 : 10;
    ctx.fillStyle = "rgba(0,0,0,.01)";
    ctx.fillRect(x-2, y-2, w+4, h+4);
    ctx.shadowColor = "transparent";

    // ── Frame reveal (darker recess behind frame in house mode) ─────────────
    if (isHouseMode) {
      var revW = Math.max(10, frame*.55);
      ctx.fillStyle = "rgba(15,20,28,.52)";
      ctx.fillRect(x-revW, y-revW, w+revW*2, h+revW*2);
    }

    // ── Outer frame body ─────────────────────────────────────────────────────
    // Slight gradient: top-left lighter (light source top-left)
    var frameGrad = ctx.createLinearGradient(x, y, x+w, y+h);
    frameGrad.addColorStop(0,   shade(color, 1.12));
    frameGrad.addColorStop(.55, shade(color, 1.02));
    frameGrad.addColorStop(1,   shade(color, .88));
    ctx.fillStyle = frameGrad;
    ctx.fillRect(x, y, w, h);

    // Corner joints
    drawCanvasCornerJoints(ctx, x, y, w, h, frame);

    // Chamfer highlight line (inner edge of frame — the Schüco Living profile line)
    ctx.strokeStyle = light2 ? "rgba(80,70,60,.18)" : "rgba(255,255,255,.22)";
    ctx.lineWidth = 1.2;
    var ci = frame * .65;
    ctx.strokeRect(x+ci, y+ci, Math.max(1,w-ci*2), Math.max(1,h-ci*2));

    // Opening shadow behind glass
    ctx.fillStyle = "rgba(10,14,20,.22)";
    ctx.fillRect(x+frame, y+frame, Math.max(1,w-frame*2), Math.max(1,h-frame*2));

    // ── Columns / rows ────────────────────────────────────────────────────────
    var ix = x+frame, iy = y+frame, iw2 = w-frame*2, ih2 = h-frame*2;
    var cx = ix;
    model.columns.forEach(function(col, ci2){
      var colW = iw2 * col.widthPct/100;
      var cellX = cx;
      if (ci2 > 0) {
        ctx.fillStyle = shade(color,1.04); ctx.fillRect(cx-mull/2, iy, mull, ih2);
        cellX += mull/2;
      }
      var cellW = colW-(ci2>0?mull/2:0)-(ci2<model.columns.length-1?mull/2:0);
      var rowY  = iy;
      col.rows.forEach(function(row, ri){
        var rowH = ih2 * row.heightPct/100;
        var drawY = rowY;
        if (ri > 0) {
          ctx.fillStyle = shade(color,1.04); ctx.fillRect(cellX, rowY-trans/2, cellW, trans);
          drawY += trans/2;
        }
        var drawH = rowH-(ri>0?trans/2:0)-(ri<col.rows.length-1?trans/2:0);
        var openable = ["draai","kiep","draaikiep","deur","schuif"].indexOf(row.paneType) >= 0;
        var inset    = row.fill==="panel"||row.paneType==="deur" ? Math.max(2,frame*.06) : Math.max(6,frame*.26);

        // Sash frame (openable panels)
        var px = cellX+inset, py = drawY+inset;
        var pw = Math.max(1,cellW-inset*2), ph = Math.max(1,drawH-inset*2);
        if (openable) {
          var si2 = inset*.34;
          var sx = cellX+si2, sy = drawY+si2;
          var sw = Math.max(1,cellW-si2*2), sh = Math.max(1,drawH-si2*2);
          var sashBar = clamp(frame*.44, 7, 22);
          var sashGrad = ctx.createLinearGradient(sx, sy, sx+sw, sy+sh);
          sashGrad.addColorStop(0, shade(color,1.10)); sashGrad.addColorStop(1, shade(color,.94));
          ctx.fillStyle = sashGrad;
          ctx.fillRect(sx,sy,sw,sashBar); ctx.fillRect(sx,sy+sh-sashBar,sw,sashBar);
          ctx.fillRect(sx,sy,sashBar,sh); ctx.fillRect(sx+sw-sashBar,sy,sashBar,sh);
          drawCanvasCornerJoints(ctx, sx,sy,sw,sh, sashBar);
          // Gasket (thin dark line between frame and sash)
          ctx.strokeStyle = "rgba(8,10,14,.84)"; ctx.lineWidth = 2.2;
          ctx.strokeRect(sx, sy, sw, sh);
          px = sx+sashBar*.88; py = sy+sashBar*.88;
          pw = Math.max(1,sw-sashBar*1.76); ph = Math.max(1,sh-sashBar*1.76);
        }

        if (row.fill==="panel" || row.paneType==="deur") {
          drawCanvasGasket(ctx, px-2,py-2,pw+4,ph+4, 2.2);
          var panelGrad = ctx.createLinearGradient(px,py,px+pw,py+ph);
          panelGrad.addColorStop(0,shade(color,1.26)); panelGrad.addColorStop(1,shade(color,1.14));
          ctx.fillStyle = panelGrad; ctx.fillRect(px,py,pw,ph);
          drawCanvasCornerJoints(ctx,px,py,pw,ph, Math.max(10,frame*.42));
          ctx.strokeStyle = light2?"rgba(80,70,60,.16)":"rgba(255,255,255,.18)"; ctx.lineWidth=1;
          ctx.strokeRect(px+8,py+8,Math.max(1,pw-16),Math.max(1,ph-16));
        } else {
          drawCanvasGasket(ctx, px-2,py-2,pw+4,ph+4, 2.2);
          drawGlass(ctx, px, py, pw, ph, row.glassPack);
        }

        // Opening direction arrows (not in house mode)
        if (!isHouseMode) {
          if (["draai","draaikiep","deur"].indexOf(row.paneType) >= 0) {
            ctx.strokeStyle="rgba(220,25,65,.88)"; ctx.lineWidth=1.8; ctx.setLineDash([4,4]);
            var hx2=row.hinge==="right"?px+pw:px, tx2=row.hinge==="right"?px:px+pw;
            ctx.beginPath(); ctx.moveTo(hx2,py); ctx.lineTo(tx2,py+ph/2); ctx.lineTo(hx2,py+ph); ctx.stroke();
            ctx.setLineDash([]);
          }
          if (row.paneType==="kiep"||row.paneType==="draaikiep") {
            ctx.strokeStyle="rgba(220,25,65,.72)"; ctx.lineWidth=1.8;
            ctx.beginPath(); ctx.moveTo(px,py+ph); ctx.lineTo(px+pw/2,py); ctx.lineTo(px+pw,py+ph); ctx.stroke();
          }
          if (row.paneType==="schuif") {
            ctx.strokeStyle="rgba(14,155,215,.88)"; ctx.lineWidth=2.2;
            ctx.beginPath(); ctx.moveTo(px+18,py+ph*.5); ctx.lineTo(px+pw-18,py+ph*.5); ctx.stroke();
          }
          drawCanvasHandle(ctx, px, py, pw, ph, row);
        }
        rowY += rowH;
      });
      cx += colW;
    });

    // ── Windowsill (house mode only) ─────────────────────────────────────────
    if (isHouseMode) {
      var sillH  = Math.max(14, frame*.55);
      var sillOH = Math.max(18, frame*.65);   // overhang beyond frame
      var sillG = ctx.createLinearGradient(0, y+h, 0, y+h+sillH);
      sillG.addColorStop(0, "#e8e4de"); sillG.addColorStop(1, "#c8c4bc");
      ctx.fillStyle = sillG;
      ctx.fillRect(x-sillOH, y+h, w+sillOH*2, sillH);
      ctx.strokeStyle = "rgba(100,92,80,.26)"; ctx.lineWidth=1;
      ctx.strokeRect(x-sillOH, y+h, w+sillOH*2, sillH);
      // Sill top highlight
      ctx.fillStyle = "rgba(255,255,255,.42)";
      ctx.fillRect(x-sillOH, y+h, w+sillOH*2, 3);
      // Sill shadow on wall
      var sillShad = ctx.createLinearGradient(0, y+h+sillH, 0, y+h+sillH+24);
      sillShad.addColorStop(0,"rgba(20,16,12,.24)"); sillShad.addColorStop(1,"rgba(20,16,12,0)");
      ctx.fillStyle = sillShad; ctx.fillRect(x-sillOH, y+h+sillH, w+sillOH*2, 24);
    }

    ctx.restore();
  }

  function drawPhotoOpening(ctx, x, y, w, h) {
    var reveal = Math.max(16, Math.min(w,h)*.09);
    ctx.save();

    // Deep shadow around frame (wall thickness visible)
    ctx.shadowColor = "rgba(2,6,23,.58)";
    ctx.shadowBlur  = 38;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = "rgba(8,12,20,.01)";
    ctx.fillRect(x-reveal, y-reveal, w+reveal*2, h+reveal*2);
    ctx.shadowColor = "transparent";

    // Reveal faces (left/right/top show wall thickness)
    var revealGrad = ctx.createLinearGradient(x-reveal, y, x+w+reveal, y);
    revealGrad.addColorStop(0,   "rgba(240,236,230,.95)");
    revealGrad.addColorStop(.14, "rgba(160,156,152,.90)");
    revealGrad.addColorStop(.5,  "rgba(28,34,44,.92)");
    revealGrad.addColorStop(.86, "rgba(160,156,152,.90)");
    revealGrad.addColorStop(1,   "rgba(240,236,230,.95)");
    ctx.fillStyle = revealGrad;
    ctx.fillRect(x-reveal, y-reveal, w+reveal*2, h+reveal*2);

    // Dark rebate (opening itself)
    ctx.fillStyle = "rgba(8,12,20,.92)";
    ctx.fillRect(x-reveal*.22, y-reveal*.22, w+reveal*.44, h+reveal*.44);

    // Stone sill top (bottom reveal — horizontal, catches light)
    var sillTop = ctx.createLinearGradient(0, y+h, 0, y+h+reveal*1.2);
    sillTop.addColorStop(0, "rgba(245,242,238,.96)");
    sillTop.addColorStop(1, "rgba(190,186,180,.95)");
    ctx.fillStyle = sillTop;
    ctx.fillRect(x-reveal*1.6, y+h+reveal*.18, w+reveal*3.2, reveal);
    ctx.strokeStyle = "rgba(100,90,76,.22)"; ctx.lineWidth=1;
    ctx.strokeRect(x-reveal*1.6, y+h+reveal*.18, w+reveal*3.2, reveal);

    ctx.restore();
  }

  function drawPhotoPreview(viewer, ctx, w, h) {
    drawPhotoBackdrop(ctx, w, h, viewer.photoImage);
    var model = viewer.model;
    if (!model) return;
    var placement = viewer.photoPlacement;
    var aspect    = model.widthMM / model.heightMM;
    var targetH   = h * .48 * placement.scale;
    var targetW   = targetH * aspect;
    var maxW = w * .78 * placement.scale;
    if (targetW > maxW) { targetW = maxW; targetH = targetW / aspect; }
    var x = w * placement.x - targetW/2;
    var y = h * placement.y - targetH/2;
    drawPhotoOpening(ctx, x, y, targetW, targetH);
    drawFrontElement(ctx, model, x, y, targetW, targetH, true);
  }

  // ─── Viewer class ────────────────────────────────────────────────────────────

  function Viewer(host, options) {
    injectCss();
    this.host    = host;
    this.options = options || {};
    this.mode    = this.options.mode === "house" ? "house" : "free";
    this.showModeControls = this.options.showModeControls !== false;
    // Better default angle: 3/4 view from top-right (yaw positive = right face visible)
    this.yaw   = 0.44;
    this.pitch = 0.32;
    this.zoom  = 1;
    this.model = null;
    this.drag  = null;
    this.spin  = false;
    this.spinFrame = 0;
    this.photoImage    = null;
    this.photoUrl      = "";
    this.photoPlacement = { x:.50, y:.52, scale:1 };
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
              <label class="kl3d-btn" data-kl3d-photo-label>📷 Foto laden<input class="kl3d-file" type="file" accept="image/*" data-kl3d-photo></label>\
            </div>\
            <button class="kl3d-btn" type="button" data-kl3d-spin>↻ 360</button>\
            <button class="kl3d-btn" type="button" data-kl3d-reset>Reset</button>\
          </div>\
        </div>\
        <div class="kl3d-canvas-wrap">\
          <canvas class="kl3d-canvas"></canvas>\
          <div class="kl3d-empty" data-kl3d-empty></div>\
        </div>\
      </div>';
    this.canvas   = this.host.querySelector("canvas");
    this.wrap     = this.host.querySelector(".kl3d-canvas-wrap");
    this.meta     = this.host.querySelector("[data-kl3d-meta]");
    this.empty    = this.host.querySelector("[data-kl3d-empty]");
    this.modeGroup  = this.host.querySelector("[data-kl3d-mode-group]");
    this.viewer     = this.host.querySelector(".kl3d-viewer");
    this.photoInput = this.host.querySelector("[data-kl3d-photo]");
    this.spinButton = this.host.querySelector("[data-kl3d-spin]");
    if (!this.showModeControls && this.modeGroup) this.modeGroup.style.display = "none";
    this.refreshButtons();
  };

  Viewer.prototype.loadDefaultPhoto = function () {
    var self = this;
    var img  = new Image();
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
      btn.addEventListener("click", function () { self.setMode(btn.getAttribute("data-kl3d-mode")); });
    });
    var reset = this.host.querySelector("[data-kl3d-reset]");
    if (reset) reset.addEventListener("click", function () { self.resetView(); });
    if (this.spinButton) this.spinButton.addEventListener("click", function () { self.setSpin(!self.spin); });
    if (this.photoInput) {
      this.photoInput.addEventListener("change", function () {
        var file = self.photoInput.files && self.photoInput.files[0];
        if (!file) return;
        if (self.photoUrl) URL.revokeObjectURL(self.photoUrl);
        self.photoUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () { self.photoImage = img; self.setMode("house"); self.draw(); };
        img.src = self.photoUrl;
      });
    }

    this.canvas.addEventListener("pointerdown", function (ev) {
      self.setSpin(false);
      if (self.mode === "house") {
        self.drag = { type:"photo", x:ev.clientX, y:ev.clientY, px:self.photoPlacement.x, py:self.photoPlacement.y };
      } else {
        self.drag = { type:"orbit", x:ev.clientX, y:ev.clientY, yaw:self.yaw, pitch:self.pitch };
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
        self.photoPlacement.x = clamp(self.drag.px + dx/Math.max(1,rect.width),  .06,.94);
        self.photoPlacement.y = clamp(self.drag.py + dy/Math.max(1,rect.height), .14,.90);
      } else {
        self.yaw   = self.drag.yaw   + dx * .016;
        self.pitch = clamp(self.drag.pitch + dy * .009, -1.22, 1.22);
      }
      self.draw();
    });
    this.canvas.addEventListener("pointerup", function (ev) {
      self.drag = null; self.wrap.classList.remove("is-dragging");
      try { self.canvas.releasePointerCapture(ev.pointerId); } catch(e){}
    });
    this.canvas.addEventListener("pointercancel", function () {
      self.drag = null; self.wrap.classList.remove("is-dragging");
    });
    this.canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      if (self.mode === "house") {
        self.photoPlacement.scale = clamp(self.photoPlacement.scale * (ev.deltaY>0?.93:1.07), .4, 2.0);
      } else {
        self.zoom = clamp(self.zoom * (ev.deltaY>0?.92:1.09), .50, 2.2);
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
    if (!this.spin) { if (this.spinFrame) cancelAnimationFrame(this.spinFrame); this.spinFrame = 0; return; }
    if (this.spinFrame) return;
    var last = 0;
    function tick(ts) {
      if (!self.spin) { self.spinFrame = 0; return; }
      var dt = last ? Math.min(32, ts-last) : 16;
      last = ts;
      self.yaw += dt * .0011;
      self.draw();
      self.spinFrame = requestAnimationFrame(tick);
    }
    this.spinFrame = requestAnimationFrame(tick);
  };

  Viewer.prototype.resetView = function () {
    this.setSpin(false);
    this.yaw   = 0.44;
    this.pitch = 0.32;
    this.zoom  = 1;
    this.photoPlacement = { x:.50, y:.52, scale:1 };
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
    this.meta.textContent = this.model.widthMM + " × " + this.model.heightMM + " mm";
    this.empty.textContent = "";
    this.refreshButtons();
    this.resize();
  };

  Viewer.prototype.resize = function () {
    var rect = this.wrap.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    if (this.canvas.width !== Math.round(w*dpr) || this.canvas.height !== Math.round(h*dpr)) {
      this.canvas.width  = Math.round(w*dpr);
      this.canvas.height = Math.round(h*dpr);
      this.canvas.style.width  = w + "px";
      this.canvas.style.height = h + "px";
    }
    this.dpr = dpr;
    this.draw();
  };

  Viewer.prototype.projector = function (scene, cw, ch) {
    var yaw   = this.yaw;
    var pitch = this.pitch;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var sceneW = Math.max(1, scene.maxX - scene.minX);
    var sceneH = Math.max(1, scene.maxY - scene.minY);
    // Ensure depth is always visually significant — scale includes a depth allowance
    var depthAllowance = 1.55;
    var base = Math.min(cw/(sceneW*depthAllowance), ch/(sceneH*1.50)) * this.zoom;
    var camera = Math.max(sceneW, sceneH) * 2.6;
    var cx2    = cw / 2;
    var centerY = ch/2 + ch*.04;
    return function (p) {
      var x1 = p.x*cy + p.z*sy;
      var z1 = -p.x*sy + p.z*cy;
      var y1 = p.y*cp - z1*sp;
      var z2 = p.y*sp + z1*cp;
      var perspective = camera / Math.max(80, camera-z2);
      return { x: cx2 + x1*base*perspective, y: centerY - y1*base*perspective, z: z2 };
    };
  };

  Viewer.prototype.draw = function () {
    if (!this.canvas) return;
    var ctx = this.canvas.getContext("2d");
    var cw = this.canvas.width, ch = this.canvas.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    var w = cw/this.dpr, h = ch/this.dpr;
    ctx.clearRect(0, 0, w, h);

    // Background gradient — sky to floor
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0,   "#bfdbfe");
    bg.addColorStop(.45, "#dbeafe");
    bg.addColorStop(1,   "#c8d8e8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (!this.model) { ctx.restore(); return; }

    if (this.mode === "house") {
      drawPhotoPreview(this, ctx, w, h);
      ctx.restore();
      return;
    }

    var scene   = buildScene(this.model, this.mode);
    var project = this.projector(scene, w, h);

    // Painter's algorithm — back to front
    var faces = scene.faces.slice().sort(function(a,b){ return avgZ(a.points,project)-avgZ(b.points,project); });
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var pts  = face.points.map(project);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
      ctx.closePath();
      ctx.globalAlpha = face.alpha;
      ctx.fillStyle   = face.color;
      ctx.fill();
      ctx.globalAlpha = Math.min(1, face.alpha+.06);
      ctx.strokeStyle = face.stroke;
      ctx.lineWidth   = face.weight;
      ctx.stroke();
    }

    var lines = scene.lines.slice().sort(function(a,b){ return avgZ(a.points,project)-avgZ(b.points,project); });
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (var k = 0; k < lines.length; k++) {
      var line = lines[k];
      var lpts = line.points.map(project);
      ctx.beginPath();
      ctx.moveTo(lpts[0].x, lpts[0].y);
      for (var m = 1; m < lpts.length; m++) ctx.lineTo(lpts[m].x, lpts[m].y);
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = line.color;
      ctx.lineWidth   = line.width;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  // ─── Public API ──────────────────────────────────────────────────────────────

  function mount(hostOrId, options) {
    var host = resolveHost(hostOrId);
    if (!host) return null;
    if (!instances.has(host)) instances.set(host, new Viewer(host, options||{}));
    return instances.get(host);
  }

  function render(hostOrId, data, options) {
    var viewer = mount(hostOrId, options||{});
    if (!viewer) return null;
    viewer.update(data, options||{});
    return viewer;
  }

  window.Kozijn3D = { mount: mount, render: render, normalizeElement: normalizeElement };
})();
