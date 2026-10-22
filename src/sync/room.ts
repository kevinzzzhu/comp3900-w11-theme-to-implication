// Group room engine: mirrors the schema's group fields between the local store and a RoomConn.
// Local-first: the store stays the source of truth for export; the room only moves values around.
import { groupFields, type FieldDef } from '../ui/schema';
import {
  applyRemote, getChecks, getRowIds, getRows, getText, newRowId, onClear, setChangeHook, setRowIds,
} from '../ui/state';
import { CODE_LENGTH, isValidCode, normaliseCode, pickTransport, syncPossible } from './config';
import type { RoomConn, Tree } from './types';

export type RoomPhase = 'off' | 'connecting' | 'live' | 'offline' | 'error';
export interface RoomState {
  phase: RoomPhase;
  code: string;
  online: number;
  message: string;
  kind: 'firebase' | 'mock' | '';
}

const STORE_KEY = 'w11:room';
const PUSH_DEBOUNCE_MS = 250;
const OWN_ECHO_MS = 20000;

let state: RoomState = { phase: 'off', code: '', online: 0, message: '', kind: '' };
const listeners = new Set<() => void>();
let conn: RoomConn | null = null;
let generation = 0;

const fieldByKey = new Map<string, FieldDef>(groupFields.map((f) => [f.key, f]));
const enc = (key: string): string => key.replace(/\./g, '_');

/** What we last pushed, so we only send what changed. Tables are keyed by row id then column. */
const lastPushed = new Map<string, string>();
const lastPushedTable = new Map<string, { ids: string[]; cells: Map<string, string> }>();
const lastApplied = new Map<string, string>();
/** Values we wrote recently; a remote echo of them must not overwrite newer typing. */
const ownRecent = new Map<string, number>();
const pushTimers = new Map<string, number>();

function setState(patch: Partial<RoomState>): void {
  state = { ...state, ...patch };
  listeners.forEach((cb) => cb());
}

