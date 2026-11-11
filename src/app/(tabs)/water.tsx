import { format } from 'date-fns';
import { Droplets } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { HistoryChart } from '@/components/history-chart';
import { Text } from '@/components/text';
import { Card, CardLabel, cx, InlineChoice, Skeleton, Group, Item, Screen, Segmented } from '@/components/ui';
import {
  useLatestReading,
  useReadingHistory,
  useThresholds,
  type HistoryRange,
} from '@/hooks/use-data';
import { fmt } from '@/lib/format';
import { rangeStatus, statusLabel, turbidityStatus, type Status } from '@/lib/status';
import { useTheme } from '@/lib/theme';
import type { AlertThresholds, WaterReading, WithId } from '@/lib/types';

type Key = 'ph' | 'tempC' | 'turbidityPct';

const PARAMS: { key: Key; label: string; unit: string; decimals: number }[] = [
  { key: 'ph', label: 'pH', unit: '', decimals: 2 },
  { key: 'tempC', label: 'Temperature', unit: '°C', decimals: 1 },
  { key: 'turbidityPct', label: 'Clarity', unit: '%', decimals: 0 },
];

const pickers: Record<Key, (r: WaterReading) => number> = {
  ph: (r) => r.ph,
  tempC: (r) => r.tempC,
  turbidityPct: (r) => r.turbidityPct,
};

const statusWord: Record<Status, string> = {
  ok: 'text-ok',
  warning: 'text-warn',
  critical: 'text-crit',
  unknown: 'text-faint',
};

function statusFor(k: Key, v: number | undefined, t: AlertThresholds): Status {
  if (k === 'ph') return rangeStatus(v, t.ph);
  if (k === 'tempC') return rangeStatus(v, t.temperature);
  return turbidityStatus(v, t.turbidity);
}

/** Min / avg / max, share of readings in the acceptable band, and excursions (ok → not ok). */
function stats(readings: WithId<WaterReading>[], k: Key, t: AlertThresholds) {
  const vals = readings.map((r) => r[k]).filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  let inRange = 0;
  let excursions = 0;
  let prevOk = true;
  for (const v of vals) {
    const ok = statusFor(k, v, t) === 'ok';
    if (ok) inRange++;
    if (prevOk && !ok) excursions++;
    prevOk = ok;
  }
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((s, v) => s + v, 0) / vals.length,
    inRangePct: (inRange / vals.length) * 100,
    excursions,
  };
}

