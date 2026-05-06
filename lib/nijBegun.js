export const NIJ_BEGUN_SOURCE_URL =
  'https://www.nijbegun.nl/onderwerpen/isolatie/bedrijven/maatregelencatalogus/'

export const NIJ_BEGUN_CATALOG_VERSION = '24 november 2025'

export const NIJ_BEGUN_REQUIRED_SENTENCE =
  'Deze offerte voldoet aan de voorwaarden van de maximale prijzen zoals deze zijn vastgesteld in de Maatregelencatalogus van de isolatieaanpak Nij Begun.'

export const NIJ_BEGUN_MEASURES = {
  TRIPLE_KUNSTSTOF_KOZIJN: {
    code: 'V2-4-D1',
    title: 'Vervangen houten kozijn door kunststof kozijn met triple glas (30% subsidiabel)',
    unit: 'm2',
    value: 'HR+++ / triple glas, Ug circa 0.5',
    maxPriceIncl: 1112.078572,
  },
  TRIPLE_KUNSTSTOF_NAAR_KUNSTSTOF: {
    code: 'V2-4-B1',
    title: 'Vervangen kunststof kozijn door kunststof kozijn met triple glas (30% subsidiabel)',
    unit: 'm2',
    value: 'HR+++ / triple glas, Ug circa 0.5',
    maxPriceIncl: 1024.544752,
  },
  VOORDEUR: {
    code: 'V2-1-B1',
    title: 'Vervangen ongeisoleerde buitendeur door geisoleerde deur (voordeur)',
    unit: 'm2',
    value: 'isolerende deur, isolatieglas U=1.2 waar van toepassing',
    maxPriceIncl: 1411.6311617682197,
  },
  ACHTER_TUINDEUR: {
    code: 'V2-1-A1',
    title: 'Vervangen ongeisoleerde buitendeur door geisoleerde deur (achter/tuindeur)',
    unit: 'm2',
    value: 'isolerende deur, isolatieglas U=1.2 waar van toepassing',
    maxPriceIncl: 1012.7459303266739,
  },
  KOZIJNPANEEL: {
    code: 'V2-2-A1',
    title: 'Vervangen ongeisoleerd kozijnpaneel door geisoleerd kozijnpaneel',
    unit: 'm2',
    value: 'Rc 1.20 m2.K/W',
    maxPriceIncl: 176.67585100000005,
  },
  MAT_GLAS: {
    code: 'V2-3-X8',
    title: 'Toeslag Gefigureerd Glas / Matte folie',
    unit: 'p/ruit',
    value: 'matte glasafwerking',
    maxPriceIncl: 90.75,
  },
  VEILIGHEIDSGLAS: {
    code: 'V2-3-X9',
    title: 'Toeslag Veiligheidglas',
    unit: 'm2',
    value: 'gelaagd / veiligheidsglas',
    maxPriceIncl: 54.45,
  },
  VENTILATIEROOSTER: {
    code: 'V2-3-X7',
    title: 'Ventilatieroosters naturel',
    unit: 'cm1',
    value: 'ventilatierooster',
    maxPriceIncl: 1.5125,
  },
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round((Number(value) || 0) * factor) / factor
}

function parseConfig(config) {
  if (!config) return null
  if (typeof config === 'string') {
    try {
      return JSON.parse(config)
    } catch {
      return null
    }
  }
  return config
}

function isDoorPaneType(type) {
  return type === 'deur' || type === 'deur2'
}

function isMatteGlassFinish(value) {
  return ['satinato', 'milk', 'melkglas'].includes(String(value || '').toLowerCase())
}

function dims(el) {
  return {
    width: Number(el?.widthMM ?? el?.dimensions?.widthMM) || 0,
    height: Number(el?.heightMM ?? el?.dimensions?.heightMM) || 0,
  }
}

function elementAreaM2(el) {
  const d = dims(el)
  return (d.width * d.height) / 1000000
}

function rowAreaM2(el, col, row) {
  const d = dims(el)
  const widthPct = Number(col?.widthPct) || 100
  const heightPct = Number(row?.heightPct) || 100
  return (d.width * widthPct / 100) * (d.height * heightPct / 100) / 1000000
}

