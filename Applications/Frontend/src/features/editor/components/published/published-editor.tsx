import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { authoringKeys } from '../../../../shared/api/query-keys';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../../shared/ui/error-state';
import { TextSkeleton } from '../../../../shared/ui/skeletons';
import { useToast } from '../../../../shared/ui/toast/toast-context';
import { authoringQueryOptions } from '../../api/authoring';
import {
  revisionQueryOptions,
  useSaveRevision,
  useWithdrawRevision,
  type RevisionState,
} from '../../api/revision';
import type { AuthoringView } from '../../api/schemas';
import {
  copyProblems,
  fromLive,
  fromRevision,
  liveHash,
  sameCopy,
  summarizeCopy,
  toRevisionInput,
} from '../../model/working-copy';
import {
  clearPersisted,
  createWorkingCopyStore,
  readPersisted,
  WorkingCopyContext,
  type WorkingCopyStore,
} from '../../model/working-copy-store';
import { useStore } from 'zustand';
import type { EditorTab } from '../../schemas/editor-search';
import { ChangeBar } from './change-bar';
import {
  PublishedEditorContext,
  type PublishedEditorApi,
  type SubmitOutcome,
} from './published-context';

const MEDIA_CODES = [
  'VIDEO_INVALID_LINK',
  'VIDEO_UNAVAILABLE',
  'YOUTUBE_UNREACHABLE',
  'PDF_INVALID',
];
const STALE_CODES = ['STALE_REVISION', 'STALE', 'INVALID_CONTENT_REFERENCE'];

function baseOf(view: AuthoringView, revisionState: RevisionState) {
  const revision = revisionState.revision;
  return {
    base: revision ? fromRevision(view, revision) : fromLive(view),
    hash: liveHash(view, revision),
  };
}

/**
 * Editing a published course (spec section 8): loads the pending revision as well, keeps
 * the working copy (zustand, saved in this browser) and renders the tabs with the change bar.
 */
export function PublishedEditor({
  view,
  renderTabs,
  onTabChange,
}: {
  view: AuthoringView;
  /** The editor's tabs and panels; called inside the working copy's providers. */
  renderTabs: () => ReactNode;
  onTabChange: (tab: EditorTab) => void;
}) {
  const errorMessage = useErrorMessage();
  const revision = useQuery(revisionQueryOptions(view.course.id));

  if (revision.isPending) return <TextSkeleton lines={6} />;
  if (revision.isError) {
    return (
      <ErrorState
        description={errorMessage(revision.error)}
        onRetry={() => void revision.refetch()}
      />
    );
  }
  return (
    <WorkingCopyEditor
      view={view}
      revisionState={revision.data}
      renderTabs={renderTabs}
      onTabChange={onTabChange}
    />
  );
}

