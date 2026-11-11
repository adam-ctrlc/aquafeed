import { format } from 'date-fns';
import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/text';
import { LineChart } from 'react-native-gifted-charts';

import { useTheme } from '@/lib/theme';
import type { WaterReading, WithId } from '@/lib/types';

const MAX_POINTS = 60;

/** Average readings into at most MAX_POINTS buckets so long ranges stay fast to draw. */
function downsample(readings: WithId<WaterReading>[], pick: (r: WaterReading) => number) {
  const valid = readings.filter((r) => Number.isFinite(pick(r)));
  if (valid.length <= MAX_POINTS) return valid.map((r) => ({ ts: r.ts, value: pick(r) }));
  const size = valid.length / MAX_POINTS;
  const out: { ts: number; value: number }[] = [];
  for (let i = 0; i < MAX_POINTS; i++) {
    const bucket = valid.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    if (!bucket.length) continue;
    const avg = bucket.reduce((s, r) => s + pick(r), 0) / bucket.length;
    out.push({ ts: bucket[bucket.length - 1].ts, value: avg });
  }
  return out;
}

export function HistoryChart({
  readings,
  pick,
  color,
  decimals,
  okBand,
  longRange,
}: {
  readings: WithId<WaterReading>[];
  pick: (r: WaterReading) => number;
  color: string;
  decimals: number;
  /** Acceptable range, drawn as reference lines */
  okBand?: [number, number];
  longRange?: boolean;
}) {
  // Card sits inside Screen padding (16 × 2) and its own padding + border (17 × 2).
  const { width: windowWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const width = Math.min(windowWidth, 800) - 54;

  const chart = useMemo(() => {
    const points = downsample(readings, pick);
    if (points.length < 2) return null;
    const values = points.map((p) => p.value);
    if (okBand) values.push(...okBand);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.15, 10 ** -decimals);
    const step = 10 ** -decimals;
    const offset = Math.floor((min - pad) / step) * step;
    const top = Math.ceil((max + pad) / step) * step;
    const data = points.map((p) => ({ value: p.value }));
    const fmtTs = (ts: number) => format(ts, longRange ? 'MMM d' : 'h:mm a');
    const first = points[0].ts;
    const last = points[points.length - 1].ts;
    const labels = [0, 1 / 3, 2 / 3, 1].map((f) => fmtTs(first + (last - first) * f));
    return { data, offset, range: top - offset, labels };
  }, [readings, pick, okBand, decimals, longRange]);

  if (!chart) {
    return (
      <View className="h-28 items-center justify-center">
        <Text className="text-xs text-faint">Not enough readings in this range yet</Text>
      </View>
    );
  }

  const yLabelWidth = 30;
  const plotWidth = Math.max(width - yLabelWidth - 16, 100);

  return (
    <View className="overflow-hidden">
      {width > 0 ? (
        <LineChart
          data={chart.data}
          width={plotWidth}
          height={110}
          adjustToWidth
          initialSpacing={4}
          endSpacing={4}
          color={color}
          thickness={1.5}
          hideDataPoints
          yAxisOffset={chart.offset}
          maxValue={chart.range}
          noOfSections={4}
          yAxisLabelWidth={yLabelWidth}
          formatYLabel={(l) => Number(l).toFixed(decimals)}
          yAxisColor="transparent"
          xAxisColor={colors.line}
          rulesColor={colors.linesoft}
          rulesThickness={1}
          rulesType="solid"
          yAxisTextStyle={{ color: colors.faint, fontSize: 10, fontFamily: 'Inter_400Regular' }}
          showReferenceLine1={!!okBand}
          referenceLine1Position={okBand ? okBand[0] : 0}
          referenceLine1Config={{ color: colors.ok, type: 'dashed', dashWidth: 4, dashGap: 4, thickness: 1 }}
          showReferenceLine2={!!okBand}
          referenceLine2Position={okBand ? okBand[1] : 0}
          referenceLine2Config={{ color: colors.ok, type: 'dashed', dashWidth: 4, dashGap: 4, thickness: 1 }}
        />
      ) : null}
      <View className="flex-row justify-between pl-8">
        {chart.labels.map((l, i) => (
          <Text key={i} className="text-[10px] text-faint">
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
