import { MasterDocument, PodcastEpisode, PodcastDialogueTurn } from '../types';

/**
 * Strips markdown markup, fences, and symbols into clean spoken text for speech synthesis.
 */
function cleanSpokenText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code fences
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/#+\s+/g, '') // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\|[ -:|]+\|/g, '') // table divider lines
    .replace(/\|/g, ', ') // table cells to commas
    .replace(/\$([^$]+)\$/g, '$1') // math $formula$
    .replace(/\\mathcal\{([^}]+)\}/g, '$1')
    .replace(/\\partial/g, 'partial')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\sum/g, 'sum')
    .replace(/\\in/g, 'in')
    .replace(/\\neq/g, 'not equal to')
    .replace(/\\approx/g, 'approximately')
    .replace(/\\to/g, 'to')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an interactive podcast script or audio lecture from a MasterDocument.
 */
export function generatePodcastScript(
  doc: MasterDocument,
  targetChapterNumber?: number | 'ALL',
  mode: 'podcast' | 'lecture' = 'podcast'
): PodcastEpisode {
  const isAll = !targetChapterNumber || targetChapterNumber === 'ALL';
  const targetChapters = isAll
    ? doc.chapters
    : doc.chapters.filter((c) => c.chapterNumber === targetChapterNumber);

  const chaptersToCover = targetChapters.length > 0 ? targetChapters : doc.chapters;
  const turns: PodcastDialogueTurn[] = [];

  const addTurn = (
    speaker: 'Alex' | 'Sam',
    text: string,
    chapterNumber?: number,
    chapterTitle?: string,
    sectionId?: string,
    sectionTitle?: string
  ) => {
    const cleaned = cleanSpokenText(text);
    if (cleaned.length > 5) {
      turns.push({
        id: `turn-${turns.length + 1}-${Date.now()}`,
        speaker: mode === 'lecture' ? 'Sam' : speaker,
        text: cleaned,
        chapterNumber,
        chapterTitle,
        sectionId,
        sectionTitle,
      });
    }
  };

  const titleTopic = isAll ? doc.title : chaptersToCover[0]?.title || doc.title;

  // 1. Episode Introduction
  if (mode === 'podcast') {
    addTurn(
      'Alex',
      `Welcome to Notelay Deep Dive! Today, we're unpacking a master blueprint on ${titleTopic}. If you've ever felt overwhelmed by technical complexity, stick around, because we're going to break down the first principles and core mental models that make everything click.`
    );
    addTurn(
      'Sam',
      `That's right, Alex. What makes this topic particularly fascinating is how elegant the underlying mechanics are once you strip away the jargon. We're going to connect the theory directly with real-world architectural design.`
    );
  } else {
    addTurn(
      'Sam',
      `Welcome to this comprehensive study lecture on ${titleTopic}. In this session, we will examine the core theorems, architecture, and operational invariants from first principles.`
    );
  }

  // 2. Iterate through target chapters and sections
  chaptersToCover.forEach((chapter) => {
    const cleanChapterTitle = chapter.title.replace(/^Chapter\s+\d+:\s*/i, '');

    // Chapter Transition
    if (mode === 'podcast') {
      addTurn(
        'Alex',
        `Let's dive into Chapter ${chapter.chapterNumber}: ${cleanChapterTitle}. Sam, where does our investigation begin here?`,
        chapter.chapterNumber,
        chapter.title
      );
      if (chapter.summary) {
        addTurn(
          'Sam',
          `The central question in Chapter ${chapter.chapterNumber} is simple: ${chapter.summary}`,
          chapter.chapterNumber,
          chapter.title
        );
      }
    } else {
      addTurn(
        'Sam',
        `Commencing Chapter ${chapter.chapterNumber}: ${cleanChapterTitle}. As an executive summary: ${chapter.summary || 'We explore key foundations.'}`,
        chapter.chapterNumber,
        chapter.title
      );
    }

    // Sections
    chapter.sections.forEach((section) => {
      // Alex prompts the section
      if (mode === 'podcast') {
        addTurn(
          'Alex',
          `Looking at section ${section.title}, what are the mechanics at play?`,
          chapter.chapterNumber,
          chapter.title,
          section.id,
          section.title
        );
      }

      // Extract core paragraph content
      const lines = section.content.split('\n');
      const paragraphs = lines
        .filter(
          (l) =>
            l.trim() &&
            !l.trim().startsWith('#') &&
            !l.trim().startsWith('|') &&
            !l.trim().startsWith('```')
        )
        .slice(0, 3)
        .join(' ');

      if (paragraphs) {
        addTurn(
          'Sam',
          paragraphs,
          chapter.chapterNumber,
          chapter.title,
          section.id,
          section.title
        );
      }

      // Handle Key Takeaways
      if (section.keyTakeaways && section.keyTakeaways.length > 0) {
        const takeawaySummary = section.keyTakeaways.slice(0, 2).join(' Furthermore, ');
        if (mode === 'podcast') {
          addTurn(
            'Alex',
            `So if we boil that down to a permanent memory anchor, what should listeners commit to memory?`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
          addTurn(
            'Sam',
            `The critical takeaway is this: ${takeawaySummary}`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
        } else {
          addTurn(
            'Sam',
            `Key takeaway for this section: ${takeawaySummary}`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
        }
      }

      // Handle Recall Questions
      if (section.recallQuestions && section.recallQuestions.length > 0) {
        const rq = section.recallQuestions[0];
        if (mode === 'podcast') {
          addTurn(
            'Alex',
            `Here's a self-test question that often trips people up: ${rq.question}`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
          addTurn(
            'Sam',
            `The answer comes down to: ${rq.answer}`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
        } else {
          addTurn(
            'Sam',
            `Consider this self-assessment question: ${rq.question}. The precise answer: ${rq.answer}`,
            chapter.chapterNumber,
            chapter.title,
            section.id,
            section.title
          );
        }
      }
    });
  });

  // 3. Outro & Synthesis
  if (mode === 'podcast') {
    addTurn(
      'Alex',
      `That covers our deep dive on ${titleTopic}! Having these concepts broken down into mental models really transforms how we think about the system.`
    );
    addTurn(
      'Sam',
      `Absolutely. The key is to revisit these notes, test yourself with the active recall flashcards, and cement these invariants. Thanks for tuning into Notelay Deep Dive!`
    );
  } else {
    addTurn(
      'Sam',
      `This concludes our study lecture on ${titleTopic}. Continue your review on the ruled notebook canvas and verify retention using the Active Recall Flashcard Studio.`
    );
  }

  // Calculate estimated duration (assuming average speech rate of ~140 words/min)
  const totalWords = turns.reduce((acc, t) => acc + t.text.split(' ').length, 0);
  const durationEstimateSeconds = Math.max(30, Math.round((totalWords / 140) * 60));

  return {
    id: `podcast-${Date.now()}`,
    title: isAll ? `Full Blueprint Deep Dive: ${doc.title}` : `Deep Dive: ${chaptersToCover[0]?.title}`,
    topic: titleTopic,
    mode,
    durationEstimateSeconds,
    dialogue: turns,
  };
}
