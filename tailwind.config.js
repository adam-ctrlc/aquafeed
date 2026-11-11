const plugin = require('tailwindcss/plugin');

/**
 * Inter ships one file per weight, and Android can't synthesize weights for custom fonts,
 * so font-* weight classes select the matching Inter family instead of setting fontWeight.
 */
const interWeights = plugin(({ addUtilities }) =>
  addUtilities({
    '.font-normal': { fontFamily: 'Inter_400Regular' },
    '.font-medium': { fontFamily: 'Inter_500Medium' },
    '.font-semibold': { fontFamily: 'Inter_600SemiBold' },
    '.font-bold': { fontFamily: 'Inter_700Bold' },
    // Display face for titles, headings and large figures
    '.font-display': { fontFamily: 'PlusJakartaSans_600SemiBold' },
    '.font-display-bold': { fontFamily: 'PlusJakartaSans_700Bold' },
  }),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  corePlugins: { fontWeight: false },
  // 'class' (not the default 'media'): the app is light-only, and NativeWind v4 throws on web with 'media'.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme tokens (values in src/lib/theme.ts, switched for light/dark)
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        linesoft: 'rgb(var(--c-linesoft) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        fg2: 'rgb(var(--c-fg2) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accentsoft: 'rgb(var(--c-accentsoft) / <alpha-value>)',
        onaccent: 'rgb(var(--c-onaccent) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        oksoft: 'rgb(var(--c-oksoft) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        warnsoft: 'rgb(var(--c-warnsoft) / <alpha-value>)',
        crit: 'rgb(var(--c-crit) / <alpha-value>)',
        critsoft: 'rgb(var(--c-critsoft) / <alpha-value>)',
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
      },
    },
  },
  plugins: [interWeights],
};
