/**
 * Embedded document editor — opens an editable attachment (Word/Excel/
 * PowerPoint/…) in a full Office editor INSIDE the app (Zoho Office
 * Integrator session created by the doc-session edge function).
 *
 * Edits are saved automatically back onto the SAME file in storage via the
 * doc-save callback — no download / re-upload, record & history intact.
 *
 * Route params: [id] = attachment id, ?name = display name.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
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
      ) : (
        <View style={styles.editorBox}>
          {Platform.OS === 'web' ? (
            // Absolute fill so the iframe can never collapse to zero height
            // inside the flex chain.
            React.createElement('iframe' as any, {
              src: editorUrl,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              },
              allow: 'clipboard-read; clipboard-write; fullscreen',
            })
          ) : (
            <NativeWebView
              source={{ uri: editorUrl }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )}
            />
          )}
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
  hint: { fontSize: 14, color: colors.mutedText, textAlign: 'center' },
  error: { fontSize: 14, color: colors.danger, textAlign: 'center' },
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
