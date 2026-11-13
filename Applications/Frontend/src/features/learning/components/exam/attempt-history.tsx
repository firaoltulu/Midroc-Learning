import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { attemptsQueryOptions } from '../../api/exams';

/** The learner's previous attempts, newest first. Nothing shown before the first attempt. */
export function AttemptHistory({ examId }: { examId: string }) {
  const { t } = useTranslation('exam');
  const { formatDateTime } = useDateFormat();
  const attempts = useQuery(attemptsQueryOptions(examId));
  const submitted = (attempts.data ?? []).filter((attempt) => attempt.submittedAt !== null);
  if (submitted.length === 0) return null;

  return (
    <Stack component="section" spacing={1} aria-labelledby="attempt-history-heading">
      <Typography id="attempt-history-heading" variant="h4" component="h3">
        {t('history.title')}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('history.date')}</TableCell>
            <TableCell align="right">{t('history.score')}</TableCell>
            <TableCell>{t('history.outcome')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {submitted.map((attempt) => (
            <TableRow key={attempt.id}>
              <TableCell>{formatDateTime(attempt.submittedAt ?? attempt.startedAt)}</TableCell>
              <TableCell align="right">
                {t('result.percent', { percent: Math.round(attempt.scorePercent ?? 0) })}
              </TableCell>
              <TableCell
                sx={{ color: attempt.passed ? 'success.main' : 'text.secondary', fontWeight: 500 }}
              >
                {attempt.passed ? t('history.passed') : t('history.notPassed')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
