import type { AlertButton } from 'react-native';

import { useSheet, type SheetButton } from '@/components/sheet';

/**
 * Same call shape as React Native's Alert, but shown as a bottom sheet on every platform.
 * With no buttons it shows a single "OK".
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const mapped: SheetButton[] = (buttons ?? []).map((b) => ({
      text: b.text ?? 'OK',
      style: b.style,
      onPress: b.onPress ? () => b.onPress?.() : undefined,
    }));
    useSheet.getState().show({ title, message, buttons: mapped });
  },
};
