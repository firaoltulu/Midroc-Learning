import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../shared/i18n/format-number';
import { formatRating } from '../lib/course-text';
import { RatingStars } from './rating-stars';

/** "★ 4.7 (1.2k)" on course cards: one star, the average and the number of ratings. */
export function CourseRating({ average, count }: { average: number; count: number }) {
  const { t } = useTranslation('courses');
  const { formatCompact } = useNumberFormat();
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <RatingStars value={1} max={1} />
      <Typography variant="body2" aria-hidden>
        <strong>{formatRating(average)}</strong>{' '}
        <Typography component="span" variant="body2" color="text.secondary">
          ({formatCompact(count)})
        </Typography>
      </Typography>
      <Typography variant="body2" component="span" sx={visuallyHidden}>
        {t('rating.card', { rating: formatRating(average), count })}
      </Typography>
    </Stack>
  );
}
