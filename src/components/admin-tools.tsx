import { format } from 'date-fns';
import { Ban, Camera, ChevronRight, CircleCheck, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/sheet';
import { Text } from '@/components/text';

import { Alert } from '@/lib/alert';
import {
  Button,
  cx,
  Group,
  Icon,
  Item,
  Label,
  OptionList,
  Pagination,
  SectionTitle,
  SkeletonRows,
  TextField,
  usePaged,
} from '@/components/ui';
import { useAquariumId, useDevice, useThresholds, useUsers } from '@/hooks/use-data';
import { useLiveObject } from '@/hooks/use-live';
import { paths } from '@/lib/paths';
import { pickProfilePhoto } from '@/lib/photo';
import {
  deleteUser,
  requestCalibration,
  saveCalibration,
  saveThresholds,
  setUserDisabled,
  setUserRole,
  updateName,
  updateProfilePhoto,
} from '@/lib/actions';
import { errorMessage, fmt } from '@/lib/format';
import { DEFAULT_THRESHOLDS } from '@/lib/status';
import type { AlertThresholds, Aquarium, Calibration, CalibrationAction, Role, UserProfile, WithId } from '@/lib/types';
import { useAuth } from '@/stores/auth';

/* ---------- helpers ---------- */

type Flat = Record<string, string>;

const str = (v: number | undefined) => (v == null ? '' : String(v));

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const invalid = value.trim() !== '' && !Number.isFinite(Number(value));
  return (
    <TextField
      className="flex-1"
      label={label}
      keyboardType="numbers-and-punctuation"
      value={value}
      onChangeText={onChange}
      error={invalid ? 'Not a number' : undefined}
      hint={hint}
    />
  );
}

/* ---------- thresholds ---------- */

function thresholdsToFlat(t: AlertThresholds): Flat {
  return {
    tOkMin: str(t.temperature.okMin),
    tOkMax: str(t.temperature.okMax),
    tWarnMin: str(t.temperature.warnMin),
    tWarnMax: str(t.temperature.warnMax),
    pOkMin: str(t.ph.okMin),
    pOkMax: str(t.ph.okMax),
    pWarnMin: str(t.ph.warnMin),
    pWarnMax: str(t.ph.warnMax),
    turbWarn: str(t.turbidity.warnPct),
    turbCrit: str(t.turbidity.criticalPct),
    hopLow: str(t.hopper.lowCm),
    hopCrit: str(t.hopper.criticalCm),
    cooldown: str(t.cooldownMin),
  };
}

function flatToThresholds(f: Flat): AlertThresholds | string {
  const n = (k: string) => Number(f[k]);
  const all = Object.keys(f).every((k) => f[k].trim() !== '' && Number.isFinite(n(k)));
  if (!all) return 'Fill in every field with a number.';
  const t: AlertThresholds = {
    temperature: { okMin: n('tOkMin'), okMax: n('tOkMax'), warnMin: n('tWarnMin'), warnMax: n('tWarnMax') },
    ph: { okMin: n('pOkMin'), okMax: n('pOkMax'), warnMin: n('pWarnMin'), warnMax: n('pWarnMax') },
    turbidity: { warnPct: n('turbWarn'), criticalPct: n('turbCrit') },
    hopper: { lowCm: n('hopLow'), criticalCm: n('hopCrit') },
    cooldownMin: n('cooldown'),
  };
  for (const [name, r] of [
    ['Temperature', t.temperature],
    ['pH', t.ph],
  ] as const) {
    if (!(r.warnMin <= r.okMin && r.okMin < r.okMax && r.okMax <= r.warnMax)) {
      return `${name}: values must satisfy critical-low ≤ acceptable-min < acceptable-max ≤ critical-high.`;
    }
  }
  if (t.turbidity.warnPct >= t.turbidity.criticalPct) return 'Turbidity warning must be below critical.';
  if (t.hopper.lowCm >= t.hopper.criticalCm) return 'Hopper "low" distance must be below "critical".';
  return t;
}

export function ThresholdsCard() {
  const { thresholds } = useThresholds();
  return <ThresholdsForm key={JSON.stringify(thresholds)} thresholds={thresholds} />;
}

