import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { CatalogCourse } from '../api/schemas';
import { useDurationLabel } from '../lib/duration';

/**
 * One quiet line of facts: language, category, modules, duration. Separated by middots that
 * screen readers skip.
 */
export function CourseMeta({
  course,
  showModules = true,
}: {
  course: Pick<CatalogCourse, 'language' | 'category' | 'moduleCount' | 'estimatedDurationMinutes'>;
  showModules?: boolean;
}) {
  const { t } = useTranslation(['courses', 'common']);
  const duration = useDurationLabel();
  const parts = [
    t(`common:languages.${course.language}`),
    course.category,
    showModules ? t('courses:meta.modules', { count: course.moduleCount }) : null,
    course.estimatedDurationMinutes !== null ? duration(course.estimatedDurationMinutes) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{ flexWrap: 'wrap', columnGap: 1, rowGap: 0.5, color: 'text.secondary' }}
    >
      {parts.map((part, index) => (
        <Typography key={`${String(index)}-${part}`} variant="body2" component="span">
          {index > 0 ? (
            <span aria-hidden="true" style={{ marginInlineEnd: 8 }}>
              ·
            </span>
          ) : null}
          {part}
        </Typography>
      ))}
    </Stack>
  );
}
