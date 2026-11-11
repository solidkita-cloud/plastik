import DOMPurify from 'dompurify';

const PBKDF2_PREFIX = 'pbkdf2_v1';
const PBKDF2_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 menit
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 jam

const LOCKOUT_STORAGE_KEY = 'plastipro_auth_lockout_v1';
const SESSION_STORAGE_KEY = 'plastipro_auth_session_v1';
const AUDIT_LOG_KEY = 'plastipro_security_audit_logs_v1';

// Hash bawaan tersandi PBKDF2-HMAC-SHA256 (100.000 iterasi, tanpa plaintext di kode)
export const DEFAULT_AUTH_HASHES = {
  ownerHash:
    'pbkdf2_v1$72eab3e5afd8d649eb46a4a1d110fa9e$943dfc868b6757cdca81af114b04e133be7730c21dc28a760b1d6fd3da1ffbfc',
  cashierHash:
    'pbkdf2_v1$ce0a71a0d598f493b96ab4646c79815a$b09e69cc01e2e88f9a0aad5d00fe1f2b0f2a004b296864e9826621ea937d7660'
} as const;

export type AuthRole = 'owner' | 'cashier';

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
    const fullHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    const code = fullHash.substring(0, 8).toUpperCase();
    return { code, fullHash };
  } catch {
    const mockHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    return { code: mockHash, fullHash: mockHash };
  }
}

// ------------------------------------------------------------------
// PBKDF2-HMAC-SHA256 Password / PIN Hashing & Verification
// ------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isHashFormat(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^pbkdf2_v1\$[0-9a-f]{32}\$[0-9a-f]{64}$/i.test(val.trim());
}

async function derivePbkdf2Hex(plainText: string, saltBytes: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plainText.trim()),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

export async function hashPassword(plainText: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = bytesToHex(saltBytes);
  const hashHex = await derivePbkdf2Hex(plainText, saltBytes);
  return `${PBKDF2_PREFIX}$${saltHex}$${hashHex}`;
}

export async function verifyPassword(inputPin: string, storedValue?: string | null): Promise<boolean> {
  if (!inputPin || !storedValue) return false;
  const cleanInput = inputPin.trim();
  const cleanStored = storedValue.trim();

  if (cleanStored.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = cleanStored.split('$');
    if (parts.length !== 3) return false;
    const saltBytes = hexToBytes(parts[1]);
    const expectedHex = parts[2].toLowerCase();
    if (!saltBytes || !/^[0-9a-f]{64}$/i.test(expectedHex)) return false;
    try {
      const derivedHex = await derivePbkdf2Hex(cleanInput, saltBytes);
      return timingSafeEqualStr(derivedHex, expectedHex);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Verifies against PBKDF2 hash if present, or migrates seamlessly from legacy plaintext ownerPin.
 */
export async function verifyOwnerOrCashierPin(params: {
  inputPin: string;
  targetRole: AuthRole;
  ownerPinHash?: string;
  cashierPinHash?: string;
  legacyOwnerPin?: string;
}): Promise<{ valid: boolean; needsMigration: boolean }> {
  const cleanInput = params.inputPin.trim();
  if (!cleanInput) return { valid: false, needsMigration: false };

  if (params.targetRole === 'cashier') {
    const activeHash = params.cashierPinHash || DEFAULT_AUTH_HASHES.cashierHash;
    const valid = await verifyPassword(cleanInput, activeHash);
    return { valid, needsMigration: false };
  }

  // Owner verification
  if (params.ownerPinHash && isHashFormat(params.ownerPinHash)) {
    const valid = await verifyPassword(cleanInput, params.ownerPinHash);
    return { valid, needsMigration: false };
  }

  // Legacy plaintext compatibility + auto-upgrade signal
  if (params.legacyOwnerPin && timingSafeEqualStr(cleanInput, params.legacyOwnerPin.trim())) {
    return { valid: true, needsMigration: true };
  }

  const defaultValid = await verifyPassword(cleanInput, DEFAULT_AUTH_HASHES.ownerHash);
  return { valid: defaultValid, needsMigration: defaultValid };
}

// ------------------------------------------------------------------
// CSV Formula Injection Defense
// ------------------------------------------------------------------

export function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const trimmedStart = raw.replace(/^[\u0000-\u001F\s]+/, '');
  const dangerousStart = /^[=+\-@\t\r]/.test(raw) || /^[=+\-@]/.test(trimmedStart);
  const safe = dangerousStart ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvRow(cells: unknown[]): string {
  return cells.map((c) => sanitizeCsvCell(c)).join(',');
}

// ------------------------------------------------------------------
// Rate Limiter / Lockout Anti Brute-Force
// ------------------------------------------------------------------

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
}

export function checkLoginAttempts(): LockoutStatus {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attempts: 0 };

    const data = JSON.parse(raw);
    const now = Date.now();

    if (data.lockedUntil && data.lockedUntil > now) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attempts: data.attempts || MAX_FAILED_ATTEMPTS };
    }

    if (data.lockedUntil && data.lockedUntil <= now) {
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }

    return { isLocked: false, remainingSeconds: 0, attempts: data.attempts || 0 };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
}

