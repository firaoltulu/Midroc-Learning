import CheckOutlined from '@mui/icons-material/CheckOutlined';
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
        <Card component="section" aria-labelledby="course-outcomes-heading">
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Typography id="course-outcomes-heading" variant="h4" component="h2" sx={{ mb: 2 }}>
              {t('learn.outcomes')}
            </Typography>
            <Box
              component="ul"
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                display: 'grid',
                gap: 1.5,
                columnGap: 4,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              {course.outcomes.map((outcome) => (
                <Stack key={outcome} component="li" direction="row" spacing={1}>
                  <CheckOutlined
                    aria-hidden
                    fontSize="small"
                    sx={{ color: 'primary.main', mt: '3px', flexShrink: 0 }}
                  />
                  <Typography sx={{ overflowWrap: 'anywhere' }} {...contentLang}>
                    {outcome}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {course.skills.length ? (
        <Stack component="section" aria-labelledby="course-skills-heading" spacing={1.5}>
          <Typography id="course-skills-heading" variant="h4" component="h2">
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
