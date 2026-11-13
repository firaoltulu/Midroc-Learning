import { z } from 'zod';
import { questionsSchema } from '../exams/index.js';

const pdfFileKey = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i
);

export const moduleCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).default('')
}).strict();

export const modulePatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).optional()
}).strict().refine((value) => Object.keys(value).length > 0);

const uniqueIds = z
  .array(z.string().uuid())
  .min(1)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Ids must be unique',
    params: { code: 'DUPLICATE_ID' }
  });
export const moduleOrderSchema = z.object({ moduleIds: uniqueIds }).strict();
export const itemOrderSchema = z.object({ itemIds: uniqueIds }).strict();

const examSettingsSchema = z.object({
  instructions: z.string().max(4000).default(''),
  passingScorePercent: z.number().int().min(0).max(100).default(60),
  maxAttempts: z.number().int().min(1).nullable().default(null),
  timeLimitMinutes: z.number().int().min(1).nullable().default(null)
}).strict();

export const itemCreateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('video'),
    title: z.string().trim().min(1).max(200),
    url: z.string().min(1).max(2000)
  }).strict(),
  z.object({
    type: z.literal('pdf'),
    title: z.string().trim().min(1).max(200),
    fileKey: pdfFileKey
  }).strict(),
  z.object({
    type: z.literal('exam'),
    title: z.string().trim().min(1).max(200),
    ...examSettingsSchema.shape,
    questions: questionsSchema.optional()
  }).strict()
]);

export const itemPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  url: z.string().min(1).max(2000).optional(),
  fileKey: pdfFileKey.optional(),
  instructions: z.string().max(4000).optional(),
  passingScorePercent: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).nullable().optional(),
  timeLimitMinutes: z.number().int().min(1).nullable().optional()
}).strict().refine((value) => Object.keys(value).length > 0);

export const questionsBodySchema = z.object({ questions: questionsSchema }).strict();

const revisionVideoSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.literal('video'),
  title: z.string().trim().min(1).max(200),
  url: z.string().min(1).max(2000).optional(),
  youtubeVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional()
}).strict().refine((value) => value.url !== undefined || value.youtubeVideoId !== undefined, {
  message: 'A video link is required',
  path: ['url'],
  params: { code: 'VIDEO_LINK_REQUIRED' }
});

const revisionPdfSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.literal('pdf'),
  title: z.string().trim().min(1).max(200),
  fileKey: pdfFileKey
}).strict();

const revisionExamSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.literal('exam'),
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(4000).default(''),
  passingScorePercent: z.number().int().min(0).max(100).default(60),
  maxAttempts: z.number().int().min(1).nullable().default(null),
  timeLimitMinutes: z.number().int().min(1).nullable().default(null),
  questions: questionsSchema
}).strict();

export const revisionItemSchema = z.discriminatedUnion('type', [
  revisionVideoSchema,
  revisionPdfSchema,
  revisionExamSchema
]);

export const revisionTreeSchema = z.object({
  modules: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).default(''),
    items: z.array(revisionItemSchema).min(1)
  }).strict()).min(1)
}).strict().superRefine((tree, context) => {
  const moduleIds = tree.modules.flatMap((module) => module.id ? [module.id] : []);
  const itemIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) => item.id ? [item.id] : [])
  );
  const questionIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) => item.type === 'exam'
      ? item.questions.flatMap((question) => question.id ? [question.id] : [])
      : [])
  );
  const choiceIds = tree.modules.flatMap((module) =>
    module.items.flatMap((item) => item.type === 'exam'
      ? item.questions.flatMap((question) =>
        question.choices.flatMap((choice) => choice.id ? [choice.id] : [])
      )
      : [])
  );
  for (const [label, ids] of [
    ['Module', moduleIds],
    ['Item', itemIds],
    ['Question', questionIds],
    ['Choice', choiceIds]
  ] as const) {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: `${label} ids must be unique`,
        params: { code: 'DUPLICATE_ID' }
      });
    }
  }
});

export type RevisionTreeInput = z.infer<typeof revisionTreeSchema>;
