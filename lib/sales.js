export const SELLERS = [
  { key: 'matthew', name: 'Matthew' },
  { key: 'rob', name: 'Rob' },
  { key: 'kay', name: 'Kay' },
]

export function sellerName(key) {
  return SELLERS.find(s => s.key === key)?.name || key || 'Niet toegewezen'
}

export function calcPotentialCommission(amount, rate = 0.05) {
  const value = Number(amount) || 0
  return Math.round(value * rate * 100) / 100
}
