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

export const ATTACHMENTS_BUCKET = 'attachments';

// Photos are auto-compressed before upload: capped to this many pixels on
// the longest side and re-encoded as JPEG at this quality. Visually
// lossless for documentation photos, typically 60-80% smaller.
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.85;

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
 * Uploads a local file URI (from expo-image-picker / document-picker) to
 * Supabase Storage and returns the public URL. Photos are compressed
 * automatically first; other file types (video/documents) are untouched.
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

  const sourceUri = isCompressiblePhoto ? await compressImage(uri) : uri;
  const finalContentType = isCompressiblePhoto ? 'image/jpeg' : contentType;
  const finalFileName =
    isCompressiblePhoto && fileName
      ? fileName.replace(/\.[^.]+$/, '') + '.jpg'
      : fileName;

  // Read the file into a Blob (works on web + native via fetch).
  const response = await fetch(sourceUri);
  const blob = await response.blob();

  const safeName = (finalFileName ?? `file-${Date.now()}`).replace(/[^\w.\-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, blob, {
      contentType: finalContentType ?? blob.type ?? 'application/octet-stream',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