function normalizeDoorPanels(panels, fallbackFill = 'panel') {
  const source = Array.isArray(panels) && panels.length ? panels : [{ heightPct: 100, fill: fallbackFill }]
  const sum = source.reduce((total, panel) => total + (Number(panel.heightPct) || 0), 0) || 100
  return source.map(panel => ({
    ...panel,
    fill: panel.fill === 'glass' ? 'glass' : 'panel',
    heightPct: ((Number(panel.heightPct) || 0) / sum) * 100,
  }))
}

function glassUnits(el) {
  const cols = el?.columns || []
  const units = []

  cols.forEach(col => {
    ;(col.rows || []).forEach(row => {
      const area = rowAreaM2(el, col, row)
      if (isDoorPaneType(row.paneType)) {
        const panels = normalizeDoorPanels(row.doorPanels || el.doorPanels, row.fill === 'glass' ? 'glass' : 'panel')
        panels.forEach(panel => {
          if (panel.fill === 'glass') {
            units.push({
              area: area * (panel.heightPct / 100),
              glassPack: panel.glassPack || row.glassPack || 'HR++',
              glassFinish: panel.glassFinish || row.glassFinish || 'clear',
              gelaagd: !!panel.gelaagd || !!row.gelaagd,
              paneType: row.paneType,
            })
          }
        })
        return
      }

      if (row.fill !== 'panel' && row.paneType !== 'vent') {
        units.push({
          area,
          glassPack: row.glassPack || 'HR++',
          glassFinish: row.glassFinish || 'clear',
          gelaagd: !!row.gelaagd,
          paneType: row.paneType,
        })
      }
    })
  })

  return units
}

function panelAreaM2(el) {
  const cols = el?.columns || []
  let area = 0

  cols.forEach(col => {
    ;(col.rows || []).forEach(row => {
      const rowArea = rowAreaM2(el, col, row)
      if (isDoorPaneType(row.paneType)) {
        return
      }
      if (row.fill === 'panel') area += rowArea
    })
  })

  return area
}

function ventilationLengthCm(el) {
  const d = dims(el)
  let total = 0
  ;(el?.columns || []).forEach(col => {
    ;(col.rows || []).forEach(row => {
      if (row.paneType === 'vent') total += (d.width * (Number(col.widthPct) || 100) / 100) / 10
    })
  })
  return total
}

function measureRow(measure, quantity, extra = {}) {
  const qty = Math.max(0, Number(quantity) || 0)
  return {
    code: measure.code,
    title: measure.title,
    unit: measure.unit,
    quantity: round(qty, measure.unit === 'p/ruit' ? 0 : 2),
    value: measure.value,
    maxPriceIncl: round(measure.maxPriceIncl, 2),
    maxTotalIncl: round(qty * measure.maxPriceIncl, 2),
    ...extra,
  }
}

function warningRow(message, extra = {}) {
  return {
    code: 'Controle',
    title: message,
    unit: '',
    quantity: '',
    value: 'Handmatige controle nodig',
    maxPriceIncl: 0,
    maxTotalIncl: 0,
    warning: true,
    ...extra,
  }
}

export function hasNijBegunEnabled(config) {
  const el = parseConfig(config)
  return !!el?.nijBegun?.enabled
}

export function getNijBegunSettingsFromItems(items = []) {
  for (const item of items) {
    const cfg = parseConfig(item?.element_config)
    if (cfg?.nijBegun?.enabled) return cfg.nijBegun
  }
  return null
}

