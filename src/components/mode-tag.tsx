import { FlaskConical, Wifi } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { isDemo } from '@/lib/db';
import { showModeInfo } from '@/lib/mode';
import { useTheme } from '@/lib/theme';

import { Text } from './text';

/** Small tag saying whether the data on screen is sample (demo) or real (live). Tap for details. */
export function ModeTag() {
  const { colors } = useTheme();
  const C = isDemo ? FlaskConical : Wifi;
  return (
    <Pressable
      onPress={showModeInfo}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={isDemo ? 'Showing demo data' : 'Showing live data'}
      className={`flex-row items-center gap-1 rounded-full px-2 py-1 active:opacity-70 ${isDemo ? 'bg-warnsoft' : 'bg-oksoft'}`}>
      <C size={11} color={isDemo ? colors.warn : colors.ok} strokeWidth={2} />
      <Text className={`text-[11px] font-semibold ${isDemo ? 'text-warn' : 'text-ok'}`}>
        {isDemo ? 'Demo data' : 'Live data'}
      </Text>
    </Pressable>
  );
}
