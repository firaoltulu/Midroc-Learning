import { describe, expect, it, vi } from 'vitest';
import { formatDate, formatDateTime, formatRelative } from '../shared/i18n/date-format';

const sampleDate = new Date('2024-01-15T12:30:00.000Z');

describe('date formatting', () => {
  it('uses the Gregorian calendar for English and the Ethiopian calendar for Amharic', () => {
    expect(formatDate(sampleDate, 'en')).toContain('2024');
    expect(formatDate(sampleDate, 'am')).toContain('2016');
  });

  it('allows the caller to override the language-default calendar', () => {
    expect(formatDate(sampleDate, 'am', { calendar: 'gregory' })).toContain('2024');
    expect(formatDate(sampleDate, 'en', { calendar: 'ethiopic' })).toContain('2016');
  });

  it('falls back to Gregorian when the requested calendar is unavailable', () => {
    const formatterSpy = vi.spyOn(Intl, 'DateTimeFormat');
    formatterSpy.mockImplementationOnce(() => {
      throw new RangeError('Calendar is unavailable');
    });

    expect(formatDate(sampleDate, 'am')).toContain('2024');
  });

  it('uses ISO output if Intl date formatting is unavailable', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new RangeError('Date formatting is unavailable');
    });

    expect(formatDate(sampleDate, 'en')).toBe('2024-01-15');
    expect(formatDateTime(sampleDate, 'en')).toBe('2024-01-15T12:30:00.000Z');
  });

  it('returns a safe placeholder for invalid dates and formats dates and relative time', () => {
    expect(formatDate('not a date', 'en')).toBe('—');
    expect(formatDateTime(sampleDate, 'am')).toContain('2016');
    expect(formatRelative(sampleDate, 'en', { now: new Date('2024-01-14T12:30:00.000Z') })).toBe(
      'tomorrow'
    );
  });

  it('falls back to a localized calendar date if relative-time formatting is unavailable', () => {
    vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementationOnce(() => {
      throw new RangeError('Relative time formatting is unavailable');
    });

    expect(
      formatRelative(sampleDate, 'am', {
        calendar: 'gregory',
        now: new Date('2024-01-14T12:30:00.000Z')
      })
    ).toContain('2024');
  });
});