export function roomState(): RoomState {
  return state;
}
export function onRoom(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function groupRoomsAvailable(): boolean {
  return syncPossible();
}
export function isGroupKey(key: string): boolean {
  return fieldByKey.has(key);
}

function remember(token: string): void {
  const now = Date.now();
  ownRecent.set(token, now);
  if (ownRecent.size > 400) {
    for (const [k, t] of ownRecent) if (now - t > OWN_ECHO_MS) ownRecent.delete(k);
  }
}
function isOwnEcho(token: string): boolean {
  const t = ownRecent.get(token);
  return t !== undefined && Date.now() - t < OWN_ECHO_MS;
}

/* ------------------------------ local -> room ------------------------------ */

function ensureRowIds(key: string, count: number): string[] {
  const ids = getRowIds(key).slice(0, count);
  let changed = ids.length !== getRowIds(key).length;
  while (ids.length < count) {
    ids.push(newRowId());
    changed = true;
  }
  if (changed) setRowIds(key, ids);
  return ids;
}

function pushKey(key: string): void {
  const f = fieldByKey.get(key);
  if (!conn || !f) return;
  if (f.kind === 'table') {
    const rows = getRows(key) ?? [];
    const ids = ensureRowIds(key, rows.length);
    const last = lastPushedTable.get(key) ?? { ids: [], cells: new Map<string, string>() };
    const cols = f.cols?.length ?? 0;
    const nextCells = new Map<string, string>();
    const writes: [string[], string | null][] = [];
    ids.forEach((id, ri) => {
      for (let c = 0; c < cols; c += 1) {
        const v = rows[ri]?.[c] ?? '';
        const ck = `${id}|${c}`;
        nextCells.set(ck, v);
        if ((last.cells.get(ck) ?? '') !== v) {
          remember(`${key}|${ck}|${v}`);
          writes.push([[enc(key), 'r', id, `c${c}`], v === '' ? null : v]);
        }
      }
    });
    for (const id of last.ids) if (!ids.includes(id)) writes.push([[enc(key), 'r', id], null]);
    if (last.ids.join(',') !== ids.join(',')) writes.push([[enc(key), 'o'], ids.length ? ids.join(',') : null]);
    // Record first: the transport echoes the tree after each write, and those echoes must see this state.
    lastPushedTable.set(key, { ids: [...ids], cells: nextCells });
    for (const [path, value] of writes) conn.set(path, value);
    return;
  }
  const v = f.kind === 'checks' ? getChecks(key, f.items?.().length ?? 0).map((b) => (b ? '1' : '0')).join('') : getText(key);
  if (lastPushed.get(key) === v) return;
  lastPushed.set(key, v);
  remember(`${key}|${v}`);
  const empty = f.kind === 'checks' ? /^0*$/.test(v) : v === '';
  conn.set([enc(key)], empty ? null : v);
}

function schedulePush(key: string): void {
  if (!conn || !fieldByKey.has(key)) return;
  const t = pushTimers.get(key);
  if (t !== undefined) window.clearTimeout(t);
  pushTimers.set(
    key,
    window.setTimeout(() => {
      pushTimers.delete(key);
      pushKey(key);
    }, PUSH_DEBOUNCE_MS),
  );
}

/* ------------------------------ room -> local ------------------------------ */

function str(v: string | Tree | undefined): string {
  return typeof v === 'string' ? v : '';
}

function remoteTable(tree: Tree, key: string, cols: number): { ids: string[]; rows: Map<string, string[]> } {
  const node = tree[enc(key)];
  const obj = typeof node === 'object' && node ? node : {};
  const order = str(obj.o) ? str(obj.o).split(',').filter(Boolean) : [];
  const rowsNode = typeof obj.r === 'object' && obj.r ? obj.r : {};
  const ids = [...order];
  for (const id of Object.keys(rowsNode).sort()) if (!ids.includes(id)) ids.push(id); // orphans from concurrent adds
  const rows = new Map<string, string[]>();
  for (const id of ids) {
    const r = rowsNode[id];
    const cells = typeof r === 'object' && r ? r : {};
    rows.set(id, Array.from({ length: cols }, (_, c) => str(cells[`c${c}`])));
  }
  return { ids: ids.filter((id) => rows.has(id)), rows };
}

function applyTable(tree: Tree, key: string, f: FieldDef): void {
  const cols = f.cols?.length ?? 0;
  const remote = remoteTable(tree, key, cols);
  const localRows = getRows(key) ?? [];
  const localIds = ensureRowIds(key, localRows.length);
  const localById = new Map<string, string[]>(localIds.map((id, i) => [id, localRows[i] ?? []]));
  const pushed = lastPushedTable.get(key);

  const outIds: string[] = [];
  const outRows: string[][] = [];
  for (const id of remote.ids) {
    const rem = remote.rows.get(id) ?? [];
    const loc = localById.get(id);
    const merged = Array.from({ length: cols }, (_, c) => {
      const rv = rem[c] ?? '';
      if (!loc) return rv;
      const lv = loc[c] ?? '';
      const unpushed = lv !== (pushed?.cells.get(`${id}|${c}`) ?? '');
      return rv === lv || unpushed || isOwnEcho(`${key}|${id}|${c}|${rv}`) ? lv : rv;
    });
    outIds.push(id);
    outRows.push(merged);
  }
  // Rows that exist only locally: keep if never pushed (new), drop if the group deleted them.
  localIds.forEach((id, i) => {
    if (outIds.includes(id)) return;
    const wasPushed = pushed?.ids.includes(id) ?? false;
    if (!wasPushed) {
      outIds.push(id);
      outRows.push(localRows[i] ?? []);
    }
  });

  const same = outIds.join(',') === localIds.join(',') && JSON.stringify(outRows) === JSON.stringify(localRows.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? '')));
  if (same) return;
  setRowIds(key, outIds);
  applyRemote(key, JSON.stringify(outRows));
  // What the group now holds is what we last saw; remember it so we do not echo it back.
  const cells = new Map<string, string>();
  outIds.forEach((id, ri) => {
    for (let c = 0; c < cols; c += 1) cells.set(`${id}|${c}`, remote.rows.get(id)?.[c] ?? (pushed?.cells.get(`${id}|${c}`) ?? ''));
  });
  lastPushedTable.set(key, { ids: remote.ids.filter((id) => outIds.includes(id)), cells });
}

/* ------------------- shared channel: data that is not a form field ------------------- */
// The galaxy keeps orb positions and added orbs under the room's "galaxy" key. Writes are
// optimistic and last-writer-wins per leaf; the page decides what each leaf means.
const sharedListeners = new Set<(galaxy: Tree) => void>();

export function sharedSet(path: string[], value: string | null): void {
  conn?.set(['galaxy', ...path], value);
}
export function onShared(cb: (galaxy: Tree) => void): () => void {
  sharedListeners.add(cb);
  return () => sharedListeners.delete(cb);
}

let sawData = false;

function handleTree(tree: Tree): void {
  const empty = Object.keys(tree).length === 0;
  if (empty && sawData) {
    // The room was deleted by someone in the group. Keep every local copy; do not let "empty" wipe them.
    leaveRoom();
    setState({ phase: 'error', message: 'This room was deleted by someone in your group. Your own copy on this device is kept.' });
    return;
  }
  if (!empty) sawData = true;
  const galaxy = tree.galaxy;
  const galaxyTree: Tree = typeof galaxy === 'object' && galaxy ? galaxy : {};
  sharedListeners.forEach((cb) => cb(galaxyTree));
  for (const f of groupFields) {
    if (f.kind === 'table') {
      applyTable(tree, f.key, f);
      continue;
    }
    const remote = str(tree[enc(f.key)]);
    if (lastApplied.get(f.key) === remote) continue;
    lastApplied.set(f.key, remote);
    const local = f.kind === 'checks' ? getChecks(f.key, f.items?.().length ?? 0).map((b) => (b ? '1' : '0')).join('') : getText(f.key);
    if (remote === local || isOwnEcho(`${f.key}|${remote}`) || pushTimers.has(f.key)) continue;
    if (f.kind === 'checks') {
      const n = f.items?.().length ?? 0;
      applyRemote(f.key, Array.from({ length: n }, (_, i) => (remote[i] === '1' ? '1' : '0')).join(''));
    } else {
      applyRemote(f.key, remote);
    }
    lastPushed.set(f.key, remote);
  }
}