function WorkingCopyEditor({
  view,
  revisionState,
  renderTabs,
  onTabChange,
}: {
  view: AuthoringView;
  revisionState: RevisionState;
  renderTabs: () => ReactNode;
  onTabChange: (tab: EditorTab) => void;
}) {
  const courseId = view.course.id;
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const { formatDate } = useDateFormat();
  const toast = useToast();
  const queryClient = useQueryClient();
  const saveRevision = useSaveRevision(courseId);
  const withdraw = useWithdrawRevision(courseId);

  // Created once, from what was saved in this browser when it still matches the course.
  const [{ store, discardedOnLoad }] = useState(() => {
    const { base, hash } = baseOf(view, revisionState);
    const stored = readPersisted(courseId);
    const fresh = stored?.baseHash === hash;
    if (stored && !fresh) clearPersisted(courseId);
    return {
      store: createWorkingCopyStore({
        courseId,
        base,
        baseHash: hash,
        copy: fresh ? stored.copy : base,
      }),
      discardedOnLoad: Boolean(stored && !fresh),
    };
  });
  const copy = useStore(store, (state) => state.copy);
  const base = useStore(store, (state) => state.base);
  const baseHash = useStore(store, (state) => state.baseHash);

  const [loadNotice, setLoadNotice] = useState(discardedOnLoad);
  // The server said the copy is based on an old version (set by a failed submit).
  const [staleError, setStaleError] = useState(false);
  const [confirm, setConfirm] = useState<'withdraw' | 'discard' | 'reload' | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);

  const live = useMemo(() => fromLive(view), [view]);
  const changes = useMemo(() => summarizeCopy(copy, live), [copy, live]);
  const problems = useMemo(() => copyProblems(copy), [copy]);
  const hasEdits = useMemo(() => !sameCopy(copy, base), [copy, base]);

  // The course or its revision changed on the server (a decision, another tab, our own
  // submit): follow it when there's nothing local to lose, otherwise ask.
  const currentHash = liveHash(view, revisionState.revision);
  useEffect(() => {
    if (currentHash === baseHash) return;
    const state = store.getState();
    if (sameCopy(state.copy, state.base)) {
      const next = baseOf(view, revisionState);
      state.reset(next.base, next.hash);
    }
  }, [currentHash, baseHash, store, view, revisionState]);
  const outdated = staleError || (currentHash !== baseHash && hasEdits);

  const reloadLatest = async () => {
    const [freshView, freshRevision] = await Promise.all([
      queryClient.query({ ...authoringQueryOptions(courseId), staleTime: 0 }),
      queryClient.query({ ...revisionQueryOptions(courseId), staleTime: 0 }),
    ]);
    const next = baseOf(freshView, freshRevision);
    store.getState().reset(next.base, next.hash);
    setStaleError(false);
    setOutcome(null);
  };

  const keepEditing = () => {
    // Keep the copy, now based on the current course (no more prompts for this change).
    const next = baseOf(view, revisionState);
    store.setState({ base: next.base, baseHash: next.hash });
    setStaleError(false);
  };

  const submit = () => {
    const state = store.getState();
    state.setSubmitAttempted(true);
    if (copyProblems(state.copy).length > 0) {
      setOutcome({ kind: 'problems' });
      return;
    }
    setOutcome(null);
    saveRevision.mutate(toRevisionInput(state.copy), {
      onSuccess: (result) => {
        if (result.unchanged) {
          state.reset(fromLive(view), liveHash(view, null));
          setOutcome({ kind: 'unchanged' });
          return;
        }
        state.markSubmitted(state.baseHash);
        state.setSubmitAttempted(false);
        setOutcome({ kind: 'submitted', changes: result.changes });
        toast.show({ message: t('working.submitted'), severity: 'success' });
      },
      onError: (error) => {
        const params = isApiError(error) ? error.params : undefined;
        const moduleIndex = params?.moduleIndex;
        const itemIndex = params?.itemIndex;
        const located =
          typeof moduleIndex === 'number' && typeof itemIndex === 'number'
            ? state.copy.modules[moduleIndex]?.items[itemIndex]
            : issueItem(error, state.copy);
        if (
          located &&
          (MEDIA_CODES.some((code) => isApiError(error, code)) ||
            isApiError(error, 'VALIDATION_FAILED'))
        ) {
          state.setItemError(located.key, error);
          setOutcome({ kind: 'itemError', error, itemKey: located.key });
          return;
        }
        if (STALE_CODES.some((code) => isApiError(error, code))) {
          // The warning above the tabs explains it and offers the choice.
          setStaleError(true);
          void queryClient.invalidateQueries({ queryKey: authoringKeys.course(courseId) });
          return;
        }
        if (isApiError(error, 'LOCKED') || isApiError(error, 'NOT_PUBLISHED')) {
          // No longer published: the editor switches to the draft flow once reloaded.
          clearPersisted(courseId);
          void queryClient.invalidateQueries({ queryKey: authoringKeys.course(courseId) });
        }
        setOutcome({ kind: 'error', error });
      },
    });
  };

  const api: PublishedEditorApi = {
    view,
    revisionState,
    changes,
    problems,
    hasEdits,
    submitting: saveRevision.isPending,
    outcome,
    submit,
    requestWithdraw: () => {
      setConfirm('withdraw');
    },
    requestDiscard: () => {
      setConfirm('discard');
    },
    showItem: (key) => {
      store.getState().select({ kind: 'item', key });
      onTabChange('content');
    },
    goToTab: onTabChange,
  };

  const pending = revisionState.revision;
  const lastDecision = revisionState.lastDecision;

  return (
    <WorkingCopyContext value={store}>
      <PublishedEditorContext value={api}>
        <Stack spacing={3} sx={{ pb: 12 }}>
          {loadNotice ? (
            <Alert
              severity="info"
              variant="outlined"
              onClose={() => {
                setLoadNotice(false);
              }}
            >
              {t('working.discardedOnLoad')}
            </Alert>
          ) : null}
          {outdated ? (
            <Alert
              severity="warning"
              variant="outlined"
              role="alert"
              action={
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <Button color="inherit" size="small" onClick={keepEditing}>
                    {t('working.stale.keep')}
                  </Button>
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setConfirm('reload');
                    }}
                  >
                    {t('working.stale.reload')}
                  </Button>
                </Stack>
              }
            >
              {t('working.stale.body')}
            </Alert>
          ) : null}
          {pending ? (
            <Alert
              severity="info"
              variant="outlined"
              action={
                <Button color="inherit" size="small" onClick={api.requestWithdraw}>
                  {t('working.withdraw')}
                </Button>
              }
            >
              {t('working.pending', { date: formatDate(pending.submittedAt) })}
            </Alert>
          ) : lastDecision?.status === 'rejected' ? (
            <Alert severity="warning" variant="outlined">
              {t('working.lastRejected')}
              {lastDecision.reason ? (
                <Box
                  component="span"
                  sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {t('banner.reason', { reason: lastDecision.reason })}
                </Box>
              ) : null}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              {t('working.intro')}
            </Alert>
          )}
          {renderTabs()}
        </Stack>
        <ChangeBar />

        <ConfirmDialog
          open={confirm === 'withdraw'}
          tone="danger"
          title={t('working.withdrawTitle')}
          description={t('working.withdrawBody')}
          confirmLabel={t('working.withdraw')}
          onClose={() => {
            setConfirm(null);
          }}
          onConfirm={async () => {
            try {
              await withdraw.mutateAsync();
              store.getState().reset(fromLive(view), liveHash(view, null));
              setOutcome(null);
              toast.show({ message: t('working.withdrawn'), severity: 'success' });
            } catch (error) {
              toast.show({ message: errorMessage(error), severity: 'error' });
            } finally {
              setConfirm(null);
            }
          }}
        />
        <ConfirmDialog
          open={confirm === 'discard'}
          tone="danger"
          title={t('working.discardTitle')}
          description={t('working.discardBody')}
          confirmLabel={t('working.discard')}
          onClose={() => {
            setConfirm(null);
          }}
          onConfirm={() => {
            const state = store.getState();
            state.reset(state.base, state.baseHash);
            setOutcome(null);
            setConfirm(null);
          }}
        />
        <ConfirmDialog
          open={confirm === 'reload'}
          tone="danger"
          title={t('working.stale.reloadTitle')}
          description={t('working.stale.reloadBody')}
          confirmLabel={t('working.stale.reload')}
          onClose={() => {
            setConfirm(null);
          }}
          onConfirm={async () => {
            await reloadLatest();
            setConfirm(null);
          }}
        />
      </PublishedEditorContext>
    </WorkingCopyContext>
  );
}

/** A validation issue's item, from its path (['modules', 1, 'items', 0, ...]). */
function issueItem(error: unknown, copy: ReturnType<WorkingCopyStore['getState']>['copy']) {
  if (!isApiError(error)) return undefined;
  for (const issue of error.issues) {
    const [first, moduleIndex, second, itemIndex] = issue.path;
    if (
      first === 'modules' &&
      second === 'items' &&
      typeof moduleIndex === 'number' &&
      typeof itemIndex === 'number'
    ) {
      const item = copy.modules[moduleIndex]?.items[itemIndex];
      if (item) return item;
    }
  }
  return undefined;
}
