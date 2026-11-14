import { firstParagraph, formatRating, restOfDescription } from './course-text';

describe('course text', () => {
  it('splits the description into the hero summary and the rest', () => {
    const text = '  Hazards and protection.\n\nFor everyone on site.\n\n\nBring your helmet.';
    expect(firstParagraph(text)).toBe('Hazards and protection.');
    expect(restOfDescription(text)).toBe('For everyone on site.\n\n\nBring your helmet.');
    expect(restOfDescription('Only one paragraph.\n')).toBe('');
    expect(firstParagraph('')).toBe('');
  });

  it('shows ratings with one decimal', () => {
    expect(formatRating(4)).toBe('4.0');
    expect(formatRating(4.66)).toBe('4.7');
  });
});
