/**
 * Single-achievement document: build a printable/shareable sheet for ONE
 * achievement (title, description, status, evaluation + drawn signature,
 * image attachments embedded inline, other attachments listed by name) and
 * expose three actions used by the achievement long-press menu everywhere:
 *
 *  - printAchievement()  — system print dialog (expo-print, web + native)
 *  - shareAchievement()  — share the sheet as a PDF via the device sheet
 *  - saveAchievement()   — save a PDF copy on the device (download on web;
 *                          the iOS/Android sheet's "Save to Files" natively)
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getEvaluationByAchievement, listAttachments } from '@/lib/api';
import { computeViewBox, parseSignature } from '@/components/SignatureView';
import { formatDate } from '@/lib/format';
import type { Achievement, Attachment } from '@/types/database';

export interface AchievementDocOptions {
  achievement: Achievement;
  /** Translator from LanguageContext. */
  t: (key: any) => string;
  language: 'ar' | 'en';
  isRTL: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline SVG for a stored signature (any historical format), or ''. */
function signatureSvg(value: string): string {
  const paths = parseSignature(value);
  if (!paths || paths.length === 0) return '';
  const viewBox = computeViewBox(paths);
  const d = paths
    .map(
      (p) =>
        `<path d="${escapeHtml(p)}" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join('');
  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:220px;height:90px;background:#FFF8E6;border:1px solid #F3E2B3;border-radius:10px;">${d}</svg>`;
}

/** Build the sheet's HTML body (fetches attachments + evaluation). */
async function buildBody(opts: AchievementDocOptions): Promise<string> {
  const { achievement: a, t, language, isRTL } = opts;
  const [attachments, evaluation] = await Promise.all([
    listAttachments(a.id).catch(() => [] as Attachment[]),
    getEvaluationByAchievement(a.id).catch(() => null),
  ]);

  const images = attachments.filter((att) => att.type === 'image');
  const files = attachments.filter((att) => att.type !== 'image');

  const statusLabel =
    a.status === 'approved'
      ? t('approved')
      : a.status === 'submitted'
      ? t('submitted')
      : a.status === 'rejected'
      ? t('rejected')
      : t('draft');

  const imagesHtml = images
    .map(
      (img) =>
        `<div class="img-wrap"><img src="${escapeHtml(img.url)}" crossorigin="anonymous" />${
          img.name ? `<div class="img-name">${escapeHtml(img.name)}</div>` : ''
        }</div>`
    )
    .join('');

  const filesHtml = files
    .map(
      (f) =>
        `<li><b>${escapeHtml(f.name ?? f.url)}</b> <span class="muted">(${escapeHtml(
          f.type
        )})</span></li>`
    )
    .join('');

  const evalHtml = evaluation
    ? `
      <div class="section">
        <h3>${t('evaluationReport')}</h3>
        <div class="stars">${'★'.repeat(evaluation.rating)}${'☆'.repeat(5 - evaluation.rating)} <span class="muted">(${evaluation.rating}/5)</span></div>
        ${evaluation.comment ? `<p>${escapeHtml(evaluation.comment)}</p>` : ''}
        ${
          evaluation.signature
            ? `<div><div class="muted" style="margin:8px 0 4px">${t('eSignature')}</div>${signatureSvg(
                evaluation.signature
              )}</div>`
            : ''
        }
        <div class="muted" style="margin-top:6px">${formatDate(evaluation.created_at, language)}</div>
      </div>`
    : '';

  return `
  <style>
    * { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; box-sizing: border-box; }
    .doc { padding: 32px; color: #1F2937; background: #fff; text-align: ${isRTL ? 'right' : 'left'}; }
    .head { border-bottom: 3px solid #F4B000; padding-bottom: 14px; }
    .title { font-size: 22px; font-weight: 800; }
    .muted { color: #6B7280; font-size: 12px; }
    .badge { display: inline-block; background: #FFF8E6; color: #D99A00; border: 1px solid #F3E2B3;
             border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 700; margin-top: 8px; }
    .section { margin-top: 22px; }
    .section h3 { font-size: 15px; color: #D99A00; margin: 0 0 8px; }
    p { font-size: 14px; line-height: 1.7; margin: 6px 0; }
    .img-wrap { margin: 10px 0; }
    .img-wrap img { max-width: 100%; border-radius: 12px; border: 1px solid #F3E2B3; }
    .img-name { font-size: 11px; color: #6B7280; margin-top: 4px; }
    ul { padding-${isRTL ? 'right' : 'left'}: 18px; margin: 6px 0; }
    li { font-size: 13px; margin: 4px 0; }
    .stars { color: #F4B000; font-size: 18px; letter-spacing: 2px; }
    .footer { margin-top: 30px; color: #6B7280; font-size: 11px; text-align: center; }
  </style>
  <div class="doc">
    <div class="head">
      <div class="title">${escapeHtml(a.title)}</div>
      <div class="muted" style="margin-top:6px">${formatDate(a.date ?? a.created_at, language)}</div>
      <div class="badge">${statusLabel}</div>
    </div>
    ${a.description ? `<div class="section"><p>${escapeHtml(a.description)}</p></div>` : ''}
    ${images.length ? `<div class="section"><h3>${t('attachments')}</h3>${imagesHtml}</div>` : ''}
    ${files.length ? `<div class="section">${images.length ? '' : `<h3>${t('attachments')}</h3>`}<ul>${filesHtml}</ul></div>` : ''}
    ${evalHtml}
    <div class="footer">${t('appName')} — ${t('developedBy')}</div>
  </div>`;
}

function fullHtml(body: string, isRTL: boolean): string {
  return `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${
    isRTL ? 'ar' : 'en'
  }"><head><meta charset="utf-8" /></head><body>${body}</body></html>`;
}

function safeFileName(title: string): string {
  return `${title.replace(/[^\w؀-ۿ-]+/g, '-').slice(0, 40) || 'achievement'}.pdf`;
}

/** Open the system print dialog for this achievement's summary sheet. */
export async function printAchievement(opts: AchievementDocOptions): Promise<void> {
  const body = await buildBody(opts);
  if (Platform.OS === 'web') {
    // Print ONLY the sheet in an isolated iframe — never the app page.
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml(body, opts.isRTL));
      doc.close();
      const done = () => setTimeout(() => iframe.remove(), 1000);
      iframe.contentWindow?.addEventListener('afterprint', done);
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 300);
    }
    return;
  }
  await Print.printAsync({ html: fullHtml(body, opts.isRTL) });
}

