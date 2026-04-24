// KozijnSVG — React SVG component + PDF string helper
// Neemt een KozijnLAB element-config object en tekent het kozijn
//
// Ondersteunt zowel het interne KozijnLAB formaat als het export-formaat:
//   Intern:  el.widthMM, el.colorOutside, col.widthPct
//   Export:  el.dimensions.widthMM, el.finish.colorOutside, col.widthPct (zelfde)

const RAL = {
  RAL9016: '#f6f6f3',
  RAL9001: '#f0ead6',
  RAL7016: '#383e42',
  RAL7039: '#6c6960',
  RAL7012: '#51565a',
  RAL7038: '#b2b4b3',
  RAL9005: '#0a0a0d',
}

const RAL_NAMES = {
  RAL9016: 'Verkeerswit',
  RAL9001: 'Crème',
  RAL7016: 'Antraciet',
  RAL7039: 'Quartzgrijs',
  RAL7012: 'Basaltgrijs',
  RAL7038: 'Agate grijs',
  RAL9005: 'Zwart',
}

const PANE_NAMES = {
  vast: 'Vast',
  draai: 'Draai',
  kiep: 'Kiep',
  draaikiep: 'Draai-kiep',
  vent: 'Ventilatie',
  deur: 'Deur',
  deur2: 'Dubbele deur',
  schuif: 'Schuifdeel',
}

export function ralName(code) {
  return RAL_NAMES[code] || code || '—'
}

function shadeHex(hex, amt) {
  if (!hex || hex.length < 7) return '#888'
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + amt))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

function normalizeEl(el) {
  if (!el) return el
  const normalized = el.widthMM !== undefined ? { ...el } : {
    ...el,
    widthMM: el.dimensions?.widthMM,
    heightMM: el.dimensions?.heightMM,
    colorOutside: el.finish?.colorOutside,
    colorInside: el.finish?.colorInside,
    finishOutside: el.finish?.finishOutside,
    finishInside: el.finish?.finishInside,
  }
  if (normalized.type === 'hefschuif') {
    normalized.type = 'schuifpui'
    normalized.slideSystem = 'hst'
  }
  return normalized
}

function isDoorPaneType(type) {
  return type === 'deur' || type === 'deur2'
}

function shouldDrawDoorHinges(el) {
  return !(el?.type === 'deur' && (el.doorSubtype || 'voordeur') === 'voordeur')
}

function defaultDoorPanel(fill = 'panel') {
  return { heightPct: 100, fill, glassPack: 'HR++', glassFinish: 'clear' }
}

function doorPanelsFor(el, row = {}) {
  const panels = Array.isArray(row.doorPanels) && row.doorPanels.length
    ? row.doorPanels
    : Array.isArray(el.doorPanels) && el.doorPanels.length
    ? el.doorPanels
    : [defaultDoorPanel(row.fill === 'glass' ? 'glass' : 'panel')]
  const sum = panels.reduce((a, p) => a + (Number(p.heightPct) || 0), 0) || 100
  return panels.map(p => ({
    heightPct: ((Number(p.heightPct) || 0) / sum) * 100,
    fill: p.fill === 'glass' ? 'glass' : 'panel',
    glassPack: p.glassPack || 'HR++',
    glassFinish: p.glassFinish || 'clear',
  }))
}

function drawingProfile(el) {
  const p = el.profile || { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 }
  const keepOriginal = el?.type === 'schuifpui' || el?.type === 'hefschuif'
  const scale = keepOriginal ? 1 : 0.82
  if (el?.type !== 'deur') {
    return {
      frameMM: (p.frameMM || 70) * scale,
      sashMM: (p.sashMM || 60) * scale,
      mullionMM: (p.mullionMM || 60) * scale,
      transomMM: (p.transomMM || p.mullionMM || 60) * scale,
    }
  }
  return {
    frameMM: (p.frameMM || 70) * scale * 2,
    sashMM: (p.sashMM || 60) * scale * 2,
    mullionMM: (p.mullionMM || 60) * scale * 2,
    transomMM: (p.transomMM || p.mullionMM || 60) * scale * 2,
  }
}

function framePathWithCutouts(fx, fy, fw, fh, ix, iy, iw, ih, cutouts = []) {
  const parts = [
    `M ${fx} ${fy} h ${fw} v ${fh} h ${-fw} Z`,
    `M ${ix} ${iy} h ${iw} v ${ih} h ${-iw} Z`,
  ]
  cutouts.forEach(c => {
    parts.push(`M ${c.x} ${c.y} h ${c.w} v ${c.h} h ${-c.w} Z`)
  })
  return parts.join(' ')
}

