import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import type { CourseDetail } from '../api/schemas';

/** "What you'll learn" (two columns of checks) and "Skills you'll gain" (chips). */
export function CourseLearn({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('courses');
  const contentLang = useContentLang(course.language);

  return (
    <>
      {course.outcomes.length ? (
        <Card
          component="section"
          aria-labelledby="course-outcomes-heading"
          sx={{
            overflow: 'hidden',
            borderColor: 'divider',
            borderTop: 3,
            borderTopColor: 'primary.main',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <CardContent
            sx={{ p: { xs: 2.5, sm: 3.5 }, '&:last-child': { pb: { xs: 2.5, sm: 3.5 } } }}
          >
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 1.5,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <SchoolOutlined />
                </Box>
                <Typography id="course-outcomes-heading" variant="h3" component="h2">
                  {t('learn.outcomes')}
                </Typography>
              </Stack>
              <Box
                component="ul"
                sx={{
                  listStyle: 'none',
                  m: 0,
                  p: 0,
                  display: 'grid',
                  gap: 1.25,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                {course.outcomes.map((outcome) => (
                  <Stack
                    key={outcome}
                    component="li"
                    direction="row"
                    spacing={1.25}
                    sx={{
                      minWidth: 0,
                      alignItems: 'flex-start',
                      p: { xs: 1.5, sm: 1.75 },
                      borderRadius: 1.5,
                      bgcolor: 'surfaceMuted',
                    }}
                  >
                    <CheckCircleOutlined
                      aria-hidden
                      sx={{ color: 'primary.main', mt: '2px', flexShrink: 0 }}
                    />
                    <Typography
                      sx={{ fontWeight: 500, lineHeight: 1.6, overflowWrap: 'anywhere' }}
                      {...contentLang}
                    >
                      {outcome}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {course.skills.length ? (
        <Stack component="section" aria-labelledby="course-skills-heading" spacing={1.5}>
          <Typography id="course-skills-heading" variant="h3" component="h2">
            {t('learn.skills')}
          </Typography>
          <Stack
            component="ul"
            direction="row"
            useFlexGap
            sx={{ listStyle: 'none', m: 0, p: 0, flexWrap: 'wrap', gap: 1 }}
          >
            {course.skills.map((skill) => (
              <li key={skill}>
                <Chip
                  label={skill}
                  size="small"
                  sx={{ bgcolor: 'surfaceMuted', color: 'text.secondary', borderRadius: 1 }}
                  {...contentLang}
                />
              </li>
            ))}
          </Stack>
        </Stack>
      ) : null}
    </>
  );
}
