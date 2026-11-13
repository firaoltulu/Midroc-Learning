/** Minimum wait between verification emails (Firebase also rate-limits). */
export const RESEND_COOLDOWN_SECONDS = 60;

const KEY = 'midroc.verify.sentAt';

/** Remembers (for this tab) when a verification email was last sent. */
export function markVerificationSent(now = Date.now()) {
  try {
    sessionStorage.setItem(KEY, String(now));
  } catch {
    // Storage blocked: the cooldown just starts fresh.
  }
}

/** Seconds left before another email may be sent (0 when allowed). */
export function cooldownRemaining(now = Date.now()): number {
  try {
    const sentAt = Number(sessionStorage.getItem(KEY));
    if (!sentAt) return 0;
    return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - (now - sentAt) / 1000));
  } catch {
    return 0;
  }
}
