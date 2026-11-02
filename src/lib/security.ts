import DOMPurify from 'dompurify';

export function sanitizeNote(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

export function validateCartItem(item: { variant_id: string; unit_id: string; qty: number }) {
  if (!item.variant_id || !item.unit_id) throw new Error('Variant & unit wajib diisi');
  if (item.qty <= 0 || !Number.isInteger(item.qty)) throw new Error('Qty harus bilangan bulat positif');
  if (item.qty > 5000) throw new Error('Qty melebihi batas maksimal');
}

export async function generateVerificationChecksum(
  orderData: Record<string, unknown>,
  secret = 'PLASTIPRO_SECURE_SALT_2026'
): Promise<{ code: string; fullHash: string }> {
  try {
    const encoder = new TextEncoder();
    const payloadStr = JSON.stringify(orderData);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const fullHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const code = fullHash.substring(0, 8).toUpperCase();
    return { code, fullHash };
  } catch {
    // Fallback if crypto subtle fails in certain environments
    const mockHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    return { code: mockHash, fullHash: mockHash };
  }
}
