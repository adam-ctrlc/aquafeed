import '@/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { SheetHost } from '@/components/sheet';
import { themeVars, useTheme } from '@/lib/theme';
import { useAuth, useIsAdmin } from '@/stores/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const user = useAuth((s) => s.user);
  const initializing = useAuth((s) => s.initializing);
  const init = useAuth((s) => s.init);
  const isAdmin = useIsAdmin();
  const { scheme, colors } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const ready = !initializing && (fontsLoaded || !!fontError);

  useEffect(() => init(), [init]);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.canvas }, themeVars[scheme]]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.fg,
          headerTitleStyle: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.canvas },
        }}>
        <Stack.Protected guard={!!user} redirectTo="/login">
          <Stack.Screen name="(tabs)" />
          <Stack.Protected guard={isAdmin} redirectTo="/settings">
            <Stack.Screen name="people" />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={!user} redirectTo="/">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <SheetHost />
    </View>
  );
}