function computeGeom(el, vw, vh) {
  const padL = 32, padR = 32, padT = 28, padB = 28
  const availW = vw - padL - padR
  const availH = vh - padT - padB
  const aspect = (el.widthMM || 1200) / (el.heightMM || 1400)
  let fw = availW, fh = fw / aspect
  if (fh > availH) { fh = availH; fw = fh * aspect }
  const fx = padL + (availW - fw) / 2
  const fy = padT + (availH - fh) / 2

  const scale = fw / (el.widthMM || 1200)
  const baseProf = el.profile || { frameMM: 70, sashMM: 60, mullionMM: 60, transomMM: 60 }
  const prof = drawingProfile(el)
  const frameW = Math.max(3, prof.frameMM * scale)
  const mullW  = Math.max(2, prof.mullionMM * scale)
  const transW = Math.max(2, (prof.transomMM || prof.mullionMM) * scale)
  const cols = el.columns || []
  const hasDoorThreshold = cols.some(col => {
    const rows = col.rows || []
    const lastRow = rows[rows.length - 1]
    return lastRow && isDoorPaneType(lastRow.paneType)
  })
  const thresholdH = Math.max(3, ((baseProf.mullionMM || 60) * scale) * 0.55)

  const ix = fx + frameW, iy = fy + frameW
  const iw = fw - 2 * frameW
  const ih = Math.max(1, fh - frameW - (hasDoorThreshold ? thresholdH : frameW))

  const pctSum = cols.reduce((a, c) => a + (c.widthPct || 0), 0) || 100
  const innerW = iw - mullW * Math.max(0, cols.length - 1)
  const colWidths = cols.map(c => innerW * ((c.widthPct || 0) / pctSum))
  const colXs = []
  let cx = ix
  colWidths.forEach(w => { colXs.push(cx); cx += w + mullW })

  return { fx, fy, fw, fh, ix, iy, iw, ih, frameW, mullW, transW, cols, colWidths, colXs, hasDoorThreshold, thresholdH }
}

// ── React component ──────────────────────────────────────────────────────────

