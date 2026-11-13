import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// JSX attributes that are shown to (or read out to) the user and therefore must be translated.
const userFacingAttributes = [
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'title',
  'placeholder',
  'label',
  'helperText',
  'tooltip',
];

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'reference',
      'docs',
      '.claude',
      'src/routeTree.gen.ts',
      'src/shared/api/generated/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // Application code
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh, i18next },
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.strict],
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Raw DOM autofocus stays banned; components (e.g. the initial button in a dialog,
      // per the WAI-ARIA dialog pattern) may set it deliberately.
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],

      // No hard-coded UI strings: JSX text and user-facing attributes go through t().
      'i18next/no-literal-string': [
        'error',
        { mode: 'jsx-only', 'jsx-attributes': { include: userFacingAttributes } },
      ],

      // Components never call the network directly; only shared/api does (see override below).
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Use the typed client in shared/api through a feature api/ hook.',
        },
        { name: 'XMLHttpRequest', message: 'Network access belongs in shared/api.' },
      ],

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@mui/icons-material',
              message: 'Import single icons, e.g. @mui/icons-material/HomeOutlined.',
            },
          ],
          patterns: [
            {
              regex: '^@mui/icons-material/(?!.*Outlined$).+$',
              message: 'Use Outlined icons only (design rule).',
            },
            {
              regex: '^(@|~|src)/',
              message: 'Use plain relative imports (no path aliases).',
            },
          ],
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'Use theme tokens (theme.vars.palette...), never hex values.',
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Render user content as plain text.',
        },
      ],
    },
  },
  {
    // The theme is the one place where raw color values live.
    files: ['src/shared/theme/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['src/shared/api/**'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    // TanStack file routes export `Route`, which is not a component.
    files: ['src/routes/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['scripts/**/*.test.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'i18next/no-literal-string': 'off', 'no-restricted-globals': 'off' },
  },

  prettier,
);
