import enErrors from '../../locales/en/errors.json';
import { ApiError, NetworkError, type ApiIssue } from '../api/errors';
import { translateError, translateIssue } from './error-messages';
import { i18n, setLanguage } from './setup';

const err = (status: number, body: object = {}) => new ApiError(status, { error: 'x', ...body });
const issue = (code: string, params: Record<string, unknown> = {}): ApiIssue => ({
  path: ['title'],
  code,
  params,
});

afterEach(async () => {
  await setLanguage('en');
});

describe('translateError', () => {
  it('translates a known code, never the server text', () => {
    const error = err(409, { error: 'Course is locked', code: 'LOCKED' });
    expect(translateError(i18n, error)).toBe(
      "This course can't be changed in its current review state.",
    );
  });

  it('translates in Amharic', async () => {
    await setLanguage('am');
    expect(translateError(i18n, err(409, { code: 'ATTEMPTS_EXHAUSTED' }))).toBe(
      'ለዚህ ፈተና የተፈቀዱልዎትን ሙከራዎች በሙሉ ተጠቅመዋል።',
    );
  });

  it('has a message for every code the spec lists', () => {
    const specCodes = [
      'LOCKED',
      'REVISION_REQUIRED',
      'STALE_REVISION',
      'NOT_PUBLISHED',
      'ATTEMPTS_EXHAUSTED',
      'EXAM_TIME_EXCEEDED',
      'COURSE_INCOMPLETE',
      'VIDEO_INVALID_LINK',
      'VIDEO_UNAVAILABLE',
      'YOUTUBE_UNREACHABLE',
      'PDF_INVALID',
      'SELF_CHANGE_FORBIDDEN',
      'LAST_ADMIN',
      'ACCOUNT_SUSPENDED',
      'RATE_LIMITED',
      'ALREADY_DECIDED',
    ];
    expect(Object.keys(enErrors.codes).sort()).toEqual([...specCodes].sort());
  });

  it("translates the backend's own names for spec codes", () => {
    expect(translateError(i18n, err(410, { code: 'TIME_EXCEEDED' }))).toBe(
      enErrors.codes.EXAM_TIME_EXCEEDED,
    );
  });

  describe('unknown or missing codes fall back', () => {
    it.each([
      [409, enErrors.http.conflict],
      [403, enErrors.http.forbidden],
      [404, enErrors.http.notFound],
      [413, enErrors.http.payloadTooLarge],
      [500, enErrors.http.server],
      [503, enErrors.http.unavailable],
    ])('an unknown code with status %i → the status message', (status, expected) => {
      expect(translateError(i18n, err(status, { code: 'SOMETHING_NEW' }))).toBe(expected);
    });

    it('an unknown code with an unusual status → the generic message', () => {
      expect(translateError(i18n, err(418, { code: 'SOMETHING_NEW' }))).toBe(enErrors.generic);
    });

    it('no code at all → the status message', () => {
      expect(translateError(i18n, err(404, { error: 'Course not found' }))).toBe(
        enErrors.http.notFound,
      );
    });

    it('a 400 with validation issues → "some fields need attention"', () => {
      const error = err(400, { issues: [{ code: 'too_small', path: ['title'], minimum: 3 }] });
      expect(translateError(i18n, error)).toBe(enErrors.invalidInput);
    });

    it('a network failure → the connection message', () => {
      expect(translateError(i18n, new NetworkError())).toBe(enErrors.network);
    });

    it('anything else → the generic message', () => {
      expect(translateError(i18n, new Error('boom'))).toBe(enErrors.generic);
      expect(translateError(i18n, 'not an error')).toBe(enErrors.generic);
    });
  });

  it('interpolates params', () => {
    i18n.addResource('en', 'errors', 'codes.TEST_PARAMS', 'Wait {{seconds}} seconds.');
    expect(translateError(i18n, err(429, { code: 'TEST_PARAMS', params: { seconds: 30 } }))).toBe(
      'Wait 30 seconds.',
    );
  });
});

describe('translateIssue', () => {
  it('uses the origin variant with plurals', () => {
    expect(translateIssue(i18n, issue('too_small', { origin: 'string', minimum: 1 }))).toBe(
      'Enter at least 1 character.',
    );
    expect(translateIssue(i18n, issue('too_big', { origin: 'string', maximum: 200 }))).toBe(
      'Use no more than 200 characters.',
    );
    expect(translateIssue(i18n, issue('too_small', { origin: 'number', minimum: 0 }))).toBe(
      'Enter 0 or more.',
    );
  });

  it('uses the format variant', () => {
    expect(translateIssue(i18n, issue('invalid_format', { format: 'url' }))).toBe(
      'Enter a link that starts with http:// or https://.',
    );
  });

  it('falls back to the code default, then to a generic message', () => {
    expect(translateIssue(i18n, issue('invalid_format', { format: 'ipv6' }))).toBe(
      'Use the expected format.',
    );
    expect(translateIssue(i18n, issue('brand_new_code'))).toBe('Check this value.');
  });

  it('translates in Amharic', async () => {
    await setLanguage('am');
    expect(translateIssue(i18n, issue('too_small', { origin: 'string', minimum: 3 }))).toBe(
      'ቢያንስ 3 ቁምፊዎች ያስገቡ።',
    );
  });
});
