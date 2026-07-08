/**
 * Sign & approve a PDF attachment — same drag/resize/rotate placement UX as
 * app/sign.tsx (images), but the background is a rendered page of the PDF
 * and "Approve" stamps the signature into the real PDF bytes (pdf-lib)
 * instead of flattening a screenshot.
 *
 * Route params: ?attachment=<id>&achievement=<id>
 *
 * Web only for now — no PDF rasterization/stamping library is wired up for
 * native (iOS/Android) yet; see plan notes for the native follow-up.
 */
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Header,
  Loading,
  Screen,
  SignatureChooser,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createNotification,
  getAchievement,
  updateAchievementStatus,
  updateAttachment,
} from '@/lib/api';
import { deleteStorageObject, uploadFile } from '@/lib/storage';
import { colors, radius, spacing } from '@/theme/colors';

export default function SignPdfScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const params = useLocalSearchParams<{ attachment?: string; achievement?: string }>();
  const attachmentId = params.attachment ?? '';
  const achievementId = params.achievement ?? '';

  const [step, setStep] = useState<'choose' | 'place'>('choose');
  const [paths, setPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingPage, setLoadingPage] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [pageDims, setPageDims] = useState({ widthPt: 612, heightPt: 792 });
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // Transform state (kept in a ref; force re-render on change) — same shape
  // and PanResponder logic as app/sign.tsx.
  const box = useRef({ x: 40, y: 40, w: 160, angle: 0 });
  const startRef = useRef({ ...box.current });
  const [, force] = useReducer((c: number) => c + 1, 0);

  const canvasRef = useRef<View>(null);
  const canvasW = 340;
  const canvasH = useMemo(
    () => Math.round((canvasW * pageDims.heightPt) / pageDims.widthPt),
    [pageDims]
  );

  // Load the achievement to get the attachment's URL (listAttachments isn't
  // scoped by id, so pull it from the achievement's own attachment list via
  // the achievement detail screen's already-known URL passed as ?attachment
  // is just the id — fetch the page straight from Supabase via the id).
  useEffect(() => {
    (async () => {
      if (!attachmentId) return;
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('attachments')
        .select('url')
        .eq('id', attachmentId)
        .single();
      if (data?.url) setAttachmentUrl(data.url);
    })();
  }, [attachmentId]);

  const loadPage = async (index: number) => {
    if (!attachmentUrl) return;
    setLoadingPage(true);
    setError(null);
    try {
      const { renderPdfPage } = await import('@/lib/pdfSign');
      const rendered = await renderPdfPage(attachmentUrl, index, canvasW * 2);
      setPageIndex(index);
      setPageCount(rendered.pageCount);
      setPageImage(rendered.dataUrl);
      setPageDims({
        widthPt: rendered.pageWidthPt,
        heightPt: rendered.pageHeightPt,
      });
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    if (step === 'place' && attachmentUrl && !pageImage) {
      loadPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, attachmentUrl]);

  const bodyPan = useMemo(
    () =>
      PanResponder.create({
        // No capture handlers here: the resize/rotate handles are children of
        // this same box, and a capturing parent would claim every touch in
        // the capture phase (top-down) before a child handle ever gets asked
        // in the bubble phase — silently turning every resize/rotate drag
        // into a plain move. Bubble-only lets the actual touch target (a
        // handle, or the body) claim the responder first.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
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

  const onApprove = async () => {
    if (!profile || !achievementId || !attachmentId || !attachmentUrl) return;
    setError(null);
    setBusy(true);
    try {
      const { rasterizeSignature, stampSignatureOnPdf } = await import('@/lib/pdfSign');
      const b = box.current;
      const h = b.w * 0.5;
      const signaturePng = rasterizeSignature(paths, b.w, h);

      const res = await fetch(attachmentUrl);
      const pdfBytes = await res.arrayBuffer();

      const stamped = await stampSignatureOnPdf({
        pdfBytes,
        pageIndex,
        signaturePngDataUrl: signaturePng,
        box: { x: b.x, y: b.y, w: b.w, h, angleDeg: b.angle },
        // NOT pageDims.canvasW (the hidden 2x-resolution raster used only for
        // a crisper preview render) — box.x/y/w live in the on-screen box's
        // own coordinate space (canvasW), which is what must scale to points.
        canvasWidth: canvasW,
        pageWidthPt: pageDims.widthPt,
        pageHeightPt: pageDims.heightPt,
      });

      // Upload the signed PDF under the signer's own storage folder (storage
      // RLS keys off the uploader's id, same convention already used when
      // adding an attachment on behalf of someone else).
      const blob = new Blob([stamped], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      let uploaded: { url: string; path: string };
      try {
        uploaded = await uploadFile({
          uri: blobUrl,
          userId: profile.id,
          fileName: `signed-${Date.now()}.pdf`,
          contentType: 'application/pdf',
        });
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      await updateAttachment(attachmentId, { url: uploaded.url, size: stamped.byteLength });
      await deleteStorageObject(attachmentUrl);

      const ach = await getAchievement(achievementId);
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
    } finally {
      setBusy(false);
    }
  };

  const b = box.current;
  const h = b.w * 0.5;

  if (!attachmentUrl) return <Loading />;

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
          {pageCount > 1 ? (
            <View style={[styles.pager, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Button
                title=""
                icon={isRTL ? 'chevron-forward' : 'chevron-back'}
                variant="outline"
                onPress={() => pageIndex > 0 && loadPage(pageIndex - 1)}
                disabled={pageIndex === 0 || loadingPage}
                fullWidth={false}
                style={styles.pagerBtn}
              />
              <Text style={styles.pagerText}>
                {t('pageOf').replace('{current}', String(pageIndex + 1)).replace('{total}', String(pageCount))}
              </Text>
              <Button
                title=""
                icon={isRTL ? 'chevron-back' : 'chevron-forward'}
                variant="outline"
                onPress={() => pageIndex < pageCount - 1 && loadPage(pageIndex + 1)}
                disabled={pageIndex === pageCount - 1 || loadingPage}
                fullWidth={false}
                style={styles.pagerBtn}
              />
            </View>
          ) : null}

          <View
            ref={canvasRef}
            collapsable={false}
            style={[
              styles.canvas,
              { width: canvasW, height: canvasH },
              ({ touchAction: 'none' } as any),
            ]}
          >
            {loadingPage || !pageImage ? (
              <Loading />
            ) : (
              <Image source={{ uri: pageImage }} style={styles.image} resizeMode="contain" />
            )}

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
                },
              ]}
              {...bodyPan.panHandlers}
            >
              <SignatureView value={JSON.stringify(paths)} height={h} />

              {/* Rotate handle (top) */}
              <View style={[styles.handle, styles.rotateHandle]} {...rotatePan.panHandlers}>
                <Ionicons name="sync-outline" size={14} color={colors.onPrimary} />
              </View>
              {/* Resize handle (bottom-right) */}
              <View style={[styles.handle, styles.resizeHandle]} {...resizePan.panHandlers}>
                <Ionicons name="resize-outline" size={14} color={colors.onPrimary} />
              </View>
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
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  pager: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  pagerBtn: { paddingHorizontal: spacing.md },
  pagerText: { fontSize: 13, fontWeight: '700', color: colors.textDark },
  canvas: {
    alignSelf: 'center',
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
    borderWidth: 1.5,
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
