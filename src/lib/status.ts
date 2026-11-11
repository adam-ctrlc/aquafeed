import type { AlertThresholds, HopperLevel, RangeThreshold } from './types';

export type Status = 'ok' | 'warning' | 'critical' | 'unknown';

/** Goldfish defaults from the spec. Turbidity and hopper values are placeholders until calibrated. */
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  temperature: { okMin: 20.0, okMax: 24.0, warnMin: 15.0, warnMax: 31.9 },
  ph: { okMin: 6.5, okMax: 7.5, warnMin: 6.0, warnMax: 8.5 },
  turbidity: { warnPct: 20, criticalPct: 50 },
  hopper: { lowCm: 9, criticalCm: 12 },
  cooldownMin: 15,
};

export function rangeStatus(value: number | undefined | null, t: RangeThreshold): Status {
  if (value == null || Number.isNaN(value)) return 'unknown';
  if (value < t.warnMin || value > t.warnMax) return 'critical';
  if (value >= t.okMin && value <= t.okMax) return 'ok';
  return 'warning';
}

export function turbidityStatus(
  pct: number | undefined | null,
  t: AlertThresholds['turbidity'],
): Status {
  if (pct == null || Number.isNaN(pct)) return 'unknown';
  if (pct >= t.criticalPct) return 'critical';
  if (pct >= t.warnPct) return 'warning';
  return 'ok';
}

/** Larger distance = less feed in the hopper. */
export function hopperLevelFromDistance(
  distanceCm: number,
  t: AlertThresholds['hopper'],
): HopperLevel {
  if (distanceCm >= t.criticalCm) return 'critical';
  if (distanceCm >= t.lowCm) return 'low';
  return 'good';
}

export function hopperStatus(level: HopperLevel | undefined): Status {
  if (!level) return 'unknown';
  return level === 'good' ? 'ok' : level === 'low' ? 'warning' : 'critical';
}

export const statusLabel: Record<Status, string> = {
  ok: 'Good',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'No data',
};

export const hopperLabel: Record<HopperLevel, string> = {
  good: 'Good',
  low: 'Low',
  critical: 'Critical',
};

/** Merge stored thresholds over defaults so missing fields never crash the UI. */
export function withDefaults(t: Partial<AlertThresholds> | null | undefined): AlertThresholds {
  return {
    temperature: { ...DEFAULT_THRESHOLDS.temperature, ...t?.temperature },
    ph: { ...DEFAULT_THRESHOLDS.ph, ...t?.ph },
    turbidity: { ...DEFAULT_THRESHOLDS.turbidity, ...t?.turbidity },
    hopper: { ...DEFAULT_THRESHOLDS.hopper, ...t?.hopper },
    cooldownMin: t?.cooldownMin ?? DEFAULT_THRESHOLDS.cooldownMin,
    updatedAt: t?.updatedAt,
    updatedBy: t?.updatedBy,
  };
}
