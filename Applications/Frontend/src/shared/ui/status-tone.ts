/** Course lifecycle states as stored by the backend. */
export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

/** Tone names in theme.palette.status. */
export type StatusTone = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

const toneByStatus: Record<CourseStatus, StatusTone> = {
  draft: 'draft',
  pending_review: 'pending',
  published: 'published',
  rejected: 'rejected',
  archived: 'archived',
};

export function statusTone(status: CourseStatus): StatusTone {
  return toneByStatus[status];
}
