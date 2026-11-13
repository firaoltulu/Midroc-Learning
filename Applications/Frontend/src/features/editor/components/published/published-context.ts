import { createContext, useContext } from 'react';
import type { RevisionChange, RevisionState } from '../../api/revision';
import type { AuthoringView } from '../../api/schemas';
import type { CopyChange, CopyProblem } from '../../model/working-copy';

/** What the last "Submit changes for review" did, shown in the bar and on the Review tab. */
export type SubmitOutcome =
  | { kind: 'submitted'; changes: RevisionChange[] }
  | { kind: 'unchanged' }
  | { kind: 'problems' }
  | { kind: 'itemError'; error: unknown; itemKey: string }
  | { kind: 'error'; error: unknown };

export interface PublishedEditorApi {
  view: AuthoringView;
  revisionState: RevisionState;
  /** The working copy compared with the live course. */
  changes: CopyChange[];
  problems: CopyProblem[];
  /** The copy differs from what it started from (the pending revision or the live course). */
  hasEdits: boolean;
  submitting: boolean;
  outcome: SubmitOutcome | null;
  submit: () => void;
  /** Asks first, then withdraws the pending revision. */
  requestWithdraw: () => void;
  /** Asks first, then drops the unsubmitted edits. */
  requestDiscard: () => void;
  /** Opens the Content tab on an item (e.g. one the server refused). */
  showItem: (key: string) => void;
  goToTab: (tab: 'details' | 'content' | 'review') => void;
}

export const PublishedEditorContext = createContext<PublishedEditorApi | null>(null);

export function usePublishedEditor(): PublishedEditorApi {
  const api = useContext(PublishedEditorContext);
  if (!api) throw new Error('usePublishedEditor must be used inside the published editor');
  return api;
}
