import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { USER_STORAGE_PREFIX } from '../../../shared/lib/user-storage';
import { move, newKey, type QuestionDraft } from './questions';
import {
  sameCopy,
  type WorkingCopy,
  type WorkingCourse,
  type WorkingExam,
  type WorkingItem,
  type WorkingModule,
} from './working-copy';

/**
 * The working copy of one published course, in a zustand store (the only place the app uses
 * zustand). Persisted per course in localStorage under the per-user prefix (cleared on
 * sign-out), together with the hash of the live course it was based on: a copy whose base
 * changed is discarded on load, with a notice.
 */

const STORAGE_VERSION = 1;
export const workingCopyStorageKey = (courseId: string) =>
  `${USER_STORAGE_PREFIX}workingCopy.${courseId}`;

interface Persisted {
  version: number;
  baseHash: string;
  copy: WorkingCopy;
}

export function readPersisted(courseId: string): Persisted | null {
  try {
    const raw = localStorage.getItem(workingCopyStorageKey(courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    if (parsed.version !== STORAGE_VERSION || !parsed.copy || !parsed.baseHash) return null;
    return parsed as Persisted;
  } catch {
    return null;
  }
}

export function clearPersisted(courseId: string) {
  try {
    localStorage.removeItem(workingCopyStorageKey(courseId));
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

function writePersisted(courseId: string, value: Persisted) {
  try {
    localStorage.setItem(workingCopyStorageKey(courseId), JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the copy still lives in memory for this visit.
  }
}

export interface WorkingCopyState {
  courseId: string;
  /** What the copy started from: the pending revision, or the live course. */
  base: WorkingCopy;
  baseHash: string;
  copy: WorkingCopy;

  // Screen state (not persisted).
  /** The module or item open in the Content tab (by key). */
  selection: { kind: 'module' | 'item'; key: string } | null;
  /** Submitting was tried: every problem is shown, not only those the author has left. */
  submitAttempted: boolean;
  /** Errors the server reported for one item (e.g. a video link), by item key. */
  itemErrors: Record<string, unknown>;
  select: (selection: WorkingCopyState['selection']) => void;
  setSubmitAttempted: (value: boolean) => void;
  setItemError: (key: string, error: unknown) => void;

  /** Starts over from a (new) base; the stored copy is removed. */
  reset: (base: WorkingCopy, baseHash: string) => void;
  /** After a successful submit: the copy becomes the new base. */
  markSubmitted: (baseHash: string) => void;
  /** Keeps the edits on top of a new base (withdrawn changes, "Keep my edits"). */
  rebase: (base: WorkingCopy, baseHash: string) => void;

  setCourse: (patch: Partial<WorkingCourse>) => void;

  addModule: (title: string) => string;
  updateModule: (key: string, patch: Partial<Pick<WorkingModule, 'title' | 'description'>>) => void;
  removeModule: (key: string) => void;
  moveModule: (from: number, to: number) => void;
  orderModules: (keys: string[]) => void;

  addItem: (moduleKey: string, item: Omit<WorkingItem, 'key'>) => string;
  updateItem: (key: string, patch: Partial<Omit<WorkingItem, 'key' | 'id' | 'type'>>) => void;
  updateExam: (key: string, patch: Partial<WorkingExam>) => void;
  setQuestions: (key: string, update: (questions: QuestionDraft[]) => QuestionDraft[]) => void;
  removeItem: (key: string) => void;
  /** Within its module, or to another module (an existing item keeps its id). */
  moveItem: (key: string, toModuleKey: string, toIndex: number) => void;
  orderItems: (moduleKey: string, keys: string[]) => void;
}

export type WorkingCopyStore = StoreApi<WorkingCopyState>;

const byKeys = <T extends { key: string }>(entries: T[], keys: string[]) =>
  [...entries].sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));

export function createWorkingCopyStore(options: {
  courseId: string;
  base: WorkingCopy;
  baseHash: string;
  copy: WorkingCopy;
}): WorkingCopyStore {
  const store = createStore<WorkingCopyState>()((set, get) => {
    const edit = (update: (copy: WorkingCopy) => WorkingCopy) => {
      set({ copy: update(get().copy) });
    };
    const editModules = (update: (modules: WorkingModule[]) => WorkingModule[]) => {
      edit((copy) => ({ ...copy, modules: update(copy.modules) }));
    };
    const editItem = (key: string, update: (item: WorkingItem) => WorkingItem) => {
      editModules((modules) =>
        modules.map((module) => ({
          ...module,
          items: module.items.map((item) => (item.key === key ? update(item) : item)),
        })),
      );
    };

    return {
      courseId: options.courseId,
      base: options.base,
      baseHash: options.baseHash,
      copy: options.copy,

      selection: null,
      submitAttempted: false,
      itemErrors: {},
      select: (selection) => {
        set({ selection });
      },
      setSubmitAttempted: (value) => {
        set({ submitAttempted: value });
      },
      setItemError: (key, error) => {
        const others = Object.fromEntries(
          Object.entries(get().itemErrors).filter(([entry]) => entry !== key),
        );
        set({ itemErrors: error ? { ...others, [key]: error } : others });
      },

      reset: (base, baseHash) => {
        clearPersisted(options.courseId);
        set({ base, baseHash, copy: base, submitAttempted: false, itemErrors: {} });
      },
      markSubmitted: (baseHash) => {
        clearPersisted(options.courseId);
        set({ base: get().copy, baseHash });
      },
      rebase: (base, baseHash) => {
        const { copy } = get();
        if (sameCopy(copy, base)) {
          clearPersisted(options.courseId);
          set({ base, baseHash, copy: base });
          return;
        }
        // Saved again under the new hash, so a reload keeps the edits.
        writePersisted(options.courseId, { version: STORAGE_VERSION, baseHash, copy });
        set({ base, baseHash });
      },

      setCourse: (patch) => {
        edit((copy) => ({ ...copy, course: { ...copy.course, ...patch } }));
      },

      addModule: (title) => {
        const key = newKey();
        editModules((modules) => [...modules, { key, title, description: '', items: [] }]);
        return key;
      },
      updateModule: (key, patch) => {
        editModules((modules) =>
          modules.map((module) => (module.key === key ? { ...module, ...patch } : module)),
        );
      },
      removeModule: (key) => {
        editModules((modules) => modules.filter((module) => module.key !== key));
      },
      moveModule: (from, to) => {
        editModules((modules) => move(modules, from, to));
      },
      orderModules: (keys) => {
        editModules((modules) => byKeys(modules, keys));
      },

      addItem: (moduleKey, item) => {
        const key = newKey();
        editModules((modules) =>
          modules.map((module) =>
            module.key === moduleKey
              ? { ...module, items: [...module.items, { ...item, key }] }
              : module,
          ),
        );
        return key;
      },
      updateItem: (key, patch) => {
        editItem(key, (item) => ({ ...item, ...patch }));
        // A changed video link or file replaces whatever the server said about the old one.
        if ((patch.video || patch.pdf) && key in get().itemErrors) get().setItemError(key, null);
      },
      updateExam: (key, patch) => {
        editItem(key, (item) => (item.exam ? { ...item, exam: { ...item.exam, ...patch } } : item));
      },
      setQuestions: (key, update) => {
        editItem(key, (item) =>
          item.exam
            ? { ...item, exam: { ...item.exam, questions: update(item.exam.questions) } }
            : item,
        );
      },
      removeItem: (key) => {
        editModules((modules) =>
          modules.map((module) => ({
            ...module,
            items: module.items.filter((item) => item.key !== key),
          })),
        );
      },
      moveItem: (key, toModuleKey, toIndex) => {
        editModules((modules) => {
          const moving = modules.flatMap((module) => module.items).find((item) => item.key === key);
          if (!moving) return modules;
          return modules.map((module) => {
            const items = module.items.filter((item) => item.key !== key);
            if (module.key !== toModuleKey) return { ...module, items };
            const index = Math.max(0, Math.min(toIndex, items.length));
            return { ...module, items: [...items.slice(0, index), moving, ...items.slice(index)] };
          });
        });
      },
      orderItems: (moduleKey, keys) => {
        editModules((modules) =>
          modules.map((module) =>
            module.key === moduleKey ? { ...module, items: byKeys(module.items, keys) } : module,
          ),
        );
      },
    };
  });

  // Persist every edit (only while the copy differs from its base).
  store.subscribe((state, previous) => {
    if (state.copy === previous.copy) return;
    if (state.copy === state.base) clearPersisted(state.courseId);
    else {
      writePersisted(state.courseId, {
        version: STORAGE_VERSION,
        baseHash: state.baseHash,
        copy: state.copy,
      });
    }
  });
  return store;
}

export const WorkingCopyContext = createContext<WorkingCopyStore | null>(null);

/** Reads (and re-renders on) a slice of the working copy store. */
export function useWorkingCopy<T>(selector: (state: WorkingCopyState) => T): T {
  const store = useContext(WorkingCopyContext);
  if (!store) throw new Error('useWorkingCopy must be used inside the published editor');
  return useStore(store, selector);
}

/** Helpers to find an entity in the copy. */
export function findItem(copy: WorkingCopy, key: string) {
  for (const module of copy.modules) {
    const index = module.items.findIndex((item) => item.key === key);
    const item = module.items[index];
    if (item) return { module, item, index };
  }
  return null;
}
