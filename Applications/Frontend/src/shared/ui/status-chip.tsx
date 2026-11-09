import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export type Status =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'not_started';

type StatusTone = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

const statusTones: Record<Status, StatusTone> = {
  draft: 'draft',
  pending_review: 'pending',
  published: 'published',
  rejected: 'rejected',
  archived: 'archived',
  active: 'published',
  suspended: 'rejected',
  completed: 'published',
  not_started: 'draft'
};

export function getStatusTone(status: Status): StatusTone {
  return statusTones[status];
}

export function StatusChip({ status }: { status: Status }) {
  const { t } = useTranslation('common');
  const label = {
    draft: t('status.draft'),
    pending_review: t('status.pendingReview'),
    published: t('status.published'),
    rejected: t('status.rejected'),
    archived: t('status.archived'),
    active: t('status.active'),
    suspended: t('status.suspended'),
    completed: t('status.completed'),
    not_started: t('status.notStarted')
  }[status];
  const tone = getStatusTone(status);

  return (
    <Chip
      data-status={status}
      data-status-tone={tone}
      label={label}
      size="small"
      sx={(theme) => {
        const colors = (theme.vars ?? theme).palette.status[tone];

        return {
          backgroundColor: colors.bg,
          color: colors.fg
        };
      }}
    />
  );
}
