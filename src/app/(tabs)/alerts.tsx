import { format, isToday, isYesterday } from 'date-fns';
import { AlertTriangle, Bell, Check, CircleAlert, Hand, OctagonAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { Button, CardLabel, cx, EmptyState, Icon, Pagination, Screen, Segmented, SkeletonRows, usePaged } from '@/components/ui';
import { useAlerts, useAquariumId, useFeedingLogs } from '@/hooks/use-data';
import { acknowledgeAlert, acknowledgeAll } from '@/lib/actions';
import { Alert } from '@/lib/alert';
import { errorMessage, fmt } from '@/lib/format';
import type { FeedingLog, SystemAlert, WithId } from '@/lib/types';
import { useAuth } from '@/stores/auth';

type Tab = 'alerts' | 'feeding';

const dayLabel = (ts: number) =>
  isToday(ts) ? 'Today' : isYesterday(ts) ? 'Yesterday' : format(ts, 'EEEE, MMM d');

function groupByDay<T extends { ts: number }>(items: T[]): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const it of items) {
    const label = dayLabel(it.ts);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(it);
    else groups.push({ label, items: [it] });
  }
  return groups;
}

export default function AlertsScreen() {
  const [tab, setTab] = useState<Tab>('alerts');
  const { alerts, unacknowledged, loading: alertsLoading } = useAlerts(100);
  const { logs, loading: logsLoading } = useFeedingLogs(100);

  const stats = useMemo(() => {
    const ok = logs.filter((l) => l.targetG > 0 && !l.faults?.emptyOrJammed);
    const problems = logs.filter((l) => l.faults?.emptyOrJammed || l.faults?.dispenseIncomplete).length;
    if (!ok.length) return { n: logs.length, accuracy: null as number | null, problems };
    const err = ok.reduce((s, l) => s + (Math.abs(l.verifiedG - l.targetG) / l.targetG) * 100, 0) / ok.length;
    return { n: logs.length, accuracy: 100 - err, problems };
  }, [logs]);

  return (
    <Screen title="History" subtitle="What needs your attention and what was fed">
      <View className="gap-3 rounded-2xl bg-accentsoft p-4">
        <View className="gap-1">
          <CardLabel icon={Bell} tone="accent">Needs attention</CardLabel>
          <Text className={cx('font-display-bold text-[22px] leading-7', unacknowledged ? 'text-warn' : 'text-fg')}>
            {unacknowledged
              ? `${unacknowledged} thing${unacknowledged > 1 ? 's' : ''} to check`
              : 'Nothing to check'}
          </Text>
        </View>
        <View className="flex-row gap-4">
          <Hero label="Feedings recorded" value={String(stats.n)} />
          <Hero label="Portion accuracy" value={stats.accuracy != null ? `${stats.accuracy.toFixed(0)}%` : '—'} />
          <Hero label="Feeding problems" value={String(stats.problems)} />
        </View>
      </View>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'alerts', label: unacknowledged ? `Alerts (${unacknowledged})` : 'Alerts' },
          { value: 'feeding', label: 'Feedings' },
        ]}
      />

      {tab === 'alerts' ? (
        <AlertsList alerts={alerts} loading={alertsLoading} />
      ) : (
        <FeedingList logs={logs} loading={logsLoading} />
      )}
    </Screen>
  );
}

function Hero({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] text-muted" numberOfLines={1}>
        {label}
      </Text>
      <Text className="font-display text-[15px] text-fg">{value}</Text>
    </View>
  );
}

/* Alerts ------------------------------------------------------------------ */

