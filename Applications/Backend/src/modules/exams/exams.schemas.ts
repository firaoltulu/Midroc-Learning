import { z } from 'zod';

const choiceSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().trim().min(1).max(2000),
  isCorrect: z.boolean()
}).strict();

const questionSchema = z
  .object({
    id: z.string().uuid().optional(),
    prompt: z.string().trim().min(1).max(10_000),
    isMultiple: z.boolean().default(false),
    points: z.number().int().min(1).default(1),
    choices: z.array(choiceSchema).min(2).max(10)
  })
  .strict()
  .superRefine((question, context) => {
    const correctCount = question.choices.filter((choice) => choice.isCorrect).length;
    if (correctCount < 1) {
      context.addIssue({ code: 'custom', message: 'At least one choice must be correct' });
    }
    if (!question.isMultiple && correctCount !== 1) {
      context.addIssue({ code: 'custom', message: 'Single-answer questions require exactly one correct choice' });
    }
  });

export const questionsSchema = z.array(questionSchema).min(1).superRefine((questions, context) => {
  const questionIds = questions.flatMap((question) => question.id ? [question.id] : []);
  if (new Set(questionIds).size !== questionIds.length) {
    context.addIssue({ code: 'custom', message: 'Question ids must be unique' });
  }
  const choiceIds = questions.flatMap((question) =>
    question.choices.flatMap((choice) => choice.id ? [choice.id] : [])
  );
  if (new Set(choiceIds).size !== choiceIds.length) {
    context.addIssue({ code: 'custom', message: 'Choice ids must be unique' });
  }
});
export type ExamQuestionInput = z.infer<typeof questionSchema>;

export const submitSchema = z
  .object({
    answers: z.array(
      z.object({
        questionId: z.string().uuid(),
        choiceIds: z.array(z.string().uuid())
      }).strict()
    )
  })
  .strict();
