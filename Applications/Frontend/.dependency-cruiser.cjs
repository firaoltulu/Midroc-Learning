const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const featureRoot = join(__dirname, 'src', 'features');
const features = readdirSync(featureRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const crossFeatureRules = features.flatMap((sourceFeature) =>
  features
    .filter((targetFeature) => targetFeature !== sourceFeature)
    .map((targetFeature) => ({
      name: `feature-${sourceFeature}-cannot-import-${targetFeature}`,
      severity: 'error',
      from: { path: `^src/features/${sourceFeature}/` },
      to: { path: `^src/features/${targetFeature}/` }
    }))
);

module.exports = {
  forbidden: [
    {
      name: 'feature-cannot-import-app-or-route',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/(app|routes)/' }
    },
    {
      name: 'shared-cannot-import-feature-or-route',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|routes)/' }
    },
    ...crossFeatureRules
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    }
  }
};
