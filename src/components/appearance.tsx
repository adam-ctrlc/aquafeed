import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/lib/theme';

import { BottomSheet } from './sheet';
import { Icon, OptionList } from './ui';

/** The three appearance choices, used in Settings and in the sign-in screens. */
export function AppearanceOptions() {
  const { mode, setMode } = useTheme();
  return (
    <OptionList
      value={mode}
      onChange={setMode}
      options={[
        { value: 'system', icon: Smartphone, label: 'Match my phone', body: 'Follows your phone’s light or dark setting' },
        { value: 'light', icon: Sun, label: 'Light', body: 'Bright background, best in daylight' },
        { value: 'dark', icon: Moon, label: 'Dark', body: 'Dim background, easier at night' },
      ]}
    />
  );
}

/** Round button that opens the appearance choices in a sheet (for screens before sign-in). */
export function AppearanceButton() {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Change appearance"
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-full bg-surface active:opacity-70">
        <Icon as={isDark ? Moon : Sun} tone="fg2" size={17} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Appearance">
        <View className="-mx-3.5">
          <AppearanceOptions />
        </View>
      </BottomSheet>
    </>
  );
}
