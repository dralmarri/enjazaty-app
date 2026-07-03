/**
 * Sign & approve a document (image) — iOS Markup-style.
 * Pick a saved signature (or draw a new one), then place it on the image:
 * drag to move, drag the corner handle to resize, the top handle to rotate.
 * "Approve" flattens the image + signature (react-native-view-shot), uploads it
 * as a new attachment, and marks the achievement approved.
 *
 * Route params: ?image=<url>&achievement=<id>
 *
 * Note: PDF signing is not yet supported — images only for now.
 */
import React, { useMemo, useReducer, useRef, useState } from 'react';
import { Image, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import {
  Button,
  Card,
  Header,
  Screen,
  SignatureChooser,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createAttachment,
  createNotification,
  getAchievement,
  updateAchievementStatus,
} from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import { colors, radius, spacing } from '@/theme/colors';

export default function SignScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ image?: string; achievement?: string }>();
  const imageUrl = params.image ? decodeURIComponent(params.image) : '';
  const achievementId = params.achievement ?? '';

  const [step, setStep] = useState<'choose' | 'place'>('choose');
  const [paths, setPaths] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<View>(null);

  // Transform state (kept in a ref; force re-render on change).
  const box = useRef({ x: 40, y: 40, w: 160, angle: 0 });
  const startRef = useRef({ ...box.current });
  const [, force] = useReducer((c: number) => c + 1, 0);

  const bodyPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { ...box.current };
        },
        onPanResponderMove: (_e, g) => {
          box.current = {
            ...box.current,
            x: startRef.current.x + g.dx,
            y: startRef.current.y + g.dy,
          };
          force();
        },
      }),
    []
  );

  const resizePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { ...box.current };
        },
        onPanResponderMove: (_e, g) => {
          box.current = {
            ...box.current,
            w: Math.max(60, Math.min(360, startRef.current.w + g.dx)),
          };
          force();
        },
      }),
    []
  );

  const rotatePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = { ...box.current };
        },
        onPanResponderMove: (_e, g) => {
          box.current = { ...box.current, angle: startRef.current.angle + g.dx };
          force();
        },
      }),
    []
  );

  const onApprove = () => {
    if (!profile || !achievementId) return;
    setError(null);
    setBusy(true);
    // Hide handles before capturing the flattened image.
    setCapturing(true);
    setTimeout(async () => {
      try {
        const uri = await captureRef(canvasRef, { format: 'jpg', quality: 0.9 });
        const uploaded = await uploadFile({
          uri,
          userId: profile.id,
          fileName: `signed-${Date.now()}.jpg`,
          contentType: 'image/jpeg',
        });
        const ach = await getAchievement(achievementId);
        await createAttachment({
          achievement_id: achievementId,
          type: 'image',
          url: uploaded.url,
          name: t('signedDocument'),
          owner_id: ach?.owner_id ?? profile.id,
        });
        await updateAchievementStatus(achievementId, 'approved');
        if (ach && ach.owner_id !== profile.id) {
          await createNotification({
            user_id: ach.owner_id,
            title: t('approveDocument'),
            body: ach.title,
            type: 'evaluation',
            related_id: achievementId,
          });
        }
        router.back();
      } catch (e: any) {
        setError(e?.message ?? t('error'));
        setCapturing(false);
        setBusy(false);
      }
    }, 80);
  };

  const b = box.current;
  const h = b.w * 0.5;

  return (
    <Screen scroll={step === 'choose'}>
      <Header
        title={t('signDocument')}
        showBack
        subtitle={step === 'place' ? t('dragToPlace') : undefined}
      />

      {step === 'choose' ? (
        <>
          <Card>
            <SignatureChooser onChange={setPaths} />
          </Card>
          <Text style={styles.note}>{t('pdfSignNote')}</Text>
          <Button
            title={t('continue')}
            icon="arrow-forward"
            onPress={() => setStep('place')}
            disabled={paths.length === 0}
            style={{ marginTop: spacing.lg }}
          />
        </>
      ) : (
        <>
          {/* The captured canvas: image + signature overlay */}
          <View
            ref={canvasRef}
            collapsable={false}
            style={[
              styles.canvas,
              Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : null,
            ]}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            ) : null}

            {/* Signature overlay (transformable) */}
            <View
              style={[
                styles.sigBox,
                {
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: h,
                  transform: [{ rotate: `${b.angle}deg` }],
                  borderWidth: capturing ? 0 : 1.5,
                },
              ]}
              {...bodyPan.panHandlers}
            >
              <SignatureView value={JSON.stringify(paths)} height={h} />

              {!capturing ? (
                <>
                  {/* Rotate handle (top) */}
                  <View style={[styles.handle, styles.rotateHandle]} {...rotatePan.panHandlers}>
                    <Ionicons name="sync-outline" size={14} color={colors.onPrimary} />
                  </View>
                  {/* Resize handle (bottom-right) */}
                  <View style={[styles.handle, styles.resizeHandle]} {...resizePan.panHandlers}>
                    <Ionicons name="resize-outline" size={14} color={colors.onPrimary} />
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Button
              title={t('drawNew')}
              variant="outline"
              icon="arrow-back"
              onPress={() => setStep('choose')}
              fullWidth={false}
              style={styles.actionBtn}
            />
            <Button
              title={busy ? t('saving_doc') : t('approve')}
              icon="checkmark-done-outline"
              onPress={onApprove}
              loading={busy}
              fullWidth={false}
              style={styles.actionBtn}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, color: colors.mutedText, textAlign: 'center', marginTop: spacing.md },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  canvas: {
    height: 420,
    backgroundColor: colors.softBackground,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  image: { width: '100%', height: '100%' },
  sigBox: {
    position: 'absolute',
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  handle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotateHandle: { top: -13, alignSelf: 'center', left: '50%', marginLeft: -13 },
  resizeHandle: { bottom: -13, right: -13 },
  actions: { gap: spacing.md },
  actionBtn: { flex: 1 },
});
