import { Chip } from '@mui/material';
import { useLanguage } from '../i18n/language-provider';

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
  const { messages } = useLanguage();
  const label = {
    draft: messages.statusDraft,
    pending_review: messages.statusPendingReview,
    published: messages.statusPublished,
    rejected: messages.statusRejected,
    archived: messages.statusArchived,
    active: messages.statusActive,
    suspended: messages.statusSuspended,
    completed: messages.statusCompleted,
    not_started: messages.statusNotStarted
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
