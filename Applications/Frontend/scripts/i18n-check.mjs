// i18n:check - fails (exit 1) when the locale files and the code disagree:
//   1. en and am have different namespaces or different key sets,
//   2. a value is empty or not a string,
//   3. a {{placeholder}} differs between the two languages,
//   4. a key is not used anywhere in src/ (dead strings),
//   5. an English namespace is not registered in src/shared/i18n/resources.ts.
//
// Usage detection is static. A key counts as used when it appears as a string literal in a
// source file that uses its namespace (useTranslation('ns'), { ns: 'ns' } or 'ns:key'; files
// that name no namespace count for the default 'common'). Template literals such as
// t(`status.${status}`) mark every key under the prefix `status.` as used; `ns:${code}`
// marks the whole namespace. Plural forms (_one, _other, ...) count via their base key.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const LANGUAGES = ['en', 'am'];
export const DEFAULT_NS = 'common';
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const KEY_CHARS = '[A-Za-z0-9_.-]';

/** { a: { b: 'x' } } -> Map { 'a.b' => 'x' }; non-string leaves are reported. */
export function flatten(value, prefix = '', out = new Map(), problems = []) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, path, out, problems);
    } else if (typeof child === 'string') {
      out.set(path, child);
    } else {
      problems.push(path);
    }
  }
  return { keys: out, problems };
}

/** Sorted, de-duplicated placeholder names: "Hi {{name}}, {{ count }}" -> ['count', 'name']. */
export function placeholders(text) {
  const names = new Set();
  for (const match of text.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)) names.add(match[1]);
  return [...names].sort();
}

export const pluralBase = (key) => key.replace(PLURAL_SUFFIX, '');

