import { router } from 'expo-router';
import {
  Bell,
  Camera,
  Database,
  FlaskConical,
  Wifi,
  Gauge,
  SlidersHorizontal,
  Wrench,
  ChevronRight,
  Shell,
  LogOut,
  Palette,
  RefreshCw,
  Router,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import {
  CalibrationRoutinesCard,
  CalibrationValuesCard,
  ThresholdsCard,
} from '@/components/admin-tools';
import { checkForUpdateNow } from '@/components/app-updater';
import { AppearanceOptions } from '@/components/appearance';
import { BottomSheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { Button, Card, CardLabel, cx, Icon, OptionList, Screen, TextField } from '@/components/ui';
import { ONLINE_WINDOW_MS, useAquarium, useAquariumId, useDevice } from '@/hooks/use-data';
import { useNow } from '@/hooks/use-now';
import {
  pairDevice,
  unpairDevice,
  updateAquarium,
  updateName,
  updateProfilePhoto,
} from '@/lib/actions';
import { Alert } from '@/lib/alert';
import { isDemo } from '@/lib/db';
import { explainOtherMode, showModeInfo } from '@/lib/mode';
import { errorMessage, fmt } from '@/lib/format';
import { registerForPush } from '@/lib/notifications';
import { pickProfilePhoto } from '@/lib/photo';
import type { Aquarium } from '@/lib/types';
import { useAuth, useIsAdmin } from '@/stores/auth';

export default function SettingsScreen() {
  const profile = useAuth((s) => s.profile);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const isAdmin = useIsAdmin();
  const [tool, setTool] = useState<'limits' | 'routines' | 'values' | null>(null);
  const [toolOpen, setToolOpen] = useState(false);
  const openTool = (t: 'limits' | 'routines' | 'values') => {
    setTool(t);
    setToolOpen(true);
  };

  return (
    <Screen title="Settings" subtitle="Your profile, feeder and tank">
      <ProfileHero />
      <NameCard key={profile?.displayName ?? ''} />
      <DeviceCard />
      <AquariumCard />
      <AppearanceCard />

      <View className="overflow-hidden rounded-xl bg-surface">
        <LinkRow
          icon={Bell}
          title="Alerts on this phone"
          body="Get notified even when the app is closed"
          onPress={async () => {
            if (!user) return;
            const { token, reason } = await registerForPush(user.uid);
            Alert.alert(
              token ? 'Alerts are on' : 'Alerts could not be turned on',
              token ? 'This phone will be notified when something needs attention.' : reason,
            );
          }}
          last
        />
      </View>

      <View className="overflow-hidden rounded-xl bg-surface">
        <View className="px-3.5 pt-3">
          <CardLabel icon={Database}>Data mode</CardLabel>
        </View>
        <OptionList
          value={isDemo ? 'demo' : 'live'}
          onChange={(v) => ((v === 'demo') === isDemo ? showModeInfo() : explainOtherMode())}
          options={[
            { value: 'demo', icon: FlaskConical, label: 'Demo', body: 'Sample data from a pretend feeder. Nothing is saved.', note: 'Not in use' },
            { value: 'live', icon: Wifi, label: 'Live', body: 'Real data from your feeder, saved to your account.', note: isDemo ? 'Not set up yet' : undefined },
          ]}
        />
      </View>

      {isAdmin ? (
        <View className="overflow-hidden rounded-xl bg-surface">
          <View className="px-3.5 pt-3">
            <CardLabel icon={ShieldCheck}>Administrator tools</CardLabel>
          </View>
          <LinkRow icon={Users} title="People" body="See, edit, turn off or remove accounts" onPress={() => router.push('/people')} />
          <LinkRow icon={SlidersHorizontal} title="Alert limits" body="When to warn about water and feed" onPress={() => openTool('limits')} />
          <LinkRow icon={Gauge} title="Calibrate sensors" body="Run a calibration on the feeder" onPress={() => openTool('routines')} />
          <LinkRow icon={Wrench} title="Calibration values" body="View or edit saved values" onPress={() => openTool('values')} last />
        </View>
      ) : null}

      <BottomSheet visible={toolOpen} onClose={() => setToolOpen(false)} scroll>
        {tool === 'limits' ? <ThresholdsCard /> : tool === 'routines' ? <CalibrationRoutinesCard /> : tool === 'values' ? <CalibrationValuesCard /> : null}
      </BottomSheet>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert('Sign out?', profile?.email ?? '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
          ])
        }
        className="flex-row items-center gap-3 rounded-xl bg-surface px-3.5 py-3 active:bg-surface2">
        <Icon as={LogOut} tone="muted" size={18} />
        <View className="flex-1 gap-0.5">
          <Text className="text-[13px] font-medium text-fg">Sign out</Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            Signed in as {profile?.email ?? 'your account'}
          </Text>
        </View>
      </Pressable>
      <View className="overflow-hidden rounded-xl bg-surface">
        <LinkRow
          icon={RefreshCw}
          title="Check for updates"
          body="New versions download and install by themselves"
          onPress={checkForUpdateNow}
          last
        />
      </View>
      <Text className="text-center text-[11px] text-faint">AquaFeed v1.0.0</Text>
    </Screen>
  );
}

