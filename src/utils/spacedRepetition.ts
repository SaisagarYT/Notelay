import { Flashcard } from '../types';

/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm Implementation
 * 
 * Grades:
 * 1 = Again: Complete failure to recall. Interval resets.
 * 2 = Hard: Recalled with significant difficulty. Small interval progression.
 * 3 = Good: Recalled correctly with reasonable effort. Standard progression.
 * 4 = Easy: Effortless recall. Interval multiplied and bonus ease factor.
 */

export interface SM2IntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

export const formatIntervalDays = (days: number): string => {
  if (days <= 0 || days === 1) return '1d';
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
};

/**
 * Calculate the next SM-2 review parameters for a flashcard based on recall grade (1-4).
 */
export const calculateSM2 = (card: Flashcard, grade: 1 | 2 | 3 | 4): Flashcard => {
  const currentEase = card.easeFactor ?? 2.5;
  const currentReps = card.repetition ?? 0;
  const currentInterval = card.interval ?? 1;
  const lapses = card.lapses ?? 0;

  // Calculate new Ease Factor (min 1.3)
  // Standard SM-2 formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEase = Math.max(
    1.3,
    currentEase + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  let nextInterval: number;
  let nextReps: number;
  let nextLapses = lapses;
  let masteryLevel: Flashcard['masteryLevel'];

  if (grade < 3) {
    // Failure (Again / Hard reset)
    nextReps = 0;
    nextInterval = 1; // Due next day
    nextLapses = lapses + 1;
    masteryLevel = 'learning';
  } else {
    // Successful recall
    nextReps = currentReps + 1;

    if (nextReps === 1) {
      nextInterval = 1;
    } else if (nextReps === 2) {
      nextInterval = grade === 4 ? 8 : 6;
    } else {
      let mult = newEase;
      if (grade === 4) mult *= 1.3;
      nextInterval = Math.max(1, Math.round(currentInterval * mult));
    }

    masteryLevel = nextReps >= 3 ? 'mastered' : 'learning';
  }

  const now = new Date();
  const nextDueDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    ...card,
    interval: nextInterval,
    repetition: nextReps,
    easeFactor: Math.round(newEase * 100) / 100,
    dueDate: nextDueDate.toISOString(),
    lastReviewed: now.toISOString(),
    reviewCount: (card.reviewCount || 0) + 1,
    lapses: nextLapses,
    masteryLevel,
  };
};

/**
 * Preview intervals for each grade button before the user clicks.
 */
export const previewIntervals = (card: Flashcard): SM2IntervalPreview => {
  const c1 = calculateSM2(card, 1);
  const c2 = calculateSM2(card, 2);
  const c3 = calculateSM2(card, 3);
  const c4 = calculateSM2(card, 4);

  return {
    again: formatIntervalDays(c1.interval ?? 1),
    hard: formatIntervalDays(c2.interval ?? 1),
    good: formatIntervalDays(c3.interval ?? 1),
    easy: formatIntervalDays(c4.interval ?? 1),
  };
};

/**
 * Check if a card is due for review today.
 */
export const isCardDue = (card: Flashcard): boolean => {
  if (!card.dueDate) return true; // Unreviewed cards are due
  const due = new Date(card.dueDate);
  const now = new Date();
  return due <= now;
};

/**
 * Export Flashcard deck to Anki-compatible TSV format.
 */
export const exportCardsToAnki = (cards: Flashcard[], deckName: string): string => {
  const headers = [
    '#separator:tab',
    '#html:true',
    '#tags column:3',
    `#deck:${deckName || 'Notelay Notes'}`,
  ].join('\n');

  const rows = cards.map((c) => {
    // Sanitize tabs and newlines for Anki TSV
    const front = c.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const back = c.back.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tags = `Ch${c.chapterNumber} ${c.category || 'general'}`.replace(/\s+/g, '_');
    return `${front}\t${back}\t${tags}`;
  });

  return `${headers}\n${rows.join('\n')}`;
};