export function buildNijBegunMeasuresForElement(config, item = {}) {
  const el = parseConfig(config)
  if (!hasNijBegunEnabled(el)) return []

  const quantity = Number(item.quantity ?? el.qty) || 1
  const area = elementAreaM2(el) * quantity
  const glass = glassUnits(el)
  const hasTriple = glass.some(unit => ['HR+++', 'Triple'].includes(String(unit.glassPack || '').trim()))
  const rows = []

  if (el.type === 'deur') {
    const subtype = el.doorSubtype || 'voordeur'
    rows.push(measureRow(
      subtype === 'voordeur' ? NIJ_BEGUN_MEASURES.VOORDEUR : NIJ_BEGUN_MEASURES.ACHTER_TUINDEUR,
      area,
      { category: 1 }
    ))
  } else if (hasTriple) {
    const existingFrame = el.nijBegun?.existingFrameMaterial || 'unknown'
    if (existingFrame === 'wood') {
      rows.push(measureRow(NIJ_BEGUN_MEASURES.TRIPLE_KUNSTSTOF_KOZIJN, area, { category: 1 }))
    } else if (existingFrame === 'plastic') {
      rows.push(measureRow(NIJ_BEGUN_MEASURES.TRIPLE_KUNSTSTOF_NAAR_KUNSTSTOF, area, { category: 1 }))
    } else {
      rows.push(warningRow('Bestaand kozijnmateriaal ontbreekt voor automatische V2-4-code.', { category: 1 }))
    }
  } else if (glass.length) {
    rows.push(warningRow('Geen automatische Nij Begun hoofdcode: kies HR+++ / Triple glas of controleer de maatregel handmatig.', { category: 1 }))
  }

  const panels = panelAreaM2(el) * quantity
  if (panels > 0.01) rows.push(measureRow(NIJ_BEGUN_MEASURES.KOZIJNPANEEL, panels, { category: 1 }))

  const gelaagdArea = glass.filter(unit => unit.gelaagd).reduce((sum, unit) => sum + unit.area, 0) * quantity
  if (gelaagdArea > 0.01) rows.push(measureRow(NIJ_BEGUN_MEASURES.VEILIGHEIDSGLAS, gelaagdArea, { category: 2 }))

  const matteCount = glass.filter(unit => isMatteGlassFinish(unit.glassFinish)).length * quantity
  if (matteCount > 0) rows.push(measureRow(NIJ_BEGUN_MEASURES.MAT_GLAS, matteCount, { category: 2 }))

  const ventCm = ventilationLengthCm(el) * quantity
  if (ventCm > 0.01) rows.push(measureRow(NIJ_BEGUN_MEASURES.VENTILATIEROOSTER, ventCm, { category: 2 }))

  return rows.map(row => ({
    ...row,
    elementName: el.name || 'Element',
    elementType: el.type || 'kozijn',
    itemId: item.id || el.id,
  }))
}

export function buildNijBegunSummaryForItems(items = []) {
  const rows = []
  let quotedIncl = 0

  items.forEach(item => {
    const cfg = parseConfig(item?.element_config)
    if (!hasNijBegunEnabled(cfg)) return
    quotedIncl += (Number(item.unit_price) || 0) * (Number(item.quantity) || 1) * 1.21
    rows.push(...buildNijBegunMeasuresForElement(cfg, item))
  })

  const catalogMaxIncl = rows.reduce((sum, row) => sum + (row.warning ? 0 : Number(row.maxTotalIncl) || 0), 0)
  const settings = getNijBegunSettingsFromItems(items)
  const warnings = rows.filter(row => row.warning).map(row => row.title)

  if (settings?.isolationPlan === 'no_under_10000' && quotedIncl > 10000) {
    warnings.push('Totaal is hoger dan EUR 10.000; volgens de handleiding is dan alsnog een isolatieplan nodig.')
  }

  return {
    enabled: rows.length > 0,
    settings,
    rows,
    catalogMaxIncl: round(catalogMaxIncl, 2),
    quotedIncl: round(quotedIncl, 2),
    ownContributionIncl: round(Math.max(0, quotedIncl - catalogMaxIncl), 2),
    warnings: [...new Set(warnings)],
  }
}

export function appendNijBegunCodeToDescription(description, config) {
  if (String(description || '').includes('Nij Begun:')) return description
  const rows = buildNijBegunMeasuresForElement(config)
  const codes = [...new Set(rows.filter(row => !row.warning).map(row => row.code))]
  if (!codes.length) return description
  return `${description} | Nij Begun: ${codes.join(', ')}`
}
