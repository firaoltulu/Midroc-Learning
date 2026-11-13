/**
 * English resources: bundled (they are the fallback) and the source of the translation-key
 * types (see i18next.d.ts). Amharic is loaded on demand from locales/am/*.json.
 *
 * Adding a namespace: create locales/en/<ns>.json and locales/am/<ns>.json, then import the
 * English file here. `npm run i18n:check` fails if a namespace is not registered.
 */
import common from '../../locales/en/common.json';
import design from '../../locales/en/design.json';

export const defaultNS = 'common';

export const resources = {
  en: { common, design },
} as const;

export type Namespace = keyof (typeof resources)['en'];
