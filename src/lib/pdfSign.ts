/**
 * Web-only helpers for stamping a drawn signature onto an existing PDF
 * attachment (supervisor "sign PDF" flow, see app/sign-pdf.tsx).
 *
 * Split in two, mirroring src/lib/webpdf.ts's separation of concerns:
 *  - renderPdfPage(): rasterize one page (pdfjs-dist) for the drag-to-place
 *    preview.
 *  - stampSignatureOnPdf(): embed the signature PNG into the real PDF bytes
 *    at chosen coordinates (pdf-lib) — the output is a genuinely edited PDF,
 *    not a screenshot.
 *
 * Both are dynamically imported by the caller so pdfjs-dist/pdf-lib never
 * ship to the native bundle.
 */
import { computeViewBox } from '@/components/SignatureView';

export interface RenderedPdfPage {
  dataUrl: string;
  pageCount: number;
  pageWidthPt: number;
  pageHeightPt: number;
  /** Pixel width/height of the rendered canvas — needed to scale drag coords back to PDF points. */
  canvasWidth: number;
  canvasHeight: number;
}

// pdfjs-dist's worker must be served as a static file (Metro can't resolve
// its usual `new URL(..., import.meta.url)` worker loading) — see
// public/pdf.worker.min.js, copied in from node_modules at v6.1.200.
async function getPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  return pdfjs;
}

/** Render one page of a remote PDF to a data URL for the placement preview. */
export async function renderPdfPage(
  url: string,
  pageIndex: number,
  targetWidthPx = 1000
): Promise<RenderedPdfPage> {
  const pdfjs = await getPdfjs();
  const res = await fetch(url);
  const bytes = await res.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pageCount = doc.numPages;
  const clampedIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const page = await doc.getPage(clampedIndex + 1); // pdfjs pages are 1-indexed

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidthPx / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  await page.render({ canvasContext: ctx, viewport }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    pageCount,
    pageWidthPt: baseViewport.width,
    pageHeightPt: baseViewport.height,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  };
}

/** Rasterize signature stroke paths (SVG path strings) to a transparent PNG. */
export function rasterizeSignature(
  paths: string[],
  widthPx: number,
  heightPx: number
): string {
  const canvas = document.createElement('canvas');
  const dpr = 2; // draw at 2x for a crisper stamp
  canvas.width = widthPx * dpr;
  canvas.height = heightPx * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const viewBox = computeViewBox(paths).split(' ').map(Number);
  const [minX, minY, vbW, vbH] = viewBox;
  const scale = Math.min((widthPx * dpr) / vbW, (heightPx * dpr) / vbH);
  const offsetX = ((widthPx * dpr) - vbW * scale) / 2;
  const offsetY = ((heightPx * dpr) - vbH * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 2.5 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of paths) {
    ctx.stroke(new Path2D(d));
  }
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface StampOptions {
  pdfBytes: ArrayBuffer;
  pageIndex: number;
  signaturePngDataUrl: string;
  /** Signature box in on-screen canvas pixels (top-left origin, y-down). */
  box: { x: number; y: number; w: number; h: number; angleDeg: number };
  /** The same canvas pixel size renderPdfPage() rendered the page at. */
  canvasWidth: number;
  pageWidthPt: number;
  pageHeightPt: number;
}

/** Embed the signature PNG into the PDF at the chosen page/position, return new bytes. */
export async function stampSignatureOnPdf(opts: StampOptions): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  const { pdfBytes, pageIndex, signaturePngDataUrl, box, canvasWidth, pageWidthPt, pageHeightPt } =
    opts;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[Math.max(0, Math.min(pageIndex, pages.length - 1))];
  const png = await pdfDoc.embedPng(dataUrlToBytes(signaturePngDataUrl));

  // Screen canvas pixels -> PDF points (uniform scale; canvas was rendered
  // preserving the page's aspect ratio, so one factor covers both axes).
  const scale = pageWidthPt / canvasWidth;
  const widthPt = box.w * scale;
  const heightPt = box.h * scale;

  // Screen rotation is CSS `rotate(Ndeg)` around the box's CENTER, clockwise,
  // in a y-down space. pdf-lib rotates counter-clockwise, in a y-up space,
  // around the (x, y) it's given (the unrotated rect's bottom-left corner) —
  // NOT the center. Convert: find where that corner must be so the rotated
  // rect's center lands on our target center point.
  const centerXPt = (box.x + box.w / 2) * scale;
  const centerYPt = pageHeightPt - (box.y + box.h / 2) * scale; // flip to PDF's y-up origin

  // A clockwise rotation in a y-down screen is visually equivalent to the
  // same-signed counter-clockwise rotation in a y-up PDF page once the y
  // flip above is applied, so the angle is reused as-is.
  const angleRad = (box.angleDeg * Math.PI) / 180;
  const halfW = widthPt / 2;
  const halfH = heightPt / 2;
  const rotatedHalfX = halfW * Math.cos(angleRad) - halfH * Math.sin(angleRad);
  const rotatedHalfY = halfW * Math.sin(angleRad) + halfH * Math.cos(angleRad);

  const x = centerXPt - rotatedHalfX;
  const y = centerYPt - rotatedHalfY;

  page.drawImage(png, {
    x,
    y,
    width: widthPt,
    height: heightPt,
    rotate: degrees(box.angleDeg),
  });

  return pdfDoc.save();
}
