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
          minWidth: 80,
          height: 24,
          borderRadius: '6px',
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

/** The revision's content changes, one row each: kind, what changed, and the detail. */
export function ChangeList({ changes }: { changes: RevisionChange[] }) {
  const { t } = useTranslation('admin');
  const targetText = useTargetText();

  if (changes.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ px: 2.5, py: 2 }}>
        {t('revision.noChanges')}
      </Typography>
    );
  }
  return (
    <Box
      component="ul"
      aria-label={t('revision.changesTitle')}
      sx={{ listStyle: 'none', p: 0, m: 0 }}
    >
      {changes.map((change, index) => (
        <Stack
          component="li"
          key={`${change.kind}-${change.target}-${change.title}-${String(index)}`}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.5, sm: 1.5 }}
          sx={{
            alignItems: { sm: 'center' },
            px: 2.5,
            py: 1.25,
            borderTop: index === 0 ? 0 : 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
            <KindChip kind={change.kind} />
            <Typography sx={{ overflowWrap: 'anywhere' }}>{targetText(change)}</Typography>
          </Stack>
          <Box
            sx={{
              color: 'text.secondary',
              textAlign: { sm: 'right' },
              flexShrink: 0,
              maxWidth: { sm: '45%' },
            }}
          >
            <ChangeDetail change={change} />
          </Box>
        </Stack>
      ))}
    </Box>
  );
}
