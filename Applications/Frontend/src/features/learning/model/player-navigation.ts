import type { CourseDetail, ItemType } from '../../courses';

export interface PlayerItem {
  id: string;
  type: ItemType;
  title: string;
  moduleId: string;
  moduleTitle: string;
}

export interface PlayerNavigation {
  item: PlayerItem;
  /** 1-based position in the whole course. */
  position: number;
  total: number;
  previous: PlayerItem | null;
  next: PlayerItem | null;
  completed: number;
  /** Every item in the course is done. */
  courseCompleted: boolean;
}

/** All items in outline order, across modules. */
export function playerItems(course: CourseDetail): PlayerItem[] {
  return course.modules.flatMap((module) =>
    module.items.map((item) => ({
      ...item,
      moduleId: module.id,
      moduleTitle: module.title,
    })),
  );
}

/** Where `itemId` sits in the course; null when the course has no such item. */
export function playerNavigation(course: CourseDetail, itemId: string): PlayerNavigation | null {
  const items = playerItems(course);
  const index = items.findIndex((item) => item.id === itemId);
  const item = items[index];
  if (!item) return null;
  const done = new Set(course.completedItemIds);
  const completed = items.filter((entry) => done.has(entry.id)).length;
  return {
    item,
    position: index + 1,
    total: items.length,
    previous: items[index - 1] ?? null,
    next: items[index + 1] ?? null,
    completed,
    courseCompleted: items.length > 0 && completed === items.length,
  };
}
