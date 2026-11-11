import { Check, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type PressableProps, type ScrollViewProps, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Status } from '@/lib/status';
import { useTheme } from '@/lib/theme';
import { statusLabel } from '@/lib/status';

import { ConnectionBanner } from './connection-banner';
import { ModeTag } from './mode-tag';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* Layout ------------------------------------------------------------------ */

export function Screen({
  children,
  className,
  title,
  subtitle,
  right,
  onBack,
  backLabel = 'Back',
  ...props
}: ScrollViewProps & {
  children: ReactNode;
  /** In-page title (tab screens have no navigation header) */
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Shows a back link above the title */
  onBack?: () => void;
  backLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: title ? insets.top : 0 }}>
      <ConnectionBanner />
      {/* Android draws edge to edge, so the page has to make room for the keyboard itself. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <ScrollView
        className={cx('flex-1', className)}
        contentContainerClassName="gap-3 px-3 pb-8 pt-3"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        {...props}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            className="-mb-1 flex-row items-center gap-0.5 self-start rounded-full bg-surface py-1.5 pl-2 pr-3 active:opacity-70">
            <Icon as={ChevronLeft} tone="accent" size={18} />
            <Text className="text-xs font-semibold text-accent">{backLabel}</Text>
          </Pressable>
        ) : null}
        {title ? (
          <View className="flex-row items-start justify-between gap-3 px-1 pt-1">
            <View className="flex-1 gap-1.5">
              <Text className="font-display-bold text-[22px] tracking-tight text-fg">{title}</Text>
              {subtitle ? <Text className="text-xs text-muted">{subtitle}</Text> : null}
            </View>
            <View className="flex-row flex-wrap items-center justify-end gap-1.5">
              <ModeTag />
              {right}
            </View>
          </View>
        ) : null}
        {children}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cx('rounded-xl bg-surface p-3', className)}>
      {children}
    </View>
  );
}

/** Small caption inside cards and above fields. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cx('text-xs font-medium text-muted', className)}>{children}</Text>;
}

/** Section heading above a card or group. */
export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cx('font-display text-[15px] text-fg', className)}>{children}</Text>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-display text-[15px] text-fg">{children}</Text>
      {right}
    </View>
  );
}

/** A labelled group of rows in one card, separated by hairlines. */
export function Group({
  title,
  right,
  footer,
  children,
}: {
  title?: string;
  right?: ReactNode;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="overflow-hidden rounded-xl bg-surface">
        {title ? (
          <View className="flex-row items-center justify-between border-b border-linesoft px-3 py-2.5">
            <Text className="text-xs font-medium text-muted">{title}</Text>
            {right}
          </View>
        ) : null}
        {children}
      </View>
      {footer ? <Text className="px-1 text-xs leading-4 text-muted">{footer}</Text> : null}
    </View>
  );
}

/** A row inside a Group. */
export function Item({
  children,
  onPress,
  last,
  className,
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
  className?: string;
}) {
  const cls = cx(
    'flex-row items-center gap-3 px-3 py-2.5',
    !last && 'border-b border-linesoft',
    onPress && 'active:bg-surface2',
    className,
  );
  return onPress ? (
    <Pressable onPress={onPress} className={cls}>
      {children}
    </Pressable>
  ) : (
    <View className={cls}>{children}</View>
  );
}

export function Row({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <Item last={last}>
      <Text className="flex-1 text-[13px] text-muted">{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className="text-[13px] font-medium text-fg">{value}</Text>
      ) : (
        value
      )}
    </Item>
  );
}

