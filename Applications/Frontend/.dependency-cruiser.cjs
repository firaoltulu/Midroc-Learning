/**
 * Architecture boundaries (docs/claude-code-frontend-prompt.md, section 2).
 *
 * A "feature" is a folder directly under src/features/, except admin, whose
 * sub-areas (src/features/admin/<area>/) are features of their own.
 * A feature's public API is its index.ts.
 */

// Captures the feature root, e.g. "catalog" or "admin/users".
const FEATURE = '^src/features/(admin/[^/]+|(?!admin/)[^/]+)/';
const FEATURE_INDEX = '^src/features/(admin/[^/]+|(?!admin/)[^/]+)/index\\.tsx?$';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make features hard to reason about and split.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'feature-public-api-only',
      severity: 'error',
      comment:
        'Outside a feature (routes, app, shared), import it only through its index.ts, ' +
        'its public API.',
      from: { path: '^src/', pathNot: FEATURE },
      to: { path: FEATURE, pathNot: FEATURE_INDEX },
    },
    {
      name: 'feature-to-feature-via-index',
      severity: 'error',
      comment: 'A feature imports another feature only through the other feature index.ts.',
      from: { path: FEATURE },
      to: { path: FEATURE, pathNot: ['^src/features/$1/', FEATURE_INDEX] },
    },
    {
      name: 'shared-is-feature-agnostic',
      severity: 'error',
      comment: 'shared/ must not depend on features, routes or app wiring.',
      from: { path: '^src/shared/' },
      to: { path: ['^src/features/', '^src/routes/', '^src/app/', '^src/routeTree\\.gen\\.ts$'] },
    },
    {
      name: 'features-do-not-import-app-or-routes',
      severity: 'error',
      comment: 'Features are wired by routes/app, never the other way around.',
      from: { path: '^src/features/' },
      to: { path: ['^src/routes/', '^src/app/', '^src/routeTree\\.gen\\.ts$'] },
    },
    {
      name: 'no-test-code-in-app',
      severity: 'error',
      comment: 'Application code must not import test helpers.',
      from: { path: '^src/', pathNot: ['\\.test\\.tsx?$', '^src/test/'] },
      to: { path: '^src/test/' },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^src/shared/api/generated/' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.app.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
