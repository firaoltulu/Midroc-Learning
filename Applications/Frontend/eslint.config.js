import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import i18next from 'eslint-plugin-i18next';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '.typecheck-dist/**', 'coverage/**', 'src/routeTree.gen.ts']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      i18next
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'i18next/no-literal-string': 'error'
    }
  },
  {
    files: ['*.config.{js,ts}', '.dependency-cruiser.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
);
