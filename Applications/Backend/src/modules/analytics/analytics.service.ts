import { db } from '../../core/db/pool.js';
import { NotFound, Unprocessable } from '../../core/http/app-error.js';
import * as repository from './analytics.repository.js';

export async function overview() {
  return repository.overview(db);
}

export async function enrollmentSeries(input: {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
  courseId?: string | undefined;
}) {
  const from = new Date(`${input.from}T00:00:00.000Z`);
  const to = new Date(`${input.to}T00:00:00.000Z`);
  const dayCount = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (dayCount < 1) throw new Unprocessable('The from date must not be after the to date');
  if (dayCount > 400) throw new Unprocessable('Date range cannot exceed 400 days');
  return repository.enrollmentSeries(db, input);
}

export async function topCourses() {
  return repository.topCourses(db);
}

export async function courseDetail(courseId: string) {
  const result = await repository.courseDetail(db, courseId);
  if (!result) throw new NotFound('Course not found');
  return result;
}
