import type { LiveDirectFields, RevisionTree } from '../content/index.js';

/**
 * Module titles and descriptions and item titles of live content are edited directly (PATCH
 * applies them at once, see FIELD_POLICY), also while a revision waits for review. To keep
 * approval from reverting such an edit, a revision records these fields as they were when its
 * tree was saved (`submitted`), and this three-way merge lets a value that changed on the live
 * course since then win over the revision's. Everything else keeps the revision's value, so a
 * revision can still rename content. Pure: no database access.
 */
export function withLiveDirectFields(
  modules: RevisionTree['modules'],
  live: LiveDirectFields,
  submitted: LiveDirectFields
): RevisionTree['modules'] {
  const byId = <T extends { id: string }>(entries: T[]) =>
    new Map(entries.map((entry) => [entry.id, entry]));
  const liveModules = byId(live.modules);
  const submittedModules = byId(submitted.modules);
  const liveItems = byId(live.items);
  const submittedItems = byId(submitted.items);

  /** The live value when it changed since the revision was saved, else the revision's. */
  const merge = (proposed: string, now: string | undefined, then: string | undefined) =>
    now !== undefined && then !== undefined && now !== then ? now : proposed;

  return modules.map((module) => {
    const now = liveModules.get(module.id);
    const then = submittedModules.get(module.id);
    return {
      ...module,
      title: merge(module.title, now?.title, then?.title),
      description: merge(module.description, now?.description, then?.description),
      items: module.items.map((item) => ({
        ...item,
        title: merge(item.title, liveItems.get(item.id)?.title, submittedItems.get(item.id)?.title)
      }))
    };
  });
}
