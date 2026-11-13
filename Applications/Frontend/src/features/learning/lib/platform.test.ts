import { pdfFileName } from './platform';

describe('pdfFileName', () => {
  it('keeps readable titles, in any script', () => {
    expect(pdfFileName('Safety handbook')).toBe('Safety handbook.pdf');
    expect(pdfFileName('የደህንነት መመሪያ')).toBe('የደህንነት መመሪያ.pdf');
  });

  it('removes path separators and control characters', () => {
    expect(pdfFileName('../etc/passwd')).toBe('.. etc passwd.pdf');
    expect(pdfFileName('a\\b:c*d?"e"<f>|g\u0000h\nI')).toBe('a b c d e f g h I.pdf');
  });

  it('falls back to a generic name', () => {
    expect(pdfFileName('  /// ')).toBe('document.pdf');
  });
});
