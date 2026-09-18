import { MasterDocument, Flashcard, QuizQuestion } from '../types';

/**
 * Extracts comprehensive flashcards from a MasterDocument by analyzing:
 * 1. section.recallQuestions
 * 2. section.keyTakeaways
 * 3. Definition patterns: `- **Term**: Explanation`
 * 4. Comparison matrices and Markdown tables
 */
export function extractFlashcardsFromDocument(doc: MasterDocument): Flashcard[] {
  if (!doc || !doc.chapters || doc.chapters.length === 0) {
    return [];
  }

  const cards: Flashcard[] = [];
  const seenFronts = new Set<string>();

  doc.chapters.forEach((chapter) => {
    chapter.sections.forEach((section) => {
      // 1. Explicit Recall Questions
      if (section.recallQuestions && section.recallQuestions.length > 0) {
        section.recallQuestions.forEach((rq, idx) => {
          const front = rq.question.trim();
          if (front && !seenFronts.has(front.toLowerCase())) {
            seenFronts.add(front.toLowerCase());
            cards.push({
              id: `fc-rq-${chapter.chapterNumber}-${section.id}-${idx}`,
              chapterNumber: chapter.chapterNumber,
              chapterTitle: chapter.title,
              sectionTitle: section.title,
              front,
              back: rq.answer.trim(),
              category: 'recall',
              masteryLevel: 'unlearned',
              reviewCount: 0,
            });
          }
        });
      }

      // 2. Permanent Key Takeaways
      if (section.keyTakeaways && section.keyTakeaways.length > 0) {
        section.keyTakeaways.forEach((takeaway, idx) => {
          const clean = takeaway.trim();
          if (!clean) return;

          // Check if format is **Term**: Description
          const colonMatch = clean.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
          if (colonMatch) {
            const front = `What is the core principle of **${colonMatch[1].trim()}**?`;
            const back = colonMatch[2].trim();
            if (!seenFronts.has(front.toLowerCase())) {
              seenFronts.add(front.toLowerCase());
              cards.push({
                id: `fc-kt-${chapter.chapterNumber}-${section.id}-${idx}`,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                sectionTitle: section.title,
                front,
                back,
                category: 'takeaway',
                masteryLevel: 'unlearned',
                reviewCount: 0,
              });
            }
          } else {
            const front = `Key Insight: ${section.title} (Chapter ${chapter.chapterNumber})`;
            if (!seenFronts.has(clean.toLowerCase())) {
              seenFronts.add(clean.toLowerCase());
              cards.push({
                id: `fc-kt-raw-${chapter.chapterNumber}-${section.id}-${idx}`,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                sectionTitle: section.title,
                front,
                back: clean,
                category: 'takeaway',
                masteryLevel: 'unlearned',
                reviewCount: 0,
              });
            }
          }
        });
      }

      // 3. Content Text Analysis (Bold Definitions & Invariants)
      if (section.content) {
        const lines = section.content.split('\n');
        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();
          // Pattern: - **Term**: Definition or - **Term** — Definition
          const defMatch = trimmed.match(/^[-*•]?\s*\*\*([^*]+)\*\*\s*(?::|—|-)\s*(.+)$/);
          if (defMatch) {
            const term = defMatch[1].trim();
            const definition = defMatch[2].trim();
            const front = `Explain the concept: **${term}**`;
            if (term.length >= 2 && definition.length >= 10 && !seenFronts.has(front.toLowerCase())) {
              seenFronts.add(front.toLowerCase());
              cards.push({
                id: `fc-def-${chapter.chapterNumber}-${section.id}-${lIdx}`,
                chapterNumber: chapter.chapterNumber,
                chapterTitle: chapter.title,
                sectionTitle: section.title,
                front,
                back: definition,
                category: 'definition',
                masteryLevel: 'unlearned',
                reviewCount: 0,
              });
            }
          }
        });

        // 4. Comparison Table Row Extraction
        const tableLines = lines.filter((l) => l.trim().startsWith('|'));
        if (tableLines.length >= 3) {
          const headers = tableLines[0].split('|').map((s) => s.trim()).filter(Boolean);
          if (headers.length >= 2) {
            for (let r = 2; r < tableLines.length; r++) {
              const cells = tableLines[r].split('|').map((s) => s.trim()).filter(Boolean);
              if (cells.length >= 2) {
                const rowKey = cells[0].replace(/\*\*/g, '').trim();
                const front = `In ${headers.join(' vs ')}, what is the distinction regarding **${rowKey}**?`;
                const back = cells.slice(1).map((val, cIdx) => `**${headers[cIdx + 1] || 'Item'}**: ${val}`).join('\n\n');
                if (rowKey && !seenFronts.has(front.toLowerCase())) {
                  seenFronts.add(front.toLowerCase());
                  cards.push({
                    id: `fc-tbl-${chapter.chapterNumber}-${section.id}-${r}`,
                    chapterNumber: chapter.chapterNumber,
                    chapterTitle: chapter.title,
                    sectionTitle: section.title,
                    front,
                    back,
                    category: 'definition',
                    masteryLevel: 'unlearned',
                    reviewCount: 0,
                  });
                }
              }
            }
          }
        }
      }
    });
  });

  // Fallback if document has very little structured text
  if (cards.length === 0) {
    doc.chapters.forEach((chapter) => {
      cards.push({
        id: `fc-ch-${chapter.chapterNumber}`,
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.title,
        front: `What are the primary objectives of **${chapter.title}**?`,
        back: chapter.summary || `Comprehensive foundations and core mechanics covered in Chapter ${chapter.chapterNumber}.`,
        category: 'takeaway',
        masteryLevel: 'unlearned',
        reviewCount: 0,
      });
    });
  }

  return cards;
}

