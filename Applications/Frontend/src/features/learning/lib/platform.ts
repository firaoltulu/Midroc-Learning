/**
 * iPhone and iPad (including iPadOS, which reports itself as a Mac with touch): inline PDF
 * rendering there is slow and cramped, so the viewer also offers opening the file directly.
 */
export function prefersExternalPdf(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** A safe download name from an item title (no path separators or control characters). */
export function pdfFileName(title: string): string {
  const base = title
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return `${base || 'document'}.pdf`;
}
