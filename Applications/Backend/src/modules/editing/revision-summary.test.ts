import { describe, expect, it } from 'vitest';
import { summarizeRevision, type ModuleLike } from './revision-summary.js';

const pdf = (id: string, title: string) => ({ id, type: 'pdf' as const, title, fileKey: `${id}.pdf` });
const exam = (id: string, prompt = 'Which is safe?') => ({
  id,
  type: 'exam' as const,
  title: 'Quiz',
  instructions: '',
  passingScorePercent: 60,
  maxAttempts: null,
  timeLimitMinutes: null,
  questions: [
    {
      prompt,
      isMultiple: false,
      points: 1,
      choices: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: false }
      ]
    }
  ]
});

const live: ModuleLike[] = [
  { id: 'm1', title: 'Basics', description: '', items: [pdf('i1', 'Guide'), pdf('i2', 'Checklist'), exam('i3')] },
  { id: 'm2', title: 'Advanced', description: '', items: [pdf('i4', 'Deep dive')] }
];

const summarize = (proposed: ModuleLike[] | undefined, courseChanges = {}) =>
  summarizeRevision({ courseTitle: 'Safety', courseChanges, live, proposed });

describe('summarizeRevision', () => {
  it('finds nothing when the proposal equals the live course', () => {
    expect(summarize(structuredClone(live))).toEqual([]);
    expect(summarize(undefined)).toEqual([]);
  });

  it('reports course field changes with the proposed title', () => {
    expect(summarize(undefined, { title: 'Safety 2', language: 'am' })).toEqual([
      { kind: 'edited', target: 'course', title: 'Safety 2', fields: ['title', 'language'] }
    ]);
  });

  it('reports removed modules once (not each of their items) and removed items', () => {
    const [basics] = structuredClone(live);
    basics!.items = basics!.items.filter((item) => item.id !== 'i2');
    expect(summarize([basics!])).toEqual([
      { kind: 'removed', target: 'item', title: 'Checklist', itemType: 'pdf' },
      { kind: 'removed', target: 'module', title: 'Advanced' }
    ]);
  });

  it('reports reordered items and edited module and item fields', () => {
    const proposed = structuredClone(live);
    proposed[0]!.description = 'Start here';
    proposed[0]!.items = [proposed[0]!.items[1]!, proposed[0]!.items[0]!, exam('i3', 'Which is safest?')];
    proposed[1]!.items[0] = { ...pdf('i4', 'Deep dive'), fileKey: 'new.pdf' };
    expect(summarize(proposed)).toEqual([
      { kind: 'edited', target: 'module', title: 'Basics', fields: ['description'] },
      { kind: 'edited', target: 'item', title: 'Quiz', itemType: 'exam', fields: ['questions'] },
      { kind: 'reordered', target: 'module', title: 'Basics' },
      { kind: 'edited', target: 'item', title: 'Deep dive', itemType: 'pdf', fields: ['file'] }
    ]);
  });
});
