import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { dbRemove, dbSet, isDemo } from './db';
import { paths } from './paths';

export const ALERT_CHANNEL = 'alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const tokenKey = (token: string) => token.replace(/[.#$/[\]]/g, '_');

/**
 * Asks for permission, gets this phone's Expo push token, and stores it under
 * Users/{uid}/pushTokens so the ESP32 can send alerts through the Expo push service.
 * Returns the token, or null with a reason when push is not available.
 */
export async function registerForPush(
  uid: string,
): Promise<{ token: string | null; reason?: string }> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALERT_CHANNEL, {
      name: 'Aquarium alerts',
      // eslint-disable-next-line import/namespace -- re-exported via `export *`, plugin can't follow it
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0891b2',
    });
  }
  if (isDemo) return { token: null, reason: 'Demo mode: push needs a Firebase project.' };
  if (!Device.isDevice) return { token: null, reason: 'Push needs a physical device.' };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { token: null, reason: 'Notification permission was denied.' };

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (!projectId) return { token: null, reason: 'Missing EAS project ID (set EAS_PROJECT_ID).' };

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await dbSet(`${paths.user(uid)}/pushTokens/${tokenKey(token)}`, token);
    return { token };
  } catch (e) {
    return { token: null, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function unregisterPush(uid: string, token: string) {
  await dbRemove(`${paths.user(uid)}/pushTokens/${tokenKey(token)}`).catch(() => {});
}
