import React, { useState, useMemo, useEffect } from 'react';
import { MasterDocument, Flashcard } from '../types';
import {
  extractFlashcardsFromDocument,
  generateQuizFromDocument,
} from '../utils/flashcardExtractor';
import {
  calculateSM2,
  previewIntervals,
  isCardDue,
  exportCardsToAnki,
} from '../utils/spacedRepetition';
import { motion } from 'motion/react';
import {
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Shuffle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Award,
  Layers,
  Flame,
  Clock,
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { triggerMicroBurst, triggerCelebration } from './ui/particle-burst';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface FlashcardStudioProps {
  document: MasterDocument;
  onJumpToChapter?: (chapterNumber: number) => void;
}

export const FlashcardStudio: React.FC<FlashcardStudioProps> = ({
  document,
  onJumpToChapter,
}) => {
  const [viewMode, setViewMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [selectedChapter, setSelectedChapter] = useState<number | 'ALL'>('ALL');
  const [dueFilter, setDueFilter] = useState<'all' | 'due'>('all');
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Extract base flashcards from current document
  const rawCards = useMemo(() => extractFlashcardsFromDocument(document), [document]);

  // Track mastery and review states in persistent SM-2 local storage
  const [cardsState, setCardsState] = useState<Record<string, Partial<Flashcard>>>(() => {
    try {
      const saved = localStorage.getItem('notelay_flashcards_sm2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveCardsState = (updater: (prev: Record<string, Partial<Flashcard>>) => Record<string, Partial<Flashcard>>) => {
    setCardsState((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem('notelay_flashcards_sm2', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Study streak tracking
  const [studyStreak, setStudyStreak] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('notelay_study_streak') || '1', 10);
    } catch {
      return 1;
    }
  });

  const cards = useMemo(() => {
    return rawCards
      .map((c) => {
        const state = cardsState[c.id];
        return {
          ...c,
          ...state,
          masteryLevel: state?.masteryLevel || c.masteryLevel,
          reviewCount: state?.reviewCount || c.reviewCount,
        };
      })
      .filter((c) => (selectedChapter === 'ALL' ? true : c.chapterNumber === selectedChapter))
      .filter((c) => (dueFilter === 'all' ? true : isCardDue(c)));
  }, [rawCards, selectedChapter, dueFilter, cardsState]);

  // Calculate total cards due today
  const dueCardsCount = useMemo(() => {
    return rawCards.filter((c) => {
      const state = cardsState[c.id];
      const merged = { ...c, ...state };
      return isCardDue(merged);
    }).length;
  }, [rawCards, cardsState]);

  // Clamp current index if filtered list changes
  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [cards.length, currentIndex]);

  const activeCard = cards[currentIndex] || null;

  // Interval previews for the 4 SM-2 grade buttons on active card
  const intervals = useMemo(() => {
    return activeCard
      ? previewIntervals(activeCard)
      : { again: '1d', hard: '1d', good: '3d', easy: '7d' };
  }, [activeCard]);

  // Mastery Statistics
  const stats = useMemo(() => {
    const total = cards.length;
    if (total === 0) return { mastered: 0, learning: 0, unlearned: 0, pctMastered: 0 };
    const mastered = cards.filter((c) => c.masteryLevel === 'mastered').length;
    const learning = cards.filter((c) => c.masteryLevel === 'learning').length;
    const unlearned = total - mastered - learning;
    return {
      mastered,
      learning,
      unlearned,
      pctMastered: Math.round((mastered / total) * 100),
    };
  }, [cards]);

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < cards.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : cards.length - 1));
  };

  const handleRateCard = (rating: 'again' | 'hard' | 'good' | 'easy', e?: React.MouseEvent) => {
    if (!activeCard) return;
    if (e) triggerMicroBurst(e.clientX, e.clientY, rating === 'easy' ? '#10b981' : rating === 'good' ? '#3b82f6' : rating === 'hard' ? '#f59e0b' : '#ef4444');

    const grade: 1 | 2 | 3 | 4 = rating === 'easy' ? 4 : rating === 'good' ? 3 : rating === 'hard' ? 2 : 1;
    const updated = calculateSM2(activeCard, grade);

    saveCardsState((prev) => ({
      ...prev,
      [activeCard.id]: {
        interval: updated.interval,
        repetition: updated.repetition,
        easeFactor: updated.easeFactor,
        dueDate: updated.dueDate,
        lastReviewed: updated.lastReviewed,
        reviewCount: updated.reviewCount,
        lapses: updated.lapses,
        masteryLevel: updated.masteryLevel,
      },
    }));

    // Daily study streak update
    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastStudyDate = localStorage.getItem('notelay_last_study_date');
      let streak = parseInt(localStorage.getItem('notelay_study_streak') || '1', 10);
      if (lastStudyDate !== today) {
        if (lastStudyDate) {
          const diffDays = Math.round((new Date(today).getTime() - new Date(lastStudyDate).getTime()) / 86400000);
          if (diffDays === 1) streak += 1;
          else if (diffDays > 1) streak = 1;
        }
        localStorage.setItem('notelay_study_streak', String(streak));
        localStorage.setItem('notelay_last_study_date', today);
        setStudyStreak(streak);
      }
    } catch {}

    if (rating === 'easy' && stats.mastered + 1 === cards.length) {
      triggerCelebration();
    }

    // Auto advance
    setTimeout(() => {
      handleNext();
    }, 280);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(Math.floor(Math.random() * cards.length));
  };

  const handleExportAnki = () => {
    triggerCelebration();
    const tsv = exportCardsToAnki(rawCards, document.title);
    const blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-anki-deck.tsv`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'flashcards') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (isFlipped) {
        if (e.key === '1') handleRateCard('again');
        else if (e.key === '2') handleRateCard('hard');
        else if (e.key === '3') handleRateCard('good');
        else if (e.key === '4') handleRateCard('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isFlipped, activeCard, cards.length]);

  // Quiz Arena States
  const rawQuiz = useMemo(() => generateQuizFromDocument(document), [document]);
  const quiz = useMemo(() => {
    return rawQuiz.filter((q) => (selectedChapter === 'ALL' ? true : q.chapterNumber === selectedChapter));
  }, [rawQuiz, selectedChapter]);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const activeQuestion = quiz[quizIndex] || null;

  const handleAnswerQuestion = (idx: number, e: React.MouseEvent) => {
    if (selectedAnswer !== null || !activeQuestion) return;
    setSelectedAnswer(idx);
    const isCorrect = idx === activeQuestion.correctIndex;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    } else {
      triggerMicroBurst(e.clientX, e.clientY, '#ef4444');
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 < quiz.length) {
      setQuizIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizCompleted(true);
      triggerCelebration();
    }
  };

  const handleResetQuiz = () => {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="space-y-4 select-text">
      {/* Top Header Card */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-[10px] tracking-wider uppercase font-semibold">
              <Layers size={11} className="text-blue-500" />
              <span>ACTIVE RECALL STUDIO</span>
            </Badge>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {cards.length} Cards
            </span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60 select-none">
              <Flame size={12} className="text-amber-500 fill-amber-500" />
              <span>{studyStreak}d Streak</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => {
                setViewMode('flashcards');
                setIsFlipped(false);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'flashcards'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles size={12} />
              <span>Flashcards</span>
            </button>
            <button
              onClick={() => {
                setViewMode('quiz');
                handleResetQuiz();
              }}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'quiz'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Award size={12} />
              <span>Quiz Arena</span>
            </button>
          </div>
        </div>

        {/* SM-2 Review Filter & Chapter Filter Row */}
        {viewMode === 'flashcards' && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setDueFilter('all');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  dueFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>All Cards</span>
                <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {rawCards.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDueFilter('due');
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  dueFilter === 'due'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Clock size={11} />
                <span>Due Today</span>
                <span className="text-[10px] font-mono px-1 rounded bg-black/10 font-bold">
                  {dueCardsCount}
                </span>
              </button>
            </div>

            <button
              onClick={handleExportAnki}
              title="Export deck to Anki format (.tsv)"
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors shrink-0 cursor-pointer font-medium"
            >
              <Download size={11} />
              <span>Anki Deck</span>
            </button>
          </div>
        )}

        {/* Chapter Filter Row */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <button
              onClick={() => {
                setSelectedChapter('ALL');
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                selectedChapter === 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Chapters ({rawCards.length})
            </button>
            {document.chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setSelectedChapter(ch.chapterNumber);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  selectedChapter === ch.chapterNumber
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Ch. {ch.chapterNumber}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportAnki}
            title="Export deck to Anki / Quizlet format (.tsv)"
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 transition-colors shrink-0 cursor-pointer font-medium"
          >
            <Download size={11} />
            <span>Anki TSV</span>
          </button>
        </div>

        {/* Mastery Progress Bar */}
        {viewMode === 'flashcards' && cards.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Mastery Progress</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {stats.pctMastered}% Mastered ({stats.mastered}/{cards.length})
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(stats.mastered / cards.length) * 100}%` }}
                className="bg-emerald-500 transition-all duration-300"
              />
              <div
                style={{ width: `${(stats.learning / cards.length) * 100}%` }}
                className="bg-blue-500 transition-all duration-300"
              />
              <div
                style={{ width: `${(stats.unlearned / cards.length) * 100}%` }}
                className="bg-slate-300 dark:bg-slate-700 transition-all duration-300"
              />
            </div>
          </div>
        )}
      </Card>

      {/* MODE 1: 3D FLIP FLASHCARDS */}
      {viewMode === 'flashcards' && (
        <div className="space-y-4">
          {cards.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Flashcards Extracted</h3>
              <p className="text-xs text-slate-500">
                This chapter doesn't have enough key takeaways or definitions yet.
              </p>
            </Card>
          ) : (
            <>
              {/* 3D Flip Card Container */}
              <div
                className="w-full min-h-[320px] cursor-pointer select-text"
                style={{ perspective: '1200px' }}
                onClick={handleFlip}
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="w-full min-h-[320px] relative rounded-2xl shadow-md transition-shadow hover:shadow-lg"
                >
                  {/* FRONT FACE */}
                  <div
                    style={{ backfaceVisibility: 'hidden' }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon icon="solar:book-bookmark-bold" className="text-blue-500" />
                          <span>Ch. {activeCard?.chapterNumber}: {activeCard?.sectionTitle || activeCard?.chapterTitle}</span>
                        </span>
                        <Badge
                          variant={
                            activeCard?.masteryLevel === 'mastered'
                              ? 'success'
                              : activeCard?.masteryLevel === 'learning'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-[10px] capitalize"
                        >
                          {activeCard?.masteryLevel}
                        </Badge>
                      </div>

                      <div className="py-6">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold block mb-2">
                          {activeCard?.category === 'recall'
                            ? 'Active Recall Prompt'
                            : activeCard?.category === 'takeaway'
                            ? 'Permanent Memory Anchor'
                            : 'Concept & Principle'}
                        </span>
                        <h2 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {activeCard?.front}
                        </h2>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
                      <span className="font-mono text-[11px]">
                        Card {currentIndex + 1} of {cards.length}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        <RotateCw size={11} />
                        <span>Click card or press [Space] to flip</span>
                      </span>
                    </div>
                  </div>

                  {/* BACK FACE */}
                  <div
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700/80 p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 mb-3 pb-2 border-b border-blue-100 dark:border-blue-900/60 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>Core Principle & Explanation</span>
                        </span>
                        {onJumpToChapter && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onJumpToChapter(activeCard?.chapterNumber || 1);
                            }}
                            className="text-[11px] underline text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            Jump to Chapter {activeCard?.chapterNumber} →
                          </button>
                        )}
                      </div>

                      <div className="py-2 text-[14px] text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                        {activeCard?.back}
                      </div>
                    </div>

                    {/* Spaced Repetition Rating Buttons */}
                    <div
                      className="pt-4 border-t border-blue-100 dark:border-blue-900/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block mb-2 text-center">
                        Rate Your Recall:
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleRateCard('again', e)}
                          className="px-2 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs"
                        >
                          <span>Again</span>
                          <span className="text-[10px] font-mono text-red-600 dark:text-red-400 font-medium">{intervals.again}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRateCard('hard', e)}
                          className="px-2 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs"
                        >
                          <span>Hard</span>
                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-medium">{intervals.hard}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRateCard('good', e)}
                          className="px-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs"
                        >
                          <span>Good</span>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-medium">{intervals.good}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRateCard('easy', e)}
                          className="px-2 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 cursor-pointer shadow-2xs"
                        >
                          <span>Easy</span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">{intervals.easy}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Navigation Controls Bar */}
              <div className="flex items-center justify-between px-2 pt-1 text-slate-500">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="Previous Card (Left Arrow)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="Next Card (Right Arrow)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="text-xs font-mono font-medium text-slate-400">
                  {currentIndex + 1} / {cards.length}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShuffle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
                    title="Shuffle Cards"
                  >
                    <Shuffle size={13} />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODE 2: QUIZ ARENA */}
      {viewMode === 'quiz' && (
        <div className="space-y-4">
          {quiz.length === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Quiz Questions Available</h3>
              <p className="text-xs text-slate-500">
                Generate more notes or switch to "All Chapters" to take the quiz.
              </p>
            </Card>
          ) : quizCompleted ? (
            /* Quiz Completed Score Card */
            <Card className="p-8 text-center bg-gradient-to-br from-white via-emerald-50/30 to-blue-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-700/80 rounded-2xl space-y-4 shadow-md">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-inner">
                🏆
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quiz Completed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You scored <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{quizScore}</strong> out of <strong className="font-mono text-sm">{quiz.length}</strong> ({Math.round((quizScore / quiz.length) * 100)}%)
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleResetQuiz}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <RotateCw size={13} />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => setViewMode('flashcards')}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs"
                >
                  Review Flashcards
                </button>
              </div>
            </Card>
          ) : (
            /* Active Question Card */
            <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-md space-y-5 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Chapter {activeQuestion?.chapterNumber}: {activeQuestion?.chapterTitle}
                </span>
                <span className="font-mono font-semibold">
                  Question {quizIndex + 1} of {quiz.length}
                </span>
              </div>

              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {activeQuestion?.question}
              </h3>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                {activeQuestion?.options.map((option, oIdx) => {
                  const isSelected = selectedAnswer === oIdx;
                  const isCorrect = oIdx === activeQuestion.correctIndex;
                  const showFeedback = selectedAnswer !== null;

                  let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

                  if (showFeedback) {
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 font-medium';
                    } else if (isSelected) {
                      btnStyle = 'bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-600 text-red-900 dark:text-red-200';
                    } else {
                      btnStyle = 'opacity-50 border-slate-200 dark:border-slate-800 text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      type="button"
                      disabled={showFeedback}
                      onClick={(e) => handleAnswerQuestion(oIdx, e)}
                      className={`w-full p-3 rounded-xl border text-left text-[13px] leading-relaxed transition-all cursor-pointer flex items-start gap-2.5 ${btnStyle}`}
                    >
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10.5px] font-mono shrink-0 mt-0.5">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showFeedback && isCorrect && (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Next Button */}
              {selectedAnswer !== null && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200">
                    <strong className="block font-semibold mb-1 text-blue-800 dark:text-blue-300">
                      💡 Explanation:
                    </strong>
                    <span>{activeQuestion?.explanation}</span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <span>{quizIndex + 1 === quiz.length ? 'Finish Quiz 🏁' : 'Next Question →'}</span>
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
