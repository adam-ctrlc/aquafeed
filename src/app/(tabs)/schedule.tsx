import { format } from 'date-fns';
import { AlarmClock, Check, Clock, Moon, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { ManualFeed } from '@/components/manual-feed';
import { ScheduleSheet } from '@/components/schedule-sheet';
import { Meter } from '@/components/sparkline';
import { Text } from '@/components/text';
import { CardLabel, cx, Icon, Screen, Skeleton } from '@/components/ui';
import { useAquariumId, useFeedingLogs, useSchedules } from '@/hooks/use-data';
import { useNow } from '@/hooks/use-now';
import { setScheduleEnabled } from '@/lib/actions';
import { Alert } from '@/lib/alert';
import { errorMessage, fmt } from '@/lib/format';
import { formatCountdown, formatTime12, nextFeeding, sortByTime, todaySlots } from '@/lib/schedule';
import { useTheme } from '@/lib/theme';
import type { FeedingSchedule, WithId } from '@/lib/types';

export default function ScheduleScreen() {
  const aid = useAquariumId();
  const now = useNow(15_000);
  const { data, loading } = useSchedules();
  const { logs } = useFeedingLogs(60);
  const schedules = sortByTime(data ?? []);
  const next = nextFeeding(schedules, new Date(now));
  const day = todaySlots(schedules, logs, now);
  const { colors } = useTheme();
  const [editing, setEditing] = useState<WithId<FeedingSchedule> | 'new' | null>(null);
  const lastFeed = logs[0];
  const left = Math.max(0, day.planned - day.given);

  const summary = !day.slots.length
    ? 'No feeding times are switched on.'
    : day.missed
      ? `${day.missed} feeding${day.missed > 1 ? 's were' : ' was'} missed today. Check the feeder.`
      : day.fed === day.slots.length
        ? 'All of today’s feedings went well.'
        : day.fed
          ? 'Every feeding so far today went well.'
          : 'No feedings yet today.';

  return (
    <Screen title="Feeding" subtitle={`It is ${format(now, 'h:mm a')}, ${format(now, 'EEEE')}`}>
      <View className="gap-3 rounded-2xl bg-accentsoft p-4">
        <View className="gap-1">
          <CardLabel icon={Clock} tone="accent">Next feeding</CardLabel>
          <Text className="font-display-bold text-[22px] leading-7 text-fg">
            {next ? `In ${formatCountdown(next.at.getTime() - now)}` : 'Nothing scheduled'}
          </Text>
          {next ? (
            <Text className="text-xs text-muted">
              At {formatTime12(next.schedule.time)}, {next.schedule.grams} g
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-4">
          <Hero label="Fed today" value={`${day.fed} of ${day.slots.length}`} />
          <Hero label="Given today" value={`${day.given.toFixed(2)} g`} />
          <Hero label="Still to give" value={`${left.toFixed(2)} g`} />
        </View>
        <Meter value={day.planned ? day.given / day.planned : 0} />
        <Text className={cx('text-xs', day.missed ? 'font-medium text-crit' : 'text-fg2')}>{summary}</Text>
      </View>

      <ManualFeed />

      <View className="overflow-hidden rounded-xl bg-surface">
        <View className="flex-row items-center justify-between border-b border-linesoft px-3.5 py-3">
          <CardLabel icon={AlarmClock}>Feeding times</CardLabel>
          <Pressable hitSlop={10} onPress={() => setEditing('new')}>
            <Text className="text-xs font-semibold text-accent">Add</Text>
          </Pressable>
        </View>
        {loading && schedules.length === 0 ? (
          <View className="gap-2.5 px-3.5 py-3.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-40" />
          </View>
        ) : !loading && schedules.length === 0 ? (
          <View className="px-3.5 py-4">
            <Text className="text-[13px] text-muted">No feeding times yet. Tap Add to create one.</Text>
          </View>
        ) : (
          schedules.map((s, i) => {
            const slot = day.slots.find((x) => x.schedule.id === s.id);
            const isNext = next?.schedule.id === s.id;
            const info = !s.enabled
              ? { icon: Moon, tone: 'faint' as const, text: 'Switched off' }
              : slot?.status === 'done'
                ? { icon: Check, tone: 'ok' as const, text: `Fed ${slot.log!.verifiedG.toFixed(2)} g at ${fmt.time(slot.log!.ts)}` }
                : slot?.status === 'missed'
                  ? { icon: X, tone: 'crit' as const, text: 'Missed today' }
                  : slot?.status === 'due'
                    ? { icon: Clock, tone: 'warn' as const, text: 'Feeding now' }
                    : { icon: Clock, tone: isNext ? ('accent' as const) : ('faint' as const), text: isNext ? `Up next, in ${formatCountdown((slot?.dueAt ?? now) - now)}` : 'Later today' };
            const toneCls = { ok: 'text-ok', crit: 'text-crit', warn: 'text-warn', accent: 'text-accent', faint: 'text-muted' }[info.tone];
            return (
              <View
                key={s.id}
                className={cx('flex-row items-center gap-3 px-3.5', i < schedules.length - 1 && 'border-b border-linesoft')}>
                <Pressable onPress={() => setEditing(s)} className="flex-1 gap-1 py-3 active:opacity-60">
                  <View className="flex-row items-baseline gap-2">
                    <Text className={cx('font-display text-[17px]', s.enabled ? 'text-fg' : 'text-faint')}>
                      {formatTime12(s.time)}
                    </Text>
                    <Text className="text-xs text-muted">{s.grams} g</Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Icon as={info.icon} tone={info.tone} size={13} />
                    <Text className={cx('text-xs', toneCls)}>{info.text}</Text>
                  </View>
                </Pressable>
                <Switch
                  value={s.enabled}
                  trackColor={{ true: colors.accent, false: colors.line }}
                  thumbColor={colors.surface}
                  style={{ transform: [{ scale: 0.85 }] }}
                  onValueChange={(v) => {
                    if (aid)
                      setScheduleEnabled(aid, s.id, v).catch((e) => Alert.alert('Error', errorMessage(e)));
                  }}
                />
              </View>
            );
          })
        )}
      </View>

      {lastFeed ? (
        <Text className="px-1 text-center text-[11px] text-faint">
          Last feeding was {fmt.ago(lastFeed.ts)}: {lastFeed.verifiedG.toFixed(2)} g
          {lastFeed.source === 'manual' ? ' from the app' : ' on schedule'}.
        </Text>
      ) : null}

      <ScheduleSheet editing={editing} schedules={schedules} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function Hero({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text className="font-display text-[15px] text-fg">{value}</Text>
    </View>
  );
}