function ThresholdsForm({ thresholds }: { thresholds: AlertThresholds }) {
  const aid = useAquariumId();
  const uid = useAuth((s) => s.user?.uid);
  const [form, setForm] = useState<Flat>(() => thresholdsToFlat(thresholds));
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const parsed = flatToThresholds(form);
    if (typeof parsed === 'string') return Alert.alert('Check thresholds', parsed);
    if (!aid || !uid) return;
    setSaving(true);
    try {
      await saveThresholds(aid, uid, parsed);
      Alert.alert('Saved', 'The feeder will use the new thresholds on its next check.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-2.5">
      <SectionTitle
        right={<Text className="text-[11px] text-muted">updated {fmt.ago(thresholds.updatedAt)}</Text>}>
        Alert thresholds
      </SectionTitle>

      <Label className="mt-1">Temperature (°C)</Label>
      <View className="flex-row gap-2">
        <NumberField label="Acceptable min" value={form.tOkMin} onChange={set('tOkMin')} />
        <NumberField label="Acceptable max" value={form.tOkMax} onChange={set('tOkMax')} />
      </View>
      <View className="flex-row gap-2">
        <NumberField label="Critical below" value={form.tWarnMin} onChange={set('tWarnMin')} />
        <NumberField label="Critical above" value={form.tWarnMax} onChange={set('tWarnMax')} />
      </View>

      <Label className="mt-1">pH</Label>
      <View className="flex-row gap-2">
        <NumberField label="Acceptable min" value={form.pOkMin} onChange={set('pOkMin')} />
        <NumberField label="Acceptable max" value={form.pOkMax} onChange={set('pOkMax')} />
      </View>
      <View className="flex-row gap-2">
        <NumberField label="Critical below" value={form.pWarnMin} onChange={set('pWarnMin')} />
        <NumberField label="Critical above" value={form.pWarnMax} onChange={set('pWarnMax')} />
      </View>

      <Label className="mt-1">Turbidity (% change from baseline)</Label>
      <View className="flex-row gap-2">
        <NumberField label="Warning at" value={form.turbWarn} onChange={set('turbWarn')} />
        <NumberField label="Critical at" value={form.turbCrit} onChange={set('turbCrit')} />
      </View>

      <Label className="mt-1">Hopper level (sensor distance, cm)</Label>
      <View className="flex-row gap-2">
        <NumberField label="Low at ≥" value={form.hopLow} onChange={set('hopLow')} />
        <NumberField label="Critical at ≥" value={form.hopCrit} onChange={set('hopCrit')} />
      </View>

      <NumberField
        label="Alert cooldown (minutes)"
        value={form.cooldown}
        onChange={set('cooldown')}
      />

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          title="Reset defaults"
          variant="secondary"
          onPress={() => setForm(thresholdsToFlat(DEFAULT_THRESHOLDS))}
        />
        <Button className="flex-1" title="Save" loading={saving} onPress={save} />
      </View>
    </View>
  );
}

/* ---------- calibration routines (run on the device) ---------- */

const ROUTINES: { action: CalibrationAction; title: string; help: string }[] = [
  { action: 'tare', title: 'Tare load cell', help: 'Empty pan, nothing touching it.' },
  {
    action: 'measure_free_fall_offset',
    title: 'Measure free-fall offset',
    help: 'Runs several test portions and stores the average overshoot.',
  },
  { action: 'ph_point_4', title: 'pH buffer 4.00', help: 'Probe rinsed and in the 4.00 buffer.' },
  { action: 'ph_point_686', title: 'pH buffer 6.86', help: 'Probe rinsed and in the 6.86 buffer.' },
  { action: 'ph_point_918', title: 'pH buffer 9.18', help: 'Probe rinsed and in the 9.18 buffer.' },
  {
    action: 'turbidity_baseline',
    title: 'Turbidity clean-water baseline',
    help: 'Sensor in clean, clear tank water, shaded from room light.',
  },
  {
    action: 'hopper_measure',
    title: 'Measure hopper distance',
    help: 'Reads the ultrasonic distance now (use at each Good/Low/Critical fill level).',
  },
];

export function CalibrationRoutinesCard() {
  const uid = useAuth((s) => s.user?.uid);
  const { data: device, deviceId } = useDevice();
  const cmd = device?.commands?.calibrate;
  const running = !!cmd && (cmd.status === 'pending' || cmd.status === 'running');

  if (!deviceId) {
    return (
      <View>
        <SectionTitle>Calibration routines</SectionTitle>
        <Text className="mt-2 text-sm text-muted">Pair a device first.</Text>
      </View>
    );
  }

  const run = (r: (typeof ROUTINES)[number]) =>
    Alert.alert(r.title, r.help, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start',
        onPress: () =>
          uid &&
          requestCalibration(deviceId, uid, r.action).catch((e) => Alert.alert('Error', errorMessage(e))),
      },
    ]);

  return (
    <Group
      title="Calibration routines"
      footer={
        cmd
          ? `Last: ${ROUTINES.find((r) => r.action === cmd.action)?.title ?? cmd.action}, ${cmd.status}${
              cmd.result != null ? `, result ${cmd.result}` : ''
            }${cmd.error ? `, ${cmd.error}` : ''}, ${fmt.ago(cmd.requestedAt)}`
          : undefined
      }>
      {ROUTINES.map((r, i) => (
        <Item key={r.action} last={i === ROUTINES.length - 1}>
          <View className="flex-1">
            <Text className="text-[13px] font-medium text-fg">{r.title}</Text>
          </View>
          <Button
            size="sm"
            variant="secondary"
            title={running && cmd?.action === r.action ? 'Running' : 'Run'}
            loading={running && cmd?.action === r.action}
            disabled={running}
            onPress={() => run(r)}
          />
        </Item>
      ))}
    </Group>
  );
}

