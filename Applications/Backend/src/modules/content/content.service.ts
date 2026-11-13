import type { Actor } from '../../core/actor.js';
import { PDFDocument } from 'pdf-lib';
import { db } from '../../core/db/pool.js';
import { NotFound, Unprocessable } from '../../core/http/app-error.js';
import { checkYoutube, extractYoutubeId, type YoutubeMetadata } from '../../integrations/youtube/youtube.js';
import { readPdf, savePdf } from '../../integrations/storage/pdf-storage.js';
import * as repository from './content.repository.js';
import { BadRequest } from '../../core/http/app-error.js';

export async function verifyVideoLink(input: string): Promise<YoutubeMetadata> {
  const youtubeVideoId = extractYoutubeId(input);
  return checkYoutube(youtubeVideoId);
}

export async function uploadPdf(contents: Buffer | undefined) {
  if (!contents) throw new BadRequest('A PDF file is required', 'PDF_REQUIRED');
  if (contents.byteLength > 50 * 1024 * 1024) {
    throw new BadRequest('PDF must be 50 MB or smaller', 'PDF_TOO_LARGE', { maxMegabytes: 50 });
  }
  if (contents.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Unprocessable('The uploaded file is not a PDF', 'PDF_INVALID');
  }
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(contents, { ignoreEncryption: false });
  } catch {
    throw new Unprocessable('The PDF is corrupt or encrypted', 'PDF_INVALID');
  }
  const pageCount = document.getPageCount();
  if (pageCount < 1) throw new Unprocessable('The PDF must contain at least one page', 'PDF_INVALID');
  return { ...(await savePdf(contents)), pageCount };
}

export async function verifyPdfFile(fileKey: string): Promise<{ sizeBytes: number; pageCount: number }> {
  const contents = await readPdf(fileKey);
  if (contents.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Unprocessable('The selected file is not a valid PDF', 'PDF_INVALID');
  }
  try {
    const pdf = await PDFDocument.load(contents, { ignoreEncryption: false });
    const pageCount = pdf.getPageCount();
    if (pageCount < 1) throw new Unprocessable('The selected PDF has no pages', 'PDF_INVALID');
    return { sizeBytes: contents.byteLength, pageCount };
  } catch {
    throw new Unprocessable('The selected PDF is corrupt or encrypted', 'PDF_INVALID');
  }
}

async function authorizedItem(itemId: string, actor: Actor) {
  const item = await repository.itemForPlayback(db, itemId, actor.id);
  if (
    !item ||
    (item.ownerId !== actor.id &&
      actor.role !== 'admin' &&
      !(item.status === 'published' && item.enrolled))
  ) {
    throw new NotFound('Item not found');
  }
  return item;
}

export async function getVideoForPlayback(itemId: string, actor: Actor): Promise<string> {
  const item = await authorizedItem(itemId, actor);
  if (item.type !== 'video' || !item.youtubeVideoId) throw new NotFound('Video not found');
  return item.youtubeVideoId;
}

export async function getPdfKey(itemId: string, actor: Actor): Promise<string> {
  const item = await authorizedItem(itemId, actor);
  if (item.type !== 'pdf' || !item.fileKey) throw new NotFound('PDF not found');
  return item.fileKey;
}

export async function listReferencedPdfKeys(): Promise<string[]> {
  return repository.referencedPdfKeys(db);
}
