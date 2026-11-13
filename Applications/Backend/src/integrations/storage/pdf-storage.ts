import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../core/config.js';
import { BadRequest, NotFound } from '../../core/http/app-error.js';

const keyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i;

function resolveKey(fileKey: string): string {
  if (!keyPattern.test(fileKey)) throw new BadRequest('Invalid PDF file key');
  return path.join(config.PDF_ROOT, fileKey);
}

export async function savePdf(contents: Buffer): Promise<{ fileKey: string; sizeBytes: number }> {
  await mkdir(config.PDF_ROOT, { recursive: true });
  const fileKey = `${randomUUID()}.pdf`;
  await writeFile(resolveKey(fileKey), contents, { flag: 'wx', mode: 0o640 });
  return { fileKey, sizeBytes: contents.byteLength };
}

export async function statPdf(fileKey: string): Promise<{ sizeBytes: number; modifiedAt: Date }> {
  try {
    const result = await stat(resolveKey(fileKey));
    if (!result.isFile()) throw new NotFound('PDF file not found');
    return { sizeBytes: result.size, modifiedAt: result.mtime };
  } catch (error) {
    if (error instanceof NotFound || error instanceof BadRequest) throw error;
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new NotFound('PDF file not found');
    }
    throw error;
  }
}

export async function readPdf(fileKey: string): Promise<Buffer> {
  try {
    return await readFile(resolveKey(fileKey));
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new NotFound('PDF file not found');
    }
    throw error;
  }
}

export async function removePdf(fileKey: string): Promise<void> {
  await rm(resolveKey(fileKey), { force: true });
}

export async function listPdfFiles(): Promise<string[]> {
  await mkdir(config.PDF_ROOT, { recursive: true });
  const entries = await readdir(config.PDF_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && keyPattern.test(entry.name))
    .map((entry) => entry.name);
}

export async function listTemporaryPdfFiles(): Promise<string[]> {
  const temporaryDirectory = path.join(config.PDF_ROOT, '_tmp');
  await mkdir(temporaryDirectory, { recursive: true });
  const entries = await readdir(temporaryDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

export async function statTemporaryPdf(fileName: string): Promise<{ modifiedAt: Date }> {
  if (path.basename(fileName) !== fileName || fileName.includes('..')) {
    throw new BadRequest('Invalid temporary filename');
  }
  const result = await stat(path.join(config.PDF_ROOT, '_tmp', fileName));
  return { modifiedAt: result.mtime };
}

export async function removeTemporaryPdf(fileName: string): Promise<void> {
  if (path.basename(fileName) !== fileName || fileName.includes('..')) {
    throw new BadRequest('Invalid temporary filename');
  }
  await rm(path.join(config.PDF_ROOT, '_tmp', fileName), { force: true });
}

export function accelPath(fileKey: string): string {
  resolveKey(fileKey);
  return `/protected-pdfs/${fileKey}`;
}

export function pdfPathForInternalUse(fileKey: string): string {
  return resolveKey(fileKey);
}
