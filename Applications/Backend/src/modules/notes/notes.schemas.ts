import { z } from 'zod';

const noteBody = z.string().trim().min(1).max(4000);

export const noteCreateSchema = z
  .object({
    body: noteBody,
    /** Where in the video the note was taken (seconds). */
    positionSeconds: z.number().int().min(0).nullable().default(null)
  })
  .strict();

export const notePatchSchema = z.object({ body: noteBody }).strict();
