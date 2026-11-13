import type { AuthoringQuestion, QuestionInput } from '../api/schemas';

/**
 * The exam question builder's working state. Every question and choice has a client `key`
 * (stable React key, survives reordering); `id` is set only for what the server already has,
 * so new questions and choices are sent without an id (the server matches existing ones by
 * id). Validation mirrors the backend (exams.schemas questionSchema).
 */

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 10;
export const PROMPT_MAX = 10_000;
export const CHOICE_MAX = 2_000;

export interface ChoiceDraft {
  key: string;
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionDraft {
  key: string;
  id?: string;
  prompt: string;
  isMultiple: boolean;
  /** Text as typed; must be a whole number ≥ 1. */
  points: string;
  choices: ChoiceDraft[];
}

let counter = 0;
export const newKey = () => {
  counter += 1;
  return `new-${String(counter)}`;
};

export const newChoice = (): ChoiceDraft => ({ key: newKey(), text: '', isCorrect: false });

export const newQuestion = (): QuestionDraft => ({
  key: newKey(),
  prompt: '',
  isMultiple: false,
  points: '1',
  choices: [newChoice(), newChoice()],
});

export function fromAuthoring(questions: AuthoringQuestion[]): QuestionDraft[] {
  return [...questions]
    .sort((a, b) => a.position - b.position)
    .map((question) => ({
      key: question.id,
      id: question.id,
      prompt: question.prompt,
      isMultiple: question.isMultiple,
      points: String(question.points),
      choices: question.choices.map((choice) => ({
        key: choice.id,
        id: choice.id,
        text: choice.text,
        isCorrect: choice.isCorrect,
      })),
    }));
}

/** The request body: ids only for existing entries, in the builder's order. */
export function toInput(drafts: QuestionDraft[]): QuestionInput[] {
  return drafts.map((draft) => ({
    ...(draft.id ? { id: draft.id } : {}),
    prompt: draft.prompt,
    isMultiple: draft.isMultiple,
    points: Number(draft.points),
    choices: draft.choices.map((choice) => ({
      ...(choice.id ? { id: choice.id } : {}),
      text: choice.text,
      isCorrect: choice.isCorrect,
    })),
  }));
}

/**
 * After a save, gives the entries that were sent without an id the id the server assigned.
 * `sent` is the snapshot that was saved and `saved` the server's questions in the same order;
 * entries are matched by key, so edits made meanwhile (including new or removed entries) keep.
 */
export function assignIds(
  drafts: QuestionDraft[],
  sent: QuestionDraft[],
  saved: AuthoringQuestion[],
): QuestionDraft[] {
  const ordered = [...saved].sort((a, b) => a.position - b.position);
  const questionIds = new Map<string, string>();
  const choiceIds = new Map<string, string>();
  sent.forEach((question, index) => {
    const match = ordered[index];
    if (!match) return;
    questionIds.set(question.key, match.id);
    question.choices.forEach((choice, choiceIndex) => {
      const savedChoice = match.choices[choiceIndex];
      if (savedChoice) choiceIds.set(choice.key, savedChoice.id);
    });
  });
  return drafts.map((question) => ({
    ...question,
    id: question.id ?? questionIds.get(question.key),
    choices: question.choices.map((choice) => ({
      ...choice,
      id: choice.id ?? choiceIds.get(choice.key),
    })),
  }));
}

// ---- Editing -------------------------------------------------------------------------

/** Single answer keeps only the first correct choice; multiple keeps them all. */
export function setMultiple(question: QuestionDraft, isMultiple: boolean): QuestionDraft {
  if (isMultiple) return { ...question, isMultiple };
  let found = false;
  return {
    ...question,
    isMultiple,
    choices: question.choices.map((choice) => {
      const keep = choice.isCorrect && !found;
      if (keep) found = true;
      return { ...choice, isCorrect: keep };
    }),
  };
}

/** Single answer: this choice becomes the one correct answer. Multiple: toggles it. */
export function markCorrect(question: QuestionDraft, choiceKey: string): QuestionDraft {
  return {
    ...question,
    choices: question.choices.map((choice) =>
      question.isMultiple
        ? choice.key === choiceKey
          ? { ...choice, isCorrect: !choice.isCorrect }
          : choice
        : { ...choice, isCorrect: choice.key === choiceKey },
    ),
  };
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [entry] = next.splice(from, 1);
  if (entry !== undefined) next.splice(to, 0, entry);
  return next;
}

// ---- Validation ----------------------------------------------------------------------

/** Translation keys ('ns:key') of what's wrong with one question. */
export interface QuestionProblems {
  prompt?: string;
  points?: string;
  /** About the choices as a whole (count, correct answers). */
  choices?: string;
  /** Per choice key. */
  choiceText: Record<string, string>;
}

export function questionProblems(question: QuestionDraft): QuestionProblems | null {
  const problems: QuestionProblems = { choiceText: {} };
  let found = false;

  if (!question.prompt.trim()) {
    problems.prompt = 'editor:questions.errors.promptRequired';
    found = true;
  } else if (question.prompt.length > PROMPT_MAX) {
    problems.prompt = 'editor:questions.errors.promptTooLong';
    found = true;
  }

  const points = Number(question.points);
  if (!/^\d+$/.test(question.points.trim()) || !Number.isInteger(points) || points < 1) {
    problems.points = 'editor:questions.errors.points';
    found = true;
  }

  for (const choice of question.choices) {
    if (!choice.text.trim()) {
      problems.choiceText[choice.key] = 'editor:questions.errors.choiceRequired';
      found = true;
    } else if (choice.text.length > CHOICE_MAX) {
      problems.choiceText[choice.key] = 'editor:questions.errors.choiceTooLong';
      found = true;
    }
  }

  const correct = question.choices.filter((choice) => choice.isCorrect).length;
  if (question.choices.length < MIN_CHOICES) {
    problems.choices = 'editor:questions.errors.minChoices';
    found = true;
  } else if (question.choices.length > MAX_CHOICES) {
    problems.choices = 'editor:questions.errors.maxChoices';
    found = true;
  } else if (correct < 1) {
    problems.choices = 'validation:CORRECT_CHOICE_REQUIRED.default';
    found = true;
  } else if (!question.isMultiple && correct !== 1) {
    problems.choices = 'validation:SINGLE_CORRECT_CHOICE_REQUIRED.default';
    found = true;
  }

  return found ? problems : null;
}

/** Problems per question key; empty when the whole list can be saved. */
export function validateQuestions(drafts: QuestionDraft[]): Map<string, QuestionProblems> {
  const result = new Map<string, QuestionProblems>();
  for (const draft of drafts) {
    const problems = questionProblems(draft);
    if (problems) result.set(draft.key, problems);
  }
  return result;
}
