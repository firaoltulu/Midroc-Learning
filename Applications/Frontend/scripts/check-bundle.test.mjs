import { catalogRootKeys, LAZY_MARKERS, staticClosure } from './check-bundle.mjs';

const manifest = {
  'index.html': {
    file: 'assets/index.js',
    imports: ['_vendor.js'],
    dynamicImports: ['player.tsx'],
  },
  '_vendor.js': { file: 'assets/vendor.js' },
  'src/routes/_authenticated.courses.index.tsx?tsr-split=component': {
    file: 'assets/catalog.js',
    imports: ['_vendor.js', '_card.js'],
  },
  '_card.js': { file: 'assets/card.js' },
  'player.tsx': { file: 'assets/player.js', imports: ['_pdf.js'] },
  '_pdf.js': { file: 'assets/pdf.js' },
};

describe('check-bundle', () => {
  it('follows static imports only (lazy chunks stay out)', () => {
    const files = staticClosure(manifest, catalogRootKeys(manifest));
    expect(files.sort()).toEqual([
      'assets/card.js',
      'assets/catalog.js',
      'assets/index.js',
      'assets/vendor.js',
    ]);
  });

  it('fails loudly when the catalog route is missing', () => {
    expect(() => catalogRootKeys({ 'index.html': { file: 'a.js' } })).toThrow(/catalog route/);
  });

  it('recognizes pdf.js and YouTube player code', () => {
    const [pdf, youtube] = LAZY_MARKERS;
    expect(pdf.pattern.test('pdfjs.GlobalWorkerOptions.workerSrc=')).toBe(true);
    expect(youtube.pattern.test('host:"https://www.youtube-nocookie.com"')).toBe(true);
    expect(pdf.pattern.test('catalog code')).toBe(false);
  });
});
