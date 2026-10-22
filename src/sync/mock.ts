// Dev-only transport: rooms live in localStorage and sync between tabs of the same browser
// through BroadcastChannel. It lets the whole group flow be tested without a Firebase project.
import { cloneTree, setPath } from './tree';
import type { RoomConn, Transport, Tree } from './types';

const ROOM_KEY = (code: string): string => `w11mock:room:${code}`;
const HEARTBEAT_MS = 2000;
const STALE_MS = 6000;

interface MockRoom {
  d: Tree;
  p: Record<string, number>;
}

function load(code: string): MockRoom {
  try {
    const raw = localStorage.getItem(ROOM_KEY(code));
    if (raw) return JSON.parse(raw) as MockRoom;
  } catch {
    /* start empty */
  }
  return { d: {}, p: {} };
}

function save(code: string, room: MockRoom): void {
  try {
    localStorage.setItem(ROOM_KEY(code), JSON.stringify(room));
  } catch {
    /* ignore */
  }
}

export function mockTransport(): Transport {
  const clientId = Math.random().toString(36).slice(2, 10);
  return {
    kind: 'mock',
    async join(code: string, opts?: { watch?: boolean }): Promise<RoomConn> {
      const watch = opts?.watch === true;
      const channel = new BroadcastChannel('w11mock');
      const treeCbs: ((t: Tree) => void)[] = [];
      const presenceCbs: ((n: number) => void)[] = [];
      const connCbs: ((o: boolean) => void)[] = [];

      const countPresence = (room: MockRoom): number => {
        const now = Date.now();
        return Object.values(room.p).filter((t) => now - t < STALE_MS).length;
      };
      const emit = (): void => {
        const room = load(code);
        treeCbs.forEach((cb) => cb(cloneTree(room.d)));
        presenceCbs.forEach((cb) => cb(countPresence(room)));
      };
      const beat = (): void => {
        if (watch) {
          emit();
          return;
        }
        const room = load(code);
        room.p[clientId] = Date.now();
        save(code, room);
        channel.postMessage({ code });
        emit();
      };
      channel.onmessage = (e: MessageEvent<{ code: string }>) => {
        if (e.data.code === code) emit();
      };
      const timer = window.setInterval(beat, HEARTBEAT_MS);
      beat();

      return {
        firstSnapshot: Promise.resolve(cloneTree(load(code).d)),
        set(path, value) {
          const room = load(code);
          setPath(room.d, path, value);
          save(code, room);
          channel.postMessage({ code });
          emit();
        },
        onTree(cb) {
          treeCbs.push(cb);
          cb(cloneTree(load(code).d));
        },
        onPresence(cb) {
          presenceCbs.push(cb);
          cb(countPresence(load(code)));
        },
        onConnection(cb) {
          connCbs.push(cb);
          cb(true);
        },
        async deleteRoom() {
          try {
            localStorage.removeItem(ROOM_KEY(code));
          } catch {
            /* ignore */
          }
          channel.postMessage({ code });
          emit();
        },
        close() {
          window.clearInterval(timer);
          if (!watch) {
            const room = load(code);
            delete room.p[clientId];
            save(code, room);
            channel.postMessage({ code });
          }
          channel.close();
        },
      };
    },
  };
}
