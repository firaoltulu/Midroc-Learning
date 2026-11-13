import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type Translate = (key: string, values?: Record<string, unknown>) => string;

/**
 * Translates a namespaced key computed at runtime (e.g. a validation result such as
 * 'editor:questions.errors.promptRequired'), which the typed t() can't check statically.
 */
export function useKeyText() {
  const { i18n } = useTranslation(['editor', 'validation']);
  const language = i18n.language;
  return useCallback(
    (key: string | null | undefined, values?: Record<string, unknown>) =>
      key && language ? (i18n.t as unknown as Translate)(key, values) : null,
    [i18n, language],
  );
}
