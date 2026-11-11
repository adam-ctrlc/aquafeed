import { useEffect, useMemo, useRef } from 'react';

import { dbUpdate } from '@/lib/db';
import { paths } from '@/lib/paths';
import { withDefaults } from '@/lib/status';
import type {
  AlertThresholds,
  Aquarium,
  Device,
  FeedingLog,
  FeedingSchedule,
  SystemAlert,
  UserProfile,
  WaterReading,
} from '@/lib/types';
import { useAuth } from '@/stores/auth';

import { useLiveList, useLiveObject } from './use-live';

export function useAquariumId(): string | null {
  return useAuth((s) => s.profile?.aquariumId ?? null);
}

export function useAquarium() {
  const aid = useAquariumId();
  return useLiveObject<Aquarium>(aid ? paths.aquarium(aid) : null);
}

export function useDevice() {
  const { data: aquarium } = useAquarium();
  const deviceId = aquarium?.deviceId ?? null;
  const state = useLiveObject<Device>(deviceId ? paths.device(deviceId) : null);
  return { ...state, deviceId };
}

/** Device counts as online if its heartbeat is newer than this. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function useThresholds() {
  const aid = useAquariumId();
  const state = useLiveObject<AlertThresholds>(aid ? paths.thresholds(aid) : null);
  const thresholds = useMemo(() => withDefaults(state.data), [state.data]);
  return { ...state, thresholds };
}

export function useLatestReading() {
  const aid = useAquariumId();
  const state = useLiveList<WaterReading>(aid ? paths.readings(aid) : null, {
    orderBy: 'ts',
    limitToLast: 1,
  });
  return { ...state, reading: state.data?.[0] };
}

export const HISTORY_RANGES = {
  '6h': 6 * 3600_000,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
} as const;
export type HistoryRange = keyof typeof HISTORY_RANGES;

export function useReadingHistory(range: HistoryRange) {
  const aid = useAquariumId();
  return useLiveList<WaterReading>(aid ? paths.readings(aid) : null, {
    orderBy: 'ts',
    sinceMs: HISTORY_RANGES[range],
    limitToLast: 5000,
    cacheKey: `history-${range}`,
  });
}

export function useSchedules() {
  const aid = useAquariumId();
  return useLiveList<FeedingSchedule>(aid ? paths.schedules(aid) : null);
}

export function useFeedingLogs(limit = 100) {
  const aid = useAquariumId();
  const state = useLiveList<FeedingLog>(aid ? paths.logs(aid) : null, {
    orderBy: 'ts',
    limitToLast: limit,
  });
  const logs = useMemo(() => [...(state.data ?? [])].reverse(), [state.data]);
  return { ...state, logs };
}

export function useAlerts(limit = 100) {
  const aid = useAquariumId();
  const state = useLiveList<SystemAlert>(aid ? paths.alerts(aid) : null, {
    orderBy: 'ts',
    limitToLast: limit,
  });
  const alerts = useMemo(() => [...(state.data ?? [])].reverse(), [state.data]);

  // Record when the phone first saw each alert (responsiveness test: alert latency).
  const stamped = useRef(new Set<string>());
  useEffect(() => {
    if (!aid || state.stale || !state.data) return;
    const now = Date.now();
    const updates: Record<string, number> = {};
    for (const a of state.data) {
      if (a.appReceivedAt || stamped.current.has(a.id)) continue;
      // Only stamp alerts that are fresh, not history loaded on first open.
      if (now - a.ts > 5 * 60_000) continue;
      stamped.current.add(a.id);
      updates[`${paths.alerts(aid)}/${a.id}/appReceivedAt`] = now;
    }
    if (Object.keys(updates).length) dbUpdate('', updates).catch(() => {});
  }, [aid, state.data, state.stale]);

  const unacknowledged = useMemo(() => alerts.filter((a) => !a.acknowledged).length, [alerts]);
  return { ...state, alerts, unacknowledged };
}

/** Everyone with an account (administrators only). Removed people are left out. */
export function useUsers() {
  const state = useLiveList<UserProfile>(paths.users);
  const users = useMemo(
    () =>
      (state.data ?? [])
        .filter((u) => !u.deleted)
        .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? '')),
    [state.data],
  );
  return { ...state, users };
}
