/**
 * Circular avatar — shows an image when available, otherwise initials on a
 * saffron background.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, uri, size = 48 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension]} />;
  }
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.softBackground },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: colors.onPrimary, fontWeight: '800' },
});
