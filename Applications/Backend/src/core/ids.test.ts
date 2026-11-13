import { describe, expect, it } from 'vitest';
import { isUuid } from './ids.js';

describe('isUuid', () => {
  it('accepts UUID strings and rejects malformed path values', () => {
    expect(isUuid('b0b723c8-bdcb-4ea9-8a8b-2ac5d2303a94')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(['b0b723c8-bdcb-4ea9-8a8b-2ac5d2303a94'])).toBe(false);
  });
});
