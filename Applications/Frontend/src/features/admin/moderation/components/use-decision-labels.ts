import { useTranslation } from 'react-i18next';

/** DecisionActions texts for a new course or for changes to a published one. */
export function useDecisionLabels(kind: 'course' | 'revision') {
  const { t } = useTranslation('admin');
  return {
    approve: t(`decision.${kind}.approve`),
    approveTitle: t(`decision.${kind}.approveTitle`),
    approveBody: t(`decision.${kind}.approveBody`),
    reject: t(`decision.${kind}.reject`),
    rejectTitle: t(`decision.${kind}.rejectTitle`),
    rejectBody: t(`decision.${kind}.rejectBody`),
  };
}
