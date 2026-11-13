import {
  choose,
  clearAnswers,
  isAnswered,
  loadAnswers,
  saveAnswers,
  toSubmission,
} from './exam-answers';
import { announcementFor, clockOffset, formatClock, remainingMs } from './exam-timer';

describe('exam timer', () => {
  it('measures the server clock offset from the Date header', () => {
    const receivedAt = Date.parse('2026-11-13T10:00:00.000Z');
    // The learner's clock is 90 s behind the server.
    expect(clockOffset('Fri, 13 Nov 2026 10:01:30 GMT', receivedAt)).toBe(90_000);
    expect(clockOffset(null, receivedAt)).toBe(0);
    expect(clockOffset('not a date', receivedAt)).toBe(0);
  });

  it('counts down on the server clock, whatever the local clock says', () => {
    const expiresAt = '2026-11-13T10:30:00.000Z';
    const serverNow = Date.parse('2026-11-13T10:20:00.000Z');
    // Local clock 5 min fast: offset -5 min; local clock 5 min slow: offset +5 min.
    for (const skew of [-300_000, 0, 300_000]) {
      const localNow = serverNow - skew;
      expect(remainingMs(expiresAt, localNow, skew)).toBe(600_000);
    }
    expect(remainingMs(expiresAt, serverNow + 3_600_000, 0)).toBe(0);
  });

  it('announces only at set points, the most urgent when several are crossed', () => {
    expect(announcementFor(301_000, 299_000)).toBe(5);
    expect(announcementFor(299_000, 298_000)).toBeNull();
    expect(announcementFor(61_000, 60_000)).toBe(1);
    expect(announcementFor(900_000, 30_000)).toBe(1); // the tab was asleep
    expect(announcementFor(30_000, 29_000)).toBeNull();
  });

  it('formats the clock, rounding up', () => {
    expect(formatClock(245_000)).toBe('4:05');
    expect(formatClock(500)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(3_729_000)).toBe('1:02:09');
  });
});

describe('exam answers', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('single-answer questions keep one choice; multi-answer questions toggle', () => {
    let answers = choose({}, 'q1', 'a', false);
    answers = choose(answers, 'q1', 'b', false);
    expect(answers).toEqual({ q1: ['b'] });

    answers = choose(answers, 'q2', 'x', true);
    answers = choose(answers, 'q2', 'y', true);
    answers = choose(answers, 'q2', 'x', true);
    expect(answers.q2).toEqual(['y']);
    expect(isAnswered(answers, 'q2')).toBe(true);
    expect(isAnswered(choose(answers, 'q2', 'y', true), 'q2')).toBe(false);
  });

  it('persists per attempt and survives garbage in storage', () => {
    saveAnswers('attempt-1', { q1: ['a'] });
    expect(loadAnswers('attempt-1')).toEqual({ q1: ['a'] });
    expect(loadAnswers('attempt-2')).toEqual({});

    sessionStorage.setItem('midroc.exam.attempt-3', '{"q1":"a","q2":["b",3]}');
    expect(loadAnswers('attempt-3')).toEqual({ q2: ['b'] });
    sessionStorage.setItem('midroc.exam.attempt-4', 'not json');
    expect(loadAnswers('attempt-4')).toEqual({});

    clearAnswers('attempt-1');
    expect(loadAnswers('attempt-1')).toEqual({});
  });

  it('submits only answered questions and existing choices', () => {
    const questions = [
      { id: 'q1', choices: [{ id: 'a' }, { id: 'b' }] },
      { id: 'q2', choices: [{ id: 'c' }] },
    ];
    expect(toSubmission(questions, { q1: ['b', 'gone'], q2: [], q9: ['x'] })).toEqual([
      { questionId: 'q1', choiceIds: ['b'] },
    ]);
  });
});
