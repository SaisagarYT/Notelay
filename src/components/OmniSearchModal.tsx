import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  FileText,
  Pin,
  Layers,
  FileCode,
  ArrowRight,
  Columns2,
  Download,
  Printer,
  Radio,
  X,
} from 'lucide-react';
import { Project, MasterDocument, SourceFile, Flashcard, NotebookStickyNote } from '../types';

export interface OmniSearchResult {
  id: string;
  type: 'action' | 'project' | 'chapter' | 'sticky' | 'flashcard' | 'source';
  title: string;
  subtitle?: string;
  badge: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  document: MasterDocument;
  sources: SourceFile[];
  flashcards?: Flashcard[];
  stickyNotes?: NotebookStickyNote[];
  onJumpToChapter?: (chapterNumber: number) => void;
  onJumpToSection?: (sectionId: string) => void;
  onOpenDualStudio?: () => void;
  onOpenExportModal?: () => void;
  onQuickDownloadMarkdown?: () => void;
  onOpenAudioPlayer?: () => void;
  onOpenFlashcards?: () => void;
  onSelectSource?: (source: SourceFile) => void;
  onAddSource?: () => void;
}

export const OmniSearchModal: React.FC<OmniSearchModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  document,
  sources,
  flashcards = [],
  stickyNotes = [],
  onJumpToChapter,
  onJumpToSection,
  onOpenDualStudio,
  onOpenExportModal,
  onQuickDownloadMarkdown,
  onOpenAudioPlayer,
  onOpenFlashcards,
  onSelectSource,
  onAddSource,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Generate searchable index
  const results = useMemo<OmniSearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    const list: OmniSearchResult[] = [];

    // 1. Quick Actions
    const actions: OmniSearchResult[] = [
      {
        id: 'act-dual-studio',
        type: 'action',
        title: 'Toggle Split View (Side-by-Side Dual Studio)',
        subtitle: 'Read source PDF and write notes simultaneously',
        badge: 'Action',
        icon: <Columns2 size={15} className="text-indigo-500" />,
        onSelect: () => {
          onClose();
          onOpenDualStudio?.();
        },
      },
      {
        id: 'act-audio-podcast',
        type: 'action',
        title: 'Open Audio Overview & Study Podcast',
        subtitle: 'Synthesize audio dialogue turn-by-turn',
        badge: 'Action',
        icon: <Radio size={15} className="text-emerald-500" />,
        onSelect: () => {
          onClose();
          onOpenAudioPlayer?.();
        },
      },
      {
        id: 'act-flashcards',
        type: 'action',
        title: 'Open Active Recall Flashcards & Quiz Arena',
        subtitle: '3D flashcards, SM-2 spaced repetition',
        badge: 'Action',
        icon: <Layers size={15} className="text-amber-500" />,
        onSelect: () => {
          onClose();
          onOpenFlashcards?.();
        },
      },
      {
        id: 'act-export-pdf',
        type: 'action',
        title: 'Print / Export Multi-Page PDF Document',
        subtitle: 'Compile notebook pages to physical print or PDF file',
        badge: 'Action',
        icon: <Printer size={15} className="text-slate-500" />,
        onSelect: () => {
          onClose();
          onOpenExportModal?.();
        },
      },
      {
        id: 'act-export-md',
        type: 'action',
        title: 'Download Master Markdown (.md)',
        subtitle: 'Export clean markdown notes and mermaid code',
        badge: 'Action',
        icon: <Download size={15} className="text-blue-500" />,
        onSelect: () => {
          onClose();
          onQuickDownloadMarkdown?.();
        },
      },
      {
        id: 'act-add-source',
        type: 'action',
        title: 'Attach New Document or PDF Source',
        subtitle: 'Ingest lecture slides or textbook to study knowledge base',
        badge: 'Action',
        icon: <FileCode size={15} className="text-purple-500" />,
        onSelect: () => {
          onClose();
          onAddSource?.();
        },
      },
    ];

    // Filter actions
    actions.forEach((act) => {
      if (!q || act.title.toLowerCase().includes(q) || (act.subtitle && act.subtitle.toLowerCase().includes(q))) {
        list.push(act);
      }
    });

    // 2. Projects
    projects.forEach((proj) => {
      if (proj.id !== activeProjectId) {
        if (!q || proj.name.toLowerCase().includes(q) || (proj.description && proj.description.toLowerCase().includes(q))) {
          list.push({
            id: `proj-${proj.id}`,
            type: 'project',
            title: proj.name,
            subtitle: proj.description || 'Switch workspace project',
            badge: 'Project',
            icon: <BookOpen size={15} className="text-blue-600" />,
            onSelect: () => {
              onClose();
              onSelectProject(proj.id);
            },
          });
        }
      }
    });

    // 3. Chapters & Sections in Active Document
    document.chapters.forEach((ch) => {
      if (!q || ch.title.toLowerCase().includes(q) || (ch.subtitle && ch.subtitle.toLowerCase().includes(q))) {
        list.push({
          id: `ch-${ch.id}`,
          type: 'chapter',
          title: `Chapter ${ch.chapterNumber}: ${ch.title}`,
          subtitle: ch.subtitle || `Estimated read: ${ch.estimatedReadTime || '5m'}`,
          badge: 'Chapter',
          icon: <FileText size={15} className="text-indigo-600" />,
          onSelect: () => {
            onClose();
            onJumpToChapter?.(ch.chapterNumber);
          },
        });
      }

      // Sections
      ch.sections.forEach((sec) => {
        if (!q || sec.title.toLowerCase().includes(q) || sec.content.toLowerCase().includes(q)) {
          list.push({
            id: `sec-${sec.id}`,
            type: 'chapter',
            title: sec.title,
            subtitle: `In Chapter ${ch.chapterNumber} • ${sec.content.slice(0, 60)}...`,
            badge: 'Section',
            icon: <FileText size={15} className="text-slate-500" />,
            onSelect: () => {
              onClose();
              onJumpToSection?.(sec.id);
            },
          });
        }
      });
    });

    // 4. Margin Sticky Notes
    stickyNotes.forEach((sn) => {
      if (!q || sn.text.toLowerCase().includes(q)) {
        list.push({
          id: `sticky-${sn.id}`,
          type: 'sticky',
          title: sn.text.length > 50 ? `${sn.text.slice(0, 50)}...` : sn.text,
          subtitle: `Pinned note • ${sn.color || 'yellow'} note`,
          badge: 'Sticky Note',
          icon: <Pin size={15} className="text-amber-500" />,
          onSelect: () => {
            onClose();
            if (sn.sectionId) onJumpToSection?.(sn.sectionId);
            else if (sn.chapterId) {
              const ch = document.chapters.find((c) => c.id === sn.chapterId);
              if (ch) onJumpToChapter?.(ch.chapterNumber);
            }
          },
        });
      }
    });

    // 5. Ingested Sources
    sources.forEach((src) => {
      if (!q || src.name.toLowerCase().includes(q)) {
        list.push({
          id: `src-${src.id}`,
          type: 'source',
          title: src.name,
          subtitle: `${(src.size / 1024).toFixed(1)} KB • ${src.type.toUpperCase()} file`,
          badge: 'Source',
          icon: <FileCode size={15} className="text-cyan-600" />,
          onSelect: () => {
            onClose();
            onSelectSource?.(src);
          },
        });
      }
    });

    // 6. Flashcards
    flashcards.forEach((fc) => {
      if (!q || fc.front.toLowerCase().includes(q) || fc.back.toLowerCase().includes(q)) {
        list.push({
          id: `fc-${fc.id}`,
          type: 'flashcard',
          title: fc.front,
          subtitle: `Answer: ${fc.back.slice(0, 60)}...`,
          badge: 'Flashcard',
          icon: <Layers size={15} className="text-emerald-600" />,
          onSelect: () => {
            onClose();
            onOpenFlashcards?.();
          },
        });
      }
    });

    return list.slice(0, 25); // Cap to top 25 items
  }, [
    query,
    projects,
    activeProjectId,
    document.chapters,
    sources,
    flashcards,
    stickyNotes,
    onClose,
    onOpenDualStudio,
    onOpenAudioPlayer,
    onOpenFlashcards,
    onOpenExportModal,
    onQuickDownloadMarkdown,
    onAddSource,
    onSelectProject,
    onJumpToChapter,
    onJumpToSection,
    onSelectSource,
  ]);

  // Clamp selection
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation inside search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item) item.onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Top Search Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapters, cards, notes, sources, or commands..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 select-none">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 select-none">
            {results.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Search size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No matching results found for "{query}"</p>
                <p className="text-[11px] text-slate-400 mt-1">Try searching by topic, chapter title, or command.</p>
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={item.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate font-medium">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700">
                        {item.badge}
                      </span>
                      {isSelected && <ArrowRight size={13} className="text-slate-400" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer keyboard shortcuts hint */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1 font-mono">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1 font-mono">
                  ↓
                </kbd>
                to navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1 font-mono">
                  ↵
                </kbd>
                to select
              </span>
            </div>
            <span className="font-mono text-[10.5px]">
              {results.length} {results.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