/* Controls ---------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const buttonStyles: Record<ButtonVariant, { box: string; text: string; spinner: 'onaccent' | 'fg' | 'crit' | 'accent' }> = {
  primary: { box: 'bg-accent active:opacity-90', text: 'text-onaccent', spinner: 'onaccent' },
  secondary: {
    box: 'bg-surface2 active:bg-linesoft',
    text: 'text-fg2',
    spinner: 'fg',
  },
  danger: {
    box: 'border border-crit/30 bg-surface active:bg-critsoft',
    text: 'text-crit',
    spinner: 'crit',
  },
  ghost: { box: 'active:bg-surface2', text: 'text-accent', spinner: 'accent' },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  className,
  ...props
}: PressableProps & {
  title: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const s = buttonStyles[variant];
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={cx(
        'flex-row items-center justify-center gap-1.5 rounded-lg',
        size === 'sm' ? 'h-8 px-3' : 'h-10 px-4',
        s.box,
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...props}>
      {loading ? <ActivityIndicator size="small" color={colors[s.spinner]} /> : icon}
      <Text className={cx('font-semibold', size === 'sm' ? 'text-xs' : 'text-sm', s.text)}>
        {title}
      </Text>
    </Pressable>
  );
}

/**
 * Keeps typed text valid for the kind of field, so a number field can only hold a number.
 * (Phones show the right keyboard, but pasting and desktop browsers can still enter anything.)
 */
function clean(text: string, kind: TextInputProps['keyboardType']): string {
  switch (kind) {
    case 'number-pad':
      return text.replace(/\D/g, '');
    case 'decimal-pad':
    case 'numeric':
    case 'numbers-and-punctuation': {
      const negative = kind === 'numbers-and-punctuation' && text.trim().startsWith('-');
      const [whole, ...rest] = text.replace(/,/g, '.').replace(/[^\d.]/g, '').split('.');
      return (negative ? '-' : '') + whole + (rest.length ? '.' + rest.join('') : '');
    }
    case 'email-address':
      return text.replace(/\s/g, '');
    default:
      return text;
  }
}

const inputModeFor: Partial<Record<NonNullable<TextInputProps['keyboardType']>, TextInputProps['inputMode']>> = {
  'number-pad': 'numeric',
  'decimal-pad': 'decimal',
  numeric: 'decimal',
  'email-address': 'email',
};

