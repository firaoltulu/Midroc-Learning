import { courseDetailFixture } from '../../../test/fixtures';
import { courseDetailSchema } from '../../courses';
import { playerNavigation } from './player-navigation';

const course = (overrides: Record<string, unknown> = {}) =>
  courseDetailSchema.parse(courseDetailFixture(overrides));

describe('playerNavigation', () => {
  it('moves across module boundaries', () => {
    const nav = playerNavigation(course(), 'item-2');
    expect(nav).toMatchObject({
      item: { id: 'item-2', moduleTitle: 'Getting started' },
      position: 2,
      total: 3,
      previous: { id: 'item-1' },
      next: { id: 'item-3', moduleTitle: 'Check your knowledge' },
    });
  });

  it('has no previous at the start and no next at the end', () => {
    expect(playerNavigation(course(), 'item-1')?.previous).toBeNull();
    expect(playerNavigation(course(), 'item-3')?.next).toBeNull();
  });

  it('counts completion and knows when the course is done', () => {
    expect(playerNavigation(course({ completedItemIds: ['item-1'] }), 'item-1')).toMatchObject({
      completed: 1,
      courseCompleted: false,
    });
    expect(
      playerNavigation(course({ completedItemIds: ['item-1', 'item-2', 'item-3'] }), 'item-1')
        ?.courseCompleted,
    ).toBe(true);
  });

  it('returns null for an item that is not in the course', () => {
    expect(playerNavigation(course(), 'elsewhere')).toBeNull();
  });
});
