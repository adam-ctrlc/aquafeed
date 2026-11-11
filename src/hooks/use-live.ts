import { useEffect, useState } from 'react';

import { readCache, writeCache } from '@/lib/cache';
import { dbSubscribe, isDemo, type QueryOptions } from '@/lib/db';
import type { WithId } from '@/lib/types';

export interface LiveState<T> {
  data: T | undefined;
  /** True until the first value (cached or live) arrives */
  loading: boolean;
  /** True while showing the on-device copy instead of a live value */
  stale: boolean;
  error: Error | null;
}

export interface ListOptions {
  orderBy?: string;
  startAt?: number;
  /** Like startAt, but relative: only children with orderBy value ≥ now − this (ms) */
  sinceMs?: number;
  limitToLast?: number;
  /** Cache under this key instead of the full query */
  cacheKey?: string;
}

type Transform<T> = (value: unknown, entries: [string, unknown][]) => T;
type Tagged<T> = LiveState<T> & { key: string | null };

const IDLE: LiveState<never> = { data: undefined, loading: false, stale: false, error: null };
const LOADING: LiveState<never> = { data: undefined, loading: true, stale: false, error: null };

/**
 * Subscribes to a database path. The last value is cached on the device so screens still
 * show the last-synced data when the phone is offline or the app restarts.
 */
function useLiveSnapshot<T>(
  path: string | null,
  options: ListOptions | undefined,
  transform: Transform<T>,
): LiveState<T> {
  const { cacheKey: customCacheKey, ...queryOptions } = options ?? {};
  const key = path ? `${path}?${JSON.stringify(queryOptions)}` : null;
  const cacheKey = customCacheKey ? `${path}#${customCacheKey}` : key;
  const [state, setState] = useState<Tagged<T>>({ ...IDLE, key: null });

  useEffect(() => {
    if (!key || !path || !cacheKey) return;
    let live = false;
    let cancelled = false;

    if (!isDemo) {
      readCache<T>(cacheKey).then((cached) => {
        if (cancelled || live || cached === undefined) return;
        setState({ key, data: cached, loading: false, stale: true, error: null });
      });
    }

    const { sinceMs, ...rest } = queryOptions;
    const opts: QueryOptions | undefined =
      Object.keys(queryOptions).length === 0
        ? undefined
        : { ...rest, ...(sinceMs != null ? { startAt: Date.now() - sinceMs } : {}) };

    const unsubscribe = dbSubscribe(
      path,
      opts,
      (value, entries) => {
        live = true;
        const data = transform(value, entries);
        setState({ key, data, loading: false, stale: false, error: null });
        if (!isDemo) writeCache(cacheKey, data);
      },
      (error) => setState((s) => ({ ...(s.key === key ? s : LOADING), key, loading: false, error })),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // key encodes path + options; transform is a stable module-level function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cacheKey]);

  if (!key) return IDLE;
  if (state.key !== key) return LOADING;
  return state;
}

const toValue = <T,>(value: unknown) => (value ?? null) as T | null;

const toList = <T,>(_: unknown, entries: [string, unknown][]): WithId<T>[] =>
  entries.map(([id, v]) => ({ ...(v as T), id }));

/** A single object node, e.g. `Aquariums/{id}`. `data` is null when the node is empty. */
export function useLiveObject<T>(path: string | null): LiveState<T | null> {
  return useLiveSnapshot<T | null>(path, undefined, toValue<T>);
}

/** A collection node as an array with ids, in query order. */
export function useLiveList<T>(path: string | null, options?: ListOptions): LiveState<WithId<T>[]> {
  return useLiveSnapshot<WithId<T>[]>(path, options, toList<T>);
}
