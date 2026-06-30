/**
 * SignatureChooser — lets the user either pick one of their saved signatures
 * or draw a new one (finger/pen). Emits the chosen signature as SVG paths.
 * Optionally saves a freshly drawn signature to the user's library.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createSignature, listSignatures } from '@/lib/api';
import type { Signature } from '@/types/database';
import { SignaturePad } from './SignaturePad';
import { SignatureView } from './SignatureView';
import { colors, radius, spacing } from '@/theme/colors';

interface Props {
  /** Emits the chosen/drawn signature as an array of SVG path strings. */
  onChange: (paths: string[]) => void;
}

export function SignatureChooser({ onChange }: Props) {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [mode, setMode] = useState<'saved' | 'draw'>('saved');
  const [saved, setSaved] = useState<Signature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [savedMsg, setSavedMsg] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const sigs = await listSignatures(profile.id);
      setSaved(sigs);
      // Default to the draw tab if there are no saved signatures yet.
      if (sigs.length === 0) setMode('draw');
    } catch {
      // ignore
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickSaved = (sig: Signature) => {
    setSelectedId(sig.id);
    try {
      const paths = JSON.parse(sig.data);
      if (Array.isArray(paths)) onChange(paths);
    } catch {
      onChange([]);
    }
  };

  const onDraw = (paths: string[]) => {
    setDrawn(paths);
    onChange(paths);
  };

  const saveDrawn = async () => {
    if (!profile || drawn.length === 0) return;
    await createSignature({ user_id: profile.id, data: JSON.stringify(drawn) });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
    await load();
  };

  return (
    <View>
      {/* Tabs */}
      <View style={[styles.tabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          style={[styles.tab, mode === 'saved' && styles.tabActive]}
          onPress={() => setMode('saved')}
        >
          <Text style={[styles.tabText, mode === 'saved' && styles.tabTextActive]}>
            {t('useSaved')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'draw' && styles.tabActive]}
          onPress={() => setMode('draw')}
        >
          <Text style={[styles.tabText, mode === 'draw' && styles.tabTextActive]}>
            {t('drawNew')}
          </Text>
        </Pressable>
      </View>

      {mode === 'saved' ? (
        saved.length === 0 ? (
          <Text style={styles.empty}>{t('noSignatures')}</Text>
        ) : (
          <View style={styles.savedList}>
            {saved.map((sig) => {
              const active = selectedId === sig.id;
              return (
                <Pressable
                  key={sig.id}
                  style={[styles.savedItem, active && styles.savedItemActive]}
                  onPress={() => pickSaved(sig)}
                >
                  <SignatureView value={sig.data} height={70} />
                  {active ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )
      ) : (
        <View>
          <SignaturePad onChange={onDraw} />
          <Pressable onPress={saveDrawn} style={styles.saveLink} hitSlop={8}>
            <Ionicons name="bookmark-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.saveLinkText}>
              {savedMsg ? t('success') : t('saveSignature')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    gap: spacing.sm,
    backgroundColor: colors.softBackground,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  tabTextActive: { color: colors.onPrimary },
  empty: { textAlign: 'center', color: colors.mutedText, paddingVertical: spacing.lg },
  savedList: { gap: spacing.md },
  savedItem: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  savedItemActive: { borderColor: colors.primary },
  check: { position: 'absolute', top: 6, right: 6 },
  saveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  saveLinkText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