async function webPdfBlob(opts: AchievementDocOptions): Promise<Blob> {
  const { htmlToPdfBlob } = await import('@/lib/webpdf');
  return htmlToPdfBlob(await buildBody(opts));
}

function webDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Share the achievement as a PDF via the device share sheet. */
export async function shareAchievement(opts: AchievementDocOptions): Promise<void> {
  const fileName = safeFileName(opts.achievement.title);
  if (Platform.OS === 'web') {
    const blob = await webPdfBlob(opts);
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    const file =
      typeof File !== 'undefined' ? new File([blob], fileName, { type: 'application/pdf' }) : null;
    if (file && nav?.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: opts.achievement.title });
    } else {
      webDownload(blob, fileName);
    }
    return;
  }
  const body = await buildBody(opts);
  const { uri } = await Print.printToFileAsync({ html: fullHtml(body, opts.isRTL) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: opts.achievement.title,
    });
  }
}

/** Save a PDF copy of the achievement on the device. */
export async function saveAchievement(opts: AchievementDocOptions): Promise<void> {
  const fileName = safeFileName(opts.achievement.title);
  if (Platform.OS === 'web') {
    webDownload(await webPdfBlob(opts), fileName);
    return;
  }
  // Native: produce the PDF and open the sheet — "Save to Files" stores it.
  const body = await buildBody(opts);
  const { uri } = await Print.printToFileAsync({ html: fullHtml(body, opts.isRTL) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
    });
  }
}
