import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import type { CopyChange } from '../../model/working-copy';
import { usePublishedEditor } from './published-context';

const KINDS: CopyChange['kind'][] = ['added', 'removed', 'moved', 'edited', 'reordered'];

/** "2 added · 1 edited": the changes by kind. */
function useChangeCounts() {
  const { t } = useTranslation('editor');
  return (changes: CopyChange[]) =>
    KINDS.flatMap((kind) => {
      const count = changes.filter((change) => change.kind === kind).length;
      return count > 0 ? [t(`working.counts.${kind}`, { count })] : [];
    }).join(' · ');
}

/**
 * The bar at the bottom of the published editor: how many changes there are compared with
 * the live course, what happened to the last submit, and the one primary action, "Submit
 * changes for review".
 */
export function ChangeBar() {
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const counts = useChangeCounts();
  const editor = usePublishedEditor();
  const { changes, hasEdits, outcome, revisionState } = editor;
  const pending = Boolean(revisionState.revision);

  const summary =
    changes.length === 0
      ? t('working.bar.none')
      : pending && !hasEdits
        ? t('working.bar.waiting', { count: changes.length })
        : t('working.bar.count', { count: changes.length });

  const message =
    outcome?.kind === 'problems'
      ? t('working.outcome.problems')
      : outcome?.kind === 'unchanged'
        ? t('working.outcome.unchanged')
        : outcome?.kind === 'itemError' || outcome?.kind === 'error'
          ? errorMessage(outcome.error)
          : null;

  return (
    <Box
      component="section"
      aria-label={t('working.bar.label')}
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        mt: 3,
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 3 },
        py: 2,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        borderRadius: { sm: '14px 14px 0 0' },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }} aria-live="polite">
          <Typography sx={{ fontWeight: 600 }}>{summary}</Typography>
          {changes.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              {counts(changes)}
            </Typography>
          ) : null}
          {message ? (
            <Typography
              variant="body2"
              role="alert"
              sx={{
                color: outcome?.kind === 'unchanged' ? 'text.secondary' : 'error.main',
                mt: 0.5,
              }}
            >
              {message}
            </Typography>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', flexShrink: 0 }}>
          {outcome?.kind === 'problems' ? (
            <Button
              onClick={() => {
                editor.goToTab('review');
              }}
            >
              {t('working.outcome.showProblems')}
            </Button>
          ) : null}
          {outcome?.kind === 'itemError' ? (
            <Button
              onClick={() => {
                editor.showItem(outcome.itemKey);
              }}
            >
              {t('working.outcome.showItem')}
            </Button>
          ) : null}
          {hasEdits ? (
            <Button onClick={editor.requestDiscard}>{t('working.discard')}</Button>
          ) : null}
          {hasEdits || !pending ? (
            <Button variant="contained" onClick={editor.submit} loading={editor.submitting}>
              {t('working.submit')}
            </Button>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
