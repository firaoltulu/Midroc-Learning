import TimerOutlined from '@mui/icons-material/TimerOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { announcementFor, formatClock, remainingMs } from '../../model/exam-timer';

const TICK_MS = 1_000;
const LOW_TIME_MS = 60_000;

/**
 * The remaining time on the server's clock. Visually updated every second (hidden from screen
 * readers); announced politely only at 10, 5 and 1 minutes left. Calls `onExpire` once at zero.
 */
export function ExamTimer({
  expiresAt,
  clockOffset,
  onExpire,
}: {
  expiresAt: string;
  clockOffset: number;
  onExpire: () => void;
}) {
  const { t } = useTranslation('exam');
  const [remaining, setRemaining] = useState(() => remainingMs(expiresAt, Date.now(), clockOffset));
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(remaining);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    const update = () => {
      const next = remainingMs(expiresAt, Date.now(), clockOffset);
      const minutes = announcementFor(previous.current, next);
      if (minutes !== null) setAnnouncement(t('timer.announce', { count: minutes }));
      previous.current = next;
      setRemaining(next);
      if (next === 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current();
      }
    };
    update();
    const timer = setInterval(update, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [expiresAt, clockOffset, t]);

  const low = remaining <= LOW_TIME_MS;
  return (
    <Stack
      direction="row"
      // A gold-tinted chip ("24:10 left"); red in the last minute (the text says so too).
      spacing={0.5}
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        px: 1.25,
        py: 0.5,
        borderRadius: '8px',
        bgcolor: low ? 'status.rejected.bg' : 'status.pending.bg',
        color: low ? 'status.rejected.fg' : 'status.pending.fg',
        fontSize: '0.875rem',
      }}
    >
      <TimerOutlined aria-hidden sx={{ fontSize: 18, display: { xs: 'none', sm: 'block' } }} />
      <Typography component="span" sx={visuallyHidden}>
        {t('timer.label')}
      </Typography>
      <Typography
        component="span"
        aria-hidden
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 'inherit' }}
        data-testid="exam-clock"
      >
        {formatClock(remaining)}
      </Typography>
      <Typography component="span" aria-hidden sx={{ fontSize: 'inherit', fontWeight: 500 }}>
        {t('timer.left')}
      </Typography>
      <Box role="status" aria-live="polite" sx={visuallyHidden}>
        {announcement}
      </Box>
    </Stack>
  );
}
