// Prints the CSP hash of each inline <script> in index.html (the color-mode script), for the
// script-src directive in deploy/nginx.conf.example.
// Usage: node scripts/csp-hash.mjs [path/to/index.html]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** CSP source expressions ('sha256-…') for every classic inline script in the HTML. */
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    ([, body]) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? 'index.html';
  for (const hash of inlineScriptHashes(readFileSync(file, 'utf8'))) console.log(hash);
}
