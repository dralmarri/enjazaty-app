/**
 * SignatureView — renders a stored signature. The value is either a JSON array
 * of SVG path strings (hand-drawn) or, for older records, plain typed text.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '@/theme/colors';

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
  if (!paths) {
    return <Text style={styles.typed}>✍️ {value}</Text>;
  }

  return (
    <View style={[styles.box, { height }]}>
      <Svg width="100%" height="100%">
        {paths.map((d, i) => (
          <Path key={i} d={d} stroke={colors.textDark} strokeWidth={2.5} fill="none" />
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
