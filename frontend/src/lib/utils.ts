// ── Currency ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

// ── Date ──────────────────────────────────────────────────────────────────────

export function ageInDays(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Geolocation ────────────────────────────────────────────────────────────────

export function haversineDistanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Margin ─────────────────────────────────────────────────────────────────────

export function calcMargin(costPrice: number | null, sellingPrice: number): number | null {
  if (!costPrice || costPrice <= 0) return null
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)
}

// ── Reorder velocity ───────────────────────────────────────────────────────────

export function calcSuggestedQty(dailyAvg: number, currentStock: number): number {
  const suggested = Math.ceil(dailyAvg * 14) - currentStock
  return Math.max(0, suggested)
}

// ── Initials ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