/** First contact with a room: what the group already holds replaces our copy; fields it lacks are offered to it. */
function reconcileFirst(tree: Tree): void {
  for (const f of groupFields) {
    const node = tree[enc(f.key)];
    const has = node !== undefined && (typeof node === 'string' || Object.keys(node).length > 0);
    if (f.kind === 'table') {
      if (has) {
        const cols = f.cols?.length ?? 0;
        const remote = remoteTable(tree, f.key, cols);
        setRowIds(f.key, remote.ids);
        applyRemote(f.key, JSON.stringify(remote.ids.map((id) => remote.rows.get(id) ?? [])));
        const cells = new Map<string, string>();
        remote.ids.forEach((id) => {
          for (let c = 0; c < cols; c += 1) cells.set(`${id}|${c}`, remote.rows.get(id)?.[c] ?? '');
        });
        lastPushedTable.set(f.key, { ids: [...remote.ids], cells });
      } else if ((getRows(f.key) ?? []).some((r) => r.some((c) => c.trim() !== ''))) {
        pushKey(f.key);
      }
      continue;
    }
    if (has) {
      const remote = str(node);
      lastApplied.set(f.key, remote);
      lastPushed.set(f.key, remote);
      const n = f.items?.().length ?? 0;
      applyRemote(f.key, f.kind === 'checks' ? Array.from({ length: n }, (_, i) => (remote[i] === '1' ? '1' : '0')).join('') : remote);
    } else {
      lastApplied.set(f.key, '');
      const local = f.kind === 'checks' ? getChecks(f.key, f.items?.().length ?? 0).some(Boolean) : getText(f.key) !== '';
      if (local) pushKey(f.key);
    }
  }
}

/* ------------------------------ join / leave ------------------------------ */

function saveCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(STORE_KEY, code);
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

function resetSyncMemory(): void {
  sawData = false;
  lastPushed.clear();
  lastPushedTable.clear();
  lastApplied.clear();
  ownRecent.clear();
  pushTimers.forEach((t) => window.clearTimeout(t));
  pushTimers.clear();
}

export async function joinRoom(raw: string): Promise<void> {
  const code = normaliseCode(raw);
  if (!isValidCode(code)) {
    setState({ phase: 'error', message: `A group code has ${CODE_LENGTH} letters and numbers (no I, L, O, 0 or 1), for example K7M-3QX.` });
    return;
  }
  if (conn) leaveRoom(false);
  const mine = ++generation;
  setState({ phase: 'connecting', code, online: 0, message: '', kind: '' });
  try {
    const transport = await pickTransport();
    if (!transport) throw new Error('Group rooms are not set up on this site.');
    const c = await transport.join(code);
    if (mine !== generation) {
      c.close();
      return;
    }
    conn = c;
    const snapshot = await c.firstSnapshot;
    if (mine !== generation) return;

    // First contact: the group's values win; anything only we have is offered to the group.
    resetSyncMemory();
    sawData = Object.keys(snapshot).length > 0;
    reconcileFirst(snapshot);

    c.onTree(handleTree);
    c.onPresence((n) => setState({ online: n }));
    c.onConnection((online) => setState({ phase: online ? 'live' : 'offline' }));
    setChangeHook(schedulePush);
    saveCode(code);
    setState({ phase: 'live', kind: transport.kind, message: '' });
  } catch (err) {
    if (mine !== generation) return;
    conn?.close();
    conn = null;
    setChangeHook(null);
    setState({ phase: 'error', message: err instanceof Error ? err.message : 'Could not join the group room.' });
  }
}

export function leaveRoom(clearSaved = true): void {
  generation += 1;
  conn?.close();
  conn = null;
  setChangeHook(null);
  resetSyncMemory();
  if (clearSaved) saveCode(null);
  setState({ phase: 'off', code: '', online: 0, message: '', kind: '' });
}

export async function deleteRoomData(): Promise<void> {
  const c = conn;
  if (!c) return;
  try {
    await c.deleteRoom();
  } finally {
    leaveRoom();
  }
}

/** Rejoin the room this browser was in before a reload. */
export function restoreRoom(): void {
  if (!syncPossible()) return;
  let code = '';
  try {
    code = localStorage.getItem(STORE_KEY) ?? '';
  } catch {
    /* ignore */
  }
  if (isValidCode(code)) void joinRoom(code);
}

// "Clear all" also leaves the room; it never deletes what the group wrote.
onClear(() => leaveRoom());
