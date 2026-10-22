// Firebase Realtime Database transport for group rooms (anonymous auth, modular SDK).
// Layout: rooms/{code}/meta/createdAt, rooms/{code}/d/... (engine data), rooms/{code}/p/{uid} (presence).
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectDatabaseEmulator, get, getDatabase, onDisconnect, onValue, ref, remove, serverTimestamp, set,
  type DataSnapshot, type Database,
} from 'firebase/database';
import type { FirebaseSettings } from './config';
import type { RoomConn, Transport, Tree } from './types';

const TIMEOUT_MS = 10_000;
const MSG_SIGN_IN = 'Could not sign in to the group service. Check your connection and try again.';
const MSG_DENIED = 'The group service refused access to this room. Ask your tutor to check the database rules.';
const MSG_TIMEOUT = 'The group service did not respond. Check your connection and try again.';

function withTimeout<T>(p: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), TIMEOUT_MS);
  });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

/** RTDB may return arrays for numeric keys and may hold numbers/booleans; the engine expects string leaves. */
function normalise(v: unknown): string | Tree | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const out: Tree = {};
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      const n = normalise(child);
      if (n !== null) out[k] = n;
    }
    return out;
  }
  return String(v);
}
function toTree(snap: DataSnapshot): Tree {
  const n = normalise(snap.val());
  return n !== null && typeof n === 'object' ? n : {};
}

export function firebaseTransport(settings: FirebaseSettings): Transport {
  return {
    kind: 'firebase',
    async join(code: string): Promise<RoomConn> {
      const fresh = getApps().length === 0;
      const app = fresh ? initializeApp(settings) : getApp();
      const auth = getAuth(app);
      // Local testing against `firebase emulators:start` (dev only, see docs/group-rooms.md).
      const emulator = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR === '1';
      if (fresh && emulator) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      let uid: string;
      try {
        uid = await withTimeout(
          (async () => {
            await auth.authStateReady();
            return (auth.currentUser ?? (await signInAnonymously(auth)).user).uid;
          })(),
          MSG_TIMEOUT,
        );
      } catch (e) {
        throw e instanceof Error && e.message === MSG_TIMEOUT ? e : new Error(MSG_SIGN_IN);
      }

      const db: Database = getDatabase(app);
      if (fresh && emulator) connectDatabaseEmulator(db, '127.0.0.1', 9000);
      const base = `rooms/${code}`;
      const dRef = ref(db, `${base}/d`);
      const pRoot = ref(db, `${base}/p`);
      const myPresence = ref(db, `${base}/p/${uid}`);
      const offs: Array<() => void> = [];
      let closed = false;

      const conn: RoomConn = {
        firstSnapshot: Promise.resolve({}),
        set(path, value) {
          const r = ref(db, `${base}/d/${path.join('/')}`);
          (value === null ? remove(r) : set(r, value)).catch((e: unknown) => console.warn('Group write failed', e));
        },
        onTree(cb) {
          offs.push(onValue(dRef, (s) => cb(toTree(s))));
        },
        onPresence(cb) {
          offs.push(onValue(pRoot, (s) => cb(s.size)));
        },
        onConnection(cb) {
          offs.push(onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true)));
        },
        deleteRoom: () => remove(ref(db, base)),
        close() {
          if (closed) return;
          closed = true;
          offs.splice(0).forEach((off) => off());
          void onDisconnect(myPresence).cancel().catch(() => undefined);
          remove(myPresence).catch(() => undefined);
        },
      };

      try {
        // Re-announce presence on every (re)connect; the server drops it when this client disappears.
        offs.push(onValue(ref(db, '.info/connected'), (s) => {
          if (s.val() !== true || closed) return;
          void onDisconnect(myPresence).remove().then(() => set(myPresence, true)).catch(() => undefined);
        }));
        const first = new Promise<Tree>((resolve, reject) => {
          onValue(dRef, (s) => resolve(toTree(s)), (err) => reject(err), { onlyOnce: true });
        });
        conn.firstSnapshot = withTimeout(first, MSG_TIMEOUT);
        await conn.firstSnapshot;
        // createdAt is write-once (rules); a failure here is cosmetic, so it never blocks joining.
        const created = ref(db, `${base}/meta/createdAt`);
        await get(created).then((s) => (s.exists() ? undefined : set(created, serverTimestamp()))).catch(() => undefined);
      } catch (e) {
        conn.close();
        const denied = e instanceof Error && /permission_denied/i.test(e.message);
        throw e instanceof Error && e.message === MSG_TIMEOUT ? e : new Error(denied ? MSG_DENIED : MSG_TIMEOUT);
      }
      return conn;
    },
  };
}
