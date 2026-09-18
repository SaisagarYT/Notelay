import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  Download,
  Printer,
  Eye,
  Plus,
  Trash2,
  FileCode,
  X,
  FileUp,
  Maximize2,
  Minimize2,
  PenTool,
  Layers,
  Radio,
  Bookmark,
} from 'lucide-react';
import { MasterDocument, SourceFile, AgentActivityRun, NotebookStickyNote } from '../types';
import { motion } from 'motion/react';
import { DiagramRenderer } from './DiagramRenderer';
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar';
import { FlashcardStudio } from './FlashcardStudio';
import { AudioOverviewPlayer } from './AudioOverviewPlayer';
import { NotebookStickyNoteCard } from './NotebookStickyNoteCard';
import { exportDocumentToMarkdown } from '../utils/documentGenerator';
import { renderMarkdownBlocks } from '../utils/markdownParser';
import { triggerCelebration, triggerMicroBurst } from './ui/particle-burst';
import { Button } from './ui/button';
import { Icon } from '@iconify/react';
import { AgentThinkingStudio } from './AgentThinkingStudio';

interface DocumentCanvasProps {
  document: MasterDocument;
  sources: SourceFile[];
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenExportModal: () => void;
  onAddSource: () => void;
  onRemoveSource: (sourceId: string) => void;
  onCustomizeSelection?: (params: {
    chapterId: string;
    sectionId: string;
    selectedText: string;
    action: 'deepen' | 'analogy' | 'diagram' | 'table' | 'custom';
    customPrompt?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onInsertPage?: (position: 'TOP' | 'BOTTOM', topic: string) => void;
  onDeleteChapter?: (chapterNumber: number) => void;
  onDeleteSection?: (chapterId: string, sectionId: string) => void;
  onUpdateSectionContent?: (chapterId: string, sectionId: string, newContent: string) => void;
  onSelectSource?: (source: SourceFile) => void;
  isDualStudio?: boolean;
  dualStudioRatio?: 'balanced' | 'pdf-focus' | 'notes-focus';
  onSetDualStudioRatio?: (ratio: 'balanced' | 'pdf-focus' | 'notes-focus') => void;
  activeAgentRun?: AgentActivityRun | null;
  activityHistory?: AgentActivityRun[];
  onOpenLogsFolder?: () => void;
  sidebarWidth?: number;
  selectedRunId?: string | null;
  onSelectRunId?: (id: string | null) => void;
  activeTab?: 'document' | 'flashcards' | 'sources' | 'activity';
  onTabChange?: (tab: 'document' | 'flashcards' | 'sources' | 'activity') => void;
}

interface TypewriterNotebookSectionProps {
  content: string;
  chapterId: string;
  sectionId: string;
  isNewest: boolean;
  completedIds: Set<string>;
  onComplete: (id: string) => void;
  renderBody: (content: string, chapterId: string, sectionId: string) => React.ReactNode;
}

const TypewriterNotebookSection: React.FC<TypewriterNotebookSectionProps> = ({
  content,
  chapterId,
  sectionId,
  isNewest,
  completedIds,
  onComplete,
  renderBody,
}) => {
  const isAlreadyCompleted = completedIds.has(sectionId);
  const shouldAnimate = isNewest && !isAlreadyCompleted;

  const lines = useMemo(() => content.split('\n'), [content]);
  const [revealedLinesCount, setRevealedLinesCount] = useState(shouldAnimate ? 1 : lines.length);
  const [isDone, setIsDone] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate || isDone) return;

    let current = 1;
    const total = lines.length;
    // Step size based on lines: smooth line-by-line reveal in ~1.5 - 2s
    const stepSize = Math.max(1, Math.ceil(total / 30));

    const interval = setInterval(() => {
      // If the current line is start of a code/mermaid block, skip through to the end of fence
      if (current < total && lines[current]?.trim().startsWith('```')) {
        let fenceEnd = current + 1;
        while (fenceEnd < total && !lines[fenceEnd]?.trim().startsWith('```')) {
          fenceEnd++;
        }
        current = Math.min(total, fenceEnd + 1);
      } else {
        current = Math.min(total, current + stepSize);
      }

      setRevealedLinesCount(current);

      if (current >= total) {
        clearInterval(interval);
        setIsDone(true);
        onComplete(sectionId);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [shouldAnimate, lines, isDone, sectionId, onComplete]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedLinesCount(lines.length);
    setIsDone(true);
    onComplete(sectionId);
  };

  if (!shouldAnimate || isDone) {
    return <>{renderBody(content, chapterId, sectionId)}</>;
  }

  const partialContent = lines.slice(0, revealedLinesCount).join('\n');

  return (
    <div
      className="relative group/notes-typewriter cursor-pointer select-text"
      onClick={handleSkip}
      title="Click to reveal all immediately"
    >
      {/* Active Writing Notification Bar */}
      <div className="flex items-center justify-between text-xs font-sans text-slate-500 bg-blue-50/80 dark:bg-slate-800/80 p-2 rounded-xl border border-blue-200/80 dark:border-slate-700/80 mb-3 select-none">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400 animate-ping" />
          <span className="animate-pulse">Writing notes to canvas...</span>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 shadow-2xs text-[11px] font-medium cursor-pointer transition-colors"
        >
          Show all
        </button>
      </div>

      {/* Ruled lines content */}
      <div>
        {renderBody(partialContent, chapterId, sectionId)}
        <span className="inline-flex items-center gap-1 text-blue-600 font-sans text-xs bg-blue-50/90 px-2 py-0.5 rounded-full border border-blue-200 ml-2 select-none animate-pulse">
          <span>✒️</span>
          <span className="text-[11px] font-medium">Writing note...</span>
        </span>
      </div>
    </div>
  );
};

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  document,
  sources,
  projectName,
  isOpen,
  onClose,
  onOpenExportModal,
  onAddSource,
  onRemoveSource,
  onCustomizeSelection,
  onInsertPage,
  onDeleteChapter,
  onDeleteSection,
  onUpdateSectionContent,
  onSelectSource,
  isDualStudio = false,
  dualStudioRatio = 'balanced',
  onSetDualStudioRatio: _onSetDualStudioRatio,
  activeAgentRun,
  activityHistory = [],
  onOpenLogsFolder,
  sidebarWidth = 0,
  selectedRunId,
  onSelectRunId,
  activeTab: externalActiveTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'flashcards' | 'sources' | 'activity'>(
    externalActiveTab || 'document'
  );

  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  const [selectedSourcePreview, setSelectedSourcePreview] = useState<SourceFile | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'chapter' | 'section';
    chapterNumber?: number;
    chapterId?: string;
    sectionId?: string;
    title: string;
  } | null>(null);

  // Automatically track background run without forcefully hijacking user tab
  const prevRunIdRef = useRef<string | null>(null);
  const [completedNoteSectionIds, setCompletedNoteSectionIds] = useState<Set<string>>(() => new Set());
  const handleNoteSectionComplete = useCallback((id: string) => {
    setCompletedNoteSectionIds((prev) => new Set(prev).add(id));
  }, []);

  useEffect(() => {
    if (activeAgentRun && activeAgentRun.id !== prevRunIdRef.current) {
      prevRunIdRef.current = activeAgentRun.id;
    }
  }, [activeAgentRun]);

  // Audio Overview & Podcast States
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [highlightedAudioSectionId, setHighlightedAudioSectionId] = useState<string | null>(null);

  const handleSyncNotebookAudio = useCallback((chapterNumber: number, sectionId?: string) => {
    setActiveTab('document');
    if (sectionId) {
      setHighlightedAudioSectionId(sectionId);
      const el = window.document.getElementById(`sec-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const el = window.document.getElementById(`chapter-${chapterNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  const handleJumpToChapter = (chapterNum: number) => {
    setActiveTab('document');
    setTimeout(() => {
      const el = window.document.getElementById(`chapter-${chapterNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-primary', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary');
        }, 2500);
      }
    }, 120);
  };

  // Agentic Canvas quick-add states
  const [showAddTopInput, setShowAddTopInput] = useState(false);
  const [addTopTopic, setAddTopTopic] = useState('');
  const [showAddBottomInput, setShowAddBottomInput] = useState(false);
  const [addBottomTopic, setAddBottomTopic] = useState('');

  // Floating selection AI copilot states
  const [selectionState, setSelectionState] = useState<{
    x: number;
    y: number;
    selectedText: string;
    chapterId: string;
    sectionId: string;
  } | null>(null);
  const [isSynthesizingSelection, setIsSynthesizingSelection] = useState(false);
  const [selectionStatusMessage, setSelectionStatusMessage] = useState('');

  // Marginalia: Margin Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<NotebookStickyNote[]>(() => {
    try {
      const key = `notelay_sticky_notes_${document.id || 'default'}`;
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      const key = `notelay_sticky_notes_${document.id || 'default'}`;
      localStorage.setItem(key, JSON.stringify(stickyNotes));
    } catch {}
  }, [stickyNotes, document.id]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const key = `notelay_sticky_notes_${document.id || 'default'}`;
        const saved = localStorage.getItem(key);
        if (saved) setStickyNotes(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [document.id]);

  const handleAddStickyNote = useCallback((chapterId: string, sectionId: string) => {
    const newNote: NotebookStickyNote = {
      id: `sticky-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      chapterId,
      sectionId,
      text: 'Key insight or concept note...',
      color: 'yellow',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setStickyNotes((prev) => [...prev, newNote]);
  }, []);

  const handleUpdateStickyNoteText = useCallback((id: string, text: string) => {
    setStickyNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  }, []);

  const handleUpdateStickyNoteColor = useCallback((id: string, color: 'yellow' | 'pink' | 'green' | 'blue') => {
    setStickyNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  }, []);

  const handleDeleteStickyNote = useCallback((id: string) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Marginalia: Page Bookmarks State
  const [bookmarkedPages, setBookmarkedPages] = useState<Set<number>>(() => {
    try {
      const key = `notelay_bookmarks_${document.id || 'default'}`;
      const saved = localStorage.getItem(key);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const handleToggleBookmark = useCallback((pageNumber: number) => {
    setBookmarkedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
      }
      try {
        const key = `notelay_bookmarks_${document.id || 'default'}`;
        localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, [document.id]);

  // Handwritten font selection ('kalam' | 'caveat' | 'patrick' | 'sans')
  const [notesFont, setNotesFont] = useState<'kalam' | 'caveat' | 'patrick' | 'sans'>(() => {
    try {
      const saved = localStorage.getItem('notelay_notes_font');
      if (saved && ['kalam', 'caveat', 'patrick', 'sans'].includes(saved)) {
        return saved as 'kalam' | 'caveat' | 'patrick' | 'sans';
      }
    } catch {}
    return 'kalam';
  });

  const fontClass =
    notesFont === 'caveat'
      ? 'font-caveat'
      : notesFont === 'patrick'
      ? 'font-patrick'
      : notesFont === 'sans'
      ? 'font-sans'
      : 'font-kalam';

  // Typography script dropdown popover
  const [showFontMenu, setShowFontMenu] = useState(false);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setShowFontMenu(false);
      }
    };
    if (showFontMenu) {
      window.document.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontMenu]);

  // Smooth adjustable width with localStorage persistence
  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notelay_canvas_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 960) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 420;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    isDraggingRef.current = true;
    window.document.body.style.cursor = 'col-resize';
    window.document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const windowWidth = window.innerWidth;
      const rawWidth = windowWidth - moveEvent.clientX;
      const minWidth = 320;
      // Always guarantee center workspace has at least 380px breathing room
      const maxWidth = Math.max(minWidth, Math.min(960, windowWidth - (sidebarWidth || 0) - 380));
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      isDraggingRef.current = false;
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const windowWidth = window.innerWidth;
      const rawWidth = windowWidth - upEvent.clientX;
      const minWidth = 320;
      const maxWidth = Math.max(minWidth, Math.min(960, windowWidth - (sidebarWidth || 0) - 380));
      const finalWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
      try {
        localStorage.setItem('notelay_canvas_width', String(finalWidth));
      } catch {
        // ignore
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  useEffect(() => {
    return () => {
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
    };
  }, []);

  // Clamp canvas width if window shrinks or sidebar widens
  useEffect(() => {
    const handleWindowResize = () => {
      const windowWidth = window.innerWidth;
      const minWidth = 320;
      const maxWidth = Math.max(minWidth, Math.min(960, windowWidth - (sidebarWidth || 0) - 380));
      setWidth((prev) => Math.max(minWidth, Math.min(maxWidth, prev)));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [sidebarWidth]);

  // Adjust canvas width when Dual Studio mode or ratio changes
  useEffect(() => {
    if (!isDualStudio) return;
    const windowWidth = window.innerWidth;
    const available = Math.max(700, windowWidth - (sidebarWidth || 0));
    let target = Math.floor(available * 0.5);
    if (dualStudioRatio === 'pdf-focus') {
      target = Math.floor(available * 0.35);
    } else if (dualStudioRatio === 'notes-focus') {
      target = Math.floor(available * 0.65);
    }
    const clamped = Math.max(340, Math.min(available - 320, target));
    setWidth(clamped);
  }, [isDualStudio, dualStudioRatio, sidebarWidth]);

  const handleResetWidth = () => {
    setWidth(420);
    try {
      localStorage.setItem('notelay_canvas_width', '420');
    } catch {
      // ignore
    }
  };

  const handleToggleExpand = () => {
    setWidth((prev) => {
      const windowWidth = window.innerWidth;
      const maxAllowed = Math.max(320, Math.min(960, windowWidth - (sidebarWidth || 0) - 380));
      const targetWidth = prev > 540 ? 420 : Math.min(680, maxAllowed);
      const next = Math.max(320, Math.min(maxAllowed, targetWidth));
      try {
        localStorage.setItem('notelay_canvas_width', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Handle mouseup to detect highlighted text inside section blocks
  const handleCanvasMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        if (!isSynthesizingSelection) {
          setSelectionState(null);
        }
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length < 3) {
        if (!isSynthesizingSelection) setSelectionState(null);
        return;
      }

      const anchorNode = selection.anchorNode;
      const parentElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
      const sectionEl = parentElement?.closest('[data-section-id]');

      if (sectionEl) {
        const secId = sectionEl.getAttribute('data-section-id');
        const chapId = sectionEl.getAttribute('data-chapter-id');
        if (secId && chapId) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionState({
            x: Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)),
            y: Math.max(70, rect.top - 12),
            selectedText: text,
            chapterId: chapId,
            sectionId: secId,
          });
        }
      }
    }, 10);
  }, [isSynthesizingSelection]);

  const handleSelectionAction = async (
    action: 'deepen' | 'analogy' | 'diagram' | 'table' | 'custom',
    customPrompt?: string
  ) => {
    if (!selectionState || !onCustomizeSelection) return;
    setIsSynthesizingSelection(true);
    setSelectionStatusMessage(
      action === 'diagram'
        ? 'Synthesizing Architecture Diagram...'
        : action === 'table'
        ? 'Building Comparison Matrix...'
        : action === 'analogy'
        ? 'Synthesizing Mental Model Analogy...'
        : action === 'deepen'
        ? 'Synthesizing In-Depth Expansion...'
        : 'Synthesizing Custom AI Enhancement...'
    );

    try {
      const res = await onCustomizeSelection({
        chapterId: selectionState.chapterId,
        sectionId: selectionState.sectionId,
        selectedText: selectionState.selectedText,
        action,
        customPrompt,
      });

      if (res.success) {
        triggerMicroBurst(selectionState.x, selectionState.y, 'emerald');
        window.getSelection()?.removeAllRanges();
        setSelectionState(null);
      } else {
        setSelectionStatusMessage(res.error || 'Synthesis error');
        setTimeout(() => setSelectionState(null), 2500);
      }
    } catch (err: any) {
      setSelectionStatusMessage(err.message || 'Customization failed');
      setTimeout(() => setSelectionState(null), 2500);
    } finally {
      setIsSynthesizingSelection(false);
    }
  };

  const handleApplyHighlight = useCallback(
    (color: 'yellow' | 'green' | 'pink' | 'blue') => {
      if (!selectionState || !onUpdateSectionContent) return;
      const { chapterId, sectionId, selectedText } = selectionState;
      const chapter = document.chapters.find((c) => c.id === chapterId);
      const section = chapter?.sections.find((s) => s.id === sectionId);
      if (!section) return;

      const cleanTarget = selectedText.trim();
      if (!cleanTarget) return;

      if (section.content.includes(cleanTarget)) {
        const updatedContent = section.content.replace(cleanTarget, `==${color}:${cleanTarget}==`);
        onUpdateSectionContent(chapterId, sectionId, updatedContent);
        triggerMicroBurst(
          selectionState.x,
          selectionState.y,
          color === 'green' ? '#10b981' : color === 'pink' ? '#ec4899' : color === 'blue' ? '#38bdf8' : '#eab308'
        );
      }
      window.getSelection()?.removeAllRanges();
      setSelectionState(null);
    },
    [selectionState, onUpdateSectionContent, document.chapters]
  );

  const handleQuickDownloadMarkdown = (e?: React.MouseEvent) => {
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
    triggerCelebration();
    const md = exportDocumentToMarkdown(document);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-master-notes.md`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Flatten chapters and sections into discrete physical notebook pages
  const pages = useMemo(() => {
    if (!document.chapters || document.chapters.length === 0) return [];

    interface NotebookPageItem {
      pageNumber: number;
      chapter: (typeof document.chapters)[0];
      section: (typeof document.chapters)[0]['sections'][0];
      isFirstSectionOfChapter: boolean;
      isLastSectionOfChapter: boolean;
      sectionIndex: number;
      totalSectionsInChapter: number;
    }

    const items: NotebookPageItem[] = [];

    document.chapters.forEach((chapter) => {
      if (!chapter.sections || chapter.sections.length === 0) {
        items.push({
          pageNumber: items.length + 1,
          chapter,
          section: {
            id: `sec-${chapter.id}-1`,
            title: chapter.title,
            level: 2,
            content: chapter.summary || 'No section content available.',
            keyTakeaways: [],
            recallQuestions: [],
          },
          isFirstSectionOfChapter: true,
          isLastSectionOfChapter: true,
          sectionIndex: 0,
          totalSectionsInChapter: 1,
        });
      } else {
        chapter.sections.forEach((section, sIdx) => {
          items.push({
            pageNumber: items.length + 1,
            chapter,
            section,
            isFirstSectionOfChapter: sIdx === 0,
            isLastSectionOfChapter: sIdx === chapter.sections.length - 1,
            sectionIndex: sIdx,
            totalSectionsInChapter: chapter.sections.length,
          });
        });
      }
    });

    return items;
  }, [document.chapters]);

  const totalPages = Math.max(1, pages.length);

  // Helper to render markdown sections with handwritten baseline alignment and embedded diagrams
  const renderSectionBody = (content: string, _chapterId: string, sectionId: string) => {
    // Strip out any Active Recall blockquote or heading artifacts if present in saved session data
    const cleanedContent = content
      .replace(/>\s*\*\*Active Recall Self-Test\*\*:\s*(\n>.*)*/gi, '')
      .replace(/### 3\. Conceptual Comparison Matrix & Active Recall/gi, '### 3. Conceptual Comparison Matrix');

    return renderMarkdownBlocks(cleanedContent, {
      isNotebook: notesFont !== 'sans',
      keyPrefix: sectionId,
      onRenderMermaid: (code, idx) => (
        <DiagramRenderer
          key={`${sectionId}-diag-${idx}`}
          code={code}
          title="Conceptual Mindmap & System Blueprint"
        />
      ),
    });
  };

  return (
    <aside
      style={{
        width: isOpen ? `${width}px` : '0px',
      }}
      className={`h-full flex-shrink-0 flex flex-col bg-[#fbfcfd] border-[#e2e8f0] relative z-20 select-none overflow-hidden ${
        isDragging
          ? 'transition-none select-none border-l'
          : 'transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'
      } ${
        isOpen
          ? 'opacity-100 border-l shadow-2xs'
          : 'opacity-0 pointer-events-none border-l-0'
      }`}
    >
      {/* Floating Selection AI Copilot Toolbar */}
      <FloatingSelectionToolbar
        position={selectionState ? { x: selectionState.x, y: selectionState.y } : null}
        selectedText={selectionState?.selectedText || ''}
        onAction={handleSelectionAction}
        onHighlight={handleApplyHighlight}
        onClose={() => setSelectionState(null)}
        isSynthesizing={isSynthesizingSelection}
        statusMessage={selectionStatusMessage}
      />

      {/* Left-edge Drag-to-Resize Handle */}
      {isOpen && (
        <div
          onMouseDown={startResizing}
          onDoubleClick={handleResetWidth}
          title="Drag to resize panel (Double-click to reset to 420px)"
          className="absolute top-0 left-0 bottom-0 w-2 -ml-1 cursor-col-resize z-40 group flex items-center justify-center hover:bg-[#1a73e8]/20 transition-colors"
        >
          <div className="w-[1.5px] h-8 bg-transparent group-hover:bg-[#1a73e8] rounded-full transition-colors" />
        </div>
      )}

      {/* Inner Content Container */}
      <div className="w-full h-full flex flex-col min-w-0 max-w-full overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-11 px-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BookOpen size={14} className="text-slate-600 dark:text-slate-400 shrink-0" strokeWidth={1.8} />
            <div className="min-w-0 flex items-baseline gap-2">
              <h2 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                {document.title || 'Studio Notes'}
              </h2>
              {document.chapters.length > 0 && (
                <span className="text-[10.5px] text-slate-400 font-mono hidden sm:inline">
                  {document.chapters.length} {document.chapters.length === 1 ? 'ch' : 'chs'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Handwriting Typography Dropdown */}
            <div className="relative" ref={fontMenuRef}>
              <button
                type="button"
                onClick={() => setShowFontMenu((v) => !v)}
                className={`h-7 px-2 text-xs flex items-center gap-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border ${
                  showFontMenu
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                    : 'border-slate-200/70 dark:border-slate-700/70 text-slate-600 dark:text-slate-300'
                }`}
                title="Notebook Script Style"
              >
                <PenTool size={11} className="text-slate-400" />
                <span className="text-[11px] capitalize font-medium">{notesFont}</span>
              </button>

              {showFontMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Handwriting Script
                  </div>
                  {[
                    { id: 'kalam' as const, label: 'Kalam', desc: 'Natural Handwriting' },
                    { id: 'caveat' as const, label: 'Caveat', desc: 'Casual Cursive' },
                    { id: 'patrick' as const, label: 'Patrick Hand', desc: 'Neat Print' },
                    { id: 'sans' as const, label: 'Inter Sans', desc: 'Clean Modern' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setNotesFont(f.id);
                        try {
                          localStorage.setItem('notelay_notes_font', f.id);
                        } catch {}
                        setShowFontMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        notesFont === f.id
                          ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-[12px]">{f.label}</div>
                        <div className="text-[10px] text-slate-400">{f.desc}</div>
                      </div>
                      {notesFont === f.id && <Icon icon="lucide:check" className="w-3.5 h-3.5 text-slate-900 dark:text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audio Overview / Podcast */}
            <button
              type="button"
              onClick={() => setIsAudioPlayerOpen(true)}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Audio Overview & Study Podcast"
            >
              <Radio size={14} strokeWidth={1.8} />
            </button>

            {/* Quick Markdown Download */}
            <button
              type="button"
              onClick={handleQuickDownloadMarkdown}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Export Markdown (.md)"
            >
              <Download size={14} strokeWidth={1.8} />
            </button>

            {/* Export Multi-Page PDF */}
            <button
              type="button"
              onClick={onOpenExportModal}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Export Multi-Page Document"
            >
              <Printer size={14} strokeWidth={1.8} />
            </button>

            <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Expand / Minimize Width */}
            <button
              type="button"
              onClick={handleToggleExpand}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title={width > 540 ? 'Compact Width (420px)' : 'Expanded Width (680px)'}
            >
              {width > 540 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Close Canvas */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Close Canvas"
            >
              <X size={14} />
            </button>
          </div>
        </div>

      {/* Navigation Tabs with Motion Sliding Pill */}
      <div className="flex items-center gap-1 px-3 py-1 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[12px] font-medium text-slate-500 select-none overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { id: 'document' as const, label: 'Notes', icon: <FileText size={12} /> },
          { id: 'flashcards' as const, label: 'Flashcards', icon: <Layers size={12} /> },
          {
            id: 'sources' as const,
            label: 'Sources',
            badge: sources.length > 0 ? sources.length : undefined,
            icon: <FileCode size={12} />,
          },
          {
            id: 'activity' as const,
            label: 'AI Thinking',
            badge: activeAgentRun?.status === 'running' ? 'Live' : undefined,
            icon: (
              <Icon
                icon="lucide:brain-circuit"
                className={`w-3.5 h-3.5 ${
                  activeAgentRun?.status === 'running' ? 'text-amber-500 animate-pulse' : 'text-slate-400'
                }`}
              />
            ),
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
              className={`relative z-10 shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11.5px] ${
                isActive
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="canvasActiveTab"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-md shadow-2xs border border-slate-200/80 dark:border-slate-700 z-[-1]"
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1 py-0.2 rounded font-normal ${
                    tab.badge === 'Live'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold animate-pulse'
                      : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Canvas Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onMouseUp={handleCanvasMouseUp}>
        {/* TAB 1: DOCUMENT READER */}
        {activeTab === 'document' && (
          <div className="space-y-4">
            {/* Empty State: Authentic Ruled Notebook Sheet */}
            {pages.length === 0 ? (
              <div
                className={`ruled-notebook-paper rounded-2xl border border-[#cbd5e1] shadow-xs p-6 sm:p-10 relative ${fontClass} flex flex-col justify-between min-h-[560px] select-none`}
              >
                <div>
                  {/* Top Notebook Header Strip */}
                  <div className="flex items-center justify-between border-b-2 border-[#94a3b8] pb-1.5 mb-8 text-[12px] font-sans uppercase text-[#475569] font-semibold tracking-wider select-none">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#0f172a] shrink-0">SUBJECT:</span>
                      <span className={`text-[15px] text-[#1e3a8a] ${fontClass} truncate max-w-[240px]`}>
                        {document.title || 'Studio Notes'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-[11px] shrink-0 font-sans">
                      <span>PAGE: 1 of 1</span>
                    </div>
                  </div>

                  {/* Inside Ruled Paper Welcome */}
                  <div className="py-14 px-4 text-center max-w-sm mx-auto space-y-4 font-sans select-none">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 flex items-center justify-center text-slate-500 mx-auto shadow-2xs">
                      <BookOpen size={20} strokeWidth={1.75} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
                        Notebook Ready
                      </h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Add lecture notes, slides, or PDFs to synthesize handwritten chapters, active recall decks, and visual blueprints.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onAddSource}
                        className="h-8 px-3.5 text-xs gap-1.5 shadow-2xs cursor-pointer font-medium"
                      >
                        <Plus size={13} />
                        <span>Attach Document</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-sans text-slate-400 select-none">
                  <span>Notelay Studio</span>
                  <span className="font-mono text-slate-500">— Page 1 of 1 —</span>
                </div>
              </div>
            ) : (
              /* Discrete Paginated Ruled Notebook Pages */
              <div className="space-y-10">
                {/* Insert Page at Beginning */}
                <div className="flex justify-center -mb-2">
                  {showAddTopInput ? (
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col gap-2 transition-all">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Plus size={13} />
                          Insert Page at Beginning (Chapter 1)
                        </span>
                        <button
                          onClick={() => setShowAddTopInput(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={addTopTopic}
                          onChange={(e) => setAddTopTopic(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && addTopTopic.trim()) {
                              onInsertPage?.('TOP', addTopTopic.trim());
                              setAddTopTopic('');
                              setShowAddTopInput(false);
                            }
                          }}
                          placeholder="Topic (e.g. Prerequisites, Hardware Foundations)..."
                          className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-slate-400"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (addTopTopic.trim()) {
                              onInsertPage?.('TOP', addTopTopic.trim());
                              setAddTopTopic('');
                              setShowAddTopInput(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                        >
                          <span>Insert</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddTopInput(true)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      <span>Insert Page at Beginning</span>
                    </button>
                  )}
                </div>

                {/* Live Drafting Status Banner */}
                {activeAgentRun && activeAgentRun.status === 'running' && (
                  <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 font-sans">
                        Writing notes to canvas...
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono font-normal text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      {activeAgentRun.currentStep || 'Synthesizing Notes'}
                    </span>
                  </div>
                )}

                {pages.map((page) => {
                  const isBookmarked = bookmarkedPages.has(page.pageNumber);
                  const pageStickyNotes = stickyNotes.filter(
                    (n) => n.sectionId === page.section.id || (n.chapterId === page.chapter.id && !n.sectionId)
                  );

                  return (
                    <div
                      key={`${page.chapter.id}-${page.section.id}`}
                      id={`chapter-${page.chapter.chapterNumber}`}
                      className="space-y-3 scroll-mt-4"
                    >
                      {/* Simulated Physical Page Break Indicator */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-300" />
                        <span className="text-[10.5px] font-mono tracking-wider uppercase text-slate-600 bg-white border border-slate-200 px-3 py-0.5 rounded-full shadow-2xs font-semibold">
                          Page {page.pageNumber} of {totalPages}
                        </span>
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-300 via-slate-300 to-transparent" />
                      </div>

                      {/* Authentic Ruled Lined Notebook Sheet (Discrete Page Card) */}
                      <div
                        className={`ruled-notebook-paper rounded-2xl border border-[#cbd5e1] shadow-md p-4 sm:p-7 relative ${fontClass} transition-all select-text flex flex-col justify-between min-h-[820px] max-w-full overflow-hidden`}
                      >
                        {/* Protruding Ribbon Bookmark Tab */}
                        {isBookmarked && (
                          <div
                            className="absolute -top-1.5 right-6 z-30 flex flex-col items-center drop-shadow-md cursor-pointer group/ribbon"
                            onClick={() => handleToggleBookmark(page.pageNumber)}
                            title={`Page ${page.pageNumber} Bookmarked. Click to unbookmark.`}
                          >
                            <div
                              className="w-6 h-9 bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center text-white pb-2 shadow-xs"
                              style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)' }}
                            >
                              <Bookmark size={11} className="fill-white" />
                            </div>
                          </div>
                        )}

                        <div>
                          {/* Top Notebook Header Strip */}
                          <div className="flex items-center justify-between border-b-2 border-[#94a3b8] pb-1.5 mb-6 text-[12px] font-sans uppercase text-[#475569] font-semibold tracking-wider select-none flex-wrap gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[#0f172a] flex-shrink-0">SUBJECT:</span>
                              <span className={`text-[15px] sm:text-[16px] text-[#1e3a8a] ${fontClass} truncate max-w-[140px] sm:max-w-[220px]`}>
                                {document.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                              <div className="hidden sm:flex items-center gap-1.5">
                                <span className="text-[#0f172a]">DATE:</span>
                                <span className={`text-[15px] text-[#1e3a8a] ${fontClass}`}>
                                  {document.createdAt}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[#0f172a]">PAGE:</span>
                                <span className="text-[#1e3a8a] font-bold">
                                  {page.pageNumber} of {totalPages}
                                </span>
                              </div>

                              {/* Bookmark Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleBookmark(page.pageNumber)}
                                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-sans font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                  isBookmarked
                                    ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <Bookmark size={11} className={isBookmarked ? 'fill-red-600' : ''} />
                                <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                              </button>

                              {/* Add Sticky Note Button */}
                              <button
                                type="button"
                                onClick={() => handleAddStickyNote(page.chapter.id, page.section.id)}
                                title="Attach sticky note to margin"
                                className="px-1.5 py-0.5 rounded text-[11px] font-sans font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={11} />
                                <span className="hidden sm:inline">Sticky Note</span>
                              </button>

                              {onDeleteSection && (
                                <button
                                  type="button"
                                  title="Delete this page"
                                  onClick={() =>
                                    setDeleteConfirmTarget({
                                      type: 'section',
                                      chapterId: page.chapter.id,
                                      sectionId: page.section.id,
                                      title: page.section.title || `Page ${page.pageNumber}`,
                                    })
                                  }
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                        {/* Chapter Banner on Page 1 of Chapter */}
                        {page.isFirstSectionOfChapter ? (
                          <div className="mb-6">
                            <div className="flex items-center justify-between text-xs text-[#64748b] font-medium mb-1 font-sans">
                              <span className="font-mono text-[11px] tracking-wider uppercase text-[#475569] font-semibold">
                                CHAPTER {page.chapter.chapterNumber}
                              </span>
                              <div className="flex items-center gap-2.5">
                                <span className="text-[11px] text-slate-500 font-normal">
                                  {page.chapter.estimatedReadTime || '6 min read'}
                                </span>
                                {onDeleteChapter && (
                                  <button
                                    type="button"
                                    title={`Delete Chapter ${page.chapter.chapterNumber}`}
                                    onClick={() =>
                                      setDeleteConfirmTarget({
                                        type: 'chapter',
                                        chapterNumber: page.chapter.chapterNumber,
                                        title: page.chapter.title,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={11} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <h2 className="text-[26px] font-bold text-[#0f172a] leading-[36px] m-0">
                              {page.chapter.title}
                            </h2>
                            {page.chapter.subtitle && (
                              <p className="text-[15px] text-[#475569] mt-1 italic leading-[28px]">
                                {page.chapter.subtitle}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="mb-5 flex items-center justify-between text-xs text-[#64748b] font-medium font-sans border-b border-slate-200/80 pb-2">
                            <span className="font-mono text-[11px] tracking-wider uppercase text-[#475569] font-semibold">
                              CHAPTER {page.chapter.chapterNumber} • PART {page.sectionIndex + 1}
                            </span>
                            <div className="flex items-center gap-2.5">
                              <span className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]">
                                {page.chapter.title}
                              </span>
                              {onDeleteSection && (
                                <button
                                  type="button"
                                  title="Delete this page"
                                  onClick={() =>
                                    setDeleteConfirmTarget({
                                      type: 'section',
                                      chapterId: page.chapter.id,
                                      sectionId: page.section.id,
                                      title: page.section.title || `Part ${page.sectionIndex + 1}`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                  <span>Delete Page</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Section Content with Ruled Baseline Alignment */}
                        <div
                          id={`sec-${page.section.id}`}
                          data-section-id={page.section.id}
                          data-chapter-id={page.chapter.id}
                          className={`scroll-mt-4 space-y-6 transition-all duration-500 rounded-2xl ${
                            highlightedAudioSectionId === page.section.id
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-400/60 p-2 shadow-xs'
                              : ''
                          }`}
                        >
                          <TypewriterNotebookSection
                            content={page.section.content}
                            chapterId={page.chapter.id}
                            sectionId={page.section.id}
                            isNewest={
                              Boolean(
                                activeAgentRun && (
                                  page.chapter.chapterNumber === activeAgentRun.targetChapterNumber ||
                                  (!activeAgentRun.targetChapterNumber && page.chapter.chapterNumber === document.chapters.length)
                                )
                              )
                            }
                            completedIds={completedNoteSectionIds}
                            onComplete={handleNoteSectionComplete}
                            renderBody={renderSectionBody}
                          />

                          {/* Section Key Takeaways - Styled as Notebook Sticky / Index Note */}
                          {page.section.keyTakeaways && page.section.keyTakeaways.length > 0 && (
                            <div className="notebook-callout my-6 text-[17px] leading-[32px]">
                              <div className="font-bold text-[#0f172a] flex items-center gap-1.5 mb-2 text-[18px]">
                                <Icon icon="solar:pin-bold" className="w-4 h-4 text-amber-500 shrink-0" />
                                <span>Key Takeaways:</span>
                              </div>
                              <ul className="list-disc pl-5 space-y-1.5 text-[#1e293b]">
                                {page.section.keyTakeaways.map((takeaway, tIdx) => (
                                   <li key={tIdx}>{takeaway}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Chapter Summary (rendered on final section of the chapter) */}
                          {page.isLastSectionOfChapter && page.chapter.summary && (
                            <div className="pt-4 border-t border-[#cbd5e1] text-[14px] text-slate-600 italic">
                              Summary: {page.chapter.summary}
                            </div>
                          )}
                        </div>

                        {/* Pinned Margin Sticky Notes for this Page / Section */}
                        {pageStickyNotes.length > 0 && (
                          <div className="my-6 pt-4 border-t border-dashed border-[#cbd5e1] space-y-3">
                            <div className="flex items-center justify-between text-xs font-sans text-slate-600 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Icon icon="solar:pin-bold" className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-semibold text-slate-700">Margin Sticky Notes ({pageStickyNotes.length})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddStickyNote(page.chapter.id, page.section.id)}
                                className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                              >
                                <Plus size={11} />
                                <span>Add note</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pageStickyNotes.map((note) => (
                                <NotebookStickyNoteCard
                                  key={note.id}
                                  note={note}
                                  onUpdateText={handleUpdateStickyNoteText}
                                  onUpdateColor={handleUpdateStickyNoteColor}
                                  onDelete={handleDeleteStickyNote}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Notebook Sheet Margin & Page Number */}
                      <div className="mt-8 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-sans text-slate-400 select-none">
                        <span>Notelay Studio</span>
                        <span className="font-mono font-medium text-slate-500">
                          — Page {page.pageNumber} of {totalPages} —
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

                {/* Insert Page at End */}
                <div className="flex justify-center pt-2 pb-6">
                  {showAddBottomInput ? (
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 shadow-sm flex flex-col gap-2 transition-all">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Plus size={13} />
                          Add Page at End
                        </span>
                        <button
                          onClick={() => setShowAddBottomInput(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={addBottomTopic}
                          onChange={(e) => setAddBottomTopic(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && addBottomTopic.trim()) {
                              onInsertPage?.('BOTTOM', addBottomTopic.trim());
                              setAddBottomTopic('');
                              setShowAddBottomInput(false);
                            }
                          }}
                          placeholder="Topic (e.g. Virtual Memory, Disk Scheduling)..."
                          className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-slate-400"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (addBottomTopic.trim()) {
                              onInsertPage?.('BOTTOM', addBottomTopic.trim());
                              setAddBottomTopic('');
                              setShowAddBottomInput(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                        >
                          <span>Insert</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddBottomInput(true)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      <span>Add Page at End</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* TAB: ACTIVE RECALL & FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <FlashcardStudio
            document={document}
            onJumpToChapter={handleJumpToChapter}
          />
        )}

        {/* TAB 3: SOURCES & ATTACHMENTS */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Root Knowledge Sources</h3>
                <p className="text-xs text-slate-500">
                  Notes, documents, and PDFs ingested into this project.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddSource}
                className="gap-1.5 text-xs shadow-2xs"
              >
                <Plus size={13} />
                <span>Add Source</span>
              </Button>
            </div>

            {sources.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-white p-6">
                <FileUp size={24} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">No files or notes attached</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload lecture notes, PDFs, or raw text to ground the AI's master document generation.
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onAddSource}
                  className="mt-3"
                >
                  <Plus size={13} className="mr-1" />
                  Attach Files
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors gap-2 overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 overflow-hidden"
                      onClick={() => {
                        if (onSelectSource) {
                          onSelectSource(source);
                        } else {
                          setSelectedSourcePreview(source);
                        }
                      }}
                      title={source.name}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 flex items-center justify-center uppercase text-[10px] font-bold shrink-0">
                        {source.type}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p
                          className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 break-all hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug"
                          title={source.name}
                        >
                          {source.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {(source.size / 1024).toFixed(1)} KB • {source.uploadedAt}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onSelectSource && (
                        <button
                          onClick={() => onSelectSource(source)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer shrink-0"
                          title="Open in Side-by-Side Dual Studio"
                        >
                          <BookOpen size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSourcePreview(source)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                        title="Quick Preview"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => onRemoveSource(source.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                        title="Remove Source"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Source Preview Modal */}
            {selectedSourcePreview && (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 mt-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-semibold">{selectedSourcePreview.name}</span>
                  <button
                    onClick={() => setSelectedSourcePreview(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>
                <pre className="max-h-48 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap p-2 bg-slate-950/60 rounded">
                  {selectedSourcePreview.content || '[Binary file content attached to knowledge base]'}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI THINKING & COGNITIVE STUDIO */}
        {activeTab === 'activity' && (
          <AgentThinkingStudio
            activeAgentRun={activeAgentRun}
            activityHistory={activityHistory}
            selectedRunId={selectedRunId}
            onSelectRunId={onSelectRunId}
            onOpenLogsFolder={onOpenLogsFolder}
            onJumpToChapter={handleJumpToChapter}
          />
        )}
      </div>
    </div>

    {/* Direct Canvas Deletion Confirmation Modal */}
    {deleteConfirmTarget && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative overflow-hidden text-left"
        >
          <div className="flex items-start gap-3.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                Delete {deleteConfirmTarget.type === 'chapter' ? 'Chapter' : 'Page'}?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800 font-medium">"{deleteConfirmTarget.title}"</strong> from your Master Document Canvas?
              </p>
              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11.5px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Icon icon="lucide:info" className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Remaining pages and chapters will be renumbered automatically.</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmTarget(null)}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteConfirmTarget.type === 'chapter' && deleteConfirmTarget.chapterNumber !== undefined) {
                  onDeleteChapter?.(deleteConfirmTarget.chapterNumber);
                } else if (deleteConfirmTarget.type === 'section' && deleteConfirmTarget.chapterId && deleteConfirmTarget.sectionId) {
                  onDeleteSection?.(deleteConfirmTarget.chapterId, deleteConfirmTarget.sectionId);
                }
                setDeleteConfirmTarget(null);
              }}
              className="gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete {deleteConfirmTarget.type === 'chapter' ? 'Chapter' : 'Page'}</span>
            </Button>
          </div>
        </motion.div>
      </div>
    )}

      {/* Audio Overview & AI Podcast Floating Dock */}
      <AudioOverviewPlayer
        document={document}
        isOpen={isAudioPlayerOpen}
        onClose={() => {
          setIsAudioPlayerOpen(false);
          setHighlightedAudioSectionId(null);
        }}
        onSyncNotebookSection={handleSyncNotebookAudio}
      />
    </aside>
  );
};