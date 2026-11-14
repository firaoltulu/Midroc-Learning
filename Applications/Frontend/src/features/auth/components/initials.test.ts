import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes the first letters of the first and last name', () => {
    expect(initials('Almaz Bekele', 'a@example.com')).toBe('AB');
    expect(initials('  hana  tesfaye girma ', 'h@example.com')).toBe('HG');
  });

  it('uses one letter for a single name, and the email without a name', () => {
    expect(initials('Sara', 's@example.com')).toBe('S');
    expect(initials(null, 'daniel@example.com')).toBe('D');
    expect(initials('', 'daniel@example.com')).toBe('D');
  });

  it('keeps Ethiopic letters whole', () => {
    expect(initials('አልማዝ በቀለ', 'a@example.com')).toBe('አበ');
  });
});
