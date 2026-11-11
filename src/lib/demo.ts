/**
 * Demo mode: sample data plus a simulated feeder, used when no Firebase project is set up.
 * Everything lives in memory and resets when the app reloads.
 */
import { dbGet, dbPush, dbUpdate, demoLoad, keyAt } from './db';
import { paths } from './paths';
import { formatTime12, parseHHmm, toHHmm } from './schedule';
import {
  DEFAULT_THRESHOLDS,
  hopperLevelFromDistance,
  rangeStatus,
  turbidityStatus,
  withDefaults,
  type Status,
} from './status';
import type {
  AlertThresholds,
  Aquarium,
  Device,
  FeedingLog,
  FeedingSchedule,
  SystemAlert,
  UserProfile,
  WaterReading,
} from './types';

export const DEMO_UID = 'demo-user';
export const DEMO_AQUARIUM = 'demo-aquarium';
export const DEMO_DEVICE = 'aquafeed-demo01';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const noise = (amp: number) => (Math.random() - 0.5) * 2 * amp;
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Smooth daily water cycle: warmest mid-afternoon. */
function waterAt(ts: number, turbidityBoost = 0): WaterReading {
  const d = new Date(ts);
  const hour = d.getHours() + d.getMinutes() / 60;
  const daily = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
  return {
    ts,
    tempC: round(22.4 + 1.1 * daily + noise(0.15), 2),
    ph: round(7.12 - 0.08 * daily + noise(0.03), 2),
    turbidityPct: round(Math.max(0, 6 + turbidityBoost + noise(1.5)), 1),
  };
}

let seeded = false;

/** Demo accounts: emails starting with "owner" get the Owner role; everything else is admin. */
export const DEMO_ACCOUNTS = [
  { email: 'admin@aquafeed.demo', password: 'demo1234', role: 'admin', name: 'Demo Admin' },
  { email: 'owner@aquafeed.demo', password: 'demo1234', role: 'owner', name: 'Demo Owner' },
] as const;

const demoRole = (email: string): UserProfile['role'] =>
  email.toLowerCase().startsWith('owner') ? 'owner' : 'admin';
const demoName = (email: string) =>
  DEMO_ACCOUNTS.find((a) => a.email === email.toLowerCase())?.name;

