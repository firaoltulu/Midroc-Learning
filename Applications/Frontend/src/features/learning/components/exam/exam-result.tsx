import CancelOutlined from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExamQuestion, ExamResult } from '../../api/exams';
import { AttemptHistory } from './attempt-history';

/**
 * Score, passed / not passed (text and tone, never colour alone), attempts left and "Try
 * again" (only when not passed), each question right or wrong, and the correct choices only
 * when the server sent them.
 */
export function ExamResultView({
  examId,
  result,
  questions,
  contentLang,
  onTryAgain,
}: {
  examId: string;
  result: ExamResult;
  questions: ExamQuestion[];
  contentLang: { lang?: string };
  onTryAgain: () => void;
}) {
  const { t } = useTranslation('exam');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const canRetry = result.attemptsRemaining === null || result.attemptsRemaining > 0;
  const byQuestion = new Map(result.results.map((entry) => [entry.questionId, entry]));
  const tone = result.passed ? 'success' : 'warning';

  return (
    <Stack spacing={3}>
      <Stack
        spacing={1}
        sx={{ p: 3, border: 1, borderRadius: '14px', borderColor: `${tone}.main` }}
      >
        <Typography
          ref={headingRef}
          tabIndex={-1}
          variant="h3"
          component="h2"
          sx={{ outline: 'none', color: `${tone}.main` }}
        >
          {result.passed ? t('result.passed') : t('result.notPassed')}
        </Typography>
        <Typography variant="h2" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {t('result.percent', { percent: Math.round(result.scorePercent) })}
        </Typography>
        {/* A passed exam is done: no attempts count, no "Try again". */}
        {result.passed ? null : (
          <>
            <Typography color="text.secondary">
              {result.attemptsRemaining === null
                ? t('result.attemptsUnlimited')
                : t('result.attemptsLeft', { count: result.attemptsRemaining })}
            </Typography>
            {canRetry ? (
              <Button
                variant="contained"
                onClick={onTryAgain}
                sx={{ alignSelf: 'flex-start', mt: 1 }}
              >
                {t('result.tryAgain')}
              </Button>
            ) : null}
          </>
        )}
      </Stack>

      <Stack component="section" spacing={1.5} aria-labelledby="exam-answers-heading">
        <Typography id="exam-answers-heading" variant="h4" component="h3">
          {t('result.yourAnswers')}
        </Typography>
        {result.revealAnswers ? null : (
          <Typography variant="body2" color="text.secondary">
            {t('result.answersHidden')}
          </Typography>
        )}
        <Stack component="ol" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {questions.map((question, index) => {
            const entry = byQuestion.get(question.id);
            const correct = entry?.isCorrect ?? false;
            const selected = new Set(entry?.selectedChoiceIds ?? []);
            const correctIds = entry?.correctChoiceIds ? new Set(entry.correctChoiceIds) : null;
            const textOf = (ids: Set<string>) =>
              question.choices.filter((choice) => ids.has(choice.id)).map((choice) => choice.text);
            const yours = textOf(selected);
            return (
              <Box
                component="li"
                key={question.id}
                sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: '14px' }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  {correct ? (
                    <CheckCircleOutlined aria-hidden sx={{ color: 'success.main' }} />
                  ) : (
                    <CancelOutlined aria-hidden sx={{ color: 'error.main' }} />
                  )}
                  <Typography sx={{ fontWeight: 600 }}>
                    {t(correct ? 'result.questionCorrect' : 'result.questionIncorrect', {
                      number: index + 1,
                    })}
                  </Typography>
                </Stack>
                <Typography
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 1 }}
                  {...contentLang}
                >
                  {question.prompt}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {yours.length > 0 ? t('result.yourAnswer') : t('result.noAnswer')}
                </Typography>
                {yours.map((text) => (
                  <Typography key={text} sx={{ overflowWrap: 'anywhere' }} {...contentLang}>
                    {text}
                  </Typography>
                ))}
                {correctIds && !correct ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {t('result.correctAnswer', { count: correctIds.size })}
                    </Typography>
                    {textOf(correctIds).map((text) => (
                      <Typography
                        key={text}
                        sx={{ overflowWrap: 'anywhere', color: 'success.main', fontWeight: 500 }}
                        {...contentLang}
                      >
                        {text}
                      </Typography>
                    ))}
                  </>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      </Stack>

      <AttemptHistory examId={examId} />
    </Stack>
  );
}
