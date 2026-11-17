import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { useNumberFormat } from '../../../shared/i18n/format-number';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { HeroBand } from '../../../shared/ui/hero-band';
import { RouterLink } from '../../../shared/ui/router-links';
import { StatusChip } from '../../../shared/ui/status-chip';
import type { CourseDetail } from '../api/schemas';
import { CourseActionPanel } from './course-action-panel';
import { CourseFacts } from './course-facts';
import { firstParagraph, formatRating } from '../lib/course-text';
import { RatingStars } from './rating-stars';

/**
 * Editorial course overview: title and summary beside the cover and enrollment panel.
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
    <HeroBand tone="surface">
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 5 },
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 380px' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ minWidth: 0, pt: { md: 1 } }}>
          <Box component="nav" aria-label={t('detail.breadcrumb')}>
            <Stack
              component="ol"
              direction="row"
              useFlexGap
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                flexWrap: 'wrap',
                gap: 0.75,
                color: 'text.secondary',
              }}
            >
              <Typography component="li" variant="body2">
                <RouterLink
                  to="/courses"
                  underline="hover"
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
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
                    sx={{ color: 'primary.main', fontWeight: 600 }}
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
                fontSize: { xs: 'clamp(2rem, 7vw, 2.75rem)', md: 'clamp(2.75rem, 4.2vw, 3.75rem)' },
                fontWeight: 700,
                lineHeight: 1.15,
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
                color: 'text.secondary',
                fontSize: '1.125rem',
                maxWidth: 720,
                lineHeight: 1.75,
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

          <Stack direction="row" useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {course.ratingAverage !== null ? (
              <>
                <RatingStars value={course.ratingAverage} />
                <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {t('rating.summary', {
                    rating: formatRating(course.ratingAverage),
                    count: course.ratingCount,
                    ratings: formatNumber(course.ratingCount),
                  })}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">{t('rating.none')}</Typography>
            )}
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              pt: 1.5,
              borderTop: 1,
              borderColor: 'divider',
              overflowWrap: 'anywhere',
            }}
          >
            {[
              course.ownerName ? t('detail.createdBy', { name: course.ownerName }) : null,
              t('detail.updated', { date: formatDate(course.updatedAt) }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        </Stack>

        <Stack component="aside" aria-label={t('detail.actionsLabel')} spacing={0}>
          <Box sx={{ overflow: 'hidden', borderRadius: 2, bgcolor: 'surfaceMuted' }}>
            <CourseThumbnail src={course.thumbnailUrl} />
          </Box>
          <Card
            sx={{
              position: 'relative',
              zIndex: 1,
              mx: { xs: 0, md: 2 },
              mt: { xs: 2, md: -4 },
              color: 'text.primary',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
              <Stack spacing={2}>
                <CourseActionPanel course={course} viewerId={viewerId} />
                {course.status === 'published' ? (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 1.5,
                      bgcolor: 'surfaceMuted',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('facts.enrolled', {
                        count: course.enrollmentCount,
                        formatted: formatNumber(course.enrollmentCount),
                      })}
                    </Typography>
                  </Box>
                ) : null}
                <Divider />
                <CourseFacts course={course} />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </HeroBand>
  );
}
