import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { RevisionChange } from '../api/moderation';

const TONE: Record<RevisionChange['kind'], 'added' | 'removed' | 'changed'> = {
  added: 'added',
  removed: 'removed',
  moved: 'changed',
  edited: 'changed',
  reordered: 'changed',
};

/** The kind of change as a chip: diff tone plus the word (never color alone). */
function KindChip({ kind }: { kind: RevisionChange['kind'] }) {
  const { t } = useTranslation('admin');
  const tone = TONE[kind];
  return (
    <Chip
      size="small"
      label={t(`revision.kinds.${kind}`)}
      data-tone={tone}
      sx={(theme) => {
        const palette = (theme.vars ?? theme).palette;
        return {
          color: palette.diff[tone].fg,
          backgroundColor: palette.diff[tone].bg,
          minWidth: 88,
        };
      }}
    />
  );
}

/** What the change is about: "Module: Basics", "Exam: Final quiz", "Course: Safety". */
function useTargetText() {
  const { t } = useTranslation(['admin', 'courses']);
  return (change: RevisionChange) => {
    const what =
      change.target === 'item' && change.itemType
        ? t(`courses:itemType.${change.itemType}`)
        : t(`revision.targets.${change.target}`);
    return t('revision.changeTitle', { what, title: change.title });
  };
}

function ChangeDetail({ change }: { change: RevisionChange }) {
  const { t } = useTranslation('admin');
  return (
    <Stack spacing={0.5}>
      {change.kind === 'moved' && change.fromModule && change.toModule ? (
        <Typography variant="body2">
          {t('revision.moved', { from: change.fromModule, to: change.toModule })}
        </Typography>
      ) : null}
      {change.fields?.length ? (
        <Typography variant="body2">
          {t('revision.changedFields', {
            fields: change.fields
              .map((field) => t(`revision.fields.${field}`, { defaultValue: field }))
              .join(t('revision.fieldSeparator')),
          })}
        </Typography>
      ) : null}
      {change.kind === 'reordered' ? (
        <Typography variant="body2">
          {t(change.target === 'course' ? 'revision.reorderedModules' : 'revision.reorderedItems')}
        </Typography>
      ) : null}
    </Stack>
  );
}

const hasDetail = (change: RevisionChange) =>
  change.kind === 'reordered' ||
  Boolean(change.fields?.length) ||
  (change.kind === 'moved' && Boolean(change.fromModule && change.toModule));

/** The revision's content changes; each one with more to say expands to show it. */
export function ChangeList({ changes }: { changes: RevisionChange[] }) {
  const { t } = useTranslation('admin');
  const targetText = useTargetText();

  if (changes.length === 0) {
    return <Typography color="text.secondary">{t('revision.noChanges')}</Typography>;
  }
  return (
    <Box
      component="ul"
      aria-label={t('revision.changesTitle')}
      sx={{ listStyle: 'none', p: 0, m: 0 }}
    >
      {changes.map((change, index) => {
        const summary = (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <KindChip kind={change.kind} />
            <Typography sx={{ overflowWrap: 'anywhere' }}>{targetText(change)}</Typography>
          </Stack>
        );
        return (
          <Box
            component="li"
            key={`${change.kind}-${change.target}-${change.title}-${String(index)}`}
          >
            {hasDetail(change) ? (
              <Accordion
                disableGutters
                variant="outlined"
                sx={{ '&:not(:first-of-type)': { borderTop: 0 } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreOutlined />} sx={{ minHeight: 48 }}>
                  {summary}
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pl: { sm: 14 } }}>
                  <ChangeDetail change={change} />
                </AccordionDetails>
              </Accordion>
            ) : (
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  border: 1,
                  borderColor: 'divider',
                  borderTop: index === 0 ? 1 : 0,
                }}
              >
                {summary}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
