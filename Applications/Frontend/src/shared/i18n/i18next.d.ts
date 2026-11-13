import 'i18next';
import type { defaultNS, resources } from './resources';

// Typed keys: resource types come from the English JSON, so a wrong key or namespace is a
// compile error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
  }
}
