import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Switch, View } from 'react-native';

import { Text } from '@/components/text';

import { useAquariumId } from '@/hooks/use-data';
import { deleteSchedule, MAX_PORTION_G, MIN_PORTION_G, saveSchedule } from '@/lib/actions';
import { errorMessage } from '@/lib/format';
import { formatTime12, parseHHmm, toHHmm } from '@/lib/schedule';
import { useTheme } from '@/lib/theme';
import type { FeedingSchedule, WithId } from '@/lib/types';

import { BottomSheet } from './sheet';
import { Button, Chips, Label, TextField } from './ui';

const PRESETS = [0.5, 1, 2].map((p) => ({ value: p.toFixed(1), label: `${p} g` }));

/** Add / edit a feeding time in a bottom sheet. `editing` null = closed, 'new' = add. */
export function ScheduleSheet({
  editing,
  schedules,
  onClose,
}: {
  editing: WithId<FeedingSchedule> | 'new' | null;
  schedules: WithId<FeedingSchedule>[];
  onClose: () => void;
}) {
  // Keep the last target while the sheet animates closed.
  const [shown, setShown] = useState(editing);
  if (editing && editing !== shown) setShown(editing);
  const existing = shown && shown !== 'new' ? shown : undefined;

  return (
    <BottomSheet
      visible={!!editing}
      onClose={onClose}
      title={existing ? 'Edit feeding time' : 'New feeding time'}>
      {shown ? (
        <ScheduleForm
          key={existing?.id ?? 'new'}
          existing={existing}
          others={schedules}
          onDone={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

function firstFreeHour(others: WithId<FeedingSchedule>[]): string {
  const taken = new Set(others.map((s) => s.time));
  const start = new Date().getHours() + 1;
  for (let i = 0; i < 24; i++) {
    const t = `${String((start + i) % 24).padStart(2, '0')}:00`;
    if (!taken.has(t)) return t;
  }
  return '08:30';
}

function ScheduleForm({
  existing,
  others,
  onDone,
}: {
  existing?: WithId<FeedingSchedule>;
  others: WithId<FeedingSchedule>[];
  onDone: () => void;
}) {
  const aid = useAquariumId();
  const { colors, scheme } = useTheme();
  // New feedings start at the next whole hour that isn't already scheduled.
  const [initial] = useState(() => existing?.time ?? firstFreeHour(others));
  const [time, setTime] = useState(() => {
    const d = new Date();
    const { h, m } = parseHHmm(initial);
    d.setHours(h, m, 0, 0);
    return d;
  });
  const [webTime, setWebTime] = useState(initial);
  const [grams, setGrams] = useState(existing ? existing.grams.toFixed(1) : '1.0');
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number(grams);
  const valid = Number.isFinite(value) && value >= MIN_PORTION_G && value <= MAX_PORTION_G;
  const duplicate = others.some((s) => s.id !== existing?.id && s.time === toHHmm(time));

  const run = async (fn: () => Promise<void>) => {
    if (!aid) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(() =>
      saveSchedule(aid!, existing?.id ?? null, {
        time: toHHmm(time),
        grams: Math.round(value * 100) / 100,
        enabled,
      }),
    );

  if (confirmDelete && existing) {
    return (
      <View className="gap-2">
        <Text className="text-sm text-fg2">
          Delete the {formatTime12(existing.time)} feeding ({existing.grams} g)? The feeder stops
          running it after its next sync.
        </Text>
        {error ? <Text className="text-xs text-crit">{error}</Text> : null}
        <Button
          className="mt-2"
          title="Delete"
          variant="danger"
          loading={busy}
          onPress={() => run(() => deleteSchedule(aid!, existing.id))}
        />
        <Button title="Keep it" variant="secondary" onPress={() => setConfirmDelete(false)} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Label>Time</Label>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            themeVariant={scheme}
            style={{ height: 150 }}
            onChange={(_, d) => d && setTime(d)}
          />
        ) : Platform.OS === 'web' ? (
          <TextField
            label="24-hour (HH:mm)"
            value={webTime}
            onChangeText={(v) => {
              setWebTime(v);
              if (/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) {
                const { h, m } = parseHHmm(v);
                const d = new Date(time);
                d.setHours(h, m, 0, 0);
                setTime(d);
              }
            }}
            hint={formatTime12(toHHmm(time))}
          />
        ) : (
          <>
            <Pressable
              onPress={() => setShowAndroidPicker(true)}
              className="h-12 justify-center rounded-lg border border-line px-3">
              <Text className="font-display text-xl text-fg">{formatTime12(toHHmm(time))}</Text>
            </Pressable>
            {showAndroidPicker ? (
              <DateTimePicker
                value={time}
                mode="time"
                onChange={(_, d) => {
                  setShowAndroidPicker(false);
                  if (d) setTime(d);
                }}
              />
            ) : null}
          </>
        )}
        {duplicate ? (
          <Text className="text-[11px] text-warn">Another feeding is already set for this time.</Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <Label>Portion</Label>
        <Chips value={grams} options={PRESETS} onChange={setGrams} />
        <TextField
          label="Grams"
          keyboardType="decimal-pad"
          value={grams}
          onChangeText={setGrams}
          error={valid ? undefined : `Enter ${MIN_PORTION_G}–${MAX_PORTION_G} g`}
        />
      </View>

      <View className="flex-row items-center justify-between rounded-lg bg-surface2 px-3 py-1.5">
        <Text className="text-[13px] text-fg">Enabled</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.accent, false: colors.line }}
          thumbColor={colors.surface}
          style={{ transform: [{ scale: 0.85 }] }}
        />
      </View>

      {error ? <Text className="text-xs text-crit">{error}</Text> : null}

      <View className="flex-row gap-2">
        {existing ? (
          <Button
            className="flex-1"
            title="Delete"
            variant="danger"
            disabled={busy}
            onPress={() => setConfirmDelete(true)}
          />
        ) : (
          <Button className="flex-1" title="Cancel" variant="secondary" onPress={onDone} />
        )}
        <Button
          className="flex-[2]"
          title="Save"
          loading={busy}
          disabled={!valid || duplicate}
          onPress={save}
        />
      </View>
    </View>
  );
}
