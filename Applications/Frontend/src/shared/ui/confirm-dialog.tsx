import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Verb-first label for the confirm button, e.g. "Delete module". */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` colors the confirm button as destructive and focuses Cancel first. */
  tone?: 'default' | 'danger';
  /** May return a promise: the dialog stays busy until it settles. */
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const danger = tone === 'danger';

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {description ? (
        <DialogContent>
          <DialogContentText id={descriptionId}>{description}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={busy} autoFocus={danger}>
          {cancelLabel ?? t('actions.cancel')}
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          onClick={() => void handleConfirm()}
          loading={busy}
          autoFocus={!danger}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
