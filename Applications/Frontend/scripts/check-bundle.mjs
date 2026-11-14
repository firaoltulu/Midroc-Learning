#!/usr/bin/env node
/**
 * After `vite build`: checks that heavy, lazily loaded code (pdf.js / react-pdf, the YouTube
 * player, the course editor with dnd-kit, the admin charts) is not in what the catalog route loads up front, and
 * reports that route's initial JavaScript size (gzip).
 *
 * "Up front" = the app entry (index.html) plus the catalog route's chunks, following static
 * imports only (dynamic imports are what lazy loading means).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const dist = join(root, 'dist');

/** Markers that only appear in the lazy chunks' code. */
export const LAZY_MARKERS = [
  { name: 'pdf.js / react-pdf', pattern: /GlobalWorkerOptions|pdfjs-dist|react-pdf__/ },
  { name: 'YouTube player', pattern: /youtube-nocookie\.com|iframe_api/ },
  { name: 'course editor (dnd-kit)', pattern: /DndDescribedBy|DndLiveRegion/ },
  { name: 'admin charts (@mui/x-charts)', pattern: /MuiChartsSurface|MuiChartsAxis/ },
];

/** Every chunk file reachable through static imports from the given manifest keys. */
export function staticClosure(manifest, rootKeys) {
  const files = new Set();
  const seen = new Set();
  const visit = (key) => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Not in the build manifest: ${key}`);
    files.add(chunk.file);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  for (const key of rootKeys) visit(key);
  return [...files];
}

export function catalogRootKeys(manifest) {
  const keys = Object.keys(manifest).filter(
    (key) => key === 'index.html' || /_authenticated\.courses\.index/.test(key),
  );
  if (!keys.includes('index.html')) throw new Error('No index.html entry in the manifest');
  if (keys.length < 2) throw new Error('The catalog route chunk was not found in the manifest');
  return keys;
}

function main() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8'));
  } catch {
    console.error('check:bundle: run `npm run build` first (dist/.vite/manifest.json is missing).');
    process.exit(1);
  }

  const files = staticClosure(manifest, catalogRootKeys(manifest)).filter((file) =>
    file.endsWith('.js'),
  );
  const problems = [];
  let gzipBytes = 0;
  for (const file of files) {
    const code = readFileSync(join(dist, file));
    gzipBytes += gzipSync(code).length;
    const text = code.toString('utf8');
    for (const marker of LAZY_MARKERS) {
      if (marker.pattern.test(text)) problems.push(`${marker.name} code is in ${file}`);
    }
  }

  const kb = (gzipBytes / 1024).toFixed(1);
  if (problems.length > 0) {
    console.error(`check:bundle found ${problems.length} problem(s) in the catalog route:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `check:bundle passed: no lazy player or editor code in the catalog route (${files.length} JS files, ${kb} KB gzip up front).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