/* ---------- calibration values (manual edit) ---------- */

const CAL_FIELDS: { key: keyof Calibration; label: string; hint?: string }[] = [
  { key: 'loadCellFactor', label: 'Load cell factor', hint: 'counts / gram' },
  { key: 'freeFallOffsetG', label: 'Free-fall offset (g)', hint: 'closes at target − this' },
  { key: 'phVoltage4', label: 'pH 4.00 (V)' },
  { key: 'phVoltage686', label: 'pH 6.86 (V)' },
  { key: 'phVoltage918', label: 'pH 9.18 (V)' },
  { key: 'turbidityBaseline', label: 'Turbidity baseline' },
  { key: 'hopperFullCm', label: 'Hopper full (cm)' },
  { key: 'hopperEmptyCm', label: 'Hopper empty (cm)' },
];

const pairs = <T,>(list: T[]): T[][] =>
  list.reduce<T[][]>((rows, x, i) => (i % 2 ? rows[rows.length - 1].push(x) : rows.push([x]), rows), []);

const calToFlat = (c?: Calibration): Flat =>
  Object.fromEntries(CAL_FIELDS.map((f) => [f.key, str(c?.[f.key] as number | undefined)]));

export function CalibrationValuesCard() {
  const { data: device, deviceId } = useDevice();
  if (!deviceId) return null;
  const cal = device?.calibration;
  // Device heartbeats re-send the whole node; only reset the form when calibration changes.
  return <CalibrationForm key={JSON.stringify(cal ?? {})} deviceId={deviceId} cal={cal} />;
}

function CalibrationForm({ deviceId, cal }: { deviceId: string; cal?: Calibration }) {
  const [form, setForm] = useState<Flat>(() => calToFlat(cal));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const values: Calibration = {};
    for (const f of CAL_FIELDS) {
      const raw = form[f.key].trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) return Alert.alert('Check values', `${f.label} is not a number.`);
      (values as Record<string, number>)[f.key] = n;
    }
    setSaving(true);
    try {
      await saveCalibration(deviceId, values);
      Alert.alert('Saved', 'Calibration values sent to the feeder.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-2.5">
      <SectionTitle
        right={<Text className="text-[11px] text-muted">updated {fmt.ago(cal?.updatedAt)}</Text>}>
        Calibration values
      </SectionTitle>
      {pairs(CAL_FIELDS).map((row) => (
        <View key={row[0].key} className="flex-row gap-2">
          {row.map((f) => (
            <NumberField
              key={f.key}
              label={f.label}
              value={form[f.key]}
              onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
            />
          ))}
        </View>
      ))}
      <Button title="Save calibration" loading={saving} onPress={save} />
    </View>
  );
}

/* ---------- people ---------- */

const roleName = (r: Role) => (r === 'admin' ? 'Administrator' : 'Owner');

