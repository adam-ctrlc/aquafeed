import { Fish } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { ONLINE_WINDOW_MS, useDevice } from '@/hooks/use-data';
import { useNow } from '@/hooks/use-now';
import { MAX_PORTION_G, MIN_PORTION_G, requestFeed } from '@/lib/actions';
import { errorMessage, fmt } from '@/lib/format';
import { useAuth } from '@/stores/auth';

import { BottomSheet } from './sheet';
import { Button, Card, Chips, Icon, TextField } from './ui';

const PRESETS = [
  { value: '0.5', label: '0.5 g' },
  { value: '1.0', label: '1 g' },
  { value: '2.0', label: '2 g' },
];

/** "Feed now" button; the portion is chosen in a bottom sheet. Renders nothing until a feeder is paired. */
export function ManualFeed() {
  const { data: device, deviceId } = useDevice();
  const now = useNow(5000);
  const online = !!device?.lastSeen && now - device.lastSeen < ONLINE_WINDOW_MS;
  const uid = useAuth((s) => s.user?.uid);
  const [open, setOpen] = useState(false);
  const [grams, setGrams] = useState('1.0');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!deviceId) return null;

  const cmd = device?.commands?.feed;
  const busy =
    !!cmd && (cmd.status === 'pending' || cmd.status === 'running') && now - cmd.requestedAt < 120_000;
  const value = Number(grams);
  const valid = Number.isFinite(value) && value >= MIN_PORTION_G && value <= MAX_PORTION_G;

  const send = async () => {
    if (!uid) return;
    setSending(true);
    setError(null);
    try {
      await requestFeed(deviceId, uid, Math.round(value * 100) / 100);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card className="gap-2 p-3.5">
        <Button
          title={busy ? 'Feeding…' : 'Feed now'}
          icon={<Icon as={Fish} tone="onaccent" />}
          loading={busy}
          onPress={() => setOpen(true)}
        />
        {cmd ? (
          <Text className="text-center text-[11px] text-muted">
            Last feed from the app: {cmd.grams} g, {cmd.status}
            {cmd.verifiedG != null ? `, weighed ${fmt.grams(cmd.verifiedG)}` : ''}
            {cmd.error ? `, ${cmd.error}` : ''}, {fmt.ago(cmd.requestedAt)}
          </Text>
        ) : null}
      </Card>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Feed now">
        <View className="gap-3">
          <Text className="text-sm leading-5 text-fg2">
            {online
              ? 'Choose how much to feed. The feeder weighs the portion before dropping it in.'
              : 'The feeder is not responding right now. It will feed as soon as it reconnects.'}
          </Text>
          <Chips value={grams} options={PRESETS} onChange={setGrams} />
          <TextField
            label="Portion in grams"
            keyboardType="decimal-pad"
            value={grams}
            onChangeText={setGrams}
            error={valid ? undefined : `Enter ${MIN_PORTION_G} to ${MAX_PORTION_G} g`}
          />
          {error ? <Text className="text-xs text-crit">{error}</Text> : null}
          <View className="mt-1 flex-row gap-2">
            <Button className="flex-1" title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
            <Button
              className="flex-[2]"
              title={valid ? `Feed ${value} g` : 'Feed'}
              loading={sending}
              disabled={!valid}
              onPress={send}
            />
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
