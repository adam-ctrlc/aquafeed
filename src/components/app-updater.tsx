import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { CloudOff, Download } from 'lucide-react-native';
import { AppState, Modal, View } from 'react-native';

import { Alert } from '@/lib/alert';
import { themeVars, useTheme } from '@/lib/theme';

import { Meter } from './sparkline';
import { Text } from './text';
import { Button, Icon } from './ui';

const CHECK_EVERY_MS = 10 * 60_000;

/**
 * Required live updates: looks for a new version when the app opens or comes back to the front.
 * If there is one, the app is covered by an "Updating" screen while it downloads, then restarts
 * into the new version by itself. No reinstall needed.
 * Only active in installed builds (not in Expo Go, the dev server or the browser).
 */
export function AppUpdater() {
  const { isUpdateAvailable, isUpdatePending, isDownloading, downloadProgress, downloadError } =
    Updates.useUpdates();
  const { scheme } = useTheme();
  const lastCheck = useRef(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const check = () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      Updates.checkForUpdateAsync().catch(() => {});
    };
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  // Download as soon as an update is found (and again when the person taps "Try again").
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending) Updates.fetchUpdateAsync().catch(() => {});
  }, [isUpdateAvailable, isUpdatePending, attempt]);

  // Restart into the new version once it is on the device.
  useEffect(() => {
    if (isUpdatePending) Updates.reloadAsync().catch(() => {});
  }, [isUpdatePending]);

  if (!Updates.isEnabled || !(isUpdateAvailable || isUpdatePending)) return null;

  const failed = !!downloadError && !isDownloading && !isUpdatePending;
  const pct = Math.round((isUpdatePending ? 1 : (downloadProgress ?? 0)) * 100);

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[{ flex: 1 }, themeVars[scheme]]}>
        <View className="flex-1 items-center justify-center gap-5 bg-canvas px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accentsoft">
            <Icon as={failed ? CloudOff : Download} tone="accent" size={28} />
          </View>
          <View className="items-center gap-1.5">
            <Text className="font-display-bold text-[22px] text-fg">
              {failed ? 'Update could not download' : isUpdatePending ? 'Restarting…' : 'Updating AquaFeed'}
            </Text>
            <Text className="text-center text-sm leading-5 text-muted">
              {failed
                ? 'This update is needed to keep using the app. Check your internet connection and try again.'
                : 'A new version is required. This only takes a moment, and the app will restart by itself.'}
            </Text>
          </View>
          {failed ? (
            <Button className="w-full" title="Try again" onPress={() => setAttempt((n) => n + 1)} />
          ) : (
            <View className="w-full gap-2">
              <Meter value={pct / 100} />
              <Text className="text-center text-xs text-muted">
                {pct > 0 ? `Downloading, ${pct}%` : 'Starting download…'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Manual check from Settings. */
export async function checkForUpdateNow() {
  if (!Updates.isEnabled) {
    Alert.alert('Updates are not available here', 'Automatic updates work in the installed app, not in the preview you are using now.', [{ text: 'Got it' }]);
    return;
  }
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) {
      Alert.alert('You are up to date', 'You already have the newest version.', [{ text: 'Got it' }]);
      return;
    }
    // The required-update screen takes over from here: it downloads and restarts.
  } catch {
    Alert.alert('Could not check for updates', 'Check your internet connection and try again.', [{ text: 'Got it' }]);
  }
}
