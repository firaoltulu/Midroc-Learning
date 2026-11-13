/**
 * Prefix for per-user data kept in localStorage (e.g. editor working copies later).
 * Device preferences (theme, language, calendar) use other keys and survive sign-out.
 */
export const USER_STORAGE_PREFIX = 'midroc.user.';

/** Removes per-user local data on sign-out: prefixed localStorage keys and sessionStorage. */
export function clearUserData() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(USER_STORAGE_PREFIX)) localStorage.removeItem(key);
    }
    sessionStorage.clear();
  } catch {
    // Storage unavailable: nothing was stored.
  }
}
