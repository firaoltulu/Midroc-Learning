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
import { CourseMeta, type CatalogCourse } from '../../courses';

/**
 * A catalog entry. The title is the link; it stretches over the whole card so the card is
 * clickable while screen readers hear one clean link name.
 */
export function CourseCard({ course }: { course: CatalogCourse }) {
  const { t } = useTranslation('catalog');
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
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h4" component="h2" sx={{ overflowWrap: 'anywhere' }} {...contentLang}>
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
            {t('card.byOwner', { name: course.ownerName })}
          </Typography>
        ) : null}
        <CourseMeta course={course} />
        <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 1, alignItems: 'center' }}>
          {course.enrolled ? (
            <Chip
              size="small"
              variant="outlined"
              color="success"
              icon={<CheckCircleOutlined />}
              label={t('card.enrolled')}
            />
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {t('card.learners', { count: course.enrollmentCount })}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