export function TextField({
  label,
  error,
  hint,
  icon,
  right,
  className,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Icon shown inside the field, on the left */
  icon?: LucideIcon;
  /** Element shown inside the field, on the right (e.g. show/hide password) */
  right?: ReactNode;
  className?: string;
}) {
  const { colors } = useTheme();
  return (
    <View className={cx('gap-1', className)}>
      <Text className="text-xs font-medium text-fg2">{label}</Text>
      <View
        className={cx(
          'h-11 flex-row items-center gap-2 rounded-lg border bg-surface px-3',
          error ? 'border-crit' : 'border-line',
        )}>
        {icon ? <Icon as={icon} tone="faint" size={16} /> : null}
        <TextInput
          placeholderTextColor={colors.faint}
          className="flex-1 self-stretch font-normal text-sm text-fg"
          // Android adds its own vertical padding and font padding, which clipped the text.
          style={
            Platform.OS === 'web'
              ? ({ outlineStyle: 'none' } as object)
              : { paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' }
          }
          inputMode={inputModeFor[props.keyboardType ?? 'default']}
          {...props}
          onChangeText={(t) => props.onChangeText?.(clean(t, props.keyboardType))}
        />
        {right}
      </View>
      {error ? (
        <Text className="text-[11px] text-crit">{error}</Text>
      ) : hint ? (
        <Text className="text-[11px] text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

/** Pill-style choices, e.g. portion presets. */
export function Chips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            className={cx(
              'h-8 flex-1 items-center justify-center rounded-md',
              active ? 'bg-accentsoft' : 'bg-surface2',
            )}>
            <Text
              className={cx(
                'text-xs font-semibold',
                active ? 'text-accent' : 'text-fg2',
              )}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Underlined text tabs for switching what a page shows. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-5 border-b border-line px-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="-mb-px pt-1 active:opacity-60">
            <Text className={cx('pb-2 text-sm', active ? 'font-display text-fg' : 'font-medium text-muted')}>
              {o.label}
            </Text>
            <View className={cx('h-0.5 rounded-full', active ? 'bg-accent' : 'bg-transparent')} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small inline choices, e.g. a time range: plain text, the active one highlighted. */
export function InlineChoice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row items-center gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            hitSlop={4}
            className={cx('rounded-full px-2.5 py-1 active:opacity-60', active && 'bg-accentsoft')}>
            <Text className={cx('text-xs', active ? 'font-semibold text-accent' : 'font-medium text-muted')}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* Status ------------------------------------------------------------------ */

const statusStyles: Record<Status, { bg: string; text: string }> = {
  ok: { bg: 'bg-oksoft', text: 'text-ok' },
  warning: { bg: 'bg-warnsoft', text: 'text-warn' },
  critical: { bg: 'bg-critsoft', text: 'text-crit' },
  unknown: { bg: 'bg-canvas', text: 'text-muted' },
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const s = statusStyles[status];
  return (
    <View className={cx('self-start rounded-full px-2 py-1', s.bg)}>
      <Text className={cx('text-[11px] font-semibold', s.text)}>{label ?? statusLabel[status]}</Text>
    </View>
  );
}

export const statusTextColor: Record<Status, string> = {
  ok: 'text-fg',
  warning: 'text-warn',
  critical: 'text-crit',
  unknown: 'text-faint',
};

/** Compact light/dark switch for page headers. */
export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-7 flex-row items-center rounded-full bg-surface2 p-0.5">
      {(['Light', 'Dark'] as const).map((l) => {
        const active = (l === 'Dark') === isDark;
        return (
          <View key={l} className={cx('rounded-full px-2.5 py-0.5', active && 'bg-accentsoft')}>
            <Text className={cx('text-[11px] font-semibold', active ? 'text-accent' : 'text-faint')}>
              {l}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}

/** Themed lucide icon: <Icon as={Droplet} tone="accent" /> */
export function Icon({
  as: C,
  tone = 'muted',
  size = 16,
}: {
  as: LucideIcon;
  tone?: 'fg' | 'fg2' | 'muted' | 'faint' | 'accent' | 'ok' | 'warn' | 'crit' | 'onaccent';
  size?: number;
}) {
  const { colors } = useTheme();
  return <C size={size} color={colors[tone]} strokeWidth={1.75} />;
}

/** Small "icon + caption" line used at the top of cards. */
export function CardLabel({ icon, children, tone = 'muted' }: { icon: LucideIcon; children: ReactNode; tone?: 'muted' | 'accent' }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={icon} tone={tone} size={14} />
      <Text className={cx('text-xs font-medium', tone === 'accent' ? 'text-accent' : 'text-muted')}>{children}</Text>
    </View>
  );
}

/** Single-choice list: one row per option with a description and a check on the active one. */
export function OptionList<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; body?: string; icon?: LucideIcon; note?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={cx(
              'flex-row items-center gap-3 px-3.5 py-3 active:bg-surface2',
              i < options.length - 1 && 'border-b border-linesoft',
            )}>
            {o.icon ? <Icon as={o.icon} tone={active ? 'accent' : 'muted'} size={18} /> : null}
            <View className="flex-1 gap-0.5">
              <Text className={cx('text-[13px] font-medium', active ? 'text-fg' : 'text-fg2')}>{o.label}</Text>
              {o.body ? <Text className="text-[11px] leading-4 text-muted">{o.body}</Text> : null}
            </View>
            {o.note && !active ? <Text className="text-[11px] text-faint">{o.note}</Text> : null}
            <View
              className={cx(
                'h-5 w-5 items-center justify-center rounded-full',
                active ? 'bg-accent' : 'border border-line',
              )}>
              {active ? <Icon as={Check} tone="onaccent" size={12} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Page numbers to show: first, last, and the pages around the current one. */
function pageItems(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (page <= 2) keep.add(3);
  if (page >= pages - 1) keep.add(pages - 2);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push('gap');
    out.push(n);
    prev = n;
  }
  return out;
}

/** Pager: ‹ 1 2 3 … 9 ›. Renders nothing when there is only one page. */
export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const cell = 'h-9 min-w-9 items-center justify-center border-line px-2.5';
  return (
    <View className="flex-row self-center overflow-hidden rounded-xl border border-line bg-surface">
      <Pressable
        disabled={page === 1}
        onPress={() => onChange(page - 1)}
        accessibilityLabel="Previous page"
        className={cx(cell, 'border-r active:bg-surface2')}>
        <View className={cx(page === 1 && 'opacity-30')}>
          <Icon as={ChevronLeft} tone="fg2" />
        </View>
      </Pressable>
      {pageItems(page, pages).map((it, i) =>
        it === 'gap' ? (
          <View key={`gap-${i}`} className={cx(cell, 'border-r')}>
            <Text className="text-xs text-faint">…</Text>
          </View>
        ) : (
          <Pressable
            key={it}
            onPress={() => onChange(it)}
            accessibilityLabel={`Page ${it}`}
            className={cx(cell, 'border-r active:bg-surface2', it === page && 'bg-accentsoft')}>
            <Text className={cx('text-xs font-semibold', it === page ? 'text-accent' : 'text-fg2')}>{it}</Text>
          </Pressable>
        ),
      )}
      <Pressable
        disabled={page === pages}
        onPress={() => onChange(page + 1)}
        accessibilityLabel="Next page"
        className={cx(cell, 'active:bg-surface2')}>
        <View className={cx(page === pages && 'opacity-30')}>
          <Icon as={ChevronRight} tone="fg2" />
        </View>
      </Pressable>
    </View>
  );
}

/** Slices a list into pages; the page resets if the list shrinks. */
export function usePaged<T>(items: T[], size = 10) {
  const [raw, setRaw] = useState(1);
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(raw, pages);
  // Brief placeholder while the next page is put together, so the change is easy to follow.
  const setPage = (p: number) => {
    setRaw(p);
    setLoading(true);
    setTimeout(() => setLoading(false), 350);
  };
  return { page, pages, setPage, loading, slice: items.slice((page - 1) * size, page * size) };
}

/* Skeletons --------------------------------------------------------------- */

/** Softly pulsing placeholder block. Size it with className, e.g. "h-4 w-24". */
export function Skeleton({ className }: { className?: string }) {
  const [pulse] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ opacity: pulse }}>
      <View className={cx('rounded-md bg-linesoft', className)} />
    </Animated.View>
  );
}

/** A card of placeholder list rows. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <View className="overflow-hidden rounded-xl bg-surface" accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          className={cx('flex-row items-center gap-3 px-3.5 py-3', i < rows - 1 && 'border-b border-linesoft')}>
          <Skeleton className="h-5 w-5 rounded-full" />
          <View className="flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40" />
          </View>
          <Skeleton className="h-4 w-12" />
        </View>
      ))}
    </View>
  );
}

/* Misc -------------------------------------------------------------------- */

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View className="items-center gap-1 rounded-xl bg-surface px-4 py-5">
      <Text className="text-center text-sm font-semibold text-fg">{title}</Text>
      {body ? <Text className="text-center text-xs text-muted">{body}</Text> : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}

/** Whole-page placeholder shown while a screen's first data arrives. */
export function Loading() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 gap-3 bg-canvas px-3" style={{ paddingTop: insets.top + 16 }} accessibilityLabel="Loading">
      <View className="gap-2 px-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-56" />
      </View>
      <View className="gap-3 rounded-2xl bg-surface p-4">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-full" />
      </View>
      <SkeletonRows rows={3} />
      <SkeletonRows rows={4} />
    </View>
  );
}
