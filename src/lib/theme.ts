import AsyncStorage from '@react-native-async-storage/async-storage';
import { vars } from 'nativewind';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

/**
 * Soft, low-glare palettes. Each token is used by Tailwind classes through a CSS variable
 * (bg-surface, text-muted, …) and by JS code (tab bar, charts) through `useTheme().colors`.
 */
const palette = {
  light: {
    canvas: '#f4f6f9',
    surface: '#ffffff',
    surface2: '#f7f9fb',
    line: '#e3e8ef',
    linesoft: '#eef2f6',
    fg: '#1b2433',
    fg2: '#475467',
    muted: '#6b7787',
    faint: '#9aa5b4',
    accent: '#0e7490',
    accentsoft: '#e6f4f7',
    onaccent: '#ffffff',
    ok: '#2f7d5b',
    oksoft: '#e9f5ef',
    warn: '#a8641a',
    warnsoft: '#fbf3e6',
    crit: '#b4423f',
    critsoft: '#fbecec',
  },
  dark: {
    canvas: '#0f141c',
    surface: '#161d27',
    surface2: '#1c2531',
    line: '#253040',
    linesoft: '#1f2935',
    fg: '#e4e9f0',
    fg2: '#b3bdca',
    muted: '#8a96a6',
    faint: '#5f6b7b',
    accent: '#5fb8cc',
    accentsoft: '#183039',
    onaccent: '#0b1218',
    ok: '#6cc49a',
    oksoft: '#16291f',
    warn: '#e0aa62',
    warnsoft: '#2c2216',
    crit: '#e88884',
    critsoft: '#2e1b1c',
  },
} as const;

export type Colors = { [K in keyof (typeof palette)['light']]: string };

const toRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const toVars = (p: Colors) =>
  vars(
    Object.fromEntries(Object.entries(p).map(([k, v]) => [`--c-${k}`, toRgb(v)])) as Record<
      `--${string}`,
      string
    >,
  );

export const themeVars = { light: toVars(palette.light), dark: toVars(palette.dark) };

/** Chart series colours that read well on both backgrounds. */
export const series = {
  light: { ph: '#7c6cc4', temp: '#c7794a', turbidity: '#3b8ea5' },
  dark: { ph: '#a99bea', temp: '#e3a27b', turbidity: '#6cc0d6' },
} as const;

/* Preference store ------------------------------------------------------- */

const KEY = 'aquafeed:theme';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(KEY, mode).catch(() => {});
  },
}));

AsyncStorage.getItem(KEY)
  .then((m) => {
    if (m === 'light' || m === 'dark' || m === 'system') useThemeStore.setState({ mode: m });
  })
  .catch(() => {});

export function useTheme() {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const scheme: Scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return {
    mode,
    scheme,
    isDark: scheme === 'dark',
    colors: palette[scheme] as Colors,
    series: series[scheme],
    setMode,
    toggle: () => setMode(scheme === 'dark' ? 'light' : 'dark'),
  };
}
