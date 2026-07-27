/**
 * Storage helpers — upload files/images to a Supabase Storage bucket and
 * return their public URLs.
 *
 * The bucket "attachments" must exist in your Supabase project (see
 * supabase/schema.sql for the SQL that creates it).
 */
import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import type { TranslationKey } from '@/i18n/translations';

export const ATTACHMENTS_BUCKET = 'attachments';

// Photos are auto-compressed before upload: capped to this many pixels on
// the longest side and re-encoded as JPEG at this quality. Visually
// lossless for documentation photos, typically 60-80% smaller.
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.85;

// Hard caps enforced after compression, so a still-too-big file is rejected
// instead of silently costing storage/transfer.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Thrown when an upload is rejected for being too large. `key` is a
 * TranslationKey so callers can show a localized message via `t(e.key)`.
 */
export class UploadSizeError extends Error {
  key: TranslationKey;
  constructor(key: TranslationKey) {
    super(key);
    this.key = key;
  }
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Resizes + re-encodes a photo to shrink its file size before upload.
 * Falls back to the original URI if anything goes wrong.
 */
async function compressImage(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageSize(uri);
    const longestSide = Math.max(width, height);
    const actions: ImageManipulator.Action[] =
      longestSide > MAX_IMAGE_DIMENSION
        ? [
            width >= height
              ? { resize: { width: MAX_IMAGE_DIMENSION } }
              : { resize: { height: MAX_IMAGE_DIMENSION } },
          ]
        : [];
    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * Re-saves a PDF's internal object table more compactly (pdf-lib's
 * `useObjectStreams`) before upload — a lossless structural re-pack, not a
 * re-render, so page content/quality never changes. Falls back to the
 * original bytes if anything goes wrong or the result isn't actually smaller.
 * pdf-lib is loaded dynamically so it never ships in the native bundle for
 * users who don't upload PDFs.
 */
async function compressPdf(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(bytes, {
      updateMetadata: false,
      ignoreEncryption: true,
    });
    const saved = await pdfDoc.save({ useObjectStreams: true });
    return saved.byteLength < bytes.byteLength ? saved : bytes;
  } catch {
    return bytes;
  }
}

/**
 * Uploads a local file URI (from expo-image-picker / document-picker) to
 * Supabase Storage and returns the public URL. Photos and PDFs are both
 * compressed automatically first; other file types (video/other documents)
 * are untouched.
 */
export async function uploadFile(params: {
  uri: string;
  userId: string;
  fileName?: string;
  contentType?: string;
}): Promise<{ url: string; path: string }> {
  const { uri, userId, fileName, contentType } = params;

  // GIFs are skipped so animation isn't destroyed by a JPEG conversion.
  const isCompressiblePhoto =
    !!contentType?.startsWith('image/') && contentType !== 'image/gif';
  const isPdf = contentType === 'application/pdf';

  const sourceUri = isCompressiblePhoto ? await compressImage(uri) : uri;
  const finalContentType = isCompressiblePhoto ? 'image/jpeg' : contentType;
  const finalFileName =
    isCompressiblePhoto && fileName
      ? fileName.replace(/\.[^.]+$/, '') + '.jpg'
      : fileName;

  // Read the file (works on web + native via fetch). PDFs are read as bytes
  // so pdf-lib can re-pack them; everything else stays a Blob.
  const response = await fetch(sourceUri);
  let body: Blob | Uint8Array;
  let size: number;
  if (isPdf) {
    body = await compressPdf(new Uint8Array(await response.arrayBuffer()));
    size = body.byteLength;
  } else {
    body = await response.blob();
    size = body.size;
  }

  if (isCompressiblePhoto && size > MAX_IMAGE_BYTES) {
    throw new UploadSizeError('imageTooLarge');
  }
  if (isPdf && size > MAX_PDF_BYTES) {
    throw new UploadSizeError('pdfTooLarge');
  }

  const safeName = (finalFileName ?? `file-${Date.now()}`).replace(/[^\w.\-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, body, {
      contentType: finalContentType ?? (body instanceof Blob ? body.type : undefined) ?? 'application/octet-stream',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * Best-effort delete of a previously-uploaded object, given its public URL
 * (e.g. an attachment being replaced by a signed copy). Never throws — the
 * old object is a minor storage-cleanup nicety, not something worth failing
 * the caller's flow over.
 */
export async function deleteStorageObject(url: string): Promise<void> {
  try {
    const marker = `/object/public/${ATTACHMENTS_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
  } catch {
    // ignore
  }
}
