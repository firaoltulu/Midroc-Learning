import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dependency boundary fixture', () => {
  it('rejects a cross-module deep import', () => {
    const root = path.resolve('test/architecture/fixtures/deep-import');
    let output = '';
    try {
      execFileSync(
        process.execPath,
        [
          path.resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs'),
          '--config',
          path.join(root, '.dependency-cruiser.cjs'),
          path.join(root, 'src')
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'stdout' in error && 'stderr' in error) {
        output = `${String(error.stdout)}${String(error.stderr)}`;
      } else {
        throw error;
      }
    }
    expect(output).toContain('fixture-deep-import');
  });
});
