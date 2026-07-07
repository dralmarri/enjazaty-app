/**
 * Labeled dropdown select — opens a bottom-sheet list of options.
 * Works across web + native and respects RTL alignment.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radius, spacing } from '@/theme/colors';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Shows a red asterisk next to the label to mark a required field. */
  required?: boolean;
}

export function Select({
  label,
  placeholder,
  value,
  options,
  onChange,
  required,
}: SelectProps) {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        style={[styles.field, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[
            styles.value,
            !selected && styles.placeholder,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder ?? '—'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.mutedText} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {opt.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color={colors.primaryDark} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  required: { color: colors.danger },
  field: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.softBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 50,
  },
  value: { flex: 1, fontSize: 16, color: colors.textDark },
  placeholder: { color: colors.mutedText },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.softBackground },
  optionText: { fontSize: 16, color: colors.textDark },
  optionTextActive: { color: colors.primaryDark, fontWeight: '700' },
});
