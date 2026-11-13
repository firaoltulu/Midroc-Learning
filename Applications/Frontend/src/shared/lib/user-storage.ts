/**
 * Prefix for per-user data kept in localStorage (e.g. the editor's working copies). Keys with
 * it are removed on sign-out; device preferences (theme, language, calendar) use other keys
 * and survive it.
 */
export const USER_STORAGE_PREFIX = 'midroc.user.';
