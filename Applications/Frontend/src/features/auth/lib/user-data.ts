import { USER_STORAGE_PREFIX } from '../../../shared/lib/user-storage';

export { USER_STORAGE_PREFIX };

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
