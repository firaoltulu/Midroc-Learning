import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { ErrorState } from '../../../../shared/ui/error-state';
import { LoadingRegion } from '../../../../shared/ui/skeletons';
import { examOverviewQueryOptions } from '../../api/exams';
import { AttemptHistory } from './attempt-history';

/**
 * Before starting: instructions, passing score, attempts, time limit; Start, Resume or Try
 * again. Once passed, the exam is done and can't be started again.
 */
export function ExamOverview({
  examId,
  contentLang,
  starting,
  startError,
  notice,
  onStart,
}: {
  examId: string;
  contentLang: { lang?: string };
  starting: boolean;
  startError: unknown;
  /** A message from the previous step (e.g. time ran out). */
  notice?: ReactNode;
  onStart: () => void;
}) {
  const { t } = useTranslation('exam');
  const errorMessage = useErrorMessage();
  const overview = useQuery(examOverviewQueryOptions(examId));

  if (overview.isPending) {
    return (
      <LoadingRegion>
        <Skeleton variant="rounded" height={220} />
      </LoadingRegion>
    );
  }
  if (overview.isError) {
    return (
      <ErrorState
        description={errorMessage(overview.error)}
        onRetry={() => void overview.refetch()}
      />
    );
  }

  const exam = overview.data;
  // A passed exam can't be started again (an attempt opened elsewhere can still be resumed).
  const done = exam.passed && !exam.hasOpenAttempt;
  const noAttemptsLeft = !done && exam.attemptsRemaining === 0 && !exam.hasOpenAttempt;
  const facts: [string, string][] = [
    [t('overview.questions'), t('overview.questionCount', { count: exam.questionCount })],
    [t('overview.passingScore'), t('result.percent', { percent: exam.passingScorePercent })],
    [
      t('overview.timeLimit'),
      exam.timeLimitMinutes === null
        ? t('overview.noTimeLimit')
        : t('overview.minutes', { count: exam.timeLimitMinutes }),
    ],
    [
      t('overview.attempts'),
      exam.attemptsRemaining === null
        ? t('overview.unlimited')
        : t('overview.attemptsLeft', { count: exam.attemptsRemaining }),
    ],
  ];

  return (
    <Stack spacing={3}>
      {notice}
      {exam.passed ? (
        <Alert severity="success" variant="outlined">
          {t('overview.alreadyPassed')}
        </Alert>
      ) : null}

      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 2,
          m: 0,
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        {facts.map(([label, value]) => (
          <Box key={label} sx={{ m: 0 }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0, fontWeight: 600 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      {exam.instructions ? (
        <Stack spacing={1}>
          <Typography variant="h4" component="h3">
            {t('overview.instructions')}
          </Typography>
          <Typography
            sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 720 }}
            {...contentLang}
          >
            {exam.instructions}
          </Typography>
        </Stack>
      ) : null}

      {exam.timeLimitMinutes !== null && !noAttemptsLeft && !done ? (
        <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
          {t('overview.timerNote', { count: exam.timeLimitMinutes })}
        </Typography>
      ) : null}

      {startError ? (
        <Alert severity="error" variant="outlined">
          {errorMessage(startError)}
        </Alert>
      ) : null}

      {done ? null : noAttemptsLeft ? (
        <Alert severity="info" variant="outlined">
          {t('overview.noAttemptsLeft')}
        </Alert>
      ) : exam.questionCount === 0 ? (
        <Alert severity="info" variant="outlined">
          {t('overview.noQuestions')}
        </Alert>
      ) : (
        <Button
          variant="contained"
          size="large"
          disabled={starting}
          onClick={onStart}
          sx={{ alignSelf: 'flex-start' }}
        >
          {starting
            ? t('overview.starting')
            : exam.hasOpenAttempt
              ? t('overview.resume')
              : exam.attemptsUsed > 0
                ? t('overview.tryAgain')
                : t('overview.start')}
        </Button>
      )}

      <AttemptHistory examId={examId} />
    </Stack>
  );
}
