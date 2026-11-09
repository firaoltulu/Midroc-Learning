import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localeRoot = join(root, 'src', 'locales');
const sourceRoot = join(root, 'src');
const errors = [];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function flattenStrings(value, prefix = '', result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      result.set(fullKey, child);
    } else if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenStrings(child, fullKey, result);
    } else {
      errors.push(`Translation value "${fullKey}" must be a string or nested object.`);
    }
  }
  return result;
}

function placeholders(value) {
  return [...value.matchAll(/\{\{\s*-?\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort();
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

const localeFiles = await readdir(join(localeRoot, 'en'));
const namespaces = localeFiles
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5));
const english = new Map();

for (const namespace of namespaces) {
  const base = flattenStrings(await readJson(join(localeRoot, 'en', `${namespace}.json`)));
  english.set(namespace, base);
}

const languages = (await readdir(localeRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== 'en')
  .map((entry) => entry.name);

for (const language of languages) {
  const languageFiles = (await readdir(join(localeRoot, language)))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.slice(0, -5))
    .sort();
  const expectedFiles = [...namespaces].sort();
  if (JSON.stringify(languageFiles) !== JSON.stringify(expectedFiles)) {
    errors.push(`${language}: locale files must match English namespaces exactly.`);
  }

  for (const namespace of namespaces) {
    const path = join(localeRoot, language, `${namespace}.json`);
    const localized = flattenStrings(await readJson(path));
    const base = english.get(namespace);
    for (const key of base.keys()) {
      if (!localized.has(key)) errors.push(`${language}:${namespace}:${key} is missing.`);
    }
    for (const key of localized.keys()) {
      if (!base.has(key))
        errors.push(`${language}:${namespace}:${key} has no English translation.`);
    }
    for (const [key, englishValue] of base) {
      const localizedValue = localized.get(key);
      if (
        localizedValue !== undefined &&
        JSON.stringify(placeholders(englishValue)) !== JSON.stringify(placeholders(localizedValue))
      ) {
        errors.push(`${language}:${namespace}:${key} has mismatched interpolation placeholders.`);
      }
    }
  }
}

const sourceFiles = await collectSourceFiles(sourceRoot);
const referencedKeys = new Set();
for (const path of sourceFiles) {
  const contents = await readFile(path, 'utf8');
  const hookPattern = /const\s+\{\s*([^}]+)\}\s*=\s*useTranslation\(\s*(?:['"](\w+)['"])?\s*\)/g;
  for (const hook of contents.matchAll(hookPattern)) {
    const members = hook[1];
    const namespace = hook[2] ?? 'common';
    const translationFunction = members.match(/\bt(?:\s*:\s*(\w+))?\b/);
    if (!translationFunction) continue;

    const functionName = translationFunction[1] ?? 't';
    const calls = new RegExp(`\\b${functionName}\\(\\s*['"]([\\w.-]+)['"]`, 'g');
    for (const call of contents.matchAll(calls)) {
      referencedKeys.add(`${namespace}:${call[1]}`);
    }
  }
}

for (const namespace of namespaces) {
  for (const key of english.get(namespace).keys()) {
    const fullKey = `${namespace}:${key}`;
    if (!referencedKeys.has(fullKey))
      errors.push(`${fullKey} is unused in the application source.`);
  }
}

for (const reference of referencedKeys) {
  const separator = reference.indexOf(':');
  const namespace = reference.slice(0, separator);
  const key = reference.slice(separator + 1);
  if (!english.get(namespace)?.has(key))
    errors.push(`${reference} is used but has no translation.`);
}

if (errors.length) {
  console.error(`i18n:check failed with ${errors.length} issue(s):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    `i18n:check passed (${namespaces.length} namespaces, ${[...english.values()].reduce((total, keys) => total + keys.size, 0)} translation keys).`
  );
}