/**
 * Generates interactive multiple-choice quiz questions from document flashcards.
 */
export function generateQuizFromDocument(doc: MasterDocument): QuizQuestion[] {
  const cards = extractFlashcardsFromDocument(doc);
  if (cards.length === 0) return [];

  const quiz: QuizQuestion[] = [];

  cards.forEach((card, idx) => {
    const otherCards = cards.filter((c) => c.id !== card.id && c.back.length > 10);
    const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());

    const distractor1 = shuffledOthers[0]?.back.slice(0, 140) || 'It operates strictly in single-threaded user mode without kernel intervention.';
    const distractor2 = shuffledOthers[1]?.back.slice(0, 140) || 'It relies on static compilation time allocation rather than dynamic paging.';
    const distractor3 = shuffledOthers[2]?.back.slice(0, 140) || 'It guarantees linear O(1) lookup regardless of dataset or memory fragmentation.';

    const correctAnswer = card.back.slice(0, 160);
    const options = [correctAnswer, distractor1, distractor2, distractor3];

    const shuffledOptions = options
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.value);

    const correctIndex = shuffledOptions.indexOf(correctAnswer);

    quiz.push({
      id: `quiz-${card.id}-${idx}`,
      chapterNumber: card.chapterNumber,
      chapterTitle: card.chapterTitle,
      question: card.front.replace(/^Explain the concept:\s*/i, 'Which of the following best describes: '),
      options: shuffledOptions,
      correctIndex: Math.max(0, correctIndex),
      explanation: card.back,
    });
  });

  return quiz;
}

/**
 * Formats flashcards into an Anki-compatible TSV string (Front \t Back \t Tags).
 */
export function exportFlashcardsToAnkiTsv(cards: Flashcard[], docTitle: string): string {
  const sanitize = (text: string) =>
    text
      .replace(/\t/g, '    ')
      .replace(/\n/g, '<br>')
      .replace(/"/g, '""');

  const tag = docTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const lines = [
    `#separator:tab`,
    `#html:true`,
    `#tags column:3`,
    `# Deck: ${docTitle}`,
    ...cards.map((c) => `${sanitize(c.front)}\t${sanitize(c.back)}\tNotelay Chapter_${c.chapterNumber} ${tag}`),
  ];

  return lines.join('\n');
}
