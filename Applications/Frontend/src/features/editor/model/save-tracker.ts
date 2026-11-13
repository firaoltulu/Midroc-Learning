import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * What the editor's save indicator shows, across every field and structural change:
 *   saving: a change is waiting for its debounce or a request is running;
 *   error:  a change couldn't be saved (the field or item shows why);
 *   invalid: a change can't be sent until it's complete (the field shows what's missing);
 *   saved:  everything changed so far is on the server;
 *   idle:   nothing has been changed yet.
 * Each change source is a "slot" (e.g. 'course.title', 'item:<id>.questions').
 */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'invalid';

export interface SaveTracker {
  subscribe: (listener: () => void) => () => void;
  getState: () => SaveState;
  /** True while anything is unsaved (used to warn before leaving the page). */
  hasUnsaved: () => boolean;
  /** A slot has (or no longer has) a change that isn't sent yet. */
  setDirty: (slot: string, dirty: boolean) => void;
  /** A slot's change can't be sent (e.g. it fails client validation). */
  setInvalid: (slot: string, invalid: boolean) => void;
  /**
   * Runs one save for a slot, tracking it; rethrows the error so the caller can show it.
   * A failure keeps the indicator on "Couldn't save" until the slot saves again, unless
   * `reportFailure` is false (the caller explains the failure itself, e.g. in a dialog).
   */
  run: <T>(
    slot: string,
    save: () => Promise<T>,
    options?: { reportFailure?: boolean },
  ) => Promise<T>;
}

export function createSaveTracker(): SaveTracker {
  const listeners = new Set<() => void>();
  const dirty = new Set<string>();
  const failed = new Set<string>();
  const invalid = new Set<string>();
  let pending = 0;
  let savedOnce = false;
  let state: SaveState = 'idle';

  const update = () => {
    const next: SaveState =
      failed.size > 0
        ? 'error'
        : invalid.size > 0
          ? 'invalid'
          : pending > 0 || dirty.size > 0
            ? 'saving'
            : savedOnce
              ? 'saved'
              : 'idle';
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };

  const toggle = (set: Set<string>, slot: string, on: boolean) => {
    if (on) set.add(slot);
    else set.delete(slot);
    update();
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    hasUnsaved: () => pending > 0 || dirty.size > 0 || failed.size > 0 || invalid.size > 0,
    setDirty: (slot, on) => {
      toggle(dirty, slot, on);
    },
    setInvalid: (slot, on) => {
      toggle(invalid, slot, on);
    },
    run: async (slot, save, options) => {
      pending += 1;
      update();
      try {
        const result = await save();
        failed.delete(slot);
        savedOnce = true;
        return result;
      } catch (error) {
        if (options?.reportFailure !== false) failed.add(slot);
        throw error;
      } finally {
        pending -= 1;
        update();
      }
    },
  };
}

export const SaveTrackerContext = createContext<SaveTracker | null>(null);

export function useSaveTracker(): SaveTracker {
  const tracker = useContext(SaveTrackerContext);
  if (!tracker) throw new Error('useSaveTracker must be used inside the editor');
  return tracker;
}

export function useSaveState(): SaveState {
  const tracker = useSaveTracker();
  return useSyncExternalStore(tracker.subscribe, tracker.getState);
}
