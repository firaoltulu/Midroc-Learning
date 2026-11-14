/** First letters of the first and last name ("Almaz Bekele" → "AB"), else of the email. */
export function initials(name: string | null, email: string) {
  const words = (name?.trim() ?? '').split(/\s+/).filter(Boolean);
  const first = (word: string | undefined) => (word ? (Array.from(word)[0] ?? '') : '');
  const letters =
    words.length > 1 ? first(words[0]) + first(words.at(-1)) : first(words[0]) || first(email);
  return letters.toUpperCase() || '?';
}
