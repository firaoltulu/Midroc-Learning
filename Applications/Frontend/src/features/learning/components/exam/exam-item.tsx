import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { examKeys } from '../../../../shared/api/query-keys';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import {
  useStartExam,
  useSubmitExam,
  type ExamQuestion,
  type ExamResult,
  type ExamSession,
} from '../../api/exams';
import {
  clearAnswers,
  loadAnswers,
  saveAnswers,
  toSubmission,
  type Answers,
} from '../../model/exam-answers';
import { ExamOverview } from './exam-overview';
import { ExamResultView } from './exam-result';
import { ExamTaking } from './exam-taking';

type Step =
  | { kind: 'overview'; notice?: 'timeExceeded' | 'alreadySubmitted' | 'saved' }
  | { kind: 'taking'; session: ExamSession }
  | { kind: 'result'; result: ExamResult; questions: ExamQuestion[] };

const stageSx = {
  maxWidth: 880,
  mx: 'auto',
  p: { xs: 1.5, sm: 2.5 },
  border: 1,
  borderTopWidth: 3,
  borderColor: 'divider',
  borderTopColor: 'primary.main',
  borderRadius: '20px',
  bgcolor: 'background.paper',
  backgroundImage:
    'radial-gradient(circle at 100% 0%, rgba(var(--mui-palette-primary-mainChannel) / 0.07), transparent 34%)',
};

/**
 * An exam item: overview → one question at a time → review → result. Answers are kept per
 * attempt in sessionStorage and restored when an open attempt is resumed; time running out
 * submits what is answered.
 */
export default function ExamItem({
  courseId,
  examId,
  title,
  contentLang,
}: {
  courseId: string;
  examId: string;
  /** The item's title, shown in the exam's own top bar. */
  title: string;
  contentLang: { lang?: string };
}) {
  const { t } = useTranslation('exam');
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const start = useStartExam(examId);
  const submit = useSubmitExam(courseId, examId);
  const [step, setStep] = useState<Step>({ kind: 'overview' });
  const [answers, setAnswers] = useState<Answers>({});
  // The latest answers for the timer's auto-submit.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  });

  const handleStart = () => {
    submit.reset();
    start.mutate(undefined, {
      onSuccess: (session) => {
        setAnswers(session.resumed ? loadAnswers(session.attemptId) : {});
        if (!session.resumed) clearAnswers(session.attemptId);
        setStep({ kind: 'taking', session });
      },
      onError: (error) => {
        // Someone else's tab used the last attempt: refresh the overview's counts.
        if (isApiError(error, 'ATTEMPTS_EXHAUSTED')) {
          void queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
        }
      },
    });
  };

  const changeAnswers = (next: Answers) => {
    if (step.kind !== 'taking') return;
    setAnswers(next);
    saveAnswers(step.session.attemptId, next);
  };

  const handleSubmit = useCallback(() => {
    if (step.kind !== 'taking' || submit.isPending) return;
    const { session } = step;
    submit.mutate(
      {
        attemptId: session.attemptId,
        answers: toSubmission(session.questions, answersRef.current),
      },
      {
        onSuccess: (result) => {
          clearAnswers(session.attemptId);
          setStep({ kind: 'result', result, questions: session.questions });
        },
        onError: (error) => {
          if (isApiError(error, 'EXAM_TIME_EXCEEDED')) {
            clearAnswers(session.attemptId);
            setStep({ kind: 'overview', notice: 'timeExceeded' });
          } else if (isApiError(error, 'ATTEMPT_ALREADY_SUBMITTED')) {
            clearAnswers(session.attemptId);
            setStep({ kind: 'overview', notice: 'alreadySubmitted' });
          }
        },
      },
    );
  }, [step, submit]);

  if (step.kind === 'taking') {
    return (
      <ExamTaking
        title={title}
        session={step.session}
        onExit={() => {
          // Answers stay in sessionStorage; starting again resumes this attempt.
          submit.reset();
          start.reset();
          void queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
          setStep({ kind: 'overview', notice: 'saved' });
        }}
        answers={answers}
        onAnswersChange={changeAnswers}
        onSubmit={handleSubmit}
        submitting={submit.isPending}
        submitError={submit.error ? errorMessage(submit.error) : null}
        contentLang={contentLang}
      />
    );
  }

  if (step.kind === 'result') {
    return (
      <Box sx={stageSx}>
        <ExamResultView
          examId={examId}
          result={step.result}
          questions={step.questions}
          contentLang={contentLang}
          onTryAgain={() => {
            submit.reset();
            start.reset();
            setStep({ kind: 'overview' });
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={stageSx}>
      <ExamOverview
        examId={examId}
        contentLang={contentLang}
        starting={start.isPending}
        startError={start.error}
        onStart={handleStart}
        notice={
          step.notice === 'saved' ? (
            <Alert severity="info" variant="outlined" role="status">
              {t('notice.saved')}
            </Alert>
          ) : step.notice ? (
            <Alert severity="warning" variant="outlined" role="alert">
              {step.notice === 'timeExceeded'
                ? t('notice.timeExceeded')
                : t('notice.alreadySubmitted')}
            </Alert>
          ) : undefined
        }
      />
    </Box>
  );
}
