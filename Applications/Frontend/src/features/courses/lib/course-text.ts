/** A rating with one decimal ("4.0", "4.7"): Latin digits and a point in both languages. */
export const formatRating = (value: number) => value.toFixed(1);

/** The first paragraph of a description: the course hero's summary. */
export const firstParagraph = (text: string) => text.trim().split(/\n\s*\n/)[0] ?? '';

/** The description after its first paragraph (shown under "About this course"); '' if none. */
export const restOfDescription = (text: string) =>
  text.trim().slice(firstParagraph(text).length).replace(/^\s+/, '');