export function KozijnSVG({ element, width = 420, height = 280, showDims = true }) {
  if (!element) return null
  const el = normalizeEl(element)

  const colorHex = RAL[el.colorOutside] || '#e2e8f0'
  const borderColor = shadeHex(colorHex, colorHex === '#f6f6f3' || colorHex === '#f0ead6' ? -60 : -25)
  const { fx, fy, fw, fh, ix, iy, iw, ih, frameW, mullW, transW, cols, colWidths, colXs, hasDoorThreshold, thresholdH } = computeGeom(el, width, height)

  const parts = []
  let k = 0

  function pushDoorLeafPanels(lx, ly, lw, lh, panels, profileW) {
    const rail = Math.max(3, Math.min(14, profileW * 0.34, Math.min(lw, lh) * 0.16))
    const gap = 0
    const innerX = lx + rail
    const innerY = ly + rail
    const innerW = Math.max(1, lw - 2 * rail)
    const innerH = Math.max(1, lh - 2 * rail - gap * (panels.length - 1))
    let cy = innerY

    panels.forEach((panel, i) => {
      const ph = innerH * (panel.heightPct / 100)
      if (panel.fill === 'glass') {
        parts.push(<rect key={k++} x={innerX} y={cy} width={innerW} height={ph} fill="#dbeafe" stroke="#93c5fd" strokeWidth="0.8" rx="1" />)
      } else {
        parts.push(<rect key={k++} x={innerX} y={cy} width={innerW} height={ph} fill="#c8d3da" stroke="#607d8b" strokeWidth="0.8" rx="1" />)
        parts.push(<rect key={k++} x={innerX + 4} y={cy + 4} width={Math.max(1, innerW - 8)} height={Math.max(1, ph - 8)} fill="none" stroke="#607d8b" strokeWidth="0.6" rx="1" />)
      }
      cy += ph + gap
    })
  }

  function pushFlagHinges(side, edgeX, y, h, profileW) {
    const frameW = Math.max(2.5, Math.min(5, profileW * 0.14))
    const leafW  = Math.max(4, Math.min(10, profileW * 0.34))
    const hingeH = Math.max(10, Math.min(24, h * 0.06))
    const leafH  = Math.max(7, Math.min(13, hingeH * 0.58))
    const barrelRx = Math.min(2.5, frameW / 2)
    const leafY = hy => hy + Math.max(1, hingeH * 0.14)
    ;[0.18, 0.5, 0.82].forEach(pos => {
      const hy = y + h * pos - hingeH / 2
      if (side === 'left') {
        // Body op kozijn frame (links van edgeX)
        parts.push(<rect key={k++} x={edgeX - frameW} y={hy} width={frameW} height={hingeH} fill="#334155" rx={barrelRx} />)
        // Bovenvleugel op deurprofiel (rechts van edgeX)
        parts.push(<rect key={k++} x={edgeX} y={leafY(hy)} width={leafW} height={leafH} fill="#475569" rx="1" />)
      } else {
        // Body op kozijn frame (rechts van edgeX)
        parts.push(<rect key={k++} x={edgeX} y={hy} width={frameW} height={hingeH} fill="#334155" rx={barrelRx} />)
        // Bovenvleugel op deurprofiel (links van edgeX)
        parts.push(<rect key={k++} x={edgeX - leafW} y={leafY(hy)} width={leafW} height={leafH} fill="#475569" rx="1" />)
      }
    })
  }

  function pushRollerBandHinges(side, edgeX, y, h, profileW) {
    const barrelW = Math.max(3.5, Math.min(8, profileW * 0.22))
    const hingeH = Math.max(10, Math.min(22, h * 0.06))
    const capH = Math.max(1.5, Math.min(3, hingeH * 0.16))
    const x = edgeX - barrelW / 2
    ;[0.18, 0.5, 0.82].forEach(pos => {
      const hy = y + h * pos - hingeH / 2
      parts.push(<rect key={k++} x={x} y={hy} width={barrelW} height={hingeH} fill="#334155" rx={barrelW / 2} />)
      parts.push(<line key={k++} x1={x + 1} y1={hy + capH} x2={x + barrelW - 1} y2={hy + capH} stroke="#f8fafc" strokeWidth="0.45" opacity="0.55" strokeLinecap="round" />)
      parts.push(<line key={k++} x1={x + 1} y1={hy + hingeH - capH} x2={x + barrelW - 1} y2={hy + hingeH - capH} stroke="#f8fafc" strokeWidth="0.45" opacity="0.55" strokeLinecap="round" />)
    })
  }

  function pushDoorHinges(style, side, edgeX, y, h, profileW) {
    if (style === 'roller') pushRollerBandHinges(side, edgeX, y, h, profileW)
    else pushFlagHinges(side, edgeX, y, h, profileW)
  }

  function pushDoorHandle(edgeX, centerY, side, profileW) {
    const plateW = Math.max(2.7, Math.min(5.5, profileW * 0.13))
    const plateH = Math.max(11, Math.min(22, profileW * 0.48))
    const leverW = Math.max(10, Math.min(22, profileW * 0.56))
    const leverH = Math.max(2.5, Math.min(5, profileW * 0.12))
    const plateX = side === 'left' ? edgeX : edgeX - plateW
    const plateY = centerY - plateH / 2
    const leverY = centerY - leverH / 2
    const leverX = side === 'left' ? plateX + plateW - 0.5 : plateX - leverW + 0.5
    parts.push(<rect key={k++} x={plateX} y={plateY} width={plateW} height={plateH} fill="#334155" rx="1" />)
    parts.push(<rect key={k++} x={leverX} y={leverY} width={leverW} height={leverH} fill="#334155" rx={leverH / 2} />)
    parts.push(<circle key={k++} cx={side === 'left' ? plateX + plateW : plateX} cy={centerY} r={Math.max(1.2, leverH * 0.55)} fill="#334155" />)
  }

  // Glass background
  parts.push(<rect key={k++} x={ix} y={iy} width={iw} height={ih} fill="#dbeafe" />)

  // Frame
  parts.push(
    <path key={k++}
      d={framePathWithCutouts(fx, fy, fw, fh, ix, iy, iw, ih)}
      fill={colorHex} stroke={borderColor} strokeWidth="1" fillRule="evenodd" />,
  )

  // Mullions
  for (let i = 1; i < cols.length; i++) {
    const mx = colXs[i] - mullW
    parts.push(<rect key={k++} x={mx} y={iy} width={mullW} height={ih} fill={colorHex} stroke={borderColor} strokeWidth="0.5" />)
  }

  // Per column: transoms + pane symbols
  cols.forEach((col, ci) => {
    const cxPx = colXs[ci], cwPx = colWidths[ci]
    const rows = col.rows || []
    const rowSum = rows.reduce((a, r) => a + (r.heightPct || 0), 0) || 100
    const innerColH = ih - transW * Math.max(0, rows.length - 1)
    let cyPos = iy

    rows.forEach((row, ri) => {
      const rh = innerColH * ((row.heightPct || 0) / rowSum)

      if (ri > 0) {
        parts.push(<rect key={k++} x={cxPx} y={cyPos - transW} width={cwPx} height={transW} fill={colorHex} stroke={borderColor} strokeWidth="0.5" />)
      }

      const pType  = row.paneType || 'vast'
      const hinge  = row.hinge || 'left'
      const hingeStyle = row.hingeStyle || 'flag'
      const isDoorPane = isDoorPaneType(pType)
      const doorPaneProfileW = isDoorPane && el.type !== 'deur' ? mullW * 2 : mullW
      const inset  = Math.max(3, Math.min(isDoorPane ? doorPaneProfileW : 10, Math.min(cwPx, rh) * (isDoorPane ? 0.14 : 0.09)))
      const sx = cxPx + inset, sy = cyPos + inset
      const sw = cwPx - 2 * inset, sh = rh - 2 * inset

      const openable = ['draai', 'draaikiep', 'deur', 'deur2', 'kiep', 'schuif'].includes(pType)
      if (openable) {
        parts.push(<rect key={k++} x={sx} y={sy} width={sw} height={sh} fill="none" stroke="#334155" strokeWidth="0.9" />)
      }

      if (pType === 'draai' || pType === 'draaikiep') {
        const hx = hinge === 'left' ? sx : sx + sw
        const ox = hinge === 'left' ? sx + sw : sx
        parts.push(<path key={k++} d={`M ${hx} ${sy} L ${ox} ${sy + sh / 2} L ${hx} ${sy + sh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
      }
      if (pType === 'deur') {
        // Openingslijnen lopen van kozijnrand tot kozijnrand (over deurprofiel heen)
        const hx = hinge === 'left' ? cxPx : cxPx + cwPx
        const ox = hinge === 'left' ? cxPx + cwPx : cxPx
        pushDoorLeafPanels(sx, sy, sw, sh, doorPanelsFor(el, row), doorPaneProfileW)
        parts.push(<path key={k++} d={`M ${hx} ${cyPos} L ${ox} ${cyPos + rh / 2} L ${hx} ${cyPos + rh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
        pushDoorHandle(hinge === 'left' ? sx + sw : sx, sy + sh * 0.5, hinge === 'left' ? 'right' : 'left', doorPaneProfileW)
        // Scharnieren op grens kozijn/deurprofiel
        if (shouldDrawDoorHinges(el)) {
          pushDoorHinges(hingeStyle, hinge === 'left' ? 'left' : 'right', hinge === 'left' ? cxPx : cxPx + cwPx, cyPos, rh, doorPaneProfileW)
        }
      }
      if (pType === 'deur2') {
        const centerX = cxPx + cwPx / 2
        // Naadlijn over volledige hoogte
        parts.push(<line key={k++} x1={centerX} y1={cyPos} x2={centerX} y2={cyPos + rh} stroke="#334155" strokeWidth="0.8" />)
        // Deurblad-panelen in het sash-vlak
        const gap = Math.max(2, inset / 2)
        const lw = sw / 2 - gap / 2
        const rox = sx + sw / 2 + gap / 2
        const rw = sw - lw - gap
        const panels = doorPanelsFor(el, row)
        pushDoorLeafPanels(sx, sy, lw, sh, panels, doorPaneProfileW)
        pushDoorLeafPanels(rox, sy, rw, sh, panels, doorPaneProfileW)
        // Openingslijnen van kozijnrand tot midden
        parts.push(<path key={k++} d={`M ${cxPx} ${cyPos} L ${centerX} ${cyPos + rh / 2} L ${cxPx} ${cyPos + rh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
        parts.push(<path key={k++} d={`M ${cxPx + cwPx} ${cyPos} L ${centerX} ${cyPos + rh / 2} L ${cxPx + cwPx} ${cyPos + rh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
        pushDoorHandle(centerX - gap / 2, sy + sh * 0.5, 'right', doorPaneProfileW)
        pushDoorHandle(centerX + gap / 2, sy + sh * 0.5, 'left', doorPaneProfileW)
        // Scharnieren op grens kozijn/deurprofiel, beide kanten
        if (shouldDrawDoorHinges(el)) {
          pushDoorHinges(hingeStyle, 'left', cxPx, cyPos, rh, doorPaneProfileW)
          pushDoorHinges(hingeStyle, 'right', cxPx + cwPx, cyPos, rh, doorPaneProfileW)
        }
      }
      if (['kiep', 'draaikiep'].includes(pType)) {
        parts.push(<path key={k++} d={`M ${sx} ${sy + sh} L ${sx + sw / 2} ${sy} L ${sx + sw} ${sy + sh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
      }
      if (pType === 'schuif') {
        const ay = cyPos + rh / 2
        const ax1 = cxPx + cwPx * 0.28, ax2 = cxPx + cwPx * 0.72
        parts.push(<line key={k++} x1={ax1} y1={ay} x2={ax2} y2={ay} stroke="#334155" strokeWidth="1.2" />)
        parts.push(<path key={k++} d={`M ${ax2 - 7} ${ay - 4} L ${ax2} ${ay} L ${ax2 - 7} ${ay + 4}`} fill="none" stroke="#334155" strokeWidth="1" strokeLinejoin="round" />)
      }
      if (pType === 'vast' && row.fill !== 'panel') {
        const cx2 = cxPx + cwPx / 2, cy2 = cyPos + rh / 2
        const sz = Math.min(cwPx, rh) * 0.06
        parts.push(
          <line key={k++} x1={cx2 - sz} y1={cy2} x2={cx2 + sz} y2={cy2} stroke="#94a3b8" strokeWidth="0.8" />,
          <line key={k++} x1={cx2} y1={cy2 - sz} x2={cx2} y2={cy2 + sz} stroke="#94a3b8" strokeWidth="0.8" />,
        )
      }
      if (pType === 'vent') {
        const vi = 3
        parts.push(<rect key={k++} x={cxPx + vi} y={cyPos + vi} width={cwPx - vi * 2} height={rh - vi * 2} fill="none" stroke="#334155" strokeWidth="0.9" />)
        const lineCount = Math.max(3, Math.floor((rh - 12) / 8))
        const gap = (rh - 8) / (lineCount + 1)
        for (let li = 1; li <= lineCount; li++) {
          const ly = cyPos + 4 + gap * li
          parts.push(<line key={k++} x1={cxPx + vi + 2} y1={ly} x2={cxPx + cwPx - vi - 2} y2={ly} stroke="#334155" strokeWidth="0.8" />)
        }
      }
      if (row.fill === 'panel' && !isDoorPaneType(pType)) {
        parts.push(<rect key={k++} x={cxPx} y={cyPos} width={cwPx} height={rh} fill="#c8d3da" />)
        parts.push(<rect key={k++} x={cxPx + 4} y={cyPos + 4} width={cwPx - 8} height={rh - 8} fill="none" stroke="#607d8b" strokeWidth="0.8" />)
      }

      cyPos += rh + transW
    })
  })

  if (hasDoorThreshold) {
    const thresholdY = fy + fh - thresholdH
    const returnW = frameW
    const returnH = Math.max(6, thresholdH * 1.35)
    parts.push(<rect key={k++} x={fx} y={thresholdY} width={fw} height={thresholdH} fill="#0f172a" stroke="#020617" strokeWidth="0.7" />)
    parts.push(<rect key={k++} x={fx} y={thresholdY - returnH} width={returnW} height={returnH + thresholdH} fill="#0f172a" stroke="#020617" strokeWidth="0.7" />)
    parts.push(<rect key={k++} x={fx + fw - returnW} y={thresholdY - returnH} width={returnW} height={returnH + thresholdH} fill="#0f172a" stroke="#020617" strokeWidth="0.7" />)
    parts.push(<line key={k++} x1={fx} y1={thresholdY} x2={fx + fw} y2={thresholdY} stroke="#020617" strokeWidth="0.7" />)
  }

  // Dimension labels
  if (showDims) {
    parts.push(
      <text key={k++} x={fx + fw / 2} y={fy - 10} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif">
        {el.widthMM} mm
      </text>,
      <text key={k++} x={fx + fw + 14} y={fy + fh / 2} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif"
        transform={`rotate(-90 ${fx + fw + 14} ${fy + fh / 2})`}>
        {el.heightMM} mm
      </text>,
    )
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Tekening ${element.name}`}>
      {parts}
    </svg>
  )
}

// ── SVG string generator (voor PDF) ──────────────────────────────────────────

export function kozijnSVGString(element, width = 420, height = 280) {
  if (!element) return ''
  const el = normalizeEl(element)

  const colorHex = RAL[el.colorOutside] || '#e2e8f0'
  const borderColor = shadeHex(colorHex, colorHex === '#f6f6f3' || colorHex === '#f0ead6' ? -60 : -25)
  const { fx, fy, fw, fh, ix, iy, iw, ih, frameW, mullW, transW, cols, colWidths, colXs, hasDoorThreshold, thresholdH } = computeGeom(el, width, height)

  let parts = []

  function pushDoorLeafPanels(lx, ly, lw, lh, panels, profileW) {
    const rail = Math.max(3, Math.min(14, profileW * 0.34, Math.min(lw, lh) * 0.16))
    const gap = 0
    const innerX = lx + rail
    const innerY = ly + rail
    const innerW = Math.max(1, lw - 2 * rail)
    const innerH = Math.max(1, lh - 2 * rail - gap * (panels.length - 1))
    let cy = innerY

    panels.forEach((panel, i) => {
      const ph = innerH * (panel.heightPct / 100)
      if (panel.fill === 'glass') {
        parts.push(`<rect x="${innerX}" y="${cy}" width="${innerW}" height="${ph}" fill="#dbeafe" stroke="#93c5fd" stroke-width="0.8" rx="1"/>`)
      } else {
        parts.push(`<rect x="${innerX}" y="${cy}" width="${innerW}" height="${ph}" fill="#c8d3da" stroke="#607d8b" stroke-width="0.8" rx="1"/>`)
        parts.push(`<rect x="${innerX + 4}" y="${cy + 4}" width="${Math.max(1, innerW - 8)}" height="${Math.max(1, ph - 8)}" fill="none" stroke="#607d8b" stroke-width="0.6" rx="1"/>`)
      }
      cy += ph + gap
    })
  }

  function pushFlagHinges(side, edgeX, y, h, profileW) {
    const frameW = Math.max(2.5, Math.min(5, profileW * 0.14))
    const leafW = Math.max(4, Math.min(10, profileW * 0.34))
    const hingeH = Math.max(10, Math.min(24, h * 0.06))
    const leafH = Math.max(7, Math.min(13, hingeH * 0.58))
    const barrelRx = Math.min(2.5, frameW / 2)
    const leafY = hy => hy + Math.max(1, hingeH * 0.14)
    ;[0.18, 0.5, 0.82].forEach(pos => {
      const hy = y + h * pos - hingeH / 2
      if (side === 'left') {
        parts.push(`<rect x="${edgeX - frameW}" y="${hy}" width="${frameW}" height="${hingeH}" fill="#334155" rx="${barrelRx}"/>`)
        parts.push(`<rect x="${edgeX}" y="${leafY(hy)}" width="${leafW}" height="${leafH}" fill="#475569" rx="1"/>`)
      } else {
        parts.push(`<rect x="${edgeX}" y="${hy}" width="${frameW}" height="${hingeH}" fill="#334155" rx="${barrelRx}"/>`)
        parts.push(`<rect x="${edgeX - leafW}" y="${leafY(hy)}" width="${leafW}" height="${leafH}" fill="#475569" rx="1"/>`)
      }
    })
  }

  function pushRollerBandHinges(side, edgeX, y, h, profileW) {
    const barrelW = Math.max(3.5, Math.min(8, profileW * 0.22))
    const hingeH = Math.max(10, Math.min(22, h * 0.06))
    const capH = Math.max(1.5, Math.min(3, hingeH * 0.16))
    const x = edgeX - barrelW / 2
    ;[0.18, 0.5, 0.82].forEach(pos => {
      const hy = y + h * pos - hingeH / 2
      parts.push(`<rect x="${x}" y="${hy}" width="${barrelW}" height="${hingeH}" fill="#334155" rx="${barrelW / 2}"/>`)
      parts.push(`<line x1="${x + 1}" y1="${hy + capH}" x2="${x + barrelW - 1}" y2="${hy + capH}" stroke="#f8fafc" stroke-width="0.45" opacity="0.55" stroke-linecap="round"/>`)
      parts.push(`<line x1="${x + 1}" y1="${hy + hingeH - capH}" x2="${x + barrelW - 1}" y2="${hy + hingeH - capH}" stroke="#f8fafc" stroke-width="0.45" opacity="0.55" stroke-linecap="round"/>`)
    })
  }

  function pushDoorHinges(style, side, edgeX, y, h, profileW) {
    if (style === 'roller') pushRollerBandHinges(side, edgeX, y, h, profileW)
    else pushFlagHinges(side, edgeX, y, h, profileW)
  }

  function pushDoorHandle(edgeX, centerY, side, profileW) {
    const plateW = Math.max(2.7, Math.min(5.5, profileW * 0.13))
    const plateH = Math.max(11, Math.min(22, profileW * 0.48))
    const leverW = Math.max(10, Math.min(22, profileW * 0.56))
    const leverH = Math.max(2.5, Math.min(5, profileW * 0.12))
    const plateX = side === 'left' ? edgeX : edgeX - plateW
    const plateY = centerY - plateH / 2
    const leverY = centerY - leverH / 2
    const leverX = side === 'left' ? plateX + plateW - 0.5 : plateX - leverW + 0.5
    const knobX = side === 'left' ? plateX + plateW : plateX
    const knobR = Math.max(1.2, leverH * 0.55)
    parts.push(`<rect x="${plateX}" y="${plateY}" width="${plateW}" height="${plateH}" fill="#334155" rx="1"/>`)
    parts.push(`<rect x="${leverX}" y="${leverY}" width="${leverW}" height="${leverH}" fill="#334155" rx="${leverH / 2}"/>`)
    parts.push(`<circle cx="${knobX}" cy="${centerY}" r="${knobR}" fill="#334155"/>`)
  }

  parts.push(`<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#dbeafe"/>`)
  parts.push(`<path d="${framePathWithCutouts(fx, fy, fw, fh, ix, iy, iw, ih)}" fill="${colorHex}" stroke="${borderColor}" stroke-width="1" fill-rule="evenodd"/>`)

  for (let i = 1; i < cols.length; i++) {
    const mx = colXs[i] - mullW
    parts.push(`<rect x="${mx}" y="${iy}" width="${mullW}" height="${ih}" fill="${colorHex}" stroke="${borderColor}" stroke-width="0.5"/>`)
  }

  cols.forEach((col, ci) => {
    const cxPx = colXs[ci], cwPx = colWidths[ci]
    const rows = col.rows || []
    const rowSum = rows.reduce((a, r) => a + (r.heightPct || 0), 0) || 100
    const innerColH = ih - transW * Math.max(0, rows.length - 1)
    let cyPos = iy

    rows.forEach((row, ri) => {
      const rh = innerColH * ((row.heightPct || 0) / rowSum)
      if (ri > 0) {
        parts.push(`<rect x="${cxPx}" y="${cyPos - transW}" width="${cwPx}" height="${transW}" fill="${colorHex}" stroke="${borderColor}" stroke-width="0.5"/>`)
      }

      const pType = row.paneType || 'vast'
      const hinge = row.hinge || 'left'
      const hingeStyle = row.hingeStyle || 'flag'
      const isDoorPane = isDoorPaneType(pType)
      const doorPaneProfileW = isDoorPane && el.type !== 'deur' ? mullW * 2 : mullW
      const inset = Math.max(3, Math.min(isDoorPane ? doorPaneProfileW : 10, Math.min(cwPx, rh) * (isDoorPane ? 0.14 : 0.09)))
      const sx = cxPx + inset, sy = cyPos + inset
      const sw = cwPx - 2 * inset, sh = rh - 2 * inset

      if (['draai', 'draaikiep', 'deur', 'deur2', 'kiep', 'schuif'].includes(pType)) {
        parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="#334155" stroke-width="0.9"/>`)
      }
      if (pType === 'draai' || pType === 'draaikiep') {
        const hx = hinge === 'left' ? sx : sx + sw
        const ox = hinge === 'left' ? sx + sw : sx
        parts.push(`<path d="M ${hx} ${sy} L ${ox} ${sy + sh / 2} L ${hx} ${sy + sh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
      }
      if (pType === 'deur') {
        const hx = hinge === 'left' ? cxPx : cxPx + cwPx
        const ox = hinge === 'left' ? cxPx + cwPx : cxPx
        pushDoorLeafPanels(sx, sy, sw, sh, doorPanelsFor(el, row), doorPaneProfileW)
        parts.push(`<path d="M ${hx} ${cyPos} L ${ox} ${cyPos + rh / 2} L ${hx} ${cyPos + rh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
        pushDoorHandle(hinge === 'left' ? sx + sw : sx, sy + sh * 0.5, hinge === 'left' ? 'right' : 'left', doorPaneProfileW)
        if (shouldDrawDoorHinges(el)) {
          pushDoorHinges(hingeStyle, hinge === 'left' ? 'left' : 'right', hinge === 'left' ? cxPx : cxPx + cwPx, cyPos, rh, doorPaneProfileW)
        }
      }
      if (pType === 'deur2') {
        const centerX = cxPx + cwPx / 2
        parts.push(`<line x1="${centerX}" y1="${cyPos}" x2="${centerX}" y2="${cyPos + rh}" stroke="#334155" stroke-width="0.8"/>`)
        const gap = Math.max(2, inset / 2)
        const lw = sw / 2 - gap / 2
        const rox = sx + sw / 2 + gap / 2
        const rw = sw - lw - gap
        const panels = doorPanelsFor(el, row)
        pushDoorLeafPanels(sx, sy, lw, sh, panels, doorPaneProfileW)
        pushDoorLeafPanels(rox, sy, rw, sh, panels, doorPaneProfileW)
        parts.push(`<path d="M ${cxPx} ${cyPos} L ${centerX} ${cyPos + rh / 2} L ${cxPx} ${cyPos + rh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
        parts.push(`<path d="M ${cxPx + cwPx} ${cyPos} L ${centerX} ${cyPos + rh / 2} L ${cxPx + cwPx} ${cyPos + rh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
        pushDoorHandle(centerX - gap / 2, sy + sh * 0.5, 'right', doorPaneProfileW)
        pushDoorHandle(centerX + gap / 2, sy + sh * 0.5, 'left', doorPaneProfileW)
        if (shouldDrawDoorHinges(el)) {
          pushDoorHinges(hingeStyle, 'left', cxPx, cyPos, rh, doorPaneProfileW)
          pushDoorHinges(hingeStyle, 'right', cxPx + cwPx, cyPos, rh, doorPaneProfileW)
        }
      }
      if (['kiep', 'draaikiep'].includes(pType)) {
        parts.push(`<path d="M ${sx} ${sy + sh} L ${sx + sw / 2} ${sy} L ${sx + sw} ${sy + sh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
      }
      if (pType === 'schuif') {
        const ay = cyPos + rh / 2
        const ax1 = cxPx + cwPx * 0.28, ax2 = cxPx + cwPx * 0.72
        parts.push(`<line x1="${ax1}" y1="${ay}" x2="${ax2}" y2="${ay}" stroke="#334155" stroke-width="1.2"/>`)
        parts.push(`<path d="M ${ax2 - 7} ${ay - 4} L ${ax2} ${ay} L ${ax2 - 7} ${ay + 4}" fill="none" stroke="#334155" stroke-width="1" stroke-linejoin="round"/>`)
      }
      if (pType === 'vast' && row.fill !== 'panel') {
        const cx2 = cxPx + cwPx / 2, cy2 = cyPos + rh / 2
        const sz = Math.min(cwPx, rh) * 0.06
        parts.push(`<line x1="${cx2 - sz}" y1="${cy2}" x2="${cx2 + sz}" y2="${cy2}" stroke="#94a3b8" stroke-width="0.8"/>`)
        parts.push(`<line x1="${cx2}" y1="${cy2 - sz}" x2="${cx2}" y2="${cy2 + sz}" stroke="#94a3b8" stroke-width="0.8"/>`)
      }
      if (pType === 'vent') {
        const vi = 3
        parts.push(`<rect x="${cxPx + vi}" y="${cyPos + vi}" width="${cwPx - vi * 2}" height="${rh - vi * 2}" fill="none" stroke="#334155" stroke-width="0.9"/>`)
        const lineCount = Math.max(3, Math.floor((rh - 12) / 8))
        const gap = (rh - 8) / (lineCount + 1)
        for (let li = 1; li <= lineCount; li++) {
          const ly = cyPos + 4 + gap * li
          parts.push(`<line x1="${cxPx + vi + 2}" y1="${ly}" x2="${cxPx + cwPx - vi - 2}" y2="${ly}" stroke="#334155" stroke-width="0.8"/>`)
        }
      }
      if (row.fill === 'panel' && !isDoorPaneType(pType)) {
        parts.push(`<rect x="${cxPx}" y="${cyPos}" width="${cwPx}" height="${rh}" fill="#c8d3da"/>`)
        parts.push(`<rect x="${cxPx + 4}" y="${cyPos + 4}" width="${cwPx - 8}" height="${rh - 8}" fill="none" stroke="#607d8b" stroke-width="0.8"/>`)
      }

      cyPos += rh + transW
    })
  })

  if (hasDoorThreshold) {
    const thresholdY = fy + fh - thresholdH
    const returnW = frameW
    const returnH = Math.max(6, thresholdH * 1.35)
    parts.push(`<rect x="${fx}" y="${thresholdY}" width="${fw}" height="${thresholdH}" fill="#0f172a" stroke="#020617" stroke-width="0.7"/>`)
    parts.push(`<rect x="${fx}" y="${thresholdY - returnH}" width="${returnW}" height="${returnH + thresholdH}" fill="#0f172a" stroke="#020617" stroke-width="0.7"/>`)
    parts.push(`<rect x="${fx + fw - returnW}" y="${thresholdY - returnH}" width="${returnW}" height="${returnH + thresholdH}" fill="#0f172a" stroke="#020617" stroke-width="0.7"/>`)
    parts.push(`<line x1="${fx}" y1="${thresholdY}" x2="${fx + fw}" y2="${thresholdY}" stroke="#020617" stroke-width="0.7"/>`)
  }

  // Dimension labels
  parts.push(`<text x="${fx + fw / 2}" y="${fy - 10}" text-anchor="middle" font-size="11" fill="#64748b" font-family="system-ui,sans-serif">${el.widthMM} mm</text>`)
  parts.push(`<text x="${fx + fw + 14}" y="${fy + fh / 2}" text-anchor="middle" font-size="11" fill="#64748b" font-family="system-ui,sans-serif" transform="rotate(-90 ${fx + fw + 14} ${fy + fh / 2})">${el.heightMM} mm</text>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`
}

// Converteert SVG string naar PNG data URL (voor jsPDF)
export function svgToPngDataUrl(svgString, w, h) {
  return new Promise((resolve) => {
    const img = new window.Image()
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * 2
      canvas.height = h * 2
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export { PANE_NAMES, RAL_NAMES, normalizeEl }
