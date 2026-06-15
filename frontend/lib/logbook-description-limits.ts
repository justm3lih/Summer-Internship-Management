/** Backend LogbookController ile aynı tut — kelime sayımı boşluklara göre. */
export const LOGBOOK_DESCRIPTION_MIN_WORDS = 20;
export const LOGBOOK_DESCRIPTION_MAX_WORDS = 150;

export function countLogbookDescriptionWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

export function logbookDescriptionWordError(wordCount: number): string | null {
  if (wordCount < LOGBOOK_DESCRIPTION_MIN_WORDS) {
    return `Description must be at least ${LOGBOOK_DESCRIPTION_MIN_WORDS} words (currently ${wordCount}).`;
  }
  if (wordCount > LOGBOOK_DESCRIPTION_MAX_WORDS) {
    return `Description must be at most ${LOGBOOK_DESCRIPTION_MAX_WORDS} words (currently ${wordCount}).`;
  }
  return null;
}