/** Full list of accounts; tapping one opens the editor in a sheet. */
export function PeopleList() {
  const { users, loading } = useUsers();
  const me = useAuth((s) => s.user?.uid);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const paged = usePaged(users, 8);
  const selected = users.find((u) => u.id === selectedId);
  const off = users.filter((u) => u.disabled).length;
  const admins = users.filter((u) => u.role === 'admin').length;

  return (
    <>
      <View className="flex-row gap-4 rounded-2xl bg-accentsoft p-4">
        <Count label="Accounts" value={users.length} />
        <Count label="Administrators" value={admins} />
        <Count label="Turned off" value={off} />
      </View>

      {loading && !users.length ? (
        <SkeletonRows rows={6} />
      ) : paged.loading ? (
        <SkeletonRows rows={paged.slice.length} />
      ) : (
        <View className="overflow-hidden rounded-xl bg-surface">
          {paged.slice.map((u, i) => (
            <Pressable
              key={u.id}
              onPress={() => {
                setSelectedId(u.id);
                setOpen(true);
              }}
              className={cx('flex-row items-center gap-3 px-3.5 py-3 active:bg-surface2', i < paged.slice.length - 1 && 'border-b border-linesoft')}>
              <Avatar person={u} size={40} />
              <View className="flex-1 gap-0.5">
                <Text className={cx('text-sm font-medium', u.disabled ? 'text-muted' : 'text-fg')} numberOfLines={1}>
                  {u.displayName}
                  {u.id === me ? ' (you)' : ''}
                </Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {u.email}
                </Text>
              </View>
              <Text className={cx('text-xs font-medium', u.disabled ? 'text-crit' : u.role === 'admin' ? 'text-accent' : 'text-muted')}>
                {u.disabled ? 'Turned off' : roleName(u.role)}
              </Text>
              <Icon as={ChevronRight} tone="faint" />
            </Pressable>
          ))}
        </View>
      )}
      <Pagination page={paged.page} pages={paged.pages} onChange={paged.setPage} />

      <BottomSheet visible={open && !!selected} onClose={() => setOpen(false)} scroll>
        {selected ? (
          <PersonEditor key={selected.id} person={selected} isMe={selected.id === me} onBack={() => setOpen(false)} />
        ) : null}
      </BottomSheet>
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text className="font-display-bold text-[22px] text-fg">{value}</Text>
    </View>
  );
}

function Avatar({ person, size = 36 }: { person: UserProfile; size?: number }) {
  const initials = (person.displayName ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-accentsoft"
      style={{ width: size, height: size }}>
      {person.photo ? (
        <Image source={{ uri: person.photo }} style={{ width: size, height: size }} />
      ) : (
        <Text className={cx('font-semibold text-accent', size > 48 ? 'text-lg' : 'text-xs')}>{initials}</Text>
      )}
    </View>
  );
}

