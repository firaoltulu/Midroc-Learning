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
import type { CatalogCourse } from '../../courses';

const quietChip = {
  bgcolor: 'surfaceMuted',
  color: 'text.secondary',
  borderRadius: 1,
  height: 24,
  '& .MuiChip-label': { px: 1 },
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
  course: CatalogCourse;
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
        transition: (theme) => theme.transitions.create('border-color'),
        '&:hover': { borderColor: 'text.secondary' },
        // The link's focus ring is drawn around the whole card.
        '&:has(a:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <CourseThumbnail src={course.thumbnailUrl} />
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {course.category ? (
          <Typography variant="caption" color="text.secondary" {...contentLang}>
            {course.category}
          </Typography>
        ) : null}
        <Typography
          variant="h5"
          component={headingLevel}
          sx={{ overflowWrap: 'anywhere' }}
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
          <Typography variant="body2" color="text.secondary">
            {t('catalog:card.byOwner', { name: course.ownerName })}
          </Typography>
        ) : null}
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: 'wrap', gap: 0.75, mt: 'auto', pt: 1, alignItems: 'center' }}
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
