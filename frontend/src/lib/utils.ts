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

// ── WhatsApp URL ───────────────────────────────────────────────────────────────

// wa.me requires full international phone numbers without '+'.
// Vendors are commonly saved as plain 10-digit local numbers, so we prepend the
// default country code when it's missing. '91' covers the app's primary market.
const DEFAULT_COUNTRY_CODE = '91'

export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export function buildWhatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone)
  if (!normalized) return null
  const base = `https://wa.me/${normalized}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
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
