/**
 * Storage helpers — upload files/images to a Supabase Storage bucket and
 * return their public URLs.
 *
 * The bucket "attachments" must exist in your Supabase project (see
 * supabase/schema.sql for the SQL that creates it).
 */
import { supabase } from './supabase';

export const ATTACHMENTS_BUCKET = 'attachments';

/**
 * Uploads a local file URI (from expo-image-picker / document-picker) to
 * Supabase Storage and returns the public URL.
 */
export async function uploadFile(params: {
  uri: string;
  userId: string;
  fileName?: string;
  contentType?: string;
}): Promise<{ url: string; path: string }> {
  const { uri, userId, fileName, contentType } = params;

  // Read the file into a Blob (works on web + native via fetch).
  const response = await fetch(uri);
  const blob = await response.blob();

  const safeName = (fileName ?? `file-${Date.now()}`).replace(/[^\w.\-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, blob, {
      contentType: contentType ?? blob.type ?? 'application/octet-stream',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
