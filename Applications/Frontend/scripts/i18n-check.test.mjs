// Vitest globals (describe/it/expect): importing 'vitest' here can load a second instance on Windows.
import { checkLocales, collectUsage, placeholders } from './i18n-check.mjs';

const en = {
  common: {
    save: 'Save',
    greet: 'Hi {{name}}',
    items_one: '{{count}} item',
    items_other: '{{count}} items',
    status: { draft: 'Draft', published: 'Published' },
  },
};
const am = {
  common: {
    save: 'አስቀምጥ',
    greet: 'ሰላም {{name}}',
    items_one: '{{count}} ንጥል',
    items_other: '{{count}} ንጥሎች',
    status: { draft: 'ረቂቅ', published: 'የታተመ' },
  },
};
const source = `
  const { t } = useTranslation('common');
  t('save'); t('greet', { name }); t('items', { count }); t(\`status.\${status}\`);
`;
const clone = (value) => JSON.parse(JSON.stringify(value));

describe('i18n-check', () => {
  it('passes when keys, placeholders and usage line up (plurals and template prefixes count)', () => {
    expect(checkLocales({ locales: { en, am }, sources: [source] })).toEqual([]);
  });

  it('reports a key missing in Amharic', () => {
    const broken = clone(am);
    delete broken.common.status.published;
    expect(checkLocales({ locales: { en, am: broken }, sources: [source] })).toEqual([
      'am/common: missing key "status.published"',
    ]);
  });

  it('reports extra keys, empty values and missing namespaces', () => {
    const broken = clone(am);
    broken.common.extra = 'ተጨማሪ';
    broken.common.save = ' ';
    const problems = checkLocales({
      locales: { en: { ...en, other: { a: 'A' } }, am: broken },
      sources: [source, "useTranslation('other'); t('a')"],
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        'am: missing namespace "other"',
        'am/common: "save" is empty',
        'am/common: extra key "extra" (not in en)',
      ]),
    );
  });

  it('reports placeholder mismatches', () => {
    const broken = clone(am);
    broken.common.greet = 'ሰላም {{user}}';
    expect(checkLocales({ locales: { en, am: broken }, sources: [source] })).toEqual([
      'am/common: "greet" placeholders differ: en {name} vs am {user}',
    ]);
  });

  it('reports unused keys and unregistered namespaces', () => {
    const problems = checkLocales({
      locales: { en, am },
      sources: ["useTranslation('common'); t('save')"],
      registry: "import design from '../../locales/en/design.json';",
    });
    expect(problems).toEqual(
      expect.arrayContaining([
        'en/common: unused key "greet"',
        'en/common: unused key "items_one"',
        'en/common: unused key "status.draft"',
        'en/common: namespace not registered in src/shared/i18n/resources.ts',
      ]),
    );
  });

  it('attributes literals to the namespaces a file uses, and honors ns: prefixes', () => {
    const usage = collectUsage(
      [
        "useTranslation('design'); t('title')",
        "const label = 'nav.home';",
        "i18n.t('design:intro'); t(`errors:${code}`)",
      ],
      ['common', 'design', 'errors'],
    );
    expect(usage.get('design')?.literals.has('title')).toBe(true);
    expect(usage.get('common')?.literals.has('title')).toBe(false);
    expect(usage.get('common')?.literals.has('nav.home')).toBe(true);
    expect(usage.get('design')?.literals.has('intro')).toBe(true);
    expect(usage.get('errors')?.all).toBe(true);
  });

  it('extracts placeholder names', () => {
    expect(placeholders('{{ b }} and {{a}} and {{a, number}}')).toEqual(['a', 'b']);
  });
});
