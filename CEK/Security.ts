import DOMPurify from 'dompurify'

export function sanitizeNote(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

export function validateCartItem(item: { variant_id: string, unit_id: string, qty: number }) {
  if (!item.variant_id || !item.unit_id) throw new Error('Variant & unit wajib')
  if (item.qty <= 0 || !Number.isInteger(item.qty)) throw new Error('Qty harus integer >0')
  if (item.qty > 1000) throw new Error('Qty melebihi batas')
}
