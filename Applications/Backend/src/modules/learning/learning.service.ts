import type { Actor } from '../../core/actor.js';
import { getPdfKey, getVideoForPlayback } from '../content/index.js';
import { saveProgress } from '../enrollments/index.js';

export async function videoForLearner(itemId: string, actor: Actor): Promise<string> {
  return getVideoForPlayback(itemId, actor);
}

export async function pdfForLearner(itemId: string, actor: Actor): Promise<string> {
  return getPdfKey(itemId, actor);
}

export async function updateProgress(
  actor: Actor,
  itemId: string,
  input: { lastPositionSeconds?: number | undefined; completed?: boolean | undefined }
): Promise<void> {
  await saveProgress(actor, itemId, input);
}
