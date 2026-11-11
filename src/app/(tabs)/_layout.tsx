import * as Notifications from 'expo-notifications';
import { router, Tabs } from 'expo-router';
import { History, Droplets, LayoutDashboard, Settings, Fish } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAlerts } from '@/hooks/use-data';
import { registerForPush } from '@/lib/notifications';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/stores/auth';

export default function TabsLayout() {
  const uid = useAuth((s) => s.user?.uid);
  const { unacknowledged } = useAlerts(50);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Register this phone for push alerts once signed in.
  useEffect(() => {
    if (!uid) return;
    registerForPush(uid).then(({ reason }) => {
      if (reason) console.log('[push] not registered:', reason);
    });
  }, [uid]);

  // Tapping a notification opens the alerts tab.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/alerts');
    });
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 4 },
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.surface, height: 64 + insets.bottom, paddingBottom: insets.bottom },
        tabBarBadgeStyle: { backgroundColor: colors.crit, color: colors.onaccent, fontSize: 10 },
        tabBarIconStyle: { marginTop: 4 },
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 4} />,
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: 'Water',
          tabBarIcon: ({ color, size }) => <Droplets color={color} size={size - 4} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Feeding',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                marginTop: -26,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.accent : colors.surface,
                borderWidth: 4,
                borderColor: focused ? colors.accentsoft : colors.line,
              }}>
              <Fish color={focused ? colors.onaccent : colors.muted} size={22} strokeWidth={1.9} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'History',
          tabBarBadge: unacknowledged > 0 ? unacknowledged : undefined,
          tabBarIcon: ({ color, size }) => <History color={color} size={size - 4} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size - 4} />,
        }}
      />
    </Tabs>
  );
}
