// Alle fases van een order, van offerte tot oplevering
export const PHASES = [
  {
    id: 0,
    key: 'offerte',
    adminLabel: 'Offerte verstuurd',
    customerTitle: 'Uw offerte',
    badgeClass: 'badge-offerte',
    // Geeft een waarschuwingstekst terug als actie nodig is
    actionNeeded: (order) => {
      if (!order.quote_expires_at) return null
      const daysLeft = Math.ceil((new Date(order.quote_expires_at) - new Date()) / 86400000)
      if (daysLeft < 0) return 'Offerte verlopen'
      if (daysLeft <= 3) return `Verloopt over ${daysLeft} dag${daysLeft !== 1 ? 'en' : ''}`
      return null
    },
  },
  {
    id: 1,
    key: 'akkoord',
    adminLabel: 'Akkoord ontvangen',
    customerTitle: 'Akkoord bevestigd',
    badgeClass: 'badge-deposit',
    actionNeeded: (order) => order.deposit_confirmed ? null : 'Aanbetaling verwacht',
  },
  {
    id: 2,
    key: 'aanbetaling',
    adminLabel: 'Aanbetaling ontvangen',
    customerTitle: 'Aanbetaling ontvangen',
    badgeClass: 'badge-deposit',
    actionNeeded: () => null,
  },
  {
    id: 3,
    key: 'productie',
    adminLabel: 'In productie',
    customerTitle: 'Kozijnen in productie',
    badgeClass: 'badge-productie',
    actionNeeded: () => null,
  },
  {
    id: 4,
    key: 'geleverd',
    adminLabel: 'Geleverd bij EcoPro',
    customerTitle: 'Kozijnen geleverd',
    badgeClass: 'badge-productie',
    actionNeeded: () => 'Montage inplannen',
  },
  {
    id: 5,
    key: 'montage_gepland',
    adminLabel: 'Montage ingepland',
    customerTitle: 'Montage ingepland',
    badgeClass: 'badge-montage',
    actionNeeded: () => null,
  },
  {
    id: 6,
    key: 'montage_klaar',
    adminLabel: 'Montage afgerond',
    customerTitle: 'Montage afgerond',
    badgeClass: 'badge-montage',
    actionNeeded: (order) => {
      if (!order.main_payment_confirmed) return 'Betaling na montage open'
      if (order.payment_split === 'split_70_10' && !order.final_payment_confirmed) {
        const openDefects = (order.defects || []).filter(d => d.status === 'open').length
        if (openDefects > 0) return `${openDefects} bevinding${openDefects !== 1 ? 'en' : ''} open`
        return 'Slotbetaling (10%) open'
      }
      return null
    },
  },
  {
    id: 7,
    key: 'compleet',
    adminLabel: 'Oplevering compleet',
    customerTitle: 'Oplevering compleet',
    badgeClass: 'badge-compleet',
    actionNeeded: () => null,
  },
]

// Haal een fase op basis van ID
export function getPhase(id) {
  return PHASES.find(p => p.id === id) || PHASES[0]
}

// Klantzijde: 5 visuele stappen (meerdere fases per stap)
export const CUSTOMER_STEPS = [
  { label: 'Offerte',      phases: [0, 1] },
  { label: 'Aanbetaling',  phases: [2] },
  { label: 'Productie',    phases: [3, 4] },
  { label: 'Montage',      phases: [5, 6] },
  { label: 'Oplevering',   phases: [7] },
]

// Welke klant-stap hoort bij een fase?
export function getCustomerStep(phaseId) {
  return CUSTOMER_STEPS.findIndex(step => step.phases.includes(phaseId))
}

// Bereken de aanbetaling (20% van totaal)
export function calcDeposit(total) {
  return Math.round(total * 0.2 * 100) / 100
}

// Bereken het hoofdbedrag (70% of 80% van totaal)
export function calcMain(total, split) {
  const pct = split === 'split_70_10' ? 0.7 : 0.8
  return Math.round(total * pct * 100) / 100
}

// Bereken slotbetaling (10% van totaal, alleen bij split)
export function calcFinal(total) {
  return Math.round(total * 0.1 * 100) / 100
}

// Formatteer bedrag als euro
export function formatEuro(amount) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount || 0)
}

// Formatteer datum als leesbare Nederlandse datum
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Korte datum
export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short',
  })
}
