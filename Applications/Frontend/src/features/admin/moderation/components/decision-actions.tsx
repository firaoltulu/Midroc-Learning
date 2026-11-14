import CheckOutlined from '@mui/icons-material/CheckOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { RejectDialog } from './reject-dialog';

export interface DecisionActionsProps {
  /** Texts for the course or the revision flavor. */
  labels: {
    approve: string;
    approveTitle: string;
    approveBody: string;
    reject: string;
    rejectTitle: string;
    rejectBody: string;
  };
  /** Hide Approve (e.g. a stale revision can only be rejected). */
  canApprove?: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

/** Approve (the one primary action, confirmed first) and Reject (with a required reason). */
export function DecisionActions({
  labels,
  canApprove = true,
  onApprove,
  onReject,
}: DecisionActionsProps) {
  const [open, setOpen] = useState<'approve' | 'reject' | null>(null);
  const close = () => {
    setOpen(null);
  };
  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
        {canApprove ? (
          <Button
            variant="contained"
            startIcon={<CheckOutlined />}
            onClick={() => {
              setOpen('approve');
            }}
          >
            {labels.approve}
          </Button>
        ) : null}
        <Button
          variant="outlined"
          color="error"
          startIcon={<CloseOutlined />}
          onClick={() => {
            setOpen('reject');
          }}
        >
          {labels.reject}
        </Button>
      </Stack>
      <ConfirmDialog
        open={open === 'approve'}
        title={labels.approveTitle}
        description={labels.approveBody}
        confirmLabel={labels.approve}
        onClose={close}
        onConfirm={async () => {
          try {
            await onApprove();
          } finally {
            close();
          }
        }}
      />
      <RejectDialog
        open={open === 'reject'}
        title={labels.rejectTitle}
        description={labels.rejectBody}
        confirmLabel={labels.reject}
        onClose={close}
        onReject={async (reason) => {
          await onReject(reason);
          close();
        }}
      />
    </>
  );
}
