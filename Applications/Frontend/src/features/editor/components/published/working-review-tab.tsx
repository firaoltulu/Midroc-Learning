import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useKeyText } from '../../lib/key-text';
import type { RevisionChange } from '../../api/revision';
import type { CopyChange } from '../../model/working-copy';
import { useWorkingCopy } from '../../model/working-copy-store';
import { usePublishedEditor } from './published-context';

/** One change as a sentence, e.g. "Added the item “Ladders”" / "Moved “Quiz” to “Basics”". */
function useChangeText() {
  const { t } = useTranslation('editor');
  return (change: CopyChange | RevisionChange) => {
    const title = change.title || t('working.untitled');
    if (change.target === 'course') {
      return change.kind === 'reordered'
        ? t('working.change.modulesReordered')
        : t('working.change.courseEdited');
    }
    if ('toModule' in change && change.kind === 'moved' && change.toModule) {
      return t('working.change.movedTo', { title, module: change.toModule });
    }
    return t(`working.change.${change.kind}.${change.target}`, { title });
  };
}

function ChangeList({
  changes,
  label,
}: {
  changes: (CopyChange | RevisionChange)[];
  label: string;
}) {
  const text = useChangeText();
  return (
    <Card component="ul" aria-label={label} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {changes.map((change, index) => (
        <Box
          component="li"
          key={`${change.kind}-${change.target}-${String(index)}`}
          sx={{
            px: 2,
            py: 1.5,
            borderTop: index === 0 ? 0 : 1,
            borderColor: 'divider',
            overflowWrap: 'anywhere',
          }}
        >
          {text(change)}
        </Box>
      ))}
    </Card>
  );
}

/**
 * Review for a published course: what differs from the live course, what must be fixed
 * before submitting, and what the server recorded for the last submit.
 */
export function WorkingReviewTab() {
  const { t } = useTranslation('editor');
  const keyText = useKeyText();
  const editor = usePublishedEditor();
  const copy = useWorkingCopy((state) => state.copy);
  const select = useWorkingCopy((state) => state.select);
  const submitAttempted = useWorkingCopy((state) => state.submitAttempted);
  const { changes, problems, outcome } = editor;

  const titleOf = (key: string) => {
    for (const module of copy.modules) {
      if (module.key === key) return module.title;
      const item = module.items.find((entry) => entry.key === key);
      if (item) return item.title;
    }
    return '';
  };

  return (
    <Stack spacing={4} sx={{ maxWidth: 720 }}>
      <Stack spacing={1.5} component="section" aria-labelledby="working-changes">
        <Typography id="working-changes" variant="h3" component="h2">
          {t('working.review.changesTitle')}
        </Typography>
        {changes.length === 0 ? (
          <Typography color="text.secondary">{t('working.review.noChanges')}</Typography>
        ) : (
          <ChangeList changes={changes} label={t('working.review.changesTitle')} />
        )}
      </Stack>

      {problems.length > 0 ? (
        <Stack spacing={1.5} component="section" aria-labelledby="working-problems">
          <Typography id="working-problems" variant="h3" component="h2">
            {t('working.review.problemsTitle')}
          </Typography>
          <Typography color="text.secondary">
            {submitAttempted
              ? t('working.review.problemsAfterSubmit')
              : t('working.review.problemsBody')}
          </Typography>
          <Card component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {problems.map((problem, index) => (
              <Stack
                component="li"
                key={`${problem.key}-${problem.message}`}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1,
                  borderTop: index === 0 ? 0 : 1,
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ overflowWrap: 'anywhere' }}>
                  {problem.target === 'course'
                    ? keyText(problem.message)
                    : t('working.review.problemOf', {
                        title: titleOf(problem.key) || t('working.untitled'),
                        problem: keyText(problem.message),
                      })}
                </Typography>
                <Button
                  size="small"
                  sx={{ flexShrink: 0 }}
                  onClick={() => {
                    if (problem.target === 'course') {
                      editor.goToTab(problem.key === 'modules' ? 'content' : 'details');
                      return;
                    }
                    select({ kind: problem.target, key: problem.key });
                    editor.goToTab('content');
                  }}
                >
                  {t('working.review.show')}
                </Button>
              </Stack>
            ))}
          </Card>
        </Stack>
      ) : null}

      {outcome?.kind === 'submitted' ? (
        <Stack spacing={1.5} component="section" aria-labelledby="working-sent">
          <Typography id="working-sent" variant="h3" component="h2">
            {t('working.review.sentTitle')}
          </Typography>
          <Typography color="text.secondary">{t('working.review.sentBody')}</Typography>
          <ChangeList changes={outcome.changes} label={t('working.review.sentTitle')} />
        </Stack>
      ) : null}
    </Stack>
  );
}
