import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { RouterLink } from '../../../shared/ui/router-links';
import { CourseRating, type CatalogCourse } from '../../courses';

/** What a card shows: a catalog course, or a public one (signed out, no `enrolled`). */
export type CardCourse = Pick<
  CatalogCourse,
  | 'id'
  | 'title'
  | 'category'
  | 'language'
  | 'thumbnailUrl'
  | 'ownerName'
  | 'level'
  | 'ratingAverage'
  | 'ratingCount'
> & { enrolled?: boolean };

const quietChip = {
  bgcolor: 'surfaceMuted',
  color: 'text.secondary',
  border: 1,
  borderColor: 'divider',
  borderRadius: '4px',
  height: 28,
  '& .MuiChip-label': { px: 1.1, fontSize: '0.75rem', fontWeight: 600 },
} as const;

/**
 * A course card: thumbnail, category, title, author, then the level and language as quiet
 * chips. The title is the link; it stretches over the whole card so the card is clickable
 * while screen readers hear one clean link name.
 */
export function CourseCard({
  course,
  headingLevel = 'h2',
}: {
  course: CardCourse;
  /** h2 in the catalog, h3 under a section heading (home page). */
  headingLevel?: 'h2' | 'h3';
}) {
  const { t } = useTranslation(['catalog', 'common']);
  const contentLang = useContentLang(course.language);

  return (
    <Card
      component="article"
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        boxShadow: '0 4px 14px rgba(13, 36, 25, 0.04)',
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.short,
          }),
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 12px 28px rgba(13, 36, 25, 0.12)',
          transform: 'translateY(-4px)',
        },
        '&:hover [data-testid="course-thumbnail"] img': { transform: 'scale(1.04)' },
        '&:hover h3 a, &:hover h2 a': { color: 'primary.main' },
        // The link's focus ring is drawn around the whole card.
        '&:has(a:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <CourseThumbnail src={course.thumbnailUrl} />
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2.25 }}>
        {course.category ? (
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', fontWeight: 700 }}
            {...contentLang}
          >
            {course.category}
          </Typography>
        ) : null}
        <Typography
          variant="h5"
          component={headingLevel}
          sx={{
            minHeight: '2.8em',
            overflowWrap: 'anywhere',
            fontSize: '1.0625rem',
            fontWeight: 700,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
          {...contentLang}
        >
          <RouterLink
            to="/courses/$courseId"
            params={{ courseId: course.id }}
            underline="none"
            color="inherit"
            sx={{
              // Stretched link: the whole card is the click target.
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
              },
              '&:focus-visible': { outline: 'none' },
            }}
          >
            {course.title}
          </RouterLink>
        </Typography>
        {course.ownerName ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {t('catalog:card.byOwner', { name: course.ownerName })}
          </Typography>
        ) : null}
        {course.ratingAverage !== null ? (
          <CourseRating average={course.ratingAverage} count={course.ratingCount} />
        ) : null}
        <Stack
          direction="row"
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            gap: 0.75,
            mt: 'auto',
            pt: 1.25,
            alignItems: 'center',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {course.level ? (
            <Chip size="small" label={t(`common:levels.${course.level}`)} sx={quietChip} />
          ) : null}
          <Chip
            size="small"
            lang={course.language}
            label={t(`common:languages.${course.language}`)}
            sx={quietChip}
          />
          {course.enrolled ? (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              icon={<CheckCircleOutlined />}
              label={t('catalog:card.enrolled')}
              sx={{ height: 24 }}
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
