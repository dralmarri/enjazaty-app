/**
 * Primary saffron button with variants. White text on saffron by default.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme/colors';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.softBackground,
    outline: 'transparent',
    danger: colors.danger,
  };
  const fg: Record<Variant, string> = {
    primary: colors.onPrimary,
    secondary: colors.textDark,
    outline: colors.primaryDark,
    danger: colors.white,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg[variant] },
        variant === 'outline' && styles.outline,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={fg[variant]}
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: fg[variant] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    minHeight: 50,
  },
  fullWidth: { alignSelf: 'stretch' },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '700' },
  icon: { marginHorizontal: 6 },
});