export default function WaterScreen() {
  const { series } = useTheme();
  const [range, setRange] = useState<HistoryRange>('24h');
  const [key, setKey] = useState<Key>('ph');
  const { reading } = useLatestReading();
  const { thresholds: t } = useThresholds();
  const { data: history, loading } = useReadingHistory(range);
  const readings = useMemo(() => history ?? [], [history]);
  const longRange = range === '7d';

  const param = PARAMS.find((p) => p.key === key)!;
  const st = useMemo(() => stats(readings, key, t), [readings, key, t]);
  const current = reading?.[key];
  const currentStatus = statusFor(key, current, t);

  const all = PARAMS.map((p) => statusFor(p.key, reading?.[p.key], t));
  const overall: Status = all.includes('critical')
    ? 'critical'
    : all.includes('warning')
      ? 'warning'
      : all.includes('unknown')
        ? 'unknown'
        : 'ok';
  const headline: Record<Status, string> = {
    ok: 'Water is healthy',
    warning: 'Water needs attention',
    critical: 'Check the tank now',
    unknown: 'Waiting for readings',
  };

  const color = key === 'ph' ? series.ph : key === 'tempC' ? series.temp : series.turbidity;
  const band: [number, number] | undefined =
    key === 'ph'
      ? [t.ph.okMin, t.ph.okMax]
      : key === 'tempC'
        ? [t.temperature.okMin, t.temperature.okMax]
        : undefined;
  const target =
    key === 'ph'
      ? `${t.ph.okMin} to ${t.ph.okMax}`
      : key === 'tempC'
        ? `${t.temperature.okMin} to ${t.temperature.okMax} °C`
        : `below ${t.turbidity.warnPct}% change`;
  const critical =
    key === 'ph'
      ? `below ${t.ph.warnMin} or above ${t.ph.warnMax}`
      : key === 'tempC'
        ? `below ${t.temperature.warnMin} or above ${t.temperature.warnMax} °C`
        : `${t.turbidity.criticalPct}% change or more`;
  const f = (v?: number) => (v == null ? '—' : `${v.toFixed(param.decimals)}${param.unit ? ` ${param.unit}` : ''}`);
  const recent = readings.slice(-8).reverse();

  return (
    <Screen
      title="Water quality"
      subtitle={reading ? `Last reading ${fmt.dateTime(reading.ts)}` : 'No readings yet'}>
      {/* Summary */}
      <View className="gap-3 rounded-2xl bg-accentsoft p-4">
        <View className="gap-1">
          <CardLabel icon={Droplets} tone="accent">Right now</CardLabel>
          <Text className={cx('font-display-bold text-[22px] leading-7', overall === 'ok' ? 'text-fg' : statusWord[overall])}>
            {headline[overall]}
          </Text>
        </View>
        <View className="flex-row gap-4">
          {PARAMS.map((p, i) => (
            <View key={p.key} className="flex-1 gap-0.5">
              <Text className="text-[11px] text-muted">{p.label}</Text>
              <Text className={cx('font-display text-[15px]', all[i] === 'ok' ? 'text-fg' : statusWord[all[i]])}>
                {f2(reading?.[p.key], p)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Segmented value={key} onChange={setKey} options={PARAMS.map((p) => ({ value: p.key, label: p.label }))} />

      {/* Selected reading */}
      <Card className="gap-3 p-3.5">
        <View className="flex-row items-end justify-between">
          <View className="gap-0.5">
            <Text className="text-xs font-medium text-muted">{param.label}</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-display-bold text-[32px] leading-9 text-fg">
                {current == null ? '—' : current.toFixed(param.decimals)}
              </Text>
              {param.unit ? <Text className="text-sm text-muted">{param.unit}</Text> : null}
            </View>
          </View>
          <View className="items-end gap-2">
            <Text className={cx('text-xs font-semibold', statusWord[currentStatus])}>
              {statusLabel[currentStatus]}
            </Text>
            <InlineChoice
              value={range}
              onChange={setRange}
              options={[
                { value: '6h', label: '6h' },
                { value: '24h', label: '24h' },
                { value: '7d', label: '7 days' },
              ]}
            />
          </View>
        </View>
        {loading && !readings.length ? (
          <Skeleton className="h-36 w-full rounded-lg" />
        ) : (
          <HistoryChart
            key={key}
            readings={readings}
            pick={pickers[key]}
            color={color}
            decimals={key === 'turbidityPct' ? 0 : 1}
            okBand={band}
            longRange={longRange}
          />
        )}
      </Card>

      {/* Stats for the selected range */}
      <Group>
        <Stat label="Lowest" value={f(st?.min)} />
        <Stat label="Average" value={f(st?.avg)} />
        <Stat label="Highest" value={f(st?.max)} />
        <Stat label="Time in acceptable range" value={st ? `${st.inRangePct.toFixed(0)}%` : '—'} />
        <Stat label="Times it left the range" value={st ? String(st.excursions) : '—'} />
        <Stat label="Acceptable" value={target} />
        <Stat label="Critical" value={critical} last />
      </Group>

      {/* Recent readings */}
      <Group>
        <View className="flex-row border-b border-linesoft px-3 py-2">
          <Text className="flex-1 text-xs font-medium text-muted">Recent readings</Text>
          <Text className="w-14 text-right text-[11px] text-muted">pH</Text>
          <Text className="w-16 text-right text-[11px] text-muted">°C</Text>
          <Text className="w-16 text-right text-[11px] text-muted">Turb %</Text>
        </View>
        {loading && !recent.length ? (
          <View className="gap-3 px-3 py-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </View>
        ) : recent.length ? (
          recent.map((r, i) => (
            <Item key={r.id} last={i === recent.length - 1} className="py-2">
              <Text className="flex-1 text-xs text-fg2">
                {format(r.ts, longRange ? 'MMM d, h:mm a' : 'h:mm:ss a')}
              </Text>
              <Cell value={r.ph.toFixed(2)} status={statusFor('ph', r.ph, t)} className="w-14" />
              <Cell value={r.tempC.toFixed(1)} status={statusFor('tempC', r.tempC, t)} className="w-16" />
              <Cell
                value={r.turbidityPct.toFixed(0)}
                status={statusFor('turbidityPct', r.turbidityPct, t)}
                className="w-16"
              />
            </Item>
          ))
        ) : (
          <Item last>
            <Text className="text-[13px] text-muted">{loading ? 'Loading…' : 'No readings in this range.'}</Text>
          </Item>
        )}
      </Group>
    </Screen>
  );
}

const f2 = (v: number | undefined, p: (typeof PARAMS)[number]) =>
  v == null ? '—' : `${v.toFixed(p.decimals)}${p.unit ? ` ${p.unit}` : ''}`;

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <Item last={last}>
      <Text className="flex-1 text-[13px] text-muted">{label}</Text>
      <Text className="text-[13px] font-medium text-fg">{value}</Text>
    </Item>
  );
}

function Cell({ value, status, className }: { value: string; status: Status; className: string }) {
  return (
    <Text className={cx('text-right text-xs font-medium', status === 'ok' ? 'text-fg' : statusWord[status], className)}>
      {value}
    </Text>
  );
}
