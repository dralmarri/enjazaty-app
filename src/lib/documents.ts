/**
 * In-app document editing helpers.
 *
 * Editable Office documents (Word/Excel/PowerPoint/OpenDocument/CSV/TXT)
 * open in the embedded editor (app/doc/[id]); everything else keeps the
 * platform open/download behavior. Legacy binary formats (.doc/.xls/.ppt)
 * and Apple .pages are NOT editable in any web editor and fall back too.
 */

const EDITABLE_EXTENSIONS = new Set([
  'docx',
  'odt',
  'rtf',
  'txt',
  'xlsx',
  'ods',
  'csv',
  'pptx',
  'odp',
]);

export function attachmentExtension(att: { name?: string | null; url: string }): string {
  const source = att.name || att.url;
  return source.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
}

/** True when this attachment can be edited in the embedded document editor. */
export function isEditableDocument(att: {
  type: string;
  name?: string | null;
  url: string;
}): boolean {
  return att.type === 'file' && EDITABLE_EXTENSIONS.has(attachmentExtension(att));
}
