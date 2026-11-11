import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppearanceButton } from '@/components/appearance';

import { useTheme } from '@/lib/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTintColor: colors.fg,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen
        name="register"
        options={{
          headerShown: true,
          title: '',
          headerRight: () => (
            <View style={{ marginRight: 12 }}>
              <AppearanceButton />
            </View>
          ),
        }}
      />
    </Stack>
  );
}
