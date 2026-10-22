import { schema } from './schema';

const PREFIX = 'w11:';
const DEBOUNCE_MS = 400;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const mem = new Map<string, string>();
const loaded = new Set<string>();
const dirty = new Set<string>();
let timer: number | undefined;
let status: SaveStatus = 'idle';
let lastSaved: Date | null = null;
const statusListeners = new Set<(s: SaveStatus, at: Date | null) => void>();
const clearListeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function setStatus(s: SaveStatus): void {
  status = s;
  statusListeners.forEach((cb) => cb(status, lastSaved));
}

function read(key: string): string {
  if (!loaded.has(key)) {
    loaded.add(key);
    try {
      const v = storage()?.getItem(PREFIX + key);
      if (typeof v === 'string' && !mem.has(key)) mem.set(key, v);
    } catch {
      /* in-memory fallback */
    }
  }
  return mem.get(key) ?? '';
}

function flush(): void {
  timer = undefined;
  if (dirty.size === 0) return;
  let ok = true;
  const ls = storage();
  for (const key of dirty) {
    const value = mem.get(key) ?? '';
    try {
      if (!ls) throw new Error('no storage');
      if (value === '') ls.removeItem(PREFIX + key);
      else ls.setItem(PREFIX + key, value);
    } catch {
      ok = false;
    }
  }
  dirty.clear();
  if (ok) lastSaved = new Date();
  setStatus(ok ? 'saved' : 'error');
}

/** Called after every local edit so a joined group room can push it. Remote applies do not call it. */
let changeHook: ((key: string) => void) | null = null;
export function setChangeHook(fn: ((key: string) => void) | null): void {
  changeHook = fn;
}

const keyListeners = new Map<string, Set<() => void>>();
/** Be told when a remote edit changes this key. Return value unsubscribes. */
export function subscribeKey(key: string, cb: () => void): () => void {
  let set = keyListeners.get(key);
  if (!set) keyListeners.set(key, (set = new Set()));
  set.add(cb);
  return () => set!.delete(cb);
}

function write(key: string, value: string): void {
  loaded.add(key);
  mem.set(key, value);
  dirty.add(key);
  setStatus('saving');
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(flush, DEBOUNCE_MS);
}

export function getText(key: string): string {
  return read(key);
}
export function setText(key: string, value: string): void {
  write(key, value);
  changeHook?.(key);
}

/** Store a value that arrived from a group room, then tell the fields showing it. */
export function applyRemote(key: string, value: string): void {
  write(key, value);
  keyListeners.get(key)?.forEach((cb) => cb());
}

/** Stable row ids, so a group can merge table edits row by row. Kept next to the table, never exported. */
export function getRowIds(key: string): string[] {
  try {
    const raw = read(`${key}#ids`);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
export function setRowIds(key: string, ids: string[]): void {
  write(`${key}#ids`, JSON.stringify(ids));
}
export function newRowId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getRows(key: string): string[][] | null {
  const raw = read(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []));
  } catch {
    return null;
  }
}
export function setRows(key: string, rows: string[][]): void {
  write(key, JSON.stringify(rows));
  changeHook?.(key);
}

/** Checkbox sets are stored as a string of 0/1 characters. */
export function getChecks(key: string, n: number): boolean[] {
  const raw = read(key);
  return Array.from({ length: n }, (_, i) => raw[i] === '1');
}
export function setChecks(key: string, values: boolean[]): void {
  write(key, values.map((v) => (v ? '1' : '0')).join(''));
  changeHook?.(key);
}

export function onStatus(cb: (s: SaveStatus, at: Date | null) => void): () => void {
  statusListeners.add(cb);
  cb(status, lastSaved);
  return () => statusListeners.delete(cb);
}
export function onClear(cb: () => void): () => void {
  clearListeners.add(cb);
  return () => clearListeners.delete(cb);
}

export function flushNow(): void {
  if (timer !== undefined) window.clearTimeout(timer);
  flush();
}

export function clearAll(): void {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
  dirty.clear();
  mem.clear();
  loaded.clear();
  try {
    const ls = storage();
    if (ls) {
      const keys: string[] = [];
      for (let i = 0; i < ls.length; i += 1) {
        const k = ls.key(i);
        if (k && k.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => ls.removeItem(k));
    }
  } catch {
    /* ignore */
  }
  lastSaved = null;
  setStatus('idle');
  clearListeners.forEach((cb) => cb());
}

function cell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim();
}

export function toMarkdown(): string {
  const out: string[] = ['# Week 11: From Theme to Implication (my notes)', '', `Exported ${new Date().toLocaleString()}`, ''];
  for (const section of schema) {
    const parts: string[] = [];
    for (const f of section.fields) {
      if (f.kind === 'text') {
        const v = getText(f.key).trim();
        if (v) parts.push(`### ${f.label}`, '', v, '');
      } else if (f.kind === 'table') {
        const rows = (getRows(f.key) ?? []).filter((r) => r.some((c) => c.trim() !== ''));
        const cols = f.cols ?? [];
        const meaningful = f.key === 't2.matrix' ? rows.filter((r) => r.slice(1).some((c) => c.trim() !== '')) : rows;
        if (meaningful.length && cols.length) {
          parts.push(`### ${f.label}`, '', `| ${cols.map(cell).join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`);
          for (const r of meaningful) {
            parts.push(`| ${cols.map((_, i) => cell(r[i] ?? '')).join(' | ')} |`);
          }
          parts.push('');
        }
      } else {
        const items = f.items ? f.items() : [];
        const state = getChecks(f.key, items.length);
        if (items.length && state.some(Boolean)) {
          parts.push(`### ${f.label}`, '');
          items.forEach((it, i) => parts.push(`- [${state[i] ? 'x' : ' '}] ${it}`));
          parts.push('');
        }
      }
    }
    if (parts.length) out.push(`## ${section.title}`, '', ...parts);
  }
  if (out.length <= 4) out.push('_Nothing saved yet._', '');
  return out.join('\n');
}

export function hasAnyData(): boolean {
  return toMarkdown().indexOf('_Nothing saved yet._') === -1;
}

window.addEventListener('pagehide', flushNow);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushNow();
});
