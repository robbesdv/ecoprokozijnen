// KozijnSVG — React SVG component + PDF string helper
// Neemt een KozijnLAB element-config object en tekent het kozijn

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

function computeGeom(el, vw, vh) {
  const padL = 32, padR = 32, padT = 28, padB = 28
  const availW = vw - padL - padR
  const availH = vh - padT - padB
  const aspect = (el.widthMM || 1200) / (el.heightMM || 1400)
  let fw = availW, fh = fw / aspect
  if (fh > availH) { fh = availH; fw = fh * aspect }
  const fx = padL + (availW - fw) / 2
  const fy = padT + (availH - fh) / 2

  const frameW  = Math.max(7, fw * 0.065)
  const mullW   = Math.max(5, fw * 0.050)
  const transW  = mullW

  const ix = fx + frameW, iy = fy + frameW
  const iw = fw - 2 * frameW, ih = fh - 2 * frameW

  const cols = el.columns || []
  const pctSum = cols.reduce((a, c) => a + (c.widthPct || 0), 0) || 100
  const innerW = iw - mullW * Math.max(0, cols.length - 1)
  const colWidths = cols.map(c => innerW * ((c.widthPct || 0) / pctSum))
  const colXs = []
  let cx = ix
  colWidths.forEach(w => { colXs.push(cx); cx += w + mullW })

  return { fx, fy, fw, fh, ix, iy, iw, ih, frameW, mullW, transW, cols, colWidths, colXs }
}

// ── React component ──────────────────────────────────────────────────────────

export function KozijnSVG({ element, width = 420, height = 280, showDims = true }) {
  if (!element) return null

  const colorHex = RAL[element.colorOutside] || '#e2e8f0'
  const borderColor = shadeHex(colorHex, colorHex === '#f6f6f3' || colorHex === '#f0ead6' ? -60 : -25)
  const { fx, fy, fw, fh, ix, iy, iw, ih, mullW, transW, cols, colWidths, colXs } = computeGeom(element, width, height)

  const parts = []
  let k = 0

  // Glass background
  parts.push(<rect key={k++} x={ix} y={iy} width={iw} height={ih} fill="#dbeafe" />)

  // Frame
  parts.push(
    <path key={k++}
      d={`M ${fx} ${fy} h ${fw} v ${fh} h ${-fw} Z M ${ix} ${iy} h ${iw} v ${ih} h ${-iw} Z`}
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
      const inset  = Math.max(3, Math.min(10, Math.min(cwPx, rh) * 0.09))
      const sx = cxPx + inset, sy = cyPos + inset
      const sw = cwPx - 2 * inset, sh = rh - 2 * inset

      const openable = ['draai', 'draaikiep', 'deur', 'kiep', 'schuif'].includes(pType)
      if (openable) {
        parts.push(<rect key={k++} x={sx} y={sy} width={sw} height={sh} fill="none" stroke="#334155" strokeWidth="0.9" />)
      }

      if (['draai', 'draaikiep', 'deur'].includes(pType)) {
        const hx = hinge === 'left' ? sx : sx + sw
        const ox = hinge === 'left' ? sx + sw : sx
        parts.push(<path key={k++} d={`M ${hx} ${sy} L ${ox} ${sy + sh / 2} L ${hx} ${sy + sh}`} fill="none" stroke="#334155" strokeWidth="0.9" strokeLinejoin="round" />)
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
      if (pType === 'vast' || pType === 'vent') {
        const cx2 = cxPx + cwPx / 2, cy2 = cyPos + rh / 2
        const sz = Math.min(cwPx, rh) * 0.06
        parts.push(
          <line key={k++} x1={cx2 - sz} y1={cy2} x2={cx2 + sz} y2={cy2} stroke="#94a3b8" strokeWidth="0.8" />,
          <line key={k++} x1={cx2} y1={cy2 - sz} x2={cx2} y2={cy2 + sz} stroke="#94a3b8" strokeWidth="0.8" />,
        )
      }

      cyPos += rh + transW
    })
  })

  // Dimension labels
  if (showDims) {
    parts.push(
      <text key={k++} x={fx + fw / 2} y={fy - 10} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif">
        {element.widthMM} mm
      </text>,
      <text key={k++} x={fx + fw + 14} y={fy + fh / 2} textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="system-ui,sans-serif"
        transform={`rotate(-90 ${fx + fw + 14} ${fy + fh / 2})`}>
        {element.heightMM} mm
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

  const colorHex = RAL[element.colorOutside] || '#e2e8f0'
  const borderColor = shadeHex(colorHex, colorHex === '#f6f6f3' || colorHex === '#f0ead6' ? -60 : -25)
  const { fx, fy, fw, fh, ix, iy, iw, ih, mullW, transW, cols, colWidths, colXs } = computeGeom(element, width, height)

  let parts = []

  parts.push(`<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#dbeafe"/>`)
  parts.push(`<path d="M ${fx} ${fy} h ${fw} v ${fh} h ${-fw} Z M ${ix} ${iy} h ${iw} v ${ih} h ${-iw} Z" fill="${colorHex}" stroke="${borderColor}" stroke-width="1" fill-rule="evenodd"/>`)

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
      const inset = Math.max(3, Math.min(10, Math.min(cwPx, rh) * 0.09))
      const sx = cxPx + inset, sy = cyPos + inset
      const sw = cwPx - 2 * inset, sh = rh - 2 * inset

      if (['draai', 'draaikiep', 'deur', 'kiep', 'schuif'].includes(pType)) {
        parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="none" stroke="#334155" stroke-width="0.9"/>`)
      }
      if (['draai', 'draaikiep', 'deur'].includes(pType)) {
        const hx = hinge === 'left' ? sx : sx + sw
        const ox = hinge === 'left' ? sx + sw : sx
        parts.push(`<path d="M ${hx} ${sy} L ${ox} ${sy + sh / 2} L ${hx} ${sy + sh}" fill="none" stroke="#334155" stroke-width="0.9" stroke-linejoin="round"/>`)
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

      cyPos += rh + transW
    })
  })

  // Dimension labels
  parts.push(`<text x="${fx + fw / 2}" y="${fy - 10}" text-anchor="middle" font-size="11" fill="#64748b" font-family="system-ui,sans-serif">${element.widthMM} mm</text>`)
  parts.push(`<text x="${fx + fw + 14}" y="${fy + fh / 2}" text-anchor="middle" font-size="11" fill="#64748b" font-family="system-ui,sans-serif" transform="rotate(-90 ${fx + fw + 14} ${fy + fh / 2})">${element.heightMM} mm</text>`)

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

export { PANE_NAMES, RAL_NAMES }
