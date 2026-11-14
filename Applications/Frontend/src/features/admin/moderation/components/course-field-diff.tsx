import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { RevisionReview } from '../api/moderation';

const COURSE_DIFF_FIELDS = ['title', 'description', 'category', 'language', 'outcomes'] as const;
type DiffField = (typeof COURSE_DIFF_FIELDS)[number];
type CourseFields = RevisionReview['diff']['course']['before'];

/** The fields whose value the revision changes. */
function changedCourseFields(before: CourseFields, after: CourseFields): DiffField[] {
  return COURSE_DIFF_FIELDS.filter(
    (field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null),
  );
}

/**
 * Course field changes: the field, then "− old" in the removed tone and "+ new" in the added
 * tone, each also labeled in text (color is never the only signal).
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

  const display = (field: DiffField, value: string | string[] | null | undefined) => {
    // Outcomes: one per line (the box keeps line breaks).
    if (Array.isArray(value)) return value.length ? value.join('\n') : t('review.none');
    if (value == null || value === '') return t('review.none');
    if (field === 'language' && (value === 'en' || value === 'am'))
      return t(`common:languages.${value}`);
    return value;
  };

  if (fields.length === 0) {
    return <Typography color="text.secondary">{t('revision.noCourseChanges')}</Typography>;
  }
  return (
    <Stack component="dl" spacing={2.5} sx={{ m: 0 }}>
      {fields.map((field) => {
        const userText = field !== 'language';
        return (
          <Box key={field}>
            <Typography component="dt" variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              {t(`revision.fields.${field}`)}
            </Typography>
            <Stack component="dd" spacing={0.5} sx={{ m: 0 }}>
              <DiffValue tone="removed" label={t('revision.before')} sign="−">
                <span {...(userText ? contentLang : {})}>{display(field, before[field])}</span>
              </DiffValue>
              <DiffValue tone="added" label={t('revision.after')} sign="+">
                <span {...(userText ? contentLang : {})}>{display(field, after[field])}</span>
              </DiffValue>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * One side of a change as a tinted line: "− old" (removed tone) or "+ new" (added tone). The
 * sign is drawn; the words "Now" / "Proposed" are there for screen readers (never color alone).
 */
function DiffValue({
  tone,
  label,
  sign,
  children,
}: {
  tone: 'added' | 'removed';
  label: string;
  sign: string;
  children: ReactNode;
}) {
  return (
    <Box
      data-tone={tone}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return {
          display: 'flex',
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderRadius: '6px',
          color: palette.diff[tone].fg,
          backgroundColor: palette.diff[tone].bg,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        };
      }}
    >
      <Box component="span" aria-hidden sx={{ fontWeight: 700, flexShrink: 0 }}>
        {sign}
      </Box>
      <Box component="span" sx={visuallyHidden}>
        {`${label}: `}
      </Box>
      <Box component="span" sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
