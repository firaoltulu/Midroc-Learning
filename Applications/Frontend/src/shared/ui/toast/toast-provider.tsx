import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { visuallyHidden } from '@mui/utils';
import Box from '@mui/material/Box';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from '../../i18n/translate';
import { ToastContext, type ToastApi, type ToastOptions } from './toast-context';

interface QueuedToast extends ToastOptions {
  id: number;
}

let nextId = 1;

/**
 * Global toast area. Toasts are shown one at a time (queued), and every message is also written
 * to a persistent aria-live region so screen readers announce it reliably: politely for
 * success/info, assertively for warnings and errors.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const [queue, setQueue] = useState<QueuedToast[]>([]);
  const [open, setOpen] = useState(true);
  const current = queue[0];

  const show = useCallback((toast: ToastOptions) => {
    setQueue((items) => [...items, { ...toast, id: nextId++ }]);
    setOpen(true);
  }, []);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);
  const severity = current?.severity ?? 'info';
  const urgent = severity === 'error' || severity === 'warning';

  return (
    <ToastContext.Provider value={api}>
      {children}

      <Box sx={visuallyHidden} aria-live="polite" aria-atomic="true">
        {current && !urgent ? current.message : ''}
      </Box>
      <Box sx={visuallyHidden} aria-live="assertive" aria-atomic="true">
        {current && urgent ? current.message : ''}
      </Box>

      <Snackbar
        key={current?.id}
        open={Boolean(current) && open}
        autoHideDuration={urgent ? null : 6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') setOpen(false);
        }}
        slotProps={{
          transition: {
            onExited: () => {
              setQueue((items) => items.slice(1));
              setOpen(true);
            },
          },
        }}
      >
        <Alert
          // The live regions above do the announcing; avoid a second announcement.
          role="presentation"
          variant="outlined"
          severity={severity}
          sx={{ bgcolor: 'background.paper', width: '100%', alignItems: 'center' }}
          action={
            <>
              {current?.action ? (
                <Button
                  size="small"
                  onClick={() => {
                    current.action?.onClick();
                    setOpen(false);
                  }}
                >
                  {current.action.label}
                </Button>
              ) : null}
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setOpen(false);
                }}
              >
                {t('actions.close')}
              </Button>
            </>
          }
        >
          {current?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
