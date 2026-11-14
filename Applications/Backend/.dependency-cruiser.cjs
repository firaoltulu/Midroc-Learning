const modules = [
  'users',
  'auth',
  'courses',
  'enrollments',
  'exams',
  'content',
  'learning',
  'editing',
  'moderation',
  'analytics',
  'reviews',
  'discussions',
  'notes'
];
const allowed = {
  users: [],
  auth: ['users'],
  courses: [],
  enrollments: ['courses'],
  exams: ['courses', 'enrollments'],
  content: ['courses', 'exams'],
  learning: ['courses', 'content', 'enrollments'],
  editing: ['courses', 'content'],
  moderation: ['courses', 'editing'],
  analytics: [],
  reviews: ['courses', 'enrollments'],
  discussions: ['content'],
  notes: ['content']
};

const moduleRules = modules.flatMap((source) =>
  modules
    .filter((target) => target !== source)
    .flatMap((target) => {
      const from = { path: `^src/modules/${source}/` };
      if (!allowed[source].includes(target)) {
        return [{
          name: `${source}-cannot-depend-on-${target}`,
          severity: 'error',
          from,
          to: { path: `^src/modules/${target}/` }
        }];
      }
      return [{
        name: `${source}-no-deep-import-${target}`,
        severity: 'error',
        from,
        to: { path: `^src/modules/${target}/(?!index\\.ts$)` }
      }];
    })
);

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'core-no-modules',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/modules/' }
    },
    {
      name: 'integrations-no-modules',
      severity: 'error',
      from: { path: '^src/integrations' },
      to: { path: '^src/modules/' }
    },
    {
      name: 'modules-no-app',
      severity: 'error',
      from: { path: '^src/modules/' },
      to: { path: '^src/app\\.ts$' }
    },
    ...moduleRules
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)__tests__/' },
    tsConfig: { fileName: 'tsconfig.json' },
    includeOnly: '^src'
  }
};
