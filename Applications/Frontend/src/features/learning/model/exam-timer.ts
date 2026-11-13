/**
 * Exam timer rules (spec section 9), free of React so they can be unit tested.
 *
 * The server sets `expiresAt`. The learner's clock may be off, so the remaining time is
 * measured on the server's clock: offset = server time (the start response's `Date` header)
 * minus the local time the response arrived.
 */

/** Milliseconds to add to the local clock to get the server's. 0 without a usable header. */
export function clockOffset(dateHeader: string | null, receivedAt: number): number {
  if (!dateHeader) return 0;
  const serverTime = Date.parse(dateHeader);
  return Number.isNaN(serverTime) ? 0 : serverTime - receivedAt;
}

/** Remaining milliseconds (never negative). */
export function remainingMs(expiresAt: string, now: number, offset: number): number {
  return Math.max(0, Date.parse(expiresAt) - (now + offset));
}

/** Screen readers hear the remaining time only at these points, not every second. */
export const ANNOUNCE_AT_MINUTES = [10, 5, 1] as const;

/**
 * The announcement due when the time goes from `previous` to `current` ms: the smallest
 * threshold crossed, or null. Crossing several at once (a tab was asleep) announces only the
 * most urgent.
 */
export function announcementFor(previous: number, current: number): number | null {
  const crossed = ANNOUNCE_AT_MINUTES.filter(
    (minutes) => previous > minutes * 60_000 && current <= minutes * 60_000,
  );
  return crossed.length > 0 ? Math.min(...crossed) : null;
}

/** "4:05", or "1:02:09" from an hour up; rounds up so 0:00 means time is really up. */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, '0')}:${ss}`
    : `${String(minutes)}:${ss}`;
}
