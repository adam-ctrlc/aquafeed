import {
  AlertTriangle,
  Check,
  Clock,
  Bean,
  GlassWater,
  TestTube,
  Droplets,
  Fish,
  Thermometer,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/text';

import { Meter, Sparkline } from '@/components/sparkline';
import {
  Card,
  CardLabel,
  Icon,
  cx,
  EmptyState,
  Group,
  Item,
  Label,
  Loading,
  Screen,
  StatusBadge,
} from '@/components/ui';
import {
  ONLINE_WINDOW_MS,
  useAlerts,
  useAquarium,
  useDevice,
  useFeedingLogs,
  useLatestReading,
  useReadingHistory,
  useSchedules,
  useThresholds,
} from '@/hooks/use-data';
import { useNow } from '@/hooks/use-now';
import { fmt } from '@/lib/format';
import { formatTime12, nextFeeding, parseHHmm, sortByTime } from '@/lib/schedule';
import {
  hopperLabel,
  hopperLevelFromDistance,
  hopperStatus,
  rangeStatus,
  statusLabel,
  turbidityStatus,
  type Status,
} from '@/lib/status';
import { useTheme } from '@/lib/theme';
import type { FeedingLog, FeedingSchedule, WaterReading, WithId } from '@/lib/types';

const statusWord: Record<Status, string> = {
  ok: 'text-ok',
  warning: 'text-warn',
  critical: 'text-crit',
  unknown: 'text-faint',
};

const worst = (list: Status[]): Status =>
  list.includes('critical')
    ? 'critical'
    : list.includes('warning')
      ? 'warning'
      : list.every((s) => s === 'unknown')
        ? 'unknown'
        : 'ok';

export default function DashboardScreen() {
  const { series } = useTheme();
  const now = useNow(5000);
  const { data: aquarium, loading: aquariumLoading } = useAquarium();
  const { data: device, deviceId } = useDevice();
  const { reading } = useLatestReading();
  const { data: history } = useReadingHistory('24h');
  const { thresholds: t } = useThresholds();
  const { data: schedules } = useSchedules();
  const { logs } = useFeedingLogs(60);
  const { alerts, unacknowledged } = useAlerts(30);

  const trend = useMemo(() => summarize(history ?? []), [history]);

  if (aquariumLoading && !aquarium) return <Loading />;

  const online = !!device?.lastSeen && now - device.lastSeen < ONLINE_WINDOW_MS;
  const species = aquarium?.target_fish_species;
  const hopperLevel =
    device?.hopper?.level ??
    (device?.hopper ? hopperLevelFromDistance(device.hopper.distanceCm, t.hopper) : undefined);
  const full = device?.calibration?.hopperFullCm ?? 3;
  const empty = device?.calibration?.hopperEmptyCm ?? t.hopper.criticalCm + 2;
  const hopperFill = device?.hopper
    ? Math.max(0, Math.min(1, (empty - device.hopper.distanceCm) / (empty - full)))
    : 0;

  const phS = rangeStatus(reading?.ph, t.ph);
  const tempS = rangeStatus(reading?.tempC, t.temperature);
  const turbS = turbidityStatus(reading?.turbidityPct, t.turbidity);
  const hopS = hopperStatus(hopperLevel);
  const waterS = worst([phS, tempS, turbS]);
  const overall = worst([waterS, hopS === 'unknown' ? 'ok' : hopS]);

  const issues = [
    phS !== 'ok' && phS !== 'unknown' ? `pH ${statusLabel[phS].toLowerCase()}` : null,
    tempS !== 'ok' && tempS !== 'unknown' ? `temperature ${statusLabel[tempS].toLowerCase()}` : null,
    turbS !== 'ok' && turbS !== 'unknown' ? `turbidity ${statusLabel[turbS].toLowerCase()}` : null,
    hopS === 'warning' ? 'feed is running low' : hopS === 'critical' ? 'feeder is almost empty' : null,
  ].filter(Boolean) as string[];

  const headline =
    overall === 'unknown'
      ? 'Waiting for the first reading'
      : issues.length
        ? `${issues[0][0].toUpperCase()}${issues[0].slice(1)}${issues.length > 1 ? ` and ${issues.length - 1} more` : ''}`
        : 'Everything looks healthy';
  const next = nextFeeding(schedules ?? [], new Date(now));
  const openAlerts = alerts.filter((a) => !a.acknowledged).slice(0, 4);

  return (
    <Screen
      title={aquarium?.name ?? 'My Aquarium'}
      subtitle={`${species ? `${species.count} × ${species.variety}` : 'Goldfish'}, ${
        reading ? `updated ${fmt.ago(reading.ts)}` : 'waiting for data'
      }`}
      right={
        deviceId ? (
          <StatusBadge status={online ? 'ok' : 'critical'} label={online ? 'Feeder online' : 'Feeder offline'} />
        ) : null
      }>
      {!deviceId ? (
        <EmptyState title="No feeder paired" body="Pair your AquaFeed device in Settings to see live data." />
      ) : null}

      {/* 1, Summary */}
      <View className="gap-3 rounded-2xl bg-accentsoft p-4">
        <View className="gap-1">
          <CardLabel icon={Waves} tone="accent">Tank status</CardLabel>
          <Text className={cx('font-display-bold text-[22px] leading-7', overall === 'ok' ? 'text-fg' : statusWord[overall])}>
            {headline}
          </Text>
        </View>
        <View className="flex-row gap-4">
          <View className="flex-1 gap-0.5">
            <Text className="text-[11px] text-muted">Next feeding</Text>
            <Text className="font-display text-[15px] text-fg">
              {next ? `${formatTime12(next.schedule.time)}, ${next.schedule.grams} g` : 'Not scheduled'}
            </Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-[11px] text-muted">Open alerts</Text>
            <Text className="font-display text-[15px] text-fg">{unacknowledged || 'None'}</Text>
          </View>
        </View>
      </View>

      {/* 2, Water: one row per reading */}
      <Card className="gap-0 p-0">
        <View className="px-3.5 pt-3"><CardLabel icon={Droplets}>Water, last 24 hours</CardLabel></View>
        <WaterRow icon={TestTube} label="pH" value={fmt.ph(reading?.ph)} status={phS} values={trend.ph}
          band={[t.ph.okMin, t.ph.okMax]} color={series.ph} minMax={trend.minMax('ph', 1)} />
        <WaterRow icon={Thermometer} label="Temperature" value={reading ? reading.tempC.toFixed(1) : '—'} unit="°C" status={tempS}
          values={trend.temp} band={[t.temperature.okMin, t.temperature.okMax]} color={series.temp}
          minMax={trend.minMax('tempC', 1)} />
        <WaterRow icon={GlassWater} label="Clarity" value={reading ? reading.turbidityPct.toFixed(0) : '—'} unit="%" status={turbS}
          values={trend.turb} color={series.turbidity} minMax={trend.minMax('turbidityPct', 0)} last />
      </Card>

      {/* 3, Feeding today */}
      <Today schedules={schedules ?? []} logs={logs} now={now} />

      {/* 4, Hopper */}
      <Card className="gap-2.5 p-3.5">
        <View className="flex-row items-center justify-between">
          <CardLabel icon={Bean}>Feed left in the feeder</CardLabel>
          <Text className={cx('text-xs font-semibold', statusWord[hopS])}>
            {hopperLevel ? hopperLabel[hopperLevel] : 'No data'}
          </Text>
        </View>
        <View className="flex-row items-baseline gap-1">
          <Text className="font-display-bold text-[28px] text-fg">
            {device?.hopper ? Math.round(hopperFill * 100) : '—'}
          </Text>
          <Text className="text-xs text-muted">% full</Text>
        </View>
        <Meter value={hopperFill} tone={hopS === 'critical' ? 'red' : hopS === 'warning' ? 'amber' : 'brand'} />
        <Text className="text-[11px] text-faint">
          {!device?.hopper
            ? 'Waiting for a level reading'
            : hopS === 'critical'
              ? 'Almost empty. Refill now so feedings are not missed.'
              : hopS === 'warning'
                ? 'Running low. Refill soon.'
                : 'Plenty of feed left.'}
        </Text>
      </Card>

      {/* 5, Alerts */}
      <Group>
        <Item>
          <Text className="flex-1 text-xs font-medium text-muted">Open alerts</Text>
          <Text className="text-xs font-semibold text-fg">{unacknowledged}</Text>
        </Item>
        {openAlerts.length ? (
          openAlerts.map((a, i) => (
            <Item key={a.id} last={i === openAlerts.length - 1} className="items-start">
              <View className="pt-0.5">
                <Icon as={AlertTriangle} tone={a.severity === 'critical' ? 'crit' : 'warn'} />
              </View>
              <View className="flex-1">
                <Text className="text-[13px] leading-[18px] text-fg">
                  <Text className={cx('font-semibold', a.severity === 'critical' ? 'text-crit' : 'text-warn')}>
                    {a.severity === 'critical' ? 'Critical' : 'Warning'}
                  </Text>
                  {'  '}
                  {a.message}
                </Text>
                <Text className="text-[11px] text-faint">{fmt.dateTime(a.ts)}</Text>
              </View>
            </Item>
          ))
        ) : (
          <Item last>
            <Text className="text-[13px] text-muted">No open alerts.</Text>
          </Item>
        )}
      </Group>

      {/* 6, Device */}
    </Screen>
  );
}

/* Water row: name and status, trend, current value */

function WaterRow({
  icon, label, value, unit, status, values, band, color, minMax, last,
}: {
  icon: LucideIcon; label: string; value: string; unit?: string; status: Status; values: number[];
  band?: [number, number]; color: string; minMax: string; last?: boolean;
}) {
  return (
    <View className={cx('flex-row items-center gap-3 px-3.5 py-3', !last && 'border-b border-linesoft')}>
      <Icon as={icon} tone="muted" size={18} />
      <View className="w-24 gap-0.5">
        <Text className="text-[13px] font-medium text-fg">{label}</Text>
        <Text className={cx('text-[11px] font-medium', statusWord[status])}>{statusLabel[status]}</Text>
      </View>
      <View className="flex-1">
        <Sparkline values={values} band={band} color={color} height={30} />
      </View>
      <View className="w-20 items-end gap-0.5">
        <View className="flex-row items-baseline gap-0.5">
          <Text className="font-display text-xl text-fg">{value}</Text>
          {unit ? <Text className="text-[11px] text-muted">{unit}</Text> : null}
        </View>
        <Text className="text-[10px] text-faint">{minMax}</Text>
      </View>
    </View>
  );
}

const SPARK_POINTS = 40;

function summarize(readings: WithId<WaterReading>[]) {
  const series = (k: 'ph' | 'tempC' | 'turbidityPct') =>
    readings.map((r) => r[k]).filter((v) => Number.isFinite(v));
  const spark = (k: 'ph' | 'tempC' | 'turbidityPct') => {
    const vals = series(k);
    if (vals.length <= SPARK_POINTS) return vals;
    const size = vals.length / SPARK_POINTS;
    return Array.from({ length: SPARK_POINTS }, (_, i) => {
      const b = vals.slice(Math.floor(i * size), Math.floor((i + 1) * size));
      return b.reduce((s, v) => s + v, 0) / b.length;
    });
  };
  return {
    ph: spark('ph'),
    temp: spark('tempC'),
    turb: spark('turbidityPct'),
    minMax: (k: 'ph' | 'tempC' | 'turbidityPct', d: number) => {
      const vals = series(k);
      if (!vals.length) return '—';
      return `${Math.min(...vals).toFixed(d)}–${Math.max(...vals).toFixed(d)}`;
    },
  };
}

/* Feeding today */

type SlotStatus = 'done' | 'missed' | 'due' | 'upcoming';

const slotText: Record<SlotStatus, { text: string; cls: string; tone: 'ok' | 'crit' | 'warn' | 'faint' }> = {
  done: { text: 'Fed', cls: 'text-ok', tone: 'ok' },
  missed: { text: 'Missed', cls: 'text-crit', tone: 'crit' },
  due: { text: 'Due now', cls: 'text-warn', tone: 'warn' },
  upcoming: { text: 'Later', cls: 'text-faint', tone: 'faint' },
};

function Today({
  schedules,
  logs,
  now,
}: {
  schedules: WithId<FeedingSchedule>[];
  logs: WithId<FeedingLog>[];
  now: number;
}) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = logs.filter((l) => l.ts >= startOfDay.getTime());
  const enabled = sortByTime(schedules.filter((s) => s.enabled));

  const slots = enabled.map((s) => {
    const { h, m } = parseHHmm(s.time);
    const due = new Date(startOfDay);
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
    return { s, log, status };
  });

  const planned = enabled.reduce((sum, s) => sum + s.grams, 0);
  const dispensed = today.reduce((sum, l) => sum + (l.verifiedG || 0), 0);
  const done = slots.filter((x) => x.status === 'done').length;
  const manual = today.filter((l) => l.source === 'manual').length;

  return (
    <View>
      <View className="overflow-hidden rounded-xl bg-surface">
        <View className="px-3 pt-3"><CardLabel icon={Fish}>Feeding today</CardLabel></View>
        <View className="flex-row border-b border-linesoft">
          <Stat label="Feeds" value={`${done} of ${enabled.length}`} sub={manual ? `+${manual} manual` : 'scheduled'} />
          <Stat label="Dispensed" value={`${dispensed.toFixed(2)} g`} sub={`plan ${planned.toFixed(2)} g`} />
          <Stat label="Left today" value={`${Math.max(0, planned - dispensed).toFixed(2)} g`} sub="still to feed" last />
        </View>
        <View className="px-3 pb-1 pt-2.5">
          <Meter value={planned ? dispensed / planned : 0} />
        </View>
        {slots.length ? (
          slots.map(({ s, log, status }, i) => (
            <Item key={s.id} last={i === slots.length - 1}>
              <Text className="w-20 text-[13px] font-medium text-fg">{formatTime12(s.time)}</Text>
              <Text className="flex-1 text-[13px] text-muted">
                {log ? `${log.verifiedG.toFixed(2)} of ${s.grams} g` : `${s.grams} g`}
              </Text>
              <Icon as={status === 'done' ? Check : status === 'missed' ? X : Clock} tone={slotText[status].tone} size={14} />
              <Text className={cx('text-xs font-medium', slotText[status].cls)}>{slotText[status].text}</Text>
            </Item>
          ))
        ) : (
          <Item last>
            <Text className="text-[13px] text-muted">No feeding times set.</Text>
          </Item>
        )}
      </View>
    </View>
  );
}

function Stat({ label, value, sub, last }: { label: string; value: string; sub: string; last?: boolean }) {
  return (
    <View className={cx('flex-1 gap-0.5 px-3 py-2.5', !last && 'border-r border-linesoft')}>
      <Label>{label}</Label>
      <Text className="font-display text-[15px] text-fg">{value}</Text>
      <Text className="text-[10px] text-faint" numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}