function LinkRow({
  icon,
  title,
  body,
  onPress,
  last,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cx('flex-row items-center gap-3 px-3.5 py-3 active:bg-surface2', !last && 'border-b border-linesoft')}>
      <Icon as={icon} tone="accent" size={18} />
      <View className="flex-1 gap-0.5">
        <Text className="text-[13px] font-medium text-fg">{title}</Text>
        <Text className="text-[11px] text-muted">{body}</Text>
      </View>
      <Icon as={ChevronRight} tone="faint" />
    </Pressable>
  );
}

/* Profile ----------------------------------------------------------------- */

function ProfileHero() {
  const profile = useAuth((s) => s.profile);
  const uid = useAuth((s) => s.user?.uid);
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    if (!uid) return;
    setBusy(true);
    try {
      const photo = await pickProfilePhoto();
      if (photo) await updateProfilePhoto(uid, photo);
    } catch (e) {
      Alert.alert('Could not update photo', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onPress = () =>
    profile?.photo
      ? Alert.alert('Profile photo', undefined, [
          { text: 'Choose a new photo', onPress: choose },
          {
            text: 'Remove photo',
            style: 'destructive',
            onPress: () => {
              if (uid) updateProfilePhoto(uid, null).catch((e) => Alert.alert('Error', errorMessage(e)));
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ])
      : choose();

  const initials = (profile?.displayName ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View className="flex-row items-center gap-3.5 rounded-2xl bg-accentsoft p-4">
      <Pressable onPress={onPress} disabled={busy} accessibilityLabel="Change profile photo" className="active:opacity-80">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface">
          {profile?.photo ? (
            <Image source={{ uri: profile.photo }} style={{ width: 64, height: 64 }} />
          ) : (
            <Text className="font-display-bold text-xl text-accent">{initials}</Text>
          )}
        </View>
        <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
          <Icon as={Camera} tone="onaccent" size={13} />
        </View>
      </Pressable>
      <View className="flex-1 gap-0.5">
        <Text className="font-display-bold text-[20px] leading-6 text-fg" numberOfLines={1}>
          {profile?.displayName ?? '—'}
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {profile?.email ?? '—'}
        </Text>
        <Text className="text-xs font-medium text-accent">
          {busy ? 'Updating photo…' : profile?.role === 'admin' ? 'Administrator' : 'Owner'}
        </Text>
      </View>
    </View>
  );
}

/** Best-effort split for profiles that only have a full name. */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(' '), lastName: parts[parts.length - 1] };
}

function NameCard() {
  const profile = useAuth((s) => s.profile);
  const uid = useAuth((s) => s.user?.uid);
  const saved = profile?.firstName
    ? { firstName: profile.firstName, middleName: profile.middleName ?? '', lastName: profile.lastName ?? '' }
    : splitName(profile?.displayName ?? '');
  const [form, setForm] = useState(saved);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = !!form.firstName.trim() && JSON.stringify(form) !== JSON.stringify(saved);

  return (
    <Card className="gap-2.5 p-3.5">
      <CardLabel icon={UserRound}>Your name</CardLabel>
      <View className="flex-row gap-2">
        <TextField className="flex-1" label="First" autoComplete="given-name" value={form.firstName} onChangeText={set('firstName')} />
        <TextField className="flex-1" label="Middle" placeholder="Optional" value={form.middleName} onChangeText={set('middleName')} />
        <TextField className="flex-1" label="Last" autoComplete="family-name" value={form.lastName} onChangeText={set('lastName')} />
      </View>
      {dirty ? (
        <Button
          title="Save name"
          loading={saving}
          onPress={async () => {
            if (!uid) return;
            setSaving(true);
            await updateName(uid, form).catch((e) => Alert.alert('Error', errorMessage(e)));
            setSaving(false);
          }}
        />
      ) : null}
    </Card>
  );
}

/* Feeder ------------------------------------------------------------------ */

function DeviceCard() {
  const aid = useAquariumId();
  const { data: device, deviceId } = useDevice();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useNow(10_000);
  const online = !!device?.lastSeen && now - device.lastSeen < ONLINE_WINDOW_MS;

  const pair = async () => {
    if (!aid) return;
    setBusy(true);
    try {
      await pairDevice(aid, input.trim(), deviceId ?? undefined);
      setInput('');
    } catch (e) {
      Alert.alert('Could not connect', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!deviceId) {
    return (
      <Card className="gap-2.5 p-3.5">
        <CardLabel icon={Router}>Your feeder</CardLabel>
        <Text className="font-display text-[17px] text-fg">Connect your feeder</Text>
        <Text className="text-xs leading-5 text-muted">
          Plug in the feeder, then type the code printed on its label.
        </Text>
        <TextField
          label="Feeder code"
          autoCapitalize="none"
          autoCorrect={false}
          value={input}
          onChangeText={setInput}
          placeholder="aquafeed-a1b2c3"
        />
        <Button title="Connect" loading={busy} disabled={!/^[\w-]{4,}$/.test(input.trim())} onPress={pair} />
      </Card>
    );
  }

  return (
    <Card className="gap-2.5 p-3.5">
      <CardLabel icon={Router}>Your feeder</CardLabel>
      <View className="gap-0.5">
        <Text className={cx('font-display text-[17px]', online ? 'text-fg' : 'text-crit')}>
          {online ? 'Connected and working' : 'Not responding'}
        </Text>
        <Text className="text-xs leading-5 text-muted">
          {online
            ? `Last checked in ${fmt.ago(device?.lastSeen)}.`
            : `Last heard from ${fmt.ago(device?.lastSeen)}. Check that it is plugged in and your Wi-Fi is on. Scheduled feedings still run on their own.`}
        </Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-faint">Feeder code {deviceId}</Text>
        <Button
          size="sm"
          variant="secondary"
          title="Disconnect"
          onPress={() =>
            Alert.alert('Disconnect this feeder?', 'Live readings and feeding from the app stop until you connect it again.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Disconnect',
                style: 'destructive',
                onPress: () => {
                  if (aid) unpairDevice(aid, deviceId).catch((e) => Alert.alert('Error', errorMessage(e)));
                },
              },
            ])
          }
        />
      </View>
    </Card>
  );
}

/* Tank -------------------------------------------------------------------- */

function AquariumCard() {
  const { data: aquarium } = useAquarium();
  // Re-mount the form (fresh initial values) whenever the saved aquarium changes.
  return <AquariumForm key={JSON.stringify(aquarium ?? {})} aquarium={aquarium} />;
}

function AquariumForm({ aquarium }: { aquarium: Aquarium | null | undefined }) {
  const aid = useAquariumId();
  const [form, setForm] = useState(() => toForm(aquarium));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(aquarium));

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const save = async () => {
    if (!aid) return;
    setSaving(true);
    try {
      await updateAquarium(aid, {
        name: form.name.trim() || 'My Aquarium',
        widthCm: num(form.widthCm) ?? null,
        heightCm: num(form.heightCm) ?? null,
        target_fish_species: {
          variety: form.variety.trim(),
          count: num(form.count) ?? 1,
          sizeCm: num(form.sizeCm) ?? 0,
        },
      });
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="gap-2.5 p-3.5">
      <CardLabel icon={Shell}>Your tank</CardLabel>
      <TextField label="Tank name" value={form.name} onChangeText={set('name')} />
      <View className="flex-row gap-2">
        <TextField className="flex-1" label="Kind of goldfish" value={form.variety} onChangeText={set('variety')} placeholder="e.g. Oranda" />
        <TextField className="w-24" label="How many" keyboardType="number-pad" value={form.count} onChangeText={set('count')} />
      </View>
      <View className="flex-row gap-2">
        <TextField className="flex-1" label="Fish size (cm)" keyboardType="decimal-pad" value={form.sizeCm} onChangeText={set('sizeCm')} />
        <TextField className="flex-1" label="Tank width (cm)" keyboardType="decimal-pad" value={form.widthCm} onChangeText={set('widthCm')} />
        <TextField className="flex-1" label="Tank height (cm)" keyboardType="decimal-pad" value={form.heightCm} onChangeText={set('heightCm')} />
      </View>
      {dirty ? <Button title="Save changes" loading={saving} onPress={save} /> : null}
    </Card>
  );
}

function toForm(a: Aquarium | null | undefined) {
  return {
    name: a?.name ?? '',
    widthCm: a?.widthCm != null ? String(a.widthCm) : '',
    heightCm: a?.heightCm != null ? String(a.heightCm) : '',
    variety: a?.target_fish_species?.variety ?? '',
    count: a?.target_fish_species?.count != null ? String(a.target_fish_species.count) : '',
    sizeCm: a?.target_fish_species?.sizeCm != null ? String(a.target_fish_species.sizeCm) : '',
  };
}

/* Appearance -------------------------------------------------------------- */

function AppearanceCard() {
  return (
    <View className="overflow-hidden rounded-xl bg-surface">
      <View className="px-3.5 pt-3">
        <CardLabel icon={Palette}>Appearance</CardLabel>
      </View>
      <AppearanceOptions />
    </View>
  );
}
