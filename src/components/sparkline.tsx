import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { useTheme } from '@/lib/theme';

/** Minimal trend line that stretches to its container's width. */
export function Sparkline({
  values,
  color,
  height = 28,
  band,
}: {
  values: number[];
  color?: string;
  height?: number;
  /** Optional [min, max] acceptable band, drawn as faint guide lines */
  band?: [number, number];
}) {
  const { colors } = useTheme();
  const stroke = color ?? colors.accent;
  const clean = values.filter((v) => Number.isFinite(v));
  if (clean.length < 2) return <View style={{ height }} />;

  const lo = Math.min(...clean, ...(band ?? []));
  const hi = Math.max(...clean, ...(band ?? []));
  const span = hi - lo || 1;
  const pad = 2;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const step = 100 / (clean.length - 1);
  const points = clean.map((v, i) => `${(i * step).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {band
        ? band.map((b) => (
            <Line
              key={b}
              x1="0"
              x2="100"
              y1={y(b)}
              y2={y(b)}
              stroke={colors.line}
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      <Polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}

/** Thin horizontal fill bar (0–1). */
export function Meter({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'red' }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = tone === 'red' ? colors.crit : tone === 'amber' ? colors.warn : colors.accent;
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-linesoft">
      <View style={{ width: `${pct}%`, backgroundColor: color, height: '100%' }} />
    </View>
  );
}
