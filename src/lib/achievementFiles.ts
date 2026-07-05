/**
 * Achievement FILE actions — print / share / save operate on the achievement's
 * ORIGINAL attached file (its real storage URL), never on an HTML rendering of
 * the app page.
 *
 *  - saveAttachment()  : downloads the original file with its original name +
 *                        extension. Web → real file download; native → the OS
 *                        save/share sheet ("Save to Files", iCloud, Downloads).
 *  - shareAttachment() : shares the original file as a real attachment through
 *                        the device share sheet (WhatsApp/email/Telegram/…).
 *  - printAttachment() : prints the file itself — PDF pages as-is, image as-is;
 *                        Office/other types open in their handler to print,
 *                        since the raw bytes can't be rendered by the printer.
 *
 * A summary-sheet fallback is used ONLY for achievements that have no file at
 * all (pure text achievements).
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import type { Attachment } from '@/types/database';

/** Guard: refuse to act on anything that isn't a real stored file URL. */
export function isRealFileUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) && /\/storage\/v1\/object\//.test(url);
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  xls: 'application/vnd.ms-excel',
  ppt: 'application/vnd.ms-powerpoint',
  pages: 'application/x-iwork-pages-sffpages',
  txt: 'text/plain',
  csv: 'text/csv',
};

function cleanUrl(url: string): string {
  return url.split('?')[0];
}

function extensionOf(att: Attachment): string {
  const src = att.name || cleanUrl(att.url);
  return src.split('.').pop()?.toLowerCase() ?? '';
}

/** Original file name WITH extension. */
export function originalFileName(att: Attachment): string {
  if (att.name && /\.[a-z0-9]+$/i.test(att.name)) return att.name;
  const fromUrl = decodeURIComponent(cleanUrl(att.url).split('/').pop() ?? '');
  if (fromUrl) return att.name ? `${att.name}.${extensionOf(att)}`.replace(/\.$/, '') : fromUrl;
  return att.name || 'file';
}

function mimeOf(att: Attachment): string {
  return att.mime_type || MIME_BY_EXT[extensionOf(att)] || 'application/octet-stream';
}

function isImage(att: Attachment): boolean {
  return att.type === 'image' || mimeOf(att).startsWith('image/');
}
function isPdf(att: Attachment): boolean {
  return extensionOf(att) === 'pdf' || mimeOf(att) === 'application/pdf';
}

/* --------------------------------- Web ---------------------------------- */

async function webBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('download failed');
  return res.blob();
}

function webSaveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName; // original name + extension → real file download
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function webPrint(att: Attachment): Promise<void> {
  const blob = await webBlob(att.url);
  const url = URL.createObjectURL(blob);
  if (isImage(att)) {
    const w = window.open('', '_blank');
    if (!w) {
      webSaveBlob(blob, originalFileName(att));
      return;
    }
    w.document.write(
      `<html><head><title>${originalFileName(att)}</title></head><body style="margin:0">
       <img src="${url}" style="max-width:100%" onload="setTimeout(()=>{window.focus();window.print();},200)" />
       </body></html>`
    );
    w.document.close();
    return;
  }
  // PDF (and anything the browser can render): print via a hidden iframe.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };
  document.body.appendChild(iframe);
}

/* ------------------------------- Native --------------------------------- */

async function nativeDownload(att: Attachment): Promise<string> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  // Keep the original file name so the share/save sheet shows the real file.
  const safe = originalFileName(att).replace(/[^\w.\-؀-ۿ]+/g, '_') || 'file';
  const target = `${dir}${Date.now()}-${safe}`;
  const { uri } = await FileSystem.downloadAsync(cleanUrl(att.url), target);
  return uri;
}

/* ------------------------------- Public --------------------------------- */

/** Save the ORIGINAL file to the device (real download / OS save sheet). */
export async function saveAttachment(att: Attachment): Promise<void> {
  if (!isRealFileUrl(att.url)) throw new Error('NOT_A_FILE');
  if (Platform.OS === 'web') {
    webSaveBlob(await webBlob(att.url), originalFileName(att));
    return;
  }
  const uri = await nativeDownload(att);
  if (await Sharing.isAvailableAsync()) {
    // The iOS/Android sheet offers "Save to Files", iCloud Drive, Downloads…
    await Sharing.shareAsync(uri, {
      mimeType: mimeOf(att),
      dialogTitle: originalFileName(att),
      UTI: isPdf(att) ? 'com.adobe.pdf' : undefined,
    });
  }
}

/** Share the ORIGINAL file as a real attachment through the device sheet. */
export async function shareAttachment(att: Attachment): Promise<void> {
  if (!isRealFileUrl(att.url)) throw new Error('NOT_A_FILE');
  if (Platform.OS === 'web') {
    const blob = await webBlob(att.url);
    const fileName = originalFileName(att);
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    const file =
      typeof File !== 'undefined' ? new File([blob], fileName, { type: mimeOf(att) }) : null;
    if (file && nav?.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: fileName });
    } else {
      webSaveBlob(blob, fileName); // no file-share support → save the real file
    }
    return;
  }
  const uri = await nativeDownload(att);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: mimeOf(att),
      dialogTitle: originalFileName(att),
      UTI: isPdf(att) ? 'com.adobe.pdf' : undefined,
    });
  }
}

/** Print the file itself (PDF/image directly; others open to print). */
export async function printAttachment(att: Attachment): Promise<void> {
  if (!isRealFileUrl(att.url)) throw new Error('NOT_A_FILE');
  if (Platform.OS === 'web') {
    if (isImage(att) || isPdf(att)) {
      await webPrint(att);
    } else {
      // Office/other: the browser can't render raw bytes for printing — hand
      // the real file to the user to open & print in its app.
      await shareAttachment(att);
    }
    return;
  }
  if (isPdf(att) || isImage(att)) {
    const uri = await nativeDownload(att);
    await Print.printAsync({ uri });
  } else {
    // Office/other on native: open the real file so its app can print it.
    await shareAttachment(att);
  }
}