export function seedDemo(email: string, displayName?: string) {
  const name = displayName ?? demoName(email);
  if (seeded) {
    void dbUpdate(paths.user(DEMO_UID), {
      email,
      role: demoRole(email),
      ...(name ? { displayName: name } : {}),
    });
    return;
  }
  seeded = true;
  const now = Date.now();

  const profile: UserProfile = {
    email,
    displayName: name ?? 'Demo User',
    role: demoRole(email),
    aquariumId: DEMO_AQUARIUM,
    createdAt: now - 14 * DAY,
  };
  const aquarium: Aquarium = {
    ownerUid: DEMO_UID,
    name: 'Living Room Tank',
    widthCm: 45,
    heightCm: 30,
    target_fish_species: { variety: 'Oranda', count: 3, sizeCm: 6 },
    deviceId: DEMO_DEVICE,
    createdAt: now - 14 * DAY,
  };
  const device: Device = {
    aquariumId: DEMO_AQUARIUM,
    firmware: '1.0.0-demo',
    lastSeen: now,
    hopper: { distanceCm: 9.4, level: 'low', ts: now },
    calibration: {
      loadCellFactor: 2280.5,
      freeFallOffsetG: 0.12,
      phVoltage4: 3.04,
      phVoltage686: 2.52,
      phVoltage918: 2.11,
      turbidityBaseline: 3.92,
      hopperFullCm: 3,
      hopperEmptyCm: 14,
      updatedAt: now - 3 * DAY,
    },
  };

  const schedules: Record<string, FeedingSchedule> = {
    s1: { time: '08:00', grams: 1, enabled: true, updatedAt: now - 7 * DAY },
    s2: { time: '13:00', grams: 0.5, enabled: true, updatedAt: now - 7 * DAY },
    s3: { time: '18:00', grams: 1, enabled: true, updatedAt: now - 7 * DAY },
    s4: { time: '21:30', grams: 0.5, enabled: false, updatedAt: now - 2 * DAY },
  };

  // Feeding logs for the past 7 days from the schedule.
  const logs: Record<string, FeedingLog> = {};
  const feedTimes: number[] = [];
  for (let day = 7; day >= 0; day--) {
    for (const [id, s] of Object.entries(schedules)) {
      if (!s.enabled) continue;
      const { h, m } = parseHHmm(s.time);
      const due = new Date(now - day * DAY);
      due.setHours(h, m, 0, 0);
      if (due.getTime() >= now || due.getTime() < now - 7 * DAY) continue;
      const ts = due.getTime() + rand(2_000, 9_000);
      const incomplete = day === 3 && id === 's2';
      logs[keyAt(Math.round(ts))] = {
        ts: Math.round(ts),
        source: 'schedule',
        scheduleId: id,
        scheduledFor: due.getTime(),
        targetG: s.grams,
        verifiedG: round(s.grams * (1 + noise(0.04)), 2),
        hopperLevel: day > 1 ? 'good' : 'low',
        ...(incomplete ? { faults: { dispenseIncomplete: true } } : {}),
      };
      feedTimes.push(ts);
    }
  }

  // Water readings every 10 min for 7 days; turbidity bumps after each feeding.
  const readings: Record<string, WaterReading> = {};
  for (let ts = now - 7 * DAY; ts <= now; ts += 10 * MIN) {
    const since = feedTimes.filter((f) => f <= ts).map((f) => ts - f);
    const boost = since.reduce((sum, dt) => sum + 10 * Math.exp(-dt / (1.5 * HOUR)), 0);
    const r = waterAt(ts, boost);
    if (ts > now - 26 * HOUR && ts < now - 24 * HOUR) r.tempC = round(r.tempC + 2.4, 2); // heat spike
    readings[keyAt(ts)] = r;
  }

  const alert = (ts: number, a: Omit<SystemAlert, 'ts'>): [string, SystemAlert] => [
    keyAt(ts),
    { ts, ...a },
  ];
  const alerts = Object.fromEntries([
    alert(now - 3 * DAY + 13 * HOUR, {
      type: 'dispense_incomplete',
      severity: 'warning',
      message: 'Dispense incomplete: pellets left on the pan after tipping twice',
      acknowledged: true,
      ackBy: DEMO_UID,
      ackAt: now - 3 * DAY + 14 * HOUR,
    }),
    alert(now - 25 * HOUR, {
      type: 'temperature',
      severity: 'warning',
      message: 'Temperature warning: 24.9 °C (acceptable 20–24 °C)',
      value: 24.9,
      acknowledged: true,
      ackBy: DEMO_UID,
      ackAt: now - 24 * HOUR,
    }),
    alert(now - 2 * HOUR, {
      type: 'hopper',
      severity: 'warning',
      message: 'Feed is running low. Refill the feeder soon.',
      value: 9.4,
      acknowledged: false,
    }),
  ]);

  demoLoad(paths.user(DEMO_UID), profile);
  const person = (first: string, last: string, role: UserProfile['role'], days: number, disabled?: boolean): UserProfile => ({
    email: `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@example.com',
    displayName: `${first} ${last}`,
    firstName: first,
    lastName: last,
    role,
    aquariumId: `demo-tank-${first.toLowerCase()}`,
    createdAt: now - days * DAY,
    ...(disabled ? { disabled: true } : {}),
  });
  demoLoad(paths.user('demo-u1'), person('Maria', 'Santos', 'owner', 40));
  demoLoad(paths.user('demo-u2'), person('Jose', 'Reyes', 'owner', 31));
  demoLoad(paths.user('demo-u3'), person('Liza', 'Cruz', 'admin', 25));
  demoLoad(paths.user('demo-u4'), person('Paolo', 'Garcia', 'owner', 12, true));
  demoLoad(paths.user('demo-u5'), person('Ana', 'Lim', 'owner', 6));
  demoLoad(paths.aquarium(DEMO_AQUARIUM), aquarium);
  demoLoad(paths.device(DEMO_DEVICE), device);
  demoLoad(paths.schedules(DEMO_AQUARIUM), schedules);
  demoLoad(paths.logs(DEMO_AQUARIUM), logs);
  demoLoad(paths.readings(DEMO_AQUARIUM), readings);
  demoLoad(paths.thresholds(DEMO_AQUARIUM), { ...DEFAULT_THRESHOLDS, updatedAt: now - 7 * DAY });
  demoLoad(paths.alerts(DEMO_AQUARIUM), alerts);
}

/* ------------------------------------------------------------------ */
/* Simulated ESP32                                                     */
/* ------------------------------------------------------------------ */

let timers: ReturnType<typeof setInterval>[] = [];
let lastFeedAt = 0;
const lastStatus: Record<string, Status> = {};
const handled = new Set<number>();

const devicePath = paths.device(DEMO_DEVICE);

async function thresholds(): Promise<AlertThresholds> {
  return withDefaults(await dbGet<AlertThresholds>(paths.thresholds(DEMO_AQUARIUM)));
}

async function raiseAlert(a: Omit<SystemAlert, 'ts' | 'acknowledged'>) {
  await dbPush(paths.alerts(DEMO_AQUARIUM), { ...a, ts: Date.now(), acknowledged: false });
}

async function tickReading() {
  const now = Date.now();
  const boost = lastFeedAt ? 10 * Math.exp(-(now - lastFeedAt) / (1.5 * HOUR)) : 0;
  const r = waterAt(now, boost);
  await dbPush(paths.readings(DEMO_AQUARIUM), r);

  const t = await thresholds();
  const checks: [string, Status, string][] = [
    ['temperature', rangeStatus(r.tempC, t.temperature), `Temperature ${r.tempC.toFixed(1)} °C`],
    ['ph', rangeStatus(r.ph, t.ph), `pH ${r.ph.toFixed(2)}`],
    ['turbidity', turbidityStatus(r.turbidityPct, t.turbidity), `Turbidity +${r.turbidityPct.toFixed(0)}%`],
  ];
  for (const [type, status, text] of checks) {
    const prev = lastStatus[type];
    lastStatus[type] = status;
    if (prev === undefined || prev === status || status === 'ok' || status === 'unknown') continue;
    await raiseAlert({
      type: type as SystemAlert['type'],
      severity: status === 'critical' ? 'critical' : 'warning',
      message: `${text} is ${status}`,
    });
  }
}

async function heartbeat() {
  await dbUpdate(devicePath, { lastSeen: Date.now() });
}

async function dispense(grams: number, source: FeedingLog['source'], extra?: Partial<FeedingLog>) {
  const device = await dbGet<Device>(devicePath);
  const t = await thresholds();
  const distance = round((device?.hopper?.distanceCm ?? 6) + grams * 0.08, 1);
  const level = hopperLevelFromDistance(distance, t.hopper);
  const verifiedG = round(grams * (1 + noise(0.04)), 2);
  const now = Date.now();
  lastFeedAt = now;
  await dbUpdate(devicePath, { hopper: { distanceCm: distance, level, ts: now } });
  await dbPush(paths.logs(DEMO_AQUARIUM), {
    ts: now,
    source,
    targetG: grams,
    verifiedG,
    hopperLevel: level,
    ...extra,
  } satisfies FeedingLog);
  if (level !== 'good' && device?.hopper?.level !== level) {
    await raiseAlert({
      type: 'hopper',
      severity: level === 'critical' ? 'critical' : 'warning',
      message: level === 'critical' ? 'The feeder is almost empty. Refill it now.' : 'Feed is running low. Refill the feeder soon.',
      value: distance,
    });
  }
  return verifiedG;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tickCommands() {
  const device = await dbGet<Device>(devicePath);

  const feed = device?.commands?.feed;
  if (feed?.status === 'pending' && !handled.has(feed.requestedAt)) {
    handled.add(feed.requestedAt);
    await dbUpdate(`${devicePath}/commands/feed`, { status: 'running' });
    await wait(2500); // gate open → weigh → tip
    const verifiedG = await dispense(feed.grams, 'manual');
    await dbUpdate(`${devicePath}/commands/feed`, { status: 'done', verifiedG });
  }

  const cal = device?.commands?.calibrate;
  if (cal?.status === 'pending' && !handled.has(cal.requestedAt)) {
    handled.add(cal.requestedAt);
    await dbUpdate(`${devicePath}/commands/calibrate`, { status: 'running' });
    await wait(2000);
    const results: Record<string, [string | null, number]> = {
      tare: [null, 0],
      measure_free_fall_offset: ['freeFallOffsetG', round(rand(0.08, 0.16), 3)],
      ph_point_4: ['phVoltage4', round(rand(3.0, 3.08), 3)],
      ph_point_686: ['phVoltage686', round(rand(2.49, 2.55), 3)],
      ph_point_918: ['phVoltage918', round(rand(2.08, 2.14), 3)],
      turbidity_baseline: ['turbidityBaseline', round(rand(3.88, 3.96), 3)],
      hopper_measure: [null, device?.hopper?.distanceCm ?? 6],
    };
    const [field, result] = results[cal.action] ?? [null, 0];
    if (field) await dbUpdate(`${devicePath}/calibration`, { [field]: result, updatedAt: Date.now() });
    await dbUpdate(`${devicePath}/commands/calibrate`, { status: 'done', result });
  }
}

const firedSchedules = new Set<string>();
async function tickSchedules() {
  const now = new Date();
  const hhmm = toHHmm(now);
  const schedules = (await dbGet<Record<string, FeedingSchedule>>(paths.schedules(DEMO_AQUARIUM))) ?? {};
  for (const [id, s] of Object.entries(schedules)) {
    const key = `${id}@${now.toDateString()} ${hhmm}`;
    if (!s.enabled || s.time !== hhmm || firedSchedules.has(key)) continue;
    firedSchedules.add(key);
    const due = new Date(now);
    due.setSeconds(0, 0);
    await dispense(s.grams, 'schedule', { scheduleId: id, scheduledFor: due.getTime() });
    console.log(`[demo] scheduled feeding ${formatTime12(s.time)} ran`);
  }
}

export function startDemoDevice() {
  stopDemoDevice();
  const safe = (fn: () => Promise<unknown>) => () => void fn().catch((e) => console.warn('[demo]', e));
  timers = [
    setInterval(safe(tickReading), 5_000),
    setInterval(safe(heartbeat), 10_000),
    setInterval(safe(tickCommands), 1_000),
    setInterval(safe(tickSchedules), 15_000),
  ];
}

export function stopDemoDevice() {
  timers.forEach(clearInterval);
  timers = [];
}
