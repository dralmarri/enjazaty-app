/**
 * Compose a circular: write it once, attach the original file if there is one,
 * and send it to everyone below you in the chain or to selected people.
 *
 * `?source=<id>` re-broadcasts a circular the user received, keeping a link to
 * the original one.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Avatar, Button, Card, Header, Input, Screen, SectionTitle } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getCircular, listSupervisedUsers, sendCircular } from '@/lib/api';
import { UploadSizeError, uploadFile } from '@/lib/storage';
import type { CircularKind, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

type Mode = 'all' | 'select';

/**
 * On web the picker sometimes hands back the blob id instead of a file name,
 * which then shows as a long meaningless string. Fall back to a readable name
 * built from the file's type in that case.
 */
const BLOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
function readableName(name: string | undefined, mimeType: string | undefined, fallback: string) {
  if (name && name.includes('.') && !BLOB_ID.test(name)) return name;
  const ext = mimeType?.split('/')[1]?.split('+')[0];
  return ext ? `${fallback}.${ext}` : fallback;
}

export default function NewCircularScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const [kind, setKind] = useState<CircularKind>('circular');
  const [title, setTitle] = useState('');
  const [number, setNumber] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);

  const [team, setTeam] = useState<UserProfile[]>([]);
  const [mode, setMode] = useState<Mode>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setTeam(await listSupervisedUsers(profile.id));
    } catch {
      // ignore
    }
    // Re-broadcast: start from the circular the user received.
    if (source) {
      const original = await getCircular(source);
      if (original) {
        setKind(original.kind);
        setTitle(original.title);
        setNumber(original.number ?? '');
        setBody(original.body ?? '');
      }
    }
  }, [profile, source]);

  useEffect(() => {
    load();
  }, [load]);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setFile({
        uri: asset.uri,
        name: readableName(asset.name, asset.mimeType, t('circularFile')),
        mimeType: asset.mimeType,
      });
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const onSend = async () => {
    setError(null);
    if (!profile || !title.trim()) {
      setError(t('required'));
      return;
    }
    const recipients = mode === 'all' ? team.map((u) => u.id) : selected;
    if (recipients.length === 0) {
      setError(t('noRecipients'));
      return;
    }

    setBusy(true);
    try {
      let fileUrl: string | null = null;
      if (file) {
        const uploaded = await uploadFile({
          uri: file.uri,
          userId: profile.id,
          fileName: file.name,
          contentType: file.mimeType,
        });
        fileUrl = uploaded.url;
      }

      await sendCircular({
        sender_id: profile.id,
        kind,
        title: title.trim(),
        number: number.trim() || null,
        body: body.trim() || null,
        file_url: fileUrl,
        file_name: file?.name ?? null,
        source_id: source ?? null,
        recipient_ids: recipients,
        notification_title: t('circulars'),
      });
      router.back();
    } catch (e: any) {
      setError(e instanceof UploadSizeError ? e.message : e?.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={source ? t('rebroadcast') : t('newCircular')} showBack />

      {/* What kind of document this is — a label for the archive, nothing more */}
      <SectionTitle title={t('documentKind')} />
      <View style={styles.tabsRow}>
        {(['circular', 'letter', 'announcement'] as CircularKind[]).map((k) => {
          const active = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(k === 'circular' ? 'kindCircular' : k === 'letter' ? 'kindLetter' : 'kindAnnouncement')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input label={t('circularTitle')} value={title} onChangeText={setTitle} />
      <Input label={t('circularNumber')} value={number} onChangeText={setNumber} />
      <Input label={t('circularBody')} value={body} onChangeText={setBody} multiline />

      {/* The original circular file (PDF / image) */}
      <Pressable style={styles.fileRow} onPress={pickFile}>
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.iconBox}>
            <Ionicons name="document-attach-outline" size={22} color={colors.primaryDark} />
          </View>
          <Text style={styles.fileLabel} numberOfLines={1}>
            {file?.name ?? t('circularFile')}
          </Text>
          {file ? (
            <Pressable onPress={() => setFile(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.mutedText} />
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      {/* Who receives it */}
      <SectionTitle title={t('recipients')} />
      <View style={styles.tabsRow}>
        {(['all', 'select'] as Mode[]).map((key) => {
          const active = mode === key;
          return (
            <Pressable
              key={key}
              onPress={() => setMode(key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(key === 'all' ? 'allSubordinates' : 'selectRecipients')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'all' ? (
        <Text style={styles.hint}>
          {t('allSubordinates')}: {team.length}
        </Text>
      ) : (
        team.map((u) => {
          const on = selected.includes(u.id);
          return (
            <Card key={u.id} style={styles.card} onPress={() => toggle(u.id)}>
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={u.full_name} uri={u.avatar_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.full_name}</Text>
                  <Text style={styles.sub}>{u.user_code}</Text>
                </View>
                <Ionicons
                  name={on ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={on ? colors.success : colors.mutedText}
                />
              </View>
            </Card>
          );
        })
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={busy ? t('saving') : t('sendCircular')}
        onPress={onSend}
        loading={busy}
        icon="send"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  fileRow: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fileLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textDark },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  chipTextActive: { color: colors.onPrimary },
  hint: { fontSize: 13, color: colors.mutedText, marginBottom: spacing.sm },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
});
