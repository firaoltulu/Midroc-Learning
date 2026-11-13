import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldEffect } from '../model/field-effects';

/**
 * A field's hint with its effect in front ("Applies right away · …" or "Needs admin review ·
 * …"), so the label is read with the field (aria-describedby), not only seen.
 */
export function useEffectHint() {
  const { t } = useTranslation('editor');
  return useCallback(
    (effect: FieldEffect | undefined, hint?: string) =>
      [
        effect === 'immediate'
          ? t('working.effect.immediate')
          : effect === 'review'
            ? t('working.effect.review')
            : undefined,
        hint,
      ]
        .filter(Boolean)
        .join(' · ') || undefined,
    [t],
  );
}
