import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RevisionReview } from '../api/moderation';

const COURSE_DIFF_FIELDS = ['title', 'description', 'category', 'language'] as const;
type DiffField = (typeof COURSE_DIFF_FIELDS)[number];
type CourseFields = RevisionReview['diff']['course']['before'];

/** The fields whose value the revision changes. */
function changedCourseFields(before: CourseFields, after: CourseFields): DiffField[] {
  return COURSE_DIFF_FIELDS.filter((field) => (before[field] ?? null) !== (after[field] ?? null));
}

/**
 * Course field changes as "from → to": the old value in the removed tone, the new one in the
 * added tone, each also labeled in text (color is never the only signal).
 */
export function CourseFieldDiff({
  before,
  after,
  contentLang = {},
}: {
  before: CourseFields;
  after: CourseFields;
  contentLang?: { lang?: string };
}) {
  const { t } = useTranslation(['admin', 'common']);
  const fields = changedCourseFields(before, after);

  const display = (field: DiffField, value: string | null | undefined) => {
    if (value == null || value === '') return t('review.none');
    if (field === 'language' && (value === 'en' || value === 'am'))
      return t(`common:languages.${value}`);
    return value;
  };

  if (fields.length === 0) {
    return <Typography color="text.secondary">{t('revision.noCourseChanges')}</Typography>;
  }
  return (
    <Stack component="dl" spacing={2} sx={{ m: 0 }}>
      {fields.map((field) => {
        const userText = field === 'title' || field === 'description' || field === 'category';
        return (
          <Box key={field}>
            <Typography component="dt" sx={{ fontWeight: 600, mb: 0.5 }}>
              {t(`revision.fields.${field}`)}
            </Typography>
            <Stack
              component="dd"
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              sx={{ m: 0, alignItems: { md: 'stretch' } }}
            >
              <DiffValue tone="removed" label={t('revision.before')}>
                <span {...(userText ? contentLang : {})}>{display(field, before[field])}</span>
              </DiffValue>
              <ArrowForwardOutlined
                aria-hidden
                sx={{
                  alignSelf: 'center',
                  color: 'text.secondary',
                  transform: { xs: 'rotate(90deg)', md: 'none' },
                }}
              />
              <DiffValue tone="added" label={t('revision.after')}>
                <span {...(userText ? contentLang : {})}>{display(field, after[field])}</span>
              </DiffValue>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function DiffValue({
  tone,
  label,
  children,
}: {
  tone: 'added' | 'removed';
  label: string;
  children: ReactNode;
}) {
  return (
    <Box
      data-tone={tone}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return {
          flex: 1,
          minWidth: 0,
          p: 1.5,
          borderRadius: 2.5,
          color: palette.diff[tone].fg,
          backgroundColor: palette.diff[tone].bg,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          maxWidth: { md: 520 },
        };
      }}
    >
      <Typography variant="caption" component="span" sx={{ display: 'block', fontWeight: 600 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}
