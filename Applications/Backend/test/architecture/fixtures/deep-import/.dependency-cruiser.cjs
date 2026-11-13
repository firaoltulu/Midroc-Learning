module.exports = {
  forbidden: [
    {
      name: 'fixture-deep-import',
      severity: 'error',
      from: { path: '^test/architecture/fixtures/deep-import/src/modules/auth/' },
      to: { path: '^test/architecture/fixtures/deep-import/src/modules/users/(?!index\\.ts$)' }
    }
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    includeOnly: '^test/architecture/fixtures/deep-import/src'
  }
};
