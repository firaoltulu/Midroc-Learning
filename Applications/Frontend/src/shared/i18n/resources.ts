/**
 * English resources: bundled (they are the fallback) and the source of the translation-key
 * types (see i18next.d.ts). Amharic is loaded on demand from locales/am/*.json.
 *
 * Adding a namespace: create locales/en/<ns>.json and locales/am/<ns>.json, then import the
 * English file here. `npm run i18n:check` fails if a namespace is not registered.
 */
import account from '../../locales/en/account.json';
import admin from '../../locales/en/admin.json';
import auth from '../../locales/en/auth.json';
import catalog from '../../locales/en/catalog.json';
import common from '../../locales/en/common.json';
import courses from '../../locales/en/courses.json';
import editor from '../../locales/en/editor.json';
import errors from '../../locales/en/errors.json';
import exam from '../../locales/en/exam.json';
import learning from '../../locales/en/learning.json';
import myCourses from '../../locales/en/myCourses.json';
import site from '../../locales/en/site.json';
import validation from '../../locales/en/validation.json';

export const defaultNS = 'common';

export const resources = {
  en: {
    common,
    errors,
    validation,
    auth,
    catalog,
    courses,
    learning,
    exam,
    myCourses,
    editor,
    account,
    admin,
    site,
  },
} as const;

export type Namespace = keyof (typeof resources)['en'];