/** Collects key usage from source files: Map<namespace, { literals, prefixes, all }>. */
export function collectUsage(sources, namespaces) {
  const usage = new Map(
    namespaces.map((ns) => [ns, { literals: new Set(), prefixes: new Set(), all: false }]),
  );
  const nsAlternation = namespaces
    .map((ns) => ns.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|');

  for (const source of sources) {
    const fileNamespaces = new Set();
    for (const match of source.matchAll(/useTranslation\(\s*(\[[^\]]*\]|['"][^'"]+['"])?/g)) {
      if (!match[1]) fileNamespaces.add(DEFAULT_NS);
      for (const ns of match[1]?.matchAll(/['"]([^'"]+)['"]/g) ?? []) fileNamespaces.add(ns[1]);
    }
    for (const match of source.matchAll(/\bns:\s*['"]([^'"]+)['"]/g)) fileNamespaces.add(match[1]);
    if (fileNamespaces.size === 0) fileNamespaces.add(DEFAULT_NS);

    const record = (ns, kind, value) => usage.get(ns)?.[kind].add(value);

    // 'key', "key", `key` (no interpolation)
    for (const match of source.matchAll(
      new RegExp(`(['"\`])(${KEY_CHARS}+(?::${KEY_CHARS}+)?)\\1`, 'g'),
    )) {
      const literal = match[2];
      const explicit = new RegExp(`^(${nsAlternation}):(.+)$`).exec(literal);
      if (explicit) record(explicit[1], 'literals', explicit[2]);
      else for (const ns of fileNamespaces) record(ns, 'literals', literal);
    }

    // `prefix${...}` template literals
    for (const match of source.matchAll(
      new RegExp(`\`(${KEY_CHARS}*(?::${KEY_CHARS}*)?)\\$\\{`, 'g'),
    )) {
      const prefix = match[1];
      const explicit = new RegExp(`^(${nsAlternation}):(.*)$`).exec(prefix);
      if (explicit) {
        if (explicit[2] === '') {
          const entry = usage.get(explicit[1]);
          if (entry) entry.all = true;
        } else record(explicit[1], 'prefixes', explicit[2]);
      } else if (prefix !== '') {
        for (const ns of fileNamespaces) record(ns, 'prefixes', prefix);
      }
    }
  }
  return usage;
}

function isUsed(key, entry) {
  if (!entry) return false;
  if (entry.all) return true;
  const base = pluralBase(key);
  if (entry.literals.has(base) || entry.literals.has(key)) return true;
  for (const prefix of entry.prefixes) if (base.startsWith(prefix)) return true;
  return false;
}

/**
 * @param {{ locales: Record<string, Record<string, object>>, sources: string[], registry?: string }} input
 *   locales: { en: { common: {...} }, am: {...} }; sources: file contents; registry: resources.ts text
 * @returns {string[]} problems (empty when everything is consistent)
 */
export function checkLocales({ locales, sources, registry }) {
  const problems = [];
  const [base, ...others] = LANGUAGES;
  const baseNamespaces = Object.keys(locales[base] ?? {}).sort();

  for (const lang of others) {
    const namespaces = Object.keys(locales[lang] ?? {}).sort();
    for (const ns of baseNamespaces)
      if (!namespaces.includes(ns)) problems.push(`${lang}: missing namespace "${ns}"`);
    for (const ns of namespaces)
      if (!baseNamespaces.includes(ns))
        problems.push(`${lang}: extra namespace "${ns}" (not in ${base})`);
  }

  const flat = {};
  for (const lang of LANGUAGES) {
    flat[lang] = {};
    for (const [ns, content] of Object.entries(locales[lang] ?? {})) {
      const { keys, problems: invalid } = flatten(content);
      for (const path of invalid) problems.push(`${lang}/${ns}: "${path}" must be a string`);
      for (const [key, value] of keys)
        if (value.trim() === '') problems.push(`${lang}/${ns}: "${key}" is empty`);
      flat[lang][ns] = keys;
    }
  }

  for (const ns of baseNamespaces) {
    const baseKeys = flat[base][ns] ?? new Map();
    for (const lang of others) {
      const keys = flat[lang][ns];
      if (!keys) continue;
      for (const key of baseKeys.keys())
        if (!keys.has(key)) problems.push(`${lang}/${ns}: missing key "${key}"`);
      for (const key of keys.keys())
        if (!baseKeys.has(key)) problems.push(`${lang}/${ns}: extra key "${key}" (not in ${base})`);
      for (const [key, value] of baseKeys) {
        if (!keys.has(key)) continue;
        const expected = placeholders(value).join(', ');
        const actual = placeholders(keys.get(key)).join(', ');
        if (expected !== actual) {
          problems.push(
            `${lang}/${ns}: "${key}" placeholders differ: ${base} {${expected}} vs ${lang} {${actual}}`,
          );
        }
      }
    }
  }

  const usage = collectUsage(sources, baseNamespaces);
  for (const ns of baseNamespaces) {
    for (const key of (flat[base][ns] ?? new Map()).keys()) {
      if (!isUsed(key, usage.get(ns))) problems.push(`${base}/${ns}: unused key "${key}"`);
    }
  }

  if (registry !== undefined) {
    for (const ns of baseNamespaces) {
      if (!registry.includes(`locales/${base}/${ns}.json`)) {
        problems.push(`${base}/${ns}: namespace not registered in src/shared/i18n/resources.ts`);
      }
    }
  }

  return problems;
}

// ---------- CLI ----------

function listFiles(dir, filter) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, filter) : filter(path) ? [path] : [];
  });
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const src = join(root, 'src');
  const locales = {};
  for (const lang of LANGUAGES) {
    locales[lang] = {};
    const dir = join(src, 'locales', lang);
    for (const file of listFiles(dir, (path) => path.endsWith('.json'))) {
      try {
        locales[lang][basename(file, '.json')] = JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        console.error(`i18n:check: ${relative(root, file)} is not valid JSON: ${error.message}`);
        process.exit(1);
      }
    }
  }

  const sources = listFiles(
    src,
    (path) =>
      /\.(ts|tsx)$/.test(path) &&
      !/\.test\.tsx?$/.test(path) &&
      !path.includes(join('shared', 'api', 'generated')) &&
      !path.endsWith('routeTree.gen.ts'),
  ).map((file) => readFileSync(file, 'utf8'));

  const registry = readFileSync(join(src, 'shared', 'i18n', 'resources.ts'), 'utf8');
  const problems = checkLocales({ locales, sources, registry });

  if (problems.length > 0) {
    console.error(`i18n:check found ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  const keyCount = Object.values(locales.en).reduce((sum, ns) => sum + flatten(ns).keys.size, 0);
  console.log(
    `i18n:check passed: ${Object.keys(locales.en).length} namespaces, ${keyCount} keys, ${LANGUAGES.join(' + ')}.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
