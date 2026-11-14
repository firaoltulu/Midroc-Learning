import { z } from 'zod';
import { courseDetailSchema, itemTypeSchema } from '../../courses';

/**
 * Authoring responses (reference/openapi.yaml: AuthoringView, AuthoringItem,
 * AuthoringQuestion). Owner/admin only: they contain video ids, file keys and correct answers,
 * so they live under `authoringKeys` with a short gcTime.
 */

export const authoringChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
});

export const authoringQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  isMultiple: z.boolean(),
  points: z.number().int(),
  position: z.number().int(),
  choices: z.array(authoringChoiceSchema),
});

export const authoringItemSchema = z.object({
  id: z.string(),
  type: itemTypeSchema,
  title: z.string(),
  position: z.number().int(),
  youtubeVideoId: z.string().nullable(),
  youtubeTitle: z.string().nullable(),
  isAvailable: z.boolean().nullable(),
  fileKey: z.string().nullable(),
  sizeBytes: z.number().int().nullable(),
  pageCount: z.number().int().nullable(),
  instructions: z.string().nullable(),
  passingScorePercent: z.number().int().nullable(),
  maxAttempts: z.number().int().nullable(),
  timeLimitMinutes: z.number().int().nullable(),
  questions: z.array(authoringQuestionSchema).optional(),
});

export const authoringModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  position: z.number().int(),
  items: z.array(authoringItemSchema),
});

export const authoringViewSchema = z.object({
  course: courseDetailSchema,
  modules: z.array(authoringModuleSchema),
});

export const moduleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  position: z.number().int(),
});

export const itemSummarySchema = z.object({
  id: z.string(),
  type: itemTypeSchema,
  title: z.string(),
  position: z.number().int(),
});

export const pdfUploadSchema = z.object({
  fileKey: z.string(),
  sizeBytes: z.number().int(),
  pageCount: z.number().int(),
});

export type AuthoringView = z.infer<typeof authoringViewSchema>;
export type AuthoringModule = z.infer<typeof authoringModuleSchema>;
export type AuthoringItem = z.infer<typeof authoringItemSchema>;
export type AuthoringQuestion = z.infer<typeof authoringQuestionSchema>;
export type PdfUpload = z.infer<typeof pdfUploadSchema>;

/** PATCH /courses/:id body (CoursePatch). */
export interface CoursePatch {
  title?: string;
  description?: string;
  category?: string | null;
  language?: 'en' | 'am';
  thumbnailUrl?: string | null;
  tags?: string[];
  estimatedDurationMinutes?: number | null;
  level?: CourseLevel | null;
  outcomes?: string[];
  skills?: string[];
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

/** PATCH /items/:id body (ItemPatch). */
export interface ItemPatch {
  title?: string;
  url?: string;
  fileKey?: string;
  instructions?: string;
  passingScorePercent?: number;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
}

/** POST /modules/:id/items body (ItemCreate). */
export type ItemCreate =
  | { type: 'video'; title: string; url: string }
  | { type: 'pdf'; title: string; fileKey: string }
  | { type: 'exam'; title: string };

/** PUT /items/:id/questions body entry (QuestionInput); no id = a new question/choice. */
export interface QuestionInput {
  id?: string;
  prompt: string;
  isMultiple: boolean;
  points: number;
  choices: { id?: string; text: string; isCorrect: boolean }[];
}
