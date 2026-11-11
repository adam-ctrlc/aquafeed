import type { FeedingLog, FeedingSchedule, WithId } from './types';

export function parseHHmm(time: string): { h: number; m: number } {
  const [h, m] = time.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

export function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatTime12(time: string): string {
  const { h, m } = parseHHmm(time);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Next enabled schedule from `now`, wrapping to tomorrow. */
export function nextFeeding(
  schedules: WithId<FeedingSchedule>[],
  now = new Date(),
): { schedule: WithId<FeedingSchedule>; at: Date } | null {
  let best: { schedule: WithId<FeedingSchedule>; at: Date } | null = null;
  for (const s of schedules) {
    if (!s.enabled) continue;
    const { h, m } = parseHHmm(s.time);
    const at = new Date(now);
    at.setHours(h, m, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    if (!best || at < best.at) best = { schedule: s, at };
  }
  return best;
}

export function sortByTime<T extends { time: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.time.localeCompare(b.time));
}

export type SlotStatus = 'done' | 'missed' | 'due' | 'upcoming';

/** Today's enabled feeding times matched against today's logs. */
export function todaySlots(
  schedules: WithId<FeedingSchedule>[],
  logs: WithId<FeedingLog>[],
  now: number,
) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = logs.filter((l) => l.ts >= start.getTime());
  const slots = sortByTime(schedules.filter((s) => s.enabled)).map((s) => {
    const { h, m } = parseHHmm(s.time);
    const due = new Date(start);
    due.setHours(h, m, 0, 0);
    const log = today.find(
      (l) =>
        l.source === 'schedule' &&
        (l.scheduleId === s.id || Math.abs((l.scheduledFor ?? l.ts) - due.getTime()) < 15 * 60_000),
    );
    const status: SlotStatus = log
      ? 'done'
      : due.getTime() > now
        ? 'upcoming'
        : now - due.getTime() < 10 * 60_000
          ? 'due'
          : 'missed';
    return { schedule: s, log, status, dueAt: due.getTime() };
  });
  return {
    slots,
    today,
    planned: slots.reduce((sum, x) => sum + x.schedule.grams, 0),
    given: today.reduce((sum, l) => sum + (l.verifiedG || 0), 0),
    fed: slots.filter((x) => x.status === 'done').length,
    missed: slots.filter((x) => x.status === 'missed').length,
  };
}

/** "3 h 12 min", "12 min", "less than a minute" */
export function formatCountdown(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'less than a minute';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
