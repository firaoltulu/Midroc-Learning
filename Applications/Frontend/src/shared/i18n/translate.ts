/**
 * TEMPORARY (phases 1-2): a minimal, English-only stand-in for react-i18next so screens have
 * no hard-coded strings before i18n exists. The API mirrors react-i18next
 * (`const { t } = useTranslation('common')`, `{{placeholder}}` interpolation) so phase 3 can
 * replace it with i18next (typed keys, language detection, Amharic) and delete this file.
 */
import common from '../../locales/en/common.json';
import design from '../../locales/en/design.json';

const resources = { common, design };

export type Namespace = keyof typeof resources;

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey<N extends Namespace> = Leaves<(typeof resources)[N]>;

export type TranslationParams = Record<string, string | number>;

export function translate<N extends Namespace>(
  ns: N,
  key: TranslationKey<N>,
  params?: TranslationParams,
): string {
  let node: unknown = resources[ns];
  for (const part of (key as string).split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== 'string') return key;
  if (!params) return node;
  return node.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function useTranslation<N extends Namespace>(ns: N) {
  return {
    t: (key: TranslationKey<N>, params?: TranslationParams) => translate(ns, key, params),
  };
}
