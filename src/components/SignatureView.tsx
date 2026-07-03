/**
 * SignatureView — renders a stored signature. The value is either a JSON array
 * of SVG path strings (hand-drawn) or, for older records, plain typed text.
 *
 * A viewBox is computed from the stroke coordinates so the signature always
 * scales to fit its box (regardless of the device it was drawn on).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '@/theme/colors';

/** Compute a fitting viewBox "minX minY width height" from SVG path strings. */
function computeViewBox(paths: string[]): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of paths) {
    // Numbers come in x/y pairs after M/L commands.
    const nums = d.match(/-?\d+(\.\d+)?/g);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return '0 0 300 150';
  const pad = 8;
  const w = Math.max(1, maxX - minX) + pad * 2;
  const h = Math.max(1, maxY - minY) + pad * 2;
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
}

export function SignatureView({ value, height = 120 }: { value: string; height?: number }) {
  let paths: string[] | null = null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
      paths = parsed;
    }
  } catch {
    paths = null;
  }

  // Old/typed signature → show as text.
  if (!paths || paths.length === 0) {
    return <Text style={styles.typed}>✍️ {value}</Text>;
  }

  const viewBox = computeViewBox(paths);

  return (
    <View style={[styles.box, { height }]}>
      <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            stroke={colors.textDark}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  typed: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, fontStyle: 'italic' },
  box: {
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
