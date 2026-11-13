/**
 * The learner's answers for one attempt: question id → chosen choice ids. Kept in
 * sessionStorage per attempt so a refresh doesn't lose them (restored when the attempt is
 * resumed), removed after submitting. sessionStorage is also cleared on sign-out.
 */
export type Answers = Record<string, string[]>;

const keyFor = (attemptId: string) => `midroc.exam.${attemptId}`;

export function loadAnswers(attemptId: string): Answers {
  try {
    const raw = sessionStorage.getItem(keyFor(attemptId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const answers: Answers = {};
    for (const [questionId, choiceIds] of Object.entries(parsed)) {
      if (Array.isArray(choiceIds)) {
        answers[questionId] = choiceIds.filter((id): id is string => typeof id === 'string');
      }
    }
    return answers;
  } catch {
    return {};
  }
}

export function saveAnswers(attemptId: string, answers: Answers): void {
  try {
    sessionStorage.setItem(keyFor(attemptId), JSON.stringify(answers));
  } catch {
    // Storage full or blocked: answers still live in memory for this page.
  }
}

export function clearAnswers(attemptId: string): void {
  try {
    sessionStorage.removeItem(keyFor(attemptId));
  } catch {
    // Nothing to clear.
  }
}

/** Single-answer questions keep one choice; multi-answer questions toggle. */
export function choose(
  answers: Answers,
  questionId: string,
  choiceId: string,
  isMultiple: boolean,
): Answers {
  if (!isMultiple) return { ...answers, [questionId]: [choiceId] };
  const current = answers[questionId] ?? [];
  const next = current.includes(choiceId)
    ? current.filter((id) => id !== choiceId)
    : [...current, choiceId];
  return { ...answers, [questionId]: next };
}

export const isAnswered = (answers: Answers, questionId: string) =>
  (answers[questionId]?.length ?? 0) > 0;

/** The submit body: only answered questions, only choices that still exist. */
export function toSubmission(
  questions: { id: string; choices: { id: string }[] }[],
  answers: Answers,
): { questionId: string; choiceIds: string[] }[] {
  return questions
    .map((question) => {
      const valid = new Set(question.choices.map((choice) => choice.id));
      return {
        questionId: question.id,
        choiceIds: (answers[question.id] ?? []).filter((id) => valid.has(id)),
      };
    })
    .filter((answer) => answer.choiceIds.length > 0);
}
