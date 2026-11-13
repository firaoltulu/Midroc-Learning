import { describe, expect, it } from 'vitest';
import { extractYoutubeId } from './youtube.js';

describe('extractYoutubeId', () => {
  const id = 'a1B2c3D4e5F';

  it.each([
    id,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/embed/${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://youtube.com/live/${id}`
  ])('normalizes %s', (input) => {
    expect(extractYoutubeId(input)).toBe(id);
  });

  it('rejects unsupported hosts and malformed ids', () => {
    expect(() => extractYoutubeId(`https://evil.example/watch?v=${id}`)).toThrow();
    expect(() => extractYoutubeId('abcdefgh')).toThrow();
  });
});
