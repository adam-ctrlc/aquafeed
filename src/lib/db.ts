/**
 * Thin database layer used by the whole app. With Firebase configured it talks to the
 * Realtime Database; without it (demo mode) it uses an in-memory tree with the same paths,
 * so every screen works before a Firebase project exists.
 */
import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  set,
  startAt,
  update,
  type QueryConstraint,
} from 'firebase/database';

import { db, isFirebaseConfigured } from './firebase';

export const isDemo = !isFirebaseConfigured;

export interface QueryOptions {
  orderBy?: string;
  startAt?: number;
  limitToLast?: number;
}

/** `value` is the node's value; `entries` are its children in query order. */
export type Listener = (value: unknown, entries: [string, unknown][]) => void;

/* ------------------------------------------------------------------ */
/* Demo store                                                          */
/* ------------------------------------------------------------------ */

type Tree = Record<string, unknown>;
const demoRoot: Tree = {};
const demoListeners = new Set<() => void>();

const split = (path: string) => path.split('/').filter(Boolean);
const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function demoGetAt(path: string): unknown {
  let node: unknown = demoRoot;
  for (const seg of split(path)) {
    if (node == null || typeof node !== 'object') return null;
    node = (node as Tree)[seg];
  }
  return node ?? null;
}

function demoSetAt(path: string, value: unknown) {
  const segs = split(path);
  if (!segs.length) throw new Error('Cannot overwrite the root');
  let node = demoRoot;
  for (const seg of segs.slice(0, -1)) {
    if (node[seg] == null || typeof node[seg] !== 'object') node[seg] = {};
    node = node[seg] as Tree;
  }
  const last = segs[segs.length - 1];
  if (value === null || value === undefined) delete node[last];
  else node[last] = clone(value);
}

let notifyScheduled = false;
function demoNotify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(() => {
    notifyScheduled = false;
    demoListeners.forEach((l) => l());
  });
}

let lastPushTs = 0;
let pushCounter = 0;
/** Time-ordered key like Firebase push IDs (sorting keys sorts by time). */
export function keyAt(ts: number): string {
  if (ts === lastPushTs) pushCounter++;
  else {
    lastPushTs = ts;
    pushCounter = 0;
  }
  return `k${ts.toString(36).padStart(9, '0')}${pushCounter.toString(36).padStart(3, '0')}`;
}

function demoEntries(value: unknown, opts?: QueryOptions): [string, unknown][] {
  if (value == null || typeof value !== 'object') return [];
  let entries = Object.entries(value as Tree);
  const by = opts?.orderBy;
  if (by) {
    const v = (x: unknown) => ((x as Tree | null)?.[by] as number | undefined) ?? -Infinity;
    entries.sort((a, b) => v(a[1]) - v(b[1]) || a[0].localeCompare(b[0]));
    if (opts?.startAt != null) entries = entries.filter(([, x]) => v(x) >= opts.startAt!);
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }
  if (opts?.limitToLast) entries = entries.slice(-opts.limitToLast);
  return entries.map(([k, x]) => [k, clone(x)]);
}

/** Load the demo tree (used by the demo seed). */
export function demoLoad(path: string, value: unknown) {
  demoSetAt(path, value);
  demoNotify();
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function newKey(path: string): string {
  return isDemo ? keyAt(Date.now()) : push(ref(db, path)).key!;
}

export async function dbGet<T>(path: string): Promise<T | null> {
  if (isDemo) return clone(demoGetAt(path)) as T | null;
  const snap = await get(ref(db, path));
  return snap.val() as T | null;
}

export async function dbSet(path: string, value: unknown): Promise<void> {
  if (!isDemo) return set(ref(db, path), value);
  demoSetAt(path, value);
  demoNotify();
}

/** Multi-path update. Keys may contain "/" (relative to `path`); null deletes. */
export async function dbUpdate(path: string, patch: Record<string, unknown>): Promise<void> {
  if (!isDemo) return update(ref(db, path || undefined), patch);
  for (const [k, v] of Object.entries(patch)) demoSetAt(path ? `${path}/${k}` : k, v);
  demoNotify();
}

export async function dbPush(path: string, value: unknown): Promise<string> {
  if (!isDemo) return (await push(ref(db, path), value)).key!;
  const key = keyAt(Date.now());
  demoSetAt(`${path}/${key}`, value);
  demoNotify();
  return key;
}

export async function dbRemove(path: string): Promise<void> {
  if (!isDemo) return remove(ref(db, path));
  demoSetAt(path, null);
  demoNotify();
}

export function dbSubscribe(
  path: string,
  opts: QueryOptions | undefined,
  onData: Listener,
  onError?: (e: Error) => void,
): () => void {
  if (isDemo) {
    let last = '';
    const run = () => {
      const value = demoGetAt(path);
      const entries = demoEntries(value, opts);
      // Only re-render subscribers whose data actually changed.
      const sig = JSON.stringify(opts ? entries : value);
      if (sig === last) return;
      last = sig;
      onData(opts ? Object.fromEntries(entries) : clone(value), entries);
    };
    run();
    demoListeners.add(run);
    return () => demoListeners.delete(run);
  }

  const constraints: QueryConstraint[] = [];
  if (opts?.orderBy) constraints.push(orderByChild(opts.orderBy));
  if (opts?.startAt != null) constraints.push(startAt(opts.startAt));
  if (opts?.limitToLast) constraints.push(limitToLast(opts.limitToLast));
  const q = constraints.length ? query(ref(db, path), ...constraints) : ref(db, path);
  return onValue(
    q,
    (snap) => {
      const entries: [string, unknown][] = [];
      snap.forEach((child) => {
        entries.push([child.key!, child.val()]);
      });
      onData(snap.val(), entries);
    },
    onError,
  );
}
