import { dbGet, dbPush, dbRemove, dbSet, dbUpdate } from './db';
import { paths } from './paths';
import type {
  AlertThresholds,
  Aquarium,
  Calibration,
  CalibrationAction,
  CalibrationCommand,
  FeedCommand,
  FeedingSchedule,
  Role,
} from './types';

export const MIN_PORTION_G = 0.1;
export const MAX_PORTION_G = 10;

/** Manual feed: the ESP32 listens on AquaFeed_Devices/{id}/commands/feed. */
export async function requestFeed(deviceId: string, uid: string, grams: number) {
  const cmd: FeedCommand = { grams, requestedAt: Date.now(), requestedBy: uid, status: 'pending' };
  await dbSet(`${paths.device(deviceId)}/commands/feed`, cmd);
}

export async function requestCalibration(deviceId: string, uid: string, action: CalibrationAction) {
  const cmd: CalibrationCommand = {
    action,
    requestedAt: Date.now(),
    requestedBy: uid,
    status: 'pending',
  };
  await dbSet(`${paths.device(deviceId)}/commands/calibrate`, cmd);
}

export async function saveCalibration(deviceId: string, values: Calibration) {
  await dbUpdate(`${paths.device(deviceId)}/calibration`, {
    ...values,
    updatedAt: Date.now(),
  });
}

export async function saveSchedule(
  aid: string,
  id: string | null,
  value: Omit<FeedingSchedule, 'updatedAt'>,
) {
  const data: FeedingSchedule = { ...value, updatedAt: Date.now() };
  if (id) await dbSet(`${paths.schedules(aid)}/${id}`, data);
  else await dbPush(paths.schedules(aid), data);
}

export async function setScheduleEnabled(aid: string, id: string, enabled: boolean) {
  await dbUpdate(`${paths.schedules(aid)}/${id}`, { enabled, updatedAt: Date.now() });
}

export async function deleteSchedule(aid: string, id: string) {
  await dbRemove(`${paths.schedules(aid)}/${id}`);
}

export async function acknowledgeAlert(aid: string, alertId: string, uid: string) {
  await dbUpdate(`${paths.alerts(aid)}/${alertId}`, {
    acknowledged: true,
    ackBy: uid,
    ackAt: Date.now(),
  });
}

export async function acknowledgeAll(aid: string, alertIds: string[], uid: string) {
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  for (const id of alertIds) {
    updates[`${paths.alerts(aid)}/${id}/acknowledged`] = true;
    updates[`${paths.alerts(aid)}/${id}/ackBy`] = uid;
    updates[`${paths.alerts(aid)}/${id}/ackAt`] = now;
  }
  await dbUpdate('', updates);
}

export async function saveThresholds(aid: string, uid: string, t: AlertThresholds) {
  await dbSet(paths.thresholds(aid), { ...t, updatedAt: Date.now(), updatedBy: uid });
}

export async function updateAquarium(
  aid: string,
  patch: { [K in keyof Aquarium]?: Aquarium[K] | null },
) {
  await dbUpdate(paths.aquarium(aid), patch);
}

/**
 * Links a device to this aquarium (both directions). The device must already exist in
 * AquaFeed_Devices (the firmware creates it on first boot) — security rules should only
 * allow claiming a device that has no aquariumId yet.
 */
export async function pairDevice(aid: string, deviceId: string, previousDeviceId?: string) {
  const owner = await dbGet<string>(`${paths.device(deviceId)}/aquariumId`).catch(() => null);
  if (owner && owner !== aid) {
    throw new Error('This device is already paired with another aquarium.');
  }
  const updates: Record<string, unknown> = {
    [`${paths.aquarium(aid)}/deviceId`]: deviceId,
    [`${paths.device(deviceId)}/aquariumId`]: aid,
  };
  if (previousDeviceId && previousDeviceId !== deviceId) {
    updates[`${paths.device(previousDeviceId)}/aquariumId`] = null;
  }
  await dbUpdate('', updates);
}

export async function unpairDevice(aid: string, deviceId: string) {
  await dbUpdate('', {
    [`${paths.aquarium(aid)}/deviceId`]: null,
    [`${paths.device(deviceId)}/aquariumId`]: null,
  });
}

export async function updateDisplayName(uid: string, displayName: string) {
  await dbUpdate(paths.user(uid), { displayName });
}

export async function updateProfilePhoto(uid: string, photo: string | null) {
  await dbUpdate(paths.user(uid), { photo });
}

export async function updateName(uid: string, name: { firstName: string; middleName: string; lastName: string }) {
  const clean = { firstName: name.firstName.trim(), middleName: name.middleName.trim(), lastName: name.lastName.trim() };
  const displayName = [clean.firstName, clean.middleName, clean.lastName].filter(Boolean).join(' ');
  await dbUpdate(paths.user(uid), {
    firstName: clean.firstName,
    middleName: clean.middleName || null,
    lastName: clean.lastName || null,
    displayName,
  });
}

/* People (administrators only; security rules must enforce this) */

export async function setUserRole(uid: string, role: Role) {
  await dbUpdate(paths.user(uid), { role });
}

export async function setUserDisabled(uid: string, disabled: boolean) {
  await dbUpdate(paths.user(uid), { disabled: disabled || null });
}

/**
 * Removes a person from the app: clears their personal details and blocks them from signing in.
 * The sign-in record itself lives in Firebase Authentication and can only be erased from the
 * Firebase console (or a server function), so a small blocked marker is kept here.
 */
export async function deleteUser(uid: string) {
  await dbUpdate(paths.user(uid), {
    deleted: true,
    disabled: true,
    photo: null,
    pushTokens: null,
    firstName: null,
    middleName: null,
    lastName: null,
    displayName: 'Removed user',
  });
}
