import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import EmojiEventsOutlined from '@mui/icons-material/EmojiEventsOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import QuizOutlined from '@mui/icons-material/QuizOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
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
  const facts: [string, string, ReactElement][] = [
    [
      t('overview.questions'),
      t('overview.questionCount', { count: exam.questionCount }),
      <QuizOutlined key="questions" />,
    ],
    [
      t('overview.passingScore'),
      t('result.percent', { percent: exam.passingScorePercent }),
      <EmojiEventsOutlined key="passing-score" />,
    ],
    [
      t('overview.timeLimit'),
      exam.timeLimitMinutes === null
        ? t('overview.noTimeLimit')
        : t('overview.minutes', { count: exam.timeLimitMinutes }),
      <AccessTimeOutlined key="time-limit" />,
    ],
    [
      t('overview.attempts'),
      exam.attemptsRemaining === null
        ? t('overview.unlimited')
        : t('overview.attemptsLeft', { count: exam.attemptsRemaining }),
      <ReplayOutlined key="attempts" />,
    ],
  ];

  return (
    <Stack spacing={2.5}>
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
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.25,
          m: 0,
        }}
      >
        {facts.map(([label, value, icon]) => (
          <Box
            component="div"
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.25,
              minWidth: 0,
              p: { xs: 1.25, sm: 1.75 },
              border: 1,
              borderColor: 'divider',
              borderRadius: '14px',
              bgcolor: 'surfaceMuted',
            }}
          >
            <Avatar
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                flexShrink: 0,
                bgcolor: 'background.paper',
                color: 'primary.main',
              }}
            >
              {icon}
            </Avatar>
            <Box component="div" sx={{ minWidth: 0 }}>
              <Typography component="dt" variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography
                component="dd"
                sx={{
                  m: 0,
                  fontWeight: 700,
                  overflowWrap: 'anywhere',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {exam.instructions ? (
        <Box
          sx={{
            p: { xs: 1.75, sm: 2.25 },
            borderLeft: 3,
            borderColor: 'primary.main',
            borderRadius: '0 14px 14px 0',
            bgcolor: 'surfaceMuted',
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <InfoOutlined fontSize="small" sx={{ color: 'primary.main' }} />
              <Typography variant="h4" component="h3">
                {t('overview.instructions')}
              </Typography>
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} {...contentLang}>
              {exam.instructions}
            </Typography>
          </Stack>
        </Box>
      ) : null}

      {exam.timeLimitMinutes !== null && !noAttemptsLeft && !done ? (
        <Alert severity="info" variant="outlined" icon={<AccessTimeOutlined />}>
          {t('overview.timerNote', { count: exam.timeLimitMinutes })}
        </Alert>
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
          startIcon={<PlayArrowOutlined />}
          onClick={onStart}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            minHeight: 52,
            px: 3,
            borderRadius: '12px',
          }}
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
