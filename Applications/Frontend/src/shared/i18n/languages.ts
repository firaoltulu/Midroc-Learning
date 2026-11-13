export const SUPPORTED_LANGUAGES = ['en', 'am'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage key for the language the user picked explicitly. */
export const LANGUAGE_STORAGE_KEY = 'midroc.language';

/** Maps any BCP 47 tag to a supported language: `am*` is Amharic, everything else English. */
export function toLanguage(tag: string | undefined | null): Language {
  return tag?.toLowerCase().startsWith('am') ? 'am' : 'en';
}

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}
