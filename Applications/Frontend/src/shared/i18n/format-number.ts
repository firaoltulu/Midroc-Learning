import { useMemo } from 'react';
import { useLanguage } from './use-language';

/**
 * Number formatters bound to the interface language. Digits are always Latin (spec section 4);
 * `am` already uses them, `latn` makes it explicit.
 */
export function useNumberFormat() {
  const language = useLanguage();
  return useMemo(() => {
    const locale = `${language}-u-nu-latn`;
    const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const decimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
    return {
      formatNumber: (value: number) => integer.format(value),
      formatDecimal: (value: number) => decimal.format(value),
      /** `value` in percent (0–100), as the API sends it. */
      formatPercent: (value: number) => percent.format(value / 100),
    };
  }, [language]);
}
