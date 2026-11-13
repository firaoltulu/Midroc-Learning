/** The backend's upload limit (PDF_TOO_LARGE above it). */
export const PDF_MAX_MEGABYTES = 50;
export const PDF_MAX_BYTES = PDF_MAX_MEGABYTES * 1024 * 1024;

/** What's wrong with a chosen file before uploading it, or null. */
export function checkPdfFile(file: Pick<File, 'name' | 'type' | 'size'>): 'type' | 'size' | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'type';
  if (file.size > PDF_MAX_BYTES) return 'size';
  return null;
}

/** "2.4 MB" style size for the file summary. */
export function megabytes(bytes: number): number {
  return Math.max(0.1, Math.round((bytes / (1024 * 1024)) * 10) / 10);
}
