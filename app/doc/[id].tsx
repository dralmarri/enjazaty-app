/**
 * Embedded document editor — opens an editable attachment (Word/Excel/
 * PowerPoint/…) in a full Office editor (Zoho Office Integrator session
 * created by the doc-session edge function).
 *
 * Native: the editor renders INSIDE the app in a WebView (cookies are
 * first-party there, so editing works).
 * Web: browsers block third-party cookies inside iframes (Zoho error 5022 →
 * read-only editor), so the editor opens in its own tab instead — launched
 * from a button tap so popup blockers allow it.
 *
 * Edits are saved automatically back onto the SAME file in storage via the
 * doc-save callback — no download / re-upload, record & history intact.
 *
 * Route params: [id] = attachment id, ?name = display name.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Button, Header, Screen } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing } from '@/theme/colors';

// react-native-webview has no web implementation — require it natively only.
const NativeWebView =
  Platform.OS === 'web'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-native-webview').WebView;

export default function DocumentEditorScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { t, language } = useLanguage();

  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    setEditorUrl(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('doc-session', {
        body: { attachmentId: id, lang: language },
      });
      if (fnError) throw fnError;
      if (!data?.editorUrl) throw new Error(data?.error ?? t('error'));
      setEditorUrl(data.editorUrl as string);
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    }
  }, [id, language, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Web: must run inside the tap handler so popup blockers allow the tab.
  const openInTab = () => {
    if (editorUrl && typeof window !== 'undefined') {
      window.open(editorUrl, '_blank', 'noopener');
    }
  };

  return (
    <Screen scroll={false}>
      <Header title={name || t('docEditorTitle')} showBack subtitle={t('docEditorHint')} />

      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Button title={t('retry')} icon="refresh" onPress={load} fullWidth={false} />
        </View>
      ) : !editorUrl ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.hint}>{t('docEditorLoading')}</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <View style={styles.center}>
          <View style={styles.readyIcon}>
            <Ionicons name="document-text" size={44} color={colors.primaryDark} />
          </View>
          <Text style={styles.readyTitle}>{t('docEditorReady')}</Text>
          <Text style={styles.hint}>{t('docEditorTabHint')}</Text>
          <Button
            title={t('docEditorOpenTab')}
            icon="open-outline"
            onPress={openInTab}
            fullWidth={false}
            style={styles.openBtn}
          />
        </View>
      ) : (
        <View style={styles.editorBox}>
          <NativeWebView
            source={{ uri: editorUrl }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  hint: { fontSize: 14, color: colors.mutedText, textAlign: 'center', lineHeight: 22 },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
  readyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  readyTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, textAlign: 'center' },
  openBtn: { marginTop: spacing.sm },
  editorBox: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  webview: { flex: 1 },
});