export function recordFailedAttempt(): LockoutStatus {
  try {
    const current = checkLoginAttempts();
    const newAttempts = current.attempts + 1;
    const now = Date.now();

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(
        LOCKOUT_STORAGE_KEY,
        JSON.stringify({ attempts: newAttempts, lockedUntil })
      );
      logSecurityEvent(
        'LOCKOUT_TRIGGERED',
        `Terkunci 10 menit karena ${newAttempts}x gagal login berturut-turut.`,
        'ALERT'
      );
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        attempts: newAttempts
      };
    }

    localStorage.setItem(
      LOCKOUT_STORAGE_KEY,
      JSON.stringify({ attempts: newAttempts, lockedUntil: null })
    );
    return { isLocked: false, remainingSeconds: 0, attempts: newAttempts };
  } catch {
    return { isLocked: false, remainingSeconds: 0, attempts: 1 };
  }
}

export function resetLoginAttempts(): void {
  try {
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
  } catch {}
}

// ------------------------------------------------------------------
// Cryptographic RBAC Session Management
// ------------------------------------------------------------------

export interface AuthSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  role: AuthRole;
}

export function createAuthSession(role: AuthRole = 'owner'): AuthSession {
  const rnd = crypto.getRandomValues(new Uint8Array(16));
  const token = `plasti_sec_${Date.now()}_${bytesToHex(rnd)}`;
  const now = Date.now();
  const session: AuthSession = {
    token,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
    role
  };
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {}
  return session;
}

export function getAuthSessionRole(): AuthRole | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.token || !session.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session.role === 'cashier' ? 'cashier' : 'owner';
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

// ------------------------------------------------------------------
// Security & Operational Audit Logging
// ------------------------------------------------------------------

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOCKOUT_TRIGGERED'
    | 'PIN_CHANGED'
    | 'HPP_UPDATED'
    | 'ORDER_VOIDED'
    | 'PRINT_REPRINT'
    | 'CLOSING_RECAP'
    | 'BACKUP_EXPORTED'
    | 'BACKUP_RESTORED'
    | 'DATA_CLEARED'
    | 'SETTINGS_UPDATED';
  details: string;
  severity: 'INFO' | 'WARN' | 'ALERT';
}

export function logSecurityEvent(
  action: SecurityAuditEntry['action'],
  details: string,
  severity: SecurityAuditEntry['severity'] = 'INFO'
): void {
  try {
    const existing = getSecurityAuditLogs();
    const newEntry: SecurityAuditEntry = {
      id: `SEC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      severity
    };
    const updated = [newEntry, ...existing].slice(0, 60);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('plastipro_security_log_updated'));
    }
  } catch {}
}

export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSecurityAuditLogs(): void {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('plastipro_security_log_updated'));
    }
  } catch {}
}
