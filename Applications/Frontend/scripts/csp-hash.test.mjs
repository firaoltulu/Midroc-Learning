import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inlineScriptHashes } from './csp-hash.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('CSP', () => {
  it('hashes each inline script', () => {
    expect(
      inlineScriptHashes('<script>a</script><script type="module" src="/x.js"></script>'),
    ).toEqual(['sha256-ypeBEsobvcr6wjGzmiPcTaeG7/gUfE5yuYB3ha/uSLs=']);
  });

  it('allows the inline color-mode script of index.html in the nginx CSP', () => {
    const hashes = inlineScriptHashes(read('../index.html'));
    expect(hashes).toHaveLength(1);
    const policy = /Content-Security-Policy "([^"]+)"/.exec(
      read('../deploy/nginx.conf.example'),
    )?.[1];
    const scriptSrc = policy
      ?.split(';')
      .find((directive) => directive.trim().startsWith('script-src'));
    for (const hash of hashes) expect(scriptSrc).toContain(`'${hash}'`);
  });
});
