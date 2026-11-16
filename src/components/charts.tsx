import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { formatCompactMoney, formatMoney } from '@/lib/format';
import { formatShortMonth } from '@/lib/date';
import type { MonthPoint } from '@/lib/stats';
import { colors } from '@/theme';

export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(cx: number, cy: number, outer: number, inner: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, outer, end);
  const p2 = polarToCartesian(cx, cy, outer, start);
  const p3 = polarToCartesian(cx, cy, inner, start);
  const p4 = polarToCartesian(cx, cy, inner, end);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outer} ${outer} 0 ${large} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${inner} ${inner} 0 ${large} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export function DonutChart({
  slices,
  size = 184,
  currency = 'XOF',
}: {
  slices: ChartSlice[];
  size?: number;
  currency?: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 6;
  const inner = outer - size * 0.15;
  const sweepOf = (slice: ChartSlice) => (total > 0 ? (slice.value / total) * 360 : 0);

  const paths = slices.flatMap((slice, index) => {
    const sweep = sweepOf(slice);
    const start = slices.slice(0, index).reduce((sum, item) => sum + sweepOf(item), 0);
    if (sweep >= 359.9) {
      return [
        { color: slice.color, d: donutSlice(cx, cy, outer, inner, 0, 180) },
        { color: slice.color, d: donutSlice(cx, cy, outer, inner, 180, 360) },
      ];
    }
    return [{ color: slice.color, d: donutSlice(cx, cy, outer, inner, start, start + sweep) }];
  });

  return (
    <View style={[styles.donutWrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((path, index) => (
          <Path key={index} d={path.d} fill={path.color} />
        ))}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutCaption}>Total dépensé</Text>
        <Text style={[styles.donutValue, total > 99999 && styles.donutValueSmall]}>
          {formatCompactMoney(total, currency)}
        </Text>
      </View>
    </View>
  );
}

export function ChartLegend({ slices, currency = 'XOF' }: { slices: ChartSlice[]; currency?: string }) {
  return (
    <View style={styles.legend}>
      {slices.slice(0, 5).map((slice) => (
        <View key={slice.label} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>
            {slice.label}
          </Text>
          <Text style={styles.legendValue}>{formatMoney(slice.value, currency)}</Text>
        </View>
      ))}
    </View>
  );
}

export function MonthlyBars({
  data,
  currency = 'XOF',
}: {
  data: MonthPoint[];
  currency?: string;
}) {
  const max = Math.max(1, ...data.flatMap((point) => [point.income, point.expense]));
  return (
    <View>
      <View style={styles.barsLegend}>
        <View style={styles.legendInline}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={styles.legendLabel}>Revenus</Text>
        </View>
        <View style={styles.legendInline}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={styles.legendLabel}>Dépenses</Text>
        </View>
      </View>
      <View style={styles.barsRow}>
        {data.map((point) => (
          <View key={point.key} style={styles.barGroup}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { height: `${(point.income / max) * 100}%`, backgroundColor: colors.income },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: `${(point.expense / max) * 100}%`, backgroundColor: colors.expense },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{formatShortMonth(point.key)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.barsHint}>6 derniers mois · {formatMoney(max, currency)} max</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  donutWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', paddingHorizontal: 24 },
  donutCaption: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  donutValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  donutValueSmall: { fontSize: 16 },
  legend: { marginTop: 14, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  legendValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  barsLegend: { flexDirection: 'row', gap: 18, marginBottom: 12 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 8 },
  barGroup: { flex: 1, alignItems: 'center', height: '100%' },
  bars: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  bar: { width: 11, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 6 },
  barsHint: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 10 },
});
