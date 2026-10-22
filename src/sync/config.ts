import type { Transport } from './types';

/** Room codes: 6 characters, no look-alikes (no 0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}
export function generateCode(): string {
  const buf = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => CODE_ALPHABET[n % CODE_ALPHABET.length]).join('');
}
export function prettyCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

const env = import.meta.env as Record<string, string | undefined>;

export interface FirebaseSettings {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

export function firebaseSettings(): FirebaseSettings | null {
  const s = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return s.apiKey && s.databaseURL && s.projectId && s.appId ? (s as FirebaseSettings) : null;
}

/**
 * Which transport this build uses. Firebase when configured; the in-browser mock
 * (same-origin tabs only) in dev when it is not; otherwise group rooms are off.
 */
export async function pickTransport(): Promise<Transport | null> {
  const fb = firebaseSettings();
  if (fb) {
    const { firebaseTransport } = await import('./firebase');
    return firebaseTransport(fb);
  }
  if (import.meta.env.DEV) {
    const { mockTransport } = await import('./mock');
    return mockTransport();
  }
  return null;
}

/** True when this build can offer group rooms at all (cheap, synchronous). */
export function syncPossible(): boolean {
  return firebaseSettings() !== null || import.meta.env.DEV;
}
