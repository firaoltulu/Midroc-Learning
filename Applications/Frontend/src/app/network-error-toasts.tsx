import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isNetworkError } from '../shared/api/errors';
import { useToast } from '../shared/ui/toast/toast-context';

/** Several requests usually fail together when the connection drops: show one toast. */
const QUIET_PERIOD_MS = 5_000;

/**
 * Network failures (a typed NetworkError) get a toast with "Try again":
 * - a mutation: retries it with the same variables;
 * - a background refetch of data already on screen: refetches it.
 * A query with nothing to show yet renders its own error state instead (no toast).
 */
export function NetworkErrorToasts() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation(['errors', 'common']);

  useEffect(() => {
    let lastShown = 0;
    const show = (retry: () => void) => {
      const now = Date.now();
      if (now - lastShown < QUIET_PERIOD_MS) return;
      lastShown = now;
      toast.show({
        message: t('errors:network'),
        severity: 'error',
        action: { label: t('common:actions.retry'), onClick: retry },
      });
    };

    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return;
      const { mutation } = event;
      if (!isNetworkError(event.action.error)) return;
      if (mutation.meta?.networkErrorToast === false) return;
      show(() => {
        void mutation.execute(mutation.state.variables as unknown).catch(() => undefined);
      });
    });

    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return;
      const { query } = event;
      if (!isNetworkError(event.action.error) || query.state.data === undefined) return;
      show(() => {
        void queryClient.refetchQueries({ predicate: (candidate) => candidate === query });
      });
    });

    return () => {
      unsubscribeMutations();
      unsubscribeQueries();
    };
  }, [queryClient, toast, t]);

  return null;
}
