import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { ButtonLink } from '../../../shared/ui/router-links';
import { LoadingRegion } from '../../../shared/ui/skeletons';
import { courseDetailQueryOptions, nextItemId } from '../../courses';
import type { Enrollment } from '../../learning';

/**
 * "Continue learning" in the home hero: the course, a progress bar, "Module 3 of 8 · 38%" and
 * Resume, which opens the first unfinished item (the course page until that is known).
 */
export function ContinueLearningCard({ enrollment }: { enrollment: Enrollment }) {
  const { t } = useTranslation('catalog');
  const contentLang = useContentLang(enrollment.language);
  const detail = useQuery(courseDetailQueryOptions(enrollment.id));
  const itemId = detail.data ? nextItemId(detail.data) : undefined;
  const progressLabel =
    enrollment.currentModule !== null && enrollment.moduleCount > 0
      ? t('home.continue.progress', {
          module: enrollment.currentModule,
          total: enrollment.moduleCount,
          percent: enrollment.progressPercent,
        })
      : t('home.continue.percent', { percent: enrollment.progressPercent });

  return (
    <Card
      component="section"
      aria-labelledby="continue-learning-title"
      sx={{ color: 'text.primary' }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t('home.continue.label')}
          </Typography>
          <Typography
            id="continue-learning-title"
            variant="h4"
            component="h2"
            sx={{ overflowWrap: 'anywhere' }}
            {...contentLang}
          >
            {enrollment.title}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={enrollment.progressPercent}
            aria-label={progressLabel}
          />
          <Typography variant="body2" color="text.secondary">
            {progressLabel}
          </Typography>
          <div>
            {itemId ? (
              <ButtonLink
                variant="contained"
                to="/learn/$courseId/$itemId"
                params={{ courseId: enrollment.id, itemId }}
              >
                {t('home.continue.resume')}
              </ButtonLink>
            ) : (
              <ButtonLink
                variant="contained"
                to="/courses/$courseId"
                params={{ courseId: enrollment.id }}
              >
                {t('home.continue.resume')}
              </ButtonLink>
            )}
          </div>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ContinueLearningSkeleton() {
  return (
    <LoadingRegion>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Skeleton variant="text" width="35%" />
          <Skeleton variant="text" width="80%" sx={{ fontSize: '1.25rem' }} />
          <Skeleton variant="rounded" height={6} sx={{ my: 1.5 }} />
          <Skeleton variant="rounded" width={96} height={40} />
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}
