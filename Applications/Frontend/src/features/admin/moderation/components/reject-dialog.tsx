import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { FormTextField } from '../../../../shared/ui/form-text-field';
import { REASON_MAX, rejectionSchema, type RejectionValues } from '../schemas/rejection';

export interface RejectDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Sends the rejection; a thrown error is shown in the dialog, which stays open. */
  onReject: (reason: string) => Promise<void>;
  onClose: () => void;
}

/** Reject with a reason (required: the owner sees it and fixes what it says). */
export function RejectDialog(props: RejectDialogProps) {
  // Mounted only while open, so each opening starts with an empty form.
  return props.open ? <RejectForm {...props} /> : null;
}

function RejectForm({ title, description, confirmLabel, onReject, onClose }: RejectDialogProps) {
  const { t } = useTranslation(['admin', 'common']);
  const errorMessage = useErrorMessage();
  const titleId = useId();
  const descriptionId = useId();
  const [failure, setFailure] = useState<unknown>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RejectionValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });
  const length = useWatch({ control, name: 'reason' }).length;

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await onReject(values.reason.trim());
    } catch (error) {
      setFailure(error);
    }
  });

  return (
    <Dialog
      open
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      fullWidth
      maxWidth="sm"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <DialogTitle id={titleId}>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText id={descriptionId}>{description}</DialogContentText>
            {failure ? (
              <Alert severity="error" variant="outlined" role="alert">
                {errorMessage(failure)}
              </Alert>
            ) : null}
            <FormTextField
              {...register('reason')}
              label={t('reject.reason')}
              hint={t('reject.reasonHint', { length, max: REASON_MAX })}
              required
              multiline
              minRows={4}
              autoFocus
              errorKey={errors.reason?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" variant="contained" color="error" loading={isSubmitting}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
