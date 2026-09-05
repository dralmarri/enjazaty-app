/**
 * Maintenance/custody request → official letter: renders the request as a
 * ready-to-print correspondence addressed to the technology department, with
 * the requester's name on the right and the approving supervisor's name +
 * drawn signature on the left once he signs it off.
 *
 * Mirrors the print/share/save pattern in achievementDoc.ts.
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { computeViewBox, parseSignature } from '@/components/SignatureView';
import { formatDate } from '@/lib/format';
import type { MaintenanceRequest, UserProfile } from '@/types/database';

export interface MaintenanceDocOptions {
  request: MaintenanceRequest;
  requester: UserProfile;
  approver: UserProfile | null;
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
  return `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:200px;height:80px;">${d}</svg>`;
}

function buildBody(opts: MaintenanceDocOptions): string {
  const { request: r, requester, approver, t, language, isRTL } = opts;
  const subject = r.kind === 'maintenance' ? t('maintenanceSubject') : t('custodySubject');
  const statusLabel =
    r.status === 'approved' ? t('approved') : r.status === 'rejected' ? t('rejected') : t('pending');

  return `
  <style>
    * { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; box-sizing: border-box; }
    .doc { padding: 40px; color: #1F2937; background: #fff; text-align: ${isRTL ? 'right' : 'left'}; direction: ${isRTL ? 'rtl' : 'ltr'}; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F4B000; padding-bottom: 12px; }
    .brand { font-size: 18px; font-weight: 800; color: #D99A00; }
    .date { font-size: 13px; color: #6B7280; }
    .badge { display: inline-block; background: #FFF8E6; color: #D99A00; border: 1px solid #F3E2B3;
             border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 700; margin-top: 10px; }
    .to-line { margin-top: 34px; font-size: 15px; font-weight: 700; }
    .after { margin-top: 22px; margin-${isRTL ? 'left' : 'right'}: 40px; font-size: 14px; }
    .subject { text-align: center; margin-top: 18px; font-size: 15px; font-weight: 800; text-decoration: underline; }
    .content { margin-top: 20px; font-size: 14px; line-height: 2; white-space: pre-wrap; }
    .thanks { margin-top: 26px; font-size: 14px; font-weight: 700; }
    .sign-row { display: flex; justify-content: space-between; margin-top: 60px; }
    .sign-col { width: 45%; text-align: center; }
    .sign-label { font-size: 12px; color: #6B7280; margin-bottom: 6px; }
    .sign-name { font-size: 14px; font-weight: 800; }
    .sign-box { height: 80px; display: flex; align-items: center; justify-content: center; margin: 8px 0; }
    .placeholder { font-size: 12px; color: #9CA3AF; border: 1px dashed #F3E2B3; border-radius: 10px; padding: 10px; }
    .footer { margin-top: 40px; color: #6B7280; font-size: 11px; text-align: center; }
  </style>
  <div class="doc">
    <div class="letterhead">
      <div>
        <div class="brand">${t('appName')}</div>
        <div class="badge">${statusLabel}</div>
      </div>
      <div class="date">${formatDate(r.created_at, language)}</div>
    </div>

    <div class="to-line">${t('headOfTechAddress')}</div>
    <div class="after">${t('afterGreeting')}</div>

    <div class="subject">${t('subjectLabel')}: ${subject}${r.request_type ? ` — ${escapeHtml(r.request_type)}` : ''}</div>

    <div class="content">${escapeHtml(r.body)}</div>

    <div class="thanks">${t('thanksClosing')}</div>

    <div class="sign-row">
      <div class="sign-col">
        <div class="sign-label">${t('requestedBy')}</div>
        <div class="sign-name">${escapeHtml(requester.full_name)}</div>
      </div>
      <div class="sign-col">
        <div class="sign-label">${t('approvedBy')}</div>
        <div class="sign-box">
          ${
            r.status === 'approved' && r.signature
              ? signatureSvg(r.signature)
              : `<span class="placeholder">${t('awaitingSignature')}</span>`
          }
        </div>
        <div class="sign-name">${approver ? escapeHtml(approver.full_name) : ''}</div>
      </div>
    </div>

    <div class="footer">${t('appName')} — ${t('developedBy')}</div>
  </div>`;
}

function fullHtml(body: string, isRTL: boolean): string {
  return `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${
    isRTL ? 'ar' : 'en'
  }"><head><meta charset="utf-8" /></head><body>${body}</body></html>`;
}

function safeFileName(subject: string): string {
  return `${subject.replace(/[^\w؀-ۿ-]+/g, '-').slice(0, 40) || 'request'}.pdf`;
}

export async function printMaintenanceRequest(opts: MaintenanceDocOptions): Promise<void> {
  const body = buildBody(opts);
  if (Platform.OS === 'web') {
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

async function webPdfBlob(opts: MaintenanceDocOptions): Promise<Blob> {
  const { htmlToPdfBlob } = await import('@/lib/webpdf');
  return htmlToPdfBlob(buildBody(opts));
}

function webDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareMaintenanceRequest(opts: MaintenanceDocOptions): Promise<void> {
  const fileName = safeFileName(opts.request.request_type);
  if (Platform.OS === 'web') {
    const blob = await webPdfBlob(opts);
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    const file =
      typeof File !== 'undefined' ? new File([blob], fileName, { type: 'application/pdf' }) : null;
    if (file && nav?.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: fileName });
    } else {
      webDownload(blob, fileName);
    }
    return;
  }
  const body = buildBody(opts);
  const { uri } = await Print.printToFileAsync({ html: fullHtml(body, opts.isRTL) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName });
  }
}

export async function saveMaintenanceRequest(opts: MaintenanceDocOptions): Promise<void> {
  const fileName = safeFileName(opts.request.request_type);
  if (Platform.OS === 'web') {
    webDownload(await webPdfBlob(opts), fileName);
    return;
  }
  const body = buildBody(opts);
  const { uri } = await Print.printToFileAsync({ html: fullHtml(body, opts.isRTL) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName });
  }
}