function AlertsList({ alerts, loading }: { alerts: WithId<SystemAlert>[]; loading: boolean }) {
  const aid = useAquariumId();
  const uid = useAuth((s) => s.user?.uid);
  const open = alerts.filter((a) => !a.acknowledged);
  const done = alerts.filter((a) => a.acknowledged);
  const seen = usePaged(done, 10);

  const ack = (id: string) => {
    if (aid && uid) acknowledgeAlert(aid, id, uid).catch((e) => Alert.alert('Error', errorMessage(e)));
  };
  const ackAll = () => {
    if (aid && uid)
      acknowledgeAll(aid, open.map((a) => a.id), uid).catch((e) => Alert.alert('Error', errorMessage(e)));
  };

  if (loading && alerts.length === 0) return <SkeletonRows rows={4} />;
  if (!loading && alerts.length === 0) {
    return <EmptyState title="No alerts yet" body="If the water or the feeder needs attention, it shows up here." />;
  }

  return (
    <>
      {open.map((a) => {
        const critical = a.severity === 'critical';
        return (
          <View key={a.id} className="gap-3 rounded-xl bg-surface p-3.5">
            <View className="flex-row items-start gap-3">
              <View className={cx('h-9 w-9 items-center justify-center rounded-full', critical ? 'bg-critsoft' : 'bg-warnsoft')}>
                <Icon as={critical ? OctagonAlert : AlertTriangle} tone={critical ? 'crit' : 'warn'} size={18} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className={cx('text-xs font-semibold', critical ? 'text-crit' : 'text-warn')}>
                  {critical ? 'Act now' : 'Check soon'}
                </Text>
                <Text className="text-sm font-medium leading-5 text-fg">{a.message}</Text>
                <Text className="text-[11px] text-faint">
                  {fmt.ago(a.ts)}, {fmt.dateTime(a.ts)}
                </Text>
              </View>
            </View>
            <Button size="sm" variant="secondary" title="Mark as seen" icon={<Icon as={Check} tone="fg2" size={14} />} onPress={() => ack(a.id)} />
          </View>
        );
      })}
      {open.length > 1 ? <Button variant="ghost" size="sm" title="Mark all as seen" onPress={ackAll} /> : null}
      {open.length === 0 ? (
        <View className="flex-row items-center gap-3 rounded-xl bg-surface p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-oksoft">
            <Icon as={Check} tone="ok" size={18} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-fg">You are all caught up</Text>
            <Text className="text-xs text-muted">Nothing needs your attention right now.</Text>
          </View>
        </View>
      ) : null}

      {seen.loading ? <SkeletonRows rows={Math.min(seen.slice.length, 6) || 3} /> : null}
      {(seen.loading ? [] : groupByDay(seen.slice)).map((g) => (
        <View key={g.label} className="overflow-hidden rounded-xl bg-surface">
          <Text className="border-b border-linesoft px-3.5 py-2.5 text-xs font-medium text-muted">
            Already seen, {g.label.toLowerCase()}
          </Text>
          {g.items.map((a, i) => (
            <View
              key={a.id}
              className={cx('flex-row items-start gap-3 px-3.5 py-2.5', i < g.items.length - 1 && 'border-b border-linesoft')}>
              <View className="pt-0.5">
                <Icon as={CircleAlert} tone="faint" size={15} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-[13px] leading-[18px] text-fg2">{a.message}</Text>
                <Text className="text-[11px] text-faint">{fmt.time(a.ts)}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
      <Pagination page={seen.page} pages={seen.pages} onChange={seen.setPage} />
    </>
  );
}

/* Feedings ---------------------------------------------------------------- */

function FeedingList({ logs, loading }: { logs: WithId<FeedingLog>[]; loading: boolean }) {
  const paged = usePaged(logs, 10);
  if (loading && logs.length === 0) return <SkeletonRows rows={6} />;
  if (!loading && logs.length === 0) {
    return <EmptyState title="No feedings yet" body="Every feeding is recorded here with the amount given." />;
  }
  return (
    <>
      {paged.loading ? <SkeletonRows rows={paged.slice.length || 6} /> : null}
      {(paged.loading ? [] : groupByDay(paged.slice)).map((g) => {
        const total = g.items.reduce((s, l) => s + (l.verifiedG || 0), 0);
        return (
          <View key={g.label} className="overflow-hidden rounded-xl bg-surface">
            <View className="flex-row items-center justify-between border-b border-linesoft px-3.5 py-2.5">
              <Text className="text-xs font-medium text-muted">{g.label}</Text>
              <Text className="text-xs text-muted">
                {g.items.length} feeding{g.items.length > 1 ? 's' : ''}, {total.toFixed(2)} g
              </Text>
            </View>
            {g.items.map((l, i) => {
              const problem = l.faults?.emptyOrJammed
                ? 'Feeder was empty or stuck'
                : l.faults?.dispenseIncomplete
                  ? 'Some food stayed in the feeder'
                  : null;
              const manual = l.source === 'manual';
              return (
                <Pressable
                  key={l.id}
                  onPress={() =>
                    Alert.alert(`Feeding at ${fmt.time(l.ts)}`, feedingDetails(l), [{ text: 'Close' }])
                  }
                  className={cx(
                    'flex-row items-center gap-3 px-3.5 py-2.5 active:bg-surface2',
                    i < g.items.length - 1 && 'border-b border-linesoft',
                  )}>
                  <Icon as={problem ? AlertTriangle : manual ? Hand : Check} tone={problem ? 'warn' : manual ? 'accent' : 'ok'} />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-[13px] font-medium text-fg">{fmt.time(l.ts)}</Text>
                    <Text className={cx('text-[11px]', problem ? 'text-warn' : 'text-muted')}>
                      {problem ?? (manual ? 'Fed from the app' : 'Fed on schedule')}
                    </Text>
                  </View>
                  <Text className="font-display text-[15px] text-fg">{l.verifiedG.toFixed(2)} g</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
      <Pagination page={paged.page} pages={paged.pages} onChange={paged.setPage} />
    </>
  );
}

function feedingDetails(l: FeedingLog): string {
  const diff = l.verifiedG - l.targetG;
  const lines = [
    `Asked for ${l.targetG} g and gave ${l.verifiedG.toFixed(2)} g (${diff >= 0 ? '+' : ''}${diff.toFixed(2)} g).`,
    l.source === 'manual' ? 'Started from the app.' : 'Started by the schedule.',
  ];
  if (l.scheduledFor) {
    const late = Math.round((l.ts - l.scheduledFor) / 1000);
    lines.push(late <= 1 ? 'Ran right on time.' : `Ran ${late} seconds after the set time.`);
  }
  if (l.hopperLevel) lines.push(`Feed left afterwards: ${l.hopperLevel === 'good' ? 'plenty' : l.hopperLevel === 'low' ? 'running low' : 'almost empty'}.`);
  if (l.queued) lines.push('The feeder was offline at the time and reported this later.');
  return lines.join('\n');
}
