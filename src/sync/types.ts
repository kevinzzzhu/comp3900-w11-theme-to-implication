// Transport contract for group rooms. The sync engine (room.ts) only talks to this interface.
// All paths are relative to the room's data root; values are strings, null deletes.

export type Tree = { [key: string]: string | Tree };

export interface RoomConn {
  /** Current room data (after the first server snapshot). Empty object for a new room. */
  firstSnapshot: Promise<Tree>;
  /** Write or delete one leaf. Must apply optimistically and queue while offline. */
  set(path: string[], value: string | null): void;
  /** Called with the full data tree on every change, local echoes included. */
  onTree(cb: (tree: Tree) => void): void;
  /** Number of clients currently connected to this room (including this one). */
  onPresence(cb: (count: number) => void): void;
  /** Connection state of the transport. */
  onConnection(cb: (online: boolean) => void): void;
  /** Delete the whole room (data, presence, meta) for everyone. */
  deleteRoom(): Promise<void>;
  /** Stop listening and release this client's presence. Does not delete data. */
  close(): void;
}

export interface Transport {
  readonly kind: 'firebase' | 'mock';
  /** Join the room, creating it if it does not exist. Rejects with a readable Error on failure. */
  join(code: string): Promise<RoomConn>;
}
