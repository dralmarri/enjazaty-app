/**
 * SignaturePad — a hand-drawn signature canvas (works on web + native via
 * react-native-svg + PanResponder). Emits the strokes as an array of SVG path
 * "d" strings so the signature can be stored as text and re-rendered later.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radius, spacing } from '@/theme/colors';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  /** Called whenever the strokes change (array of SVG path d-strings). */
  onChange: (paths: string[]) => void;
  height?: number;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return (
    `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ` +
    rest.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  );
}

export function SignaturePad({ onChange, height = 180 }: SignaturePadProps) {
  const { t } = useLanguage();
  const [strokes, setStrokes] = useState<string[]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const currentRef = useRef<Point[]>([]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Capture the gesture before any parent ScrollView so drawing doesn't
        // scroll the page.
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          const { locationX, locationY } = e.nativeEvent;
          currentRef.current = [{ x: locationX, y: locationY }];
          setCurrent(currentRef.current);
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          const { locationX, locationY } = e.nativeEvent;
          currentRef.current = [...currentRef.current, { x: locationX, y: locationY }];
          setCurrent(currentRef.current);
        },
        onPanResponderRelease: () => {
          const path = pointsToPath(currentRef.current);
          if (path) {
            setStrokes((prev) => {
              const next = [...prev, path];
              onChange(next);
              return next;
            });
          }
          currentRef.current = [];
          setCurrent([]);
        },
      }),
    [onChange]
  );

  const clear = () => {
    setStrokes([]);
    setCurrent([]);
    currentRef.current = [];
    onChange([]);
  };

  // On web, prevent the browser from scrolling / selecting while drawing.
  const webNoScroll =
    Platform.OS === 'web'
      ? ({ touchAction: 'none', userSelect: 'none', cursor: 'crosshair' } as any)
      : null;

  return (
    <View>
      <View
        style={[styles.canvas, { height }, webNoScroll]}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%">
          {strokes.map((d, i) => (
            <Path key={i} d={d} stroke={colors.textDark} strokeWidth={2.5} fill="none" />
          ))}
          {current.length > 0 ? (
            <Path d={pointsToPath(current)} stroke={colors.textDark} strokeWidth={2.5} fill="none" />
          ) : null}
        </Svg>
        {strokes.length === 0 && current.length === 0 ? (
          <Text style={styles.placeholder}>✍️ {t('drawSignature')}</Text>
        ) : null}
      </View>
      <Pressable onPress={clear} style={styles.clearBtn} hitSlop={8}>
        <Text style={styles.clearText}>{t('clear')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.softBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { position: 'absolute', color: colors.mutedText, fontSize: 15 },
  clearBtn: { alignSelf: 'flex-end', marginTop: spacing.sm },
  clearText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