function PersonEditor({ person, isMe, onBack }: { person: WithId<UserProfile>; isMe: boolean; onBack: () => void }) {
  const parts = (person.displayName ?? '').trim().split(/\s+/);
  const saved = {
    firstName: person.firstName ?? parts[0] ?? '',
    middleName: person.middleName ?? (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''),
    lastName: person.lastName ?? (parts.length > 1 ? parts[parts.length - 1] : ''),
    role: person.role,
    status: (person.disabled ? 'off' : 'on') as 'on' | 'off',
    photo: person.photo ?? null,
  };
  // Nothing is changed until "Save changes" is pressed.
  const [form, setForm] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: tank } = useLiveObject<Aquarium>(person.aquariumId ? paths.aquarium(person.aquariumId) : null);
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const valid = !!form.firstName.trim();
  const phones = Object.keys(person.pushTokens ?? {}).length;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (form.firstName !== saved.firstName || form.middleName !== saved.middleName || form.lastName !== saved.lastName) {
        await updateName(person.id, form);
      }
      if (form.role !== saved.role) await setUserRole(person.id, form.role);
      if (form.status !== saved.status) await setUserDisabled(person.id, form.status === 'off');
      if (form.photo !== saved.photo) await updateProfilePhoto(person.id, form.photo);
      onBack();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async () => {
    try {
      const photo = await pickProfilePhoto();
      if (photo) set('photo')(photo);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteUser(person.id);
      onBack();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  if (confirmRemove) {
    return (
      <View className="gap-3">
        <Text className="font-display-bold text-lg text-fg">Remove {person.displayName}?</Text>
        <Text className="text-sm leading-5 text-fg2">
          Their details are erased and they can no longer sign in. This cannot be undone here.
        </Text>
        {error ? <Text className="text-xs text-crit">{error}</Text> : null}
        <View className="mt-1 flex-row gap-2">
          <Button className="flex-1" variant="secondary" title="Keep" onPress={() => setConfirmRemove(false)} />
          <Button className="flex-1" variant="danger" title="Remove person" loading={busy} onPress={remove} />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="items-center gap-2 pt-1">
        <Pressable onPress={choosePhoto} accessibilityLabel="Change photo" className="active:opacity-80">
          <Avatar person={{ ...person, photo: form.photo ?? undefined }} size={72} />
          <View className="absolute -bottom-0.5 -right-0.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
            <Icon as={Camera} tone="onaccent" size={13} />
          </View>
        </Pressable>
        <View className="flex-row gap-4">
          <Pressable hitSlop={6} onPress={choosePhoto}>
            <Text className="text-xs font-semibold text-accent">{form.photo ? 'Change photo' : 'Add photo'}</Text>
          </Pressable>
          {form.photo ? (
            <Pressable hitSlop={6} onPress={() => set('photo')(null)}>
              <Text className="text-xs font-semibold text-crit">Remove photo</Text>
            </Pressable>
          ) : null}
        </View>
        <View className="items-center gap-0.5">
          <Text className="font-display-bold text-xl text-fg" numberOfLines={1}>
            {person.displayName}
            {isMe ? ' (you)' : ''}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {person.email}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-medium text-muted">About</Text>
        <View className="overflow-hidden rounded-xl bg-surface2">
          <Info label="Email" value={person.email || '—'} />
          <Info label="Joined" value={format(person.createdAt, 'MMM d, yyyy')} />
          <Info label="Tank" value={tank?.name ?? 'Not set up yet'} />
          <Info
            label="Fish"
            value={tank?.target_fish_species ? `${tank.target_fish_species.count} × ${tank.target_fish_species.variety}` : '—'}
          />
          <Info label="Feeder" value={tank?.deviceId ? `Connected (${tank.deviceId})` : 'None connected'} />
          <Info label="Phones getting alerts" value={String(phones)} last />
        </View>
      </View>

      <View className="gap-2.5">
        <Text className="text-xs font-medium text-muted">Name</Text>
        <TextField label="First name" icon={UserRound} placeholder="First name" value={form.firstName} onChangeText={set('firstName')} error={valid ? undefined : 'Enter a first name'} />
        <TextField label="Middle name" icon={UserRound} placeholder="Optional" value={form.middleName} onChangeText={set('middleName')} />
        <TextField label="Last name" icon={UserRound} placeholder="Last name" value={form.lastName} onChangeText={set('lastName')} />
      </View>

      <View className="gap-1.5">
        <Text className="text-xs font-medium text-muted">What they can do</Text>
        {isMe ? (
          <Text className="text-xs text-muted">You cannot change your own role or turn off your own account.</Text>
        ) : (
          <View className="overflow-hidden rounded-xl bg-surface2">
            <OptionList
              value={form.role}
              onChange={set('role')}
              options={[
                { value: 'owner', icon: UserRound, label: 'Owner', body: 'Everyday use: readings, feeding and their own tank' },
                { value: 'admin', icon: ShieldCheck, label: 'Administrator', body: 'Can also change limits, calibrate and manage people' },
              ]}
            />
          </View>
        )}
      </View>

      {isMe ? null : (
        <View className="gap-1.5">
          <Text className="text-xs font-medium text-muted">Account</Text>
          <View className="overflow-hidden rounded-xl bg-surface2">
            <OptionList
              value={form.status}
              onChange={set('status')}
              options={[
                { value: 'on', icon: CircleCheck, label: 'Active', body: 'Can sign in and use the app' },
                { value: 'off', icon: Ban, label: 'Turned off', body: 'Signed out and blocked until turned back on' },
              ]}
            />
          </View>
        </View>
      )}

      {error ? <Text className="text-xs text-crit">{error}</Text> : null}

      <View className="gap-2">
        <Button title={dirty ? 'Save changes' : 'No changes to save'} loading={busy} disabled={!dirty || !valid} onPress={save} />
        <View className="flex-row gap-2">
          <Button className="flex-1" variant="secondary" title={dirty ? 'Discard' : 'Close'} onPress={onBack} />
          {isMe ? null : (
            <Button className="flex-1" variant="danger" title="Remove person" onPress={() => setConfirmRemove(true)} />
          )}
        </View>
      </View>
    </View>
  );
}

function Info({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={cx('flex-row items-center gap-3 px-3 py-2.5', !last && 'border-b border-line')}>
      <Text className="text-[13px] text-muted">{label}</Text>
      <Text className="flex-1 text-right text-[13px] font-medium text-fg" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
