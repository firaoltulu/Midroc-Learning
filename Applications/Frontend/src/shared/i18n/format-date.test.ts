import {
  formatDate,
  formatDateTime,
  formatRelative,
  resolveCalendar,
  supportsEthiopicCalendar,
} from './format-date';

const sample = new Date('2026-11-13T09:30:00Z');
const utc = { timeZone: 'UTC' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('calendar selection', () => {
  it('follows the interface language by default', () => {
    expect(resolveCalendar('am')).toBe('ethiopic');
    expect(resolveCalendar('en')).toBe('gregory');
  });

  it('honors the user override in either language', () => {
    expect(resolveCalendar('am', 'gregorian')).toBe('gregory');
    expect(resolveCalendar('en', 'ethiopian')).toBe('ethiopic');
  });
});

describe('Gregorian (English)', () => {
  it('formats dates and date-times', () => {
    expect(formatDate(sample, { language: 'en', ...utc })).toBe('Nov 13, 2026');
    expect(formatDateTime(sample, { language: 'en', ...utc })).toBe('Nov 13, 2026, 9:30 AM');
  });

  it('accepts ISO strings and timestamps', () => {
    expect(formatDate('2026-11-13T09:30:00Z', { language: 'en', ...utc })).toBe('Nov 13, 2026');
    expect(formatDate(sample.getTime(), { language: 'en', ...utc })).toBe('Nov 13, 2026');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatDate('not a date', { language: 'en' })).toBe('');
  });
});

describe('Ethiopian (Amharic)', () => {
  it('is supported by the test runtime', () => {
    expect(supportsEthiopicCalendar()).toBe(true);
  });

  const amEra = { ...utc, ethiopicEra: 'ዓ.ም.' };

  it('formats 13 Nov 2026 as 4 Hedar 2019 ዓ.ም. with Latin digits', () => {
    expect(formatDate(sample, { language: 'am', ...amEra })).toBe('4 ኅዳር 2019 ዓ.ም.');
    expect(formatDateTime(sample, { language: 'am', ...amEra })).toBe('4 ኅዳር 2019 ዓ.ም. 9:30 ጥዋት');
  });

  it('never shows ICU placeholder eras, and omits the marker when none is given', () => {
    expect(formatDate(sample, { language: 'am', ...utc })).toBe('4 ኅዳር 2019');
    expect(formatDate(sample, { language: 'en', calendar: 'ethiopian', ...utc })).not.toMatch(
      /ERA/,
    );
  });

  it('can show Gregorian dates in Amharic and Ethiopian dates in English', () => {
    expect(formatDate(sample, { language: 'am', calendar: 'gregorian', ...amEra })).toBe(
      '13 ኖቬም 2026',
    );
    expect(
      formatDate(sample, { language: 'en', calendar: 'ethiopian', ...utc, ethiopicEra: 'E.C.' }),
    ).toBe('Hedar 4, 2019 E.C.');
    expect(
      formatDateTime(sample, {
        language: 'en',
        calendar: 'ethiopian',
        ...utc,
        ethiopicEra: 'E.C.',
      }),
    ).toBe('Hedar 4, 2019 E.C., 9:30 AM');
  });
});

describe('fallback', () => {
  it('uses Gregorian when the runtime cannot format the Ethiopian calendar', () => {
    const RealDateTimeFormat = Intl.DateTimeFormat;
    // Simulate an engine without Ethiopian calendar data: it silently resolves to Gregorian.
    // A regular function (not an arrow) so it can be called with `new`.
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return new RealDateTimeFormat(
        typeof locales === 'string' ? locales.replace('-ca-ethiopic', '-ca-gregory') : locales,
        options,
      );
    });

    expect(supportsEthiopicCalendar()).toBe(false);
    expect(resolveCalendar('am')).toBe('gregory');
    expect(formatDate(sample, { language: 'am', ...utc })).toBe('13 ኖቬም 2026');
  });

  it('falls back to an ISO date if Intl throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function () {
      throw new RangeError('unsupported');
    });
    expect(formatDate(sample, { language: 'am', ...utc })).toBe('2026-11-13');
    expect(formatDateTime(sample, { language: 'en', ...utc })).toBe('2026-11-13 09:30');
  });
});

describe('formatRelative', () => {
  const at = (hoursAgo: number) => new Date(sample.getTime() - hoursAgo * 3_600_000);

  it('describes recent moments in words', () => {
    expect(formatRelative(at(3), { language: 'en', now: sample })).toBe('3 hours ago');
    expect(formatRelative(at(3), { language: 'am', now: sample })).toBe('ከ3 ሰዓቶች በፊት');
    expect(formatRelative(at(24), { language: 'en', now: sample })).toBe('yesterday');
    expect(formatRelative(sample, { language: 'en', now: sample })).toBe('now');
  });

  it('switches to the calendar date after a week', () => {
    expect(formatRelative(at(24 * 10), { language: 'am', now: sample, ...utc })).toBe(
      formatDate(at(24 * 10), { language: 'am', ...utc }),
    );
  });
});
