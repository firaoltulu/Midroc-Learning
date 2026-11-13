import { courseDetailFixture } from '../../../test/fixtures';
import { courseDetailSchema } from '../api/schemas';
import { canUnenroll, courseAction, courseProgress } from './course-action';

const course = (overrides: Record<string, unknown> = {}) =>
  courseDetailSchema.parse(courseDetailFixture(overrides));

const viewer = 'user-1';

describe('courseAction (enroll / continue / edit state machine)', () => {
  it('not enrolled in a published course → Enroll', () => {
    expect(courseAction(course(), viewer)).toEqual({ kind: 'enroll' });
  });

  it('enrolled → Continue at the first incomplete item, in outline order', () => {
    expect(courseAction(course({ enrolled: true }), viewer)).toEqual({
      kind: 'continue',
      itemId: 'item-1',
    });
    expect(
      courseAction(course({ enrolled: true, completedItemIds: ['item-1', 'item-3'] }), viewer),
    ).toEqual({ kind: 'continue', itemId: 'item-2' });
  });

  it('everything done → Review from the first item', () => {
    expect(
      courseAction(
        course({ enrolled: true, completedItemIds: ['item-3', 'item-1', 'item-2'] }),
        viewer,
      ),
    ).toEqual({ kind: 'review', itemId: 'item-1' });
  });

  it('the owner → Edit course (whatever the status)', () => {
    for (const status of ['draft', 'pending_review', 'published', 'rejected', 'archived']) {
      expect(courseAction(course({ ownerId: viewer, status }), viewer)).toEqual({ kind: 'edit' });
    }
  });

  it('not published and not the owner (an administrator) → no action', () => {
    expect(courseAction(course({ status: 'pending_review' }), viewer)).toEqual({ kind: 'none' });
  });

  it('only enrolled non-owners can unenroll', () => {
    expect(canUnenroll(course({ enrolled: true }), viewer)).toBe(true);
    expect(canUnenroll(course({ enrolled: false }), viewer)).toBe(false);
    expect(canUnenroll(course({ enrolled: true, ownerId: viewer }), viewer)).toBe(false);
  });

  it('progress counts only items still in the course', () => {
    expect(courseProgress(course({ completedItemIds: ['item-2', 'gone-item'] }))).toEqual({
      completed: 1,
      total: 3,
    });
  });
});
