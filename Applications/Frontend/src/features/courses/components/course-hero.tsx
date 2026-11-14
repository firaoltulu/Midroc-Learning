import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { useNumberFormat } from '../../../shared/i18n/format-number';
import { HeroBand } from '../../../shared/ui/hero-band';
import { RouterLink } from '../../../shared/ui/router-links';
import { StatusChip } from '../../../shared/ui/status-chip';
import type { CourseDetail } from '../api/schemas';
import { CourseActionPanel } from './course-action-panel';
import { CourseFacts } from './course-facts';
import { firstParagraph, formatRating } from '../lib/course-text';
import { RatingStars } from './rating-stars';

/**
 * The course page's green band: breadcrumb, title, summary, rating, author and last update,
 * and the enroll card (main action, enrolled count, contents, level, duration, language).
 */
export function CourseHero({
  course,
  viewerId,
  canManage,
}: {
  course: CourseDetail;
  viewerId: string;
  canManage: boolean;
}) {
  const { t } = useTranslation('courses');
  const { formatNumber } = useNumberFormat();
  const contentLang = useContentLang(course.language);
  const { formatDate } = useDateFormat();
  const summary = firstParagraph(course.description);

  return (
    <HeroBand>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 6 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 360px' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Box component="nav" aria-label={t('detail.breadcrumb')}>
            <Stack
              component="ol"
              direction="row"
              useFlexGap
              sx={{ listStyle: 'none', m: 0, p: 0, flexWrap: 'wrap', gap: 0.75 }}
            >
              <Typography component="li" variant="body2">
                <RouterLink to="/courses" underline="hover" sx={{ color: 'inherit' }}>
                  {t('detail.courses')}
                </RouterLink>
              </Typography>
              {course.category ? (
                <Typography component="li" variant="body2" {...contentLang}>
                  <Box component="span" aria-hidden sx={{ mr: 0.75 }}>
                    ›
                  </Box>
                  <RouterLink
                    to="/courses"
                    search={{ category: course.category }}
                    underline="hover"
                    sx={{ color: 'inherit' }}
                  >
                    {course.category}
                  </RouterLink>
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Stack
            direction="row"
            useFlexGap
            sx={{ flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.875rem', md: '2.5rem' },
                fontWeight: 700,
                overflowWrap: 'anywhere',
              }}
              {...contentLang}
            >
              {course.title}
            </Typography>
            {canManage ? <StatusChip status={course.status} /> : null}
          </Stack>

          {summary ? (
            <Typography
              sx={{
                color: 'hero.fgMuted',
                fontSize: '1.125rem',
                maxWidth: 720,
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              {...contentLang}
            >
              {summary}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {course.ratingAverage !== null ? (
              <>
                <RatingStars value={course.ratingAverage} onHero />
                <Typography sx={{ fontWeight: 600 }}>
                  {t('rating.summary', {
                    rating: formatRating(course.ratingAverage),
                    count: course.ratingCount,
                    ratings: formatNumber(course.ratingCount),
                  })}
                </Typography>
              </>
            ) : (
              <Typography sx={{ color: 'hero.fgMuted' }}>{t('rating.none')}</Typography>
            )}
          </Stack>

          <Typography variant="body2" sx={{ color: 'hero.fgMuted' }}>
            {[
              course.ownerName ? t('detail.createdBy', { name: course.ownerName }) : null,
              t('detail.updated', { date: formatDate(course.updatedAt) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Stack>

        <Card
          component="aside"
          aria-label={t('detail.actionsLabel')}
          sx={{ color: 'text.primary' }}
        >
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Stack spacing={2.5}>
              <CourseActionPanel course={course} viewerId={viewerId} />
              {course.status === 'published' ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('facts.enrolled', {
                    count: course.enrollmentCount,
                    formatted: formatNumber(course.enrollmentCount),
                  })}
                </Typography>
              ) : null}
              <CourseFacts course={course} />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </HeroBand>
  );
}
