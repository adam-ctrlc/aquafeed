import { View } from 'react-native';

import { Text } from '@/components/text';

import { useOnline } from '@/hooks/use-online';
import { isDemo } from '@/lib/db';

/** Shown when the phone is offline: screens keep showing the last-synced data. */
export function ConnectionBanner() {
  const { internet, firebase } = useOnline();
  if (isDemo) return null;
  if (internet && firebase) return null;
  return (
    <View className="flex-row items-center gap-2 border-b border-warn/30 bg-warnsoft px-3 py-1.5">
      <Text className="flex-1 text-[11px] font-medium text-warn">
        {internet ? 'Reconnecting to the server…' : 'You are offline.'} Showing last-synced data.
      </Text>
    </View>
  );
}
