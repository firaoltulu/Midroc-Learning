import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { CourseDetail, ItemType } from '../api/schemas';
import { useDurationLabel } from '../lib/duration';

const ITEM_TYPES: ItemType[] = ['video', 'pdf', 'exam'];

/**
 * The enroll card's facts: how many are enrolled, what the course contains ("12 videos · 3 PDFs
 * · 2 exams"), level and duration, and the language it is taught in.
 */
export function CourseFacts({ course }: { course: CourseDetail }) {
  const { t } = useTranslation(['courses', 'common']);
  const duration = useDurationLabel();

  const counts = ITEM_TYPES.map((type) => ({
    type,
    count: course.modules.reduce(
      (sum, module) => sum + module.items.filter((item) => item.type === type).length,
      0,
    ),
  })).filter(({ count }) => count > 0);

  const levelAndDuration = [
    course.level ? t('courses:facts.level', { level: t(`common:levels.${course.level}`) }) : null,
    course.estimatedDurationMinutes !== null
      ? t('courses:facts.duration', { duration: duration(course.estimatedDurationMinutes) })
      : null,
  ].filter((part): part is string => Boolean(part));

  const lines = [
    counts.length
      ? counts.map(({ type, count }) => t(`courses:facts.items.${type}`, { count })).join(' · ')
      : null,
    levelAndDuration.length ? levelAndDuration.join(' · ') : null,
    t('courses:facts.taughtIn', { language: t(`common:languages.${course.language}`) }),
  ].filter((line): line is string => Boolean(line));

  return (
    <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {lines.map((line) => (
        <Typography key={line} component="li" variant="body2">
          {line}
        </Typography>
      ))}
    </Stack>
  );
}
