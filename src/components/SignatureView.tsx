/**
 * SignatureView — renders a stored signature for EVERY viewer (owner,
 * supervisor, sub-admin, employee) identically.
 *
 * Handles every historical storage format:
 *  - JSON array of SVG path strings (current format)
 *  - double-encoded JSON (a JSON string containing the array)
 *  - bare SVG path data, e.g. "M 173.7 86.0 L 213.7 …" (legacy records)
 *  - plain typed text (oldest records: the evaluator's typed name)
 *
 * Raw path data is NEVER shown as text: anything that looks like stroke
 * coordinates is drawn as a signature; only genuine human text falls back
 * to the typed style. A viewBox computed from the stroke coordinates keeps
 * the drawing scaled to its box on every device.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '@/theme/colors';

/** True when the string looks like SVG path data (starts with an M command). */
function looksLikePath(s: string): boolean {
  return /^\s*[Mm]\s*-?\d/.test(s);
}

/** Split concatenated path data into one path per stroke (each starts at M). */
function splitStrokes(d: string): string[] {
  const parts = d
    .split(/(?=[Mm]\s*-?\d)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [d];
}

/** Parse ANY stored signature format into drawable path strings, or null. */
export function parseSignature(value: string): string[] | null {
  try {
    let parsed: unknown = JSON.parse(value);
    if (typeof parsed === 'string') {
      // Double-encoded JSON — unwrap once more if possible.
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // keep as string
      }
    }
    if (Array.isArray(parsed)) {
      const paths = parsed
        .filter((p): p is string => typeof p === 'string')
        .flatMap((p) => (looksLikePath(p) ? splitStrokes(p) : []));
      if (paths.length > 0) return paths;
      return null;
    }
    if (typeof parsed === 'string' && looksLikePath(parsed)) {
      return splitStrokes(parsed);
    }
  } catch {
    // not JSON at all
  }
  if (looksLikePath(value)) return splitStrokes(value);
  return null;
}

/** Compute a fitting viewBox "minX minY width height" from SVG path strings. */
export function computeViewBox(paths: string[]): string {
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
  const paths = parseSignature(value);

  if (!paths || paths.length === 0) {
    // Only genuine human text (old typed-name signatures) may show as text.
    // Anything that still resembles coordinate data is masked — raw stroke
    // codes must never reach the screen.
    const isHumanText =
      value.length <= 80 && !/-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s*[LlMm]/.test(value);
    return <Text style={styles.typed}>✍️ {isHumanText ? value : ''}</Text>;
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
