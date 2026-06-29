/**
 * Screen header with optional back button and right action.
 * Back-arrow direction flips automatically for RTL.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  rightIcon,
  onRightPress,
}: HeaderProps) {
  const { isRTL } = useLanguage();
  // In RTL the "back" chevron should point the opposite way.
  const backIcon = isRTL ? 'chevron-forward' : 'chevron-back';

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack && router.canGoBack() ? (
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name={backIcon} size={24} color={colors.textDark} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.side}>
        {rightIcon ? (
          <Pressable onPress={onRightPress} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name={rightIcon} size={24} color={colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  side: { width: 40, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center' },
  iconBtn: { padding: spacing.xs },
  title: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
});
