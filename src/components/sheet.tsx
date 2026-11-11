import { useEffect, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { themeVars, useTheme } from '@/lib/theme';

import { cx } from './ui';

const useNativeDriver = Platform.OS !== 'web';

/**
 * Bottom sheet that slides up over a dimmed backdrop. Stays mounted while it animates out,
 * then calls `onClosed`.
 */
export function BottomSheet({
  visible,
  onClose,
  onClosed,
  title,
  scroll,
  children,
}: {
  visible: boolean;
  /** Backdrop tap / Android back */
  onClose: () => void;
  onClosed?: () => void;
  title?: string;
  /** Long content: scrolls inside the sheet (max 72% of the screen) */
  scroll?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { scheme } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const [rendered, setRendered] = useState(visible);
  // Mount as soon as it should show (derived state, set during render).
  if (visible && !rendered) setRendered(true);

  useEffect(() => {
    if (!rendered) return;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 180,
      useNativeDriver,
    }).start(({ finished }) => {
      if (visible || !finished) return;
      setRendered(false);
      onClosed?.();
    });
    // onClosed is read when the animation ends; it should not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rendered, progress]);

  if (!rendered) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={[{ flex: 1 }, themeVars[scheme]]}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(5,10,18,0.5)', opacity: progress }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) },
            ],
          }}>
          <View
            className="w-full">
            <View
              className="rounded-t-3xl bg-surface px-5 pt-5"
              style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
            {title ? <Text className="mb-4 font-display-bold text-lg text-fg">{title}</Text> : null}
            {scroll ? (
              <ScrollView style={{ maxHeight: height * 0.72 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              children
            )}
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* Confirmation / message sheet (backs the app's Alert.alert) -------------- */

export interface SheetButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface SheetRequest {
  title: string;
  message?: string;
  buttons: SheetButton[];
}

interface SheetState {
  current: SheetRequest | null;
  open: boolean;
  /** Runs after the close animation, so a button can open another sheet. */
  after: (() => void) | null;
  show: (req: SheetRequest) => void;
  close: (after?: () => void) => void;
}

export const useSheet = create<SheetState>((set) => ({
  current: null,
  open: false,
  after: null,
  show: (req) => set({ current: req, open: true, after: null }),
  close: (after) => set({ open: false, after: after ?? null }),
}));

/** Mounted once in the root layout. */
export function SheetHost() {
  const current = useSheet((s) => s.current);
  const open = useSheet((s) => s.open);

  const cancel = current?.buttons.find((b) => b.style === 'cancel');
  const actions = current?.buttons.filter((b) => b.style !== 'cancel') ?? [];
  const press = (b?: SheetButton) => useSheet.getState().close(b?.onPress);

  return (
    <BottomSheet
      visible={open}
      onClose={() => press(cancel)}
      onClosed={() => {
        const { after } = useSheet.getState();
        useSheet.setState({ after: null });
        after?.();
      }}>
      {current ? (
        <>
          <Text className="font-display-bold text-lg text-fg">{current.title}</Text>
          {current.message ? (
            <Text className="mt-1 text-sm leading-5 text-fg2">{current.message}</Text>
          ) : null}
          <View className="mt-5 flex-row-reverse gap-2">
            {(actions.length ? actions : [{ text: 'OK' } as SheetButton]).map((b) => (
              <Pressable
                key={b.text}
                onPress={() => press(b)}
                className={cx(
                  'h-11 flex-1 items-center justify-center rounded-full',
                  b.style === 'destructive'
                    ? 'bg-crit active:opacity-90'
                    : 'bg-accent active:opacity-90',
                )}>
                <Text className="text-sm font-semibold text-onaccent">{b.text}</Text>
              </Pressable>
            ))}
            {cancel ? (
              <Pressable
                onPress={() => press(cancel)}
                className="h-11 flex-1 items-center justify-center rounded-full bg-surface2 active:bg-linesoft">
                <Text className="text-sm font-semibold text-fg2">{cancel.text}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}
