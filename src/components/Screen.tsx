/**
 * Screen wrapper — applies safe-area insets, white background, and optional
 * scrolling. Use for every screen for consistent padding & RTL behavior.
 */
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/colors';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const containerStyle = [
    styles.container,
    { paddingTop: insets.top },
    style,
  ];
  const innerStyle = padded ? styles.padded : undefined;

  if (scroll) {
    return (
      <View style={containerStyle}>
        <ScrollView
          contentContainerStyle={[innerStyle, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={[innerStyle, styles.flex]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg },
  scrollContent: { paddingBottom: spacing.xxl },
  flex: { flex: 1 },
});
