/**
 * TEMPORARY (phase 1): a minimal English-only lookup so the placeholder screen has no
 * hard-coded strings. Phase 3 replaces this with i18next (typed keys, namespaces,
 * language detection) and deletes this file.
 */
import common from '../../locales/en/common.json';

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type CommonKey = Leaves<typeof common>;

export function t(key: CommonKey): string {
  let node: unknown = common;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : key;
}
