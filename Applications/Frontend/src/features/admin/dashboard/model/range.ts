import type { SeriesInterval, SeriesRange } from '../api/analytics';

/** The dashboard's search params (validated in the route). */
export interface DashboardSearch {
  range?: RangePreset;
  interval?: SeriesInterval;
  /** Custom range only. */
  from?: string;
  to?: string;
}

export const RANGE_PRESETS = ['7d', '30d', '90d', '12m', 'custom'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const INTERVALS: SeriesInterval[] = ['day', 'week', 'month'];

/** The backend refuses longer ranges (DATE_RANGE_TOO_LONG). */
export const MAX_RANGE_DAYS = 400;

const DAYS: Record<Exclude<RangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

const DAY_MS = 86_400_000;

/** YYYY-MM-DD of a UTC day (the API's buckets are UTC). */
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const parseDay = (day: string) => new Date(`${day}T00:00:00.000Z`);

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS) + 1;
}

/** Problems with a custom range, checked before asking the API. */
export function rangeProblem(from: string, to: string): 'order' | 'tooLong' | null {
  if (from > to) return 'order';
  if (daysBetween(from, to) > MAX_RANGE_DAYS) return 'tooLong';
  return null;
}

/** The last 60 days, by day: the "vs previous 30 days" comparison on the enrollments card. */
export function comparisonRange(today = new Date()): SeriesRange {
  const to = isoDay(today);
  return { from: isoDay(new Date(parseDay(to).getTime() - 59 * DAY_MS)), to, interval: 'day' };
}

/**
 * The last 30 days against the 30 before, in percent (rounded); null when the earlier period
 * had no enrollments (no meaningful percentage).
 */
export function periodChange(points: { count: number }[]): number | null {
  const counts = points.map((point) => point.count);
  const recent = counts.slice(-30).reduce((sum, count) => sum + count, 0);
  const previous = counts.slice(-60, -30).reduce((sum, count) => sum + count, 0);
  if (previous === 0) return null;
  return Math.round(((recent - previous) / previous) * 100);
}

/** The range to request: a preset ending today, or the custom days from the URL. */
export function resolveRange(search: DashboardSearch, today = new Date()): SeriesRange {
  const preset = search.range ?? '30d';
  const to = isoDay(today);
  const days = DAYS[preset === 'custom' ? '30d' : preset];
  const presetFrom = isoDay(new Date(parseDay(to).getTime() - (days - 1) * DAY_MS));
  const custom = preset === 'custom' && search.from && search.to;
  const interval = search.interval ?? (preset === '12m' ? 'month' : 'day');
  return custom
    ? { from: search.from as string, to: search.to as string, interval }
    : { from: presetFrom, to, interval };
}
