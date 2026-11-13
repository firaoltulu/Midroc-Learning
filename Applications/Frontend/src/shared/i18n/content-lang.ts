import { useLanguage } from './use-language';

/**
 * Props for user content written in `language` (a course title or description): sets `lang`
 * when it differs from the interface language, so screen readers and fonts switch correctly.
 *   <Typography {...contentLang}>{course.title}</Typography>
 */
export function useContentLang(language: string): { lang?: string } {
  const uiLanguage = useLanguage();
  return language === uiLanguage ? {} : { lang: language };
}
