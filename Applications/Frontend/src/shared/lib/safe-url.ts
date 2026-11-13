/** True for absolute http(s) URLs only: user-supplied links never get another scheme. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
