import { comparisonRange, periodChange, resolveRange } from './range';

const days = (counts: number[]) => counts.map((count) => ({ count }));

describe('enrollments: last 30 days against the 30 before', () => {
  it('asks for the last 60 days by day', () => {
    expect(comparisonRange(new Date('2026-11-14T10:00:00Z'))).toEqual({
      from: '2026-09-16',
      to: '2026-11-14',
      interval: 'day',
    });
  });

  it('gives the change in percent, rounded', () => {
    // 30 days with 1 each (30), then 30 days with 2 each and one extra (61).
    const points = days([...Array<number>(30).fill(1), ...Array<number>(29).fill(2), 3]);
    expect(periodChange(points)).toBe(103);
    expect(periodChange(days([...Array<number>(30).fill(2), ...Array<number>(30).fill(1)]))).toBe(
      -50,
    );
  });

  it('has no percentage without enrollments before', () => {
    expect(periodChange(days([...Array<number>(30).fill(0), 5, 5]))).toBeNull();
    expect(periodChange([])).toBeNull();
  });
});

describe('dashboard range', () => {
  it('defaults to the last 30 days by day', () => {
    expect(resolveRange({}, new Date('2026-11-14T10:00:00Z'))).toEqual({
      from: '2026-10-16',
      to: '2026-11-14',
      interval: 'day',
    });
  });
});
