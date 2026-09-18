import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { SourceFile } from '../types';
import { triggerMicroBurst } from './ui/particle-burst';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PdfViewer } from './PdfViewer';

interface FileViewerProps {
  source: SourceFile | null;
  projectId: string;
  projectName?: string;
  onBackToChat: () => void;
  onClipToNotebook?: (text: string, sourceName: string) => void;
  onToggleDualStudio?: () => void;
  isDualStudio?: boolean;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  source,
  projectId,
  projectName: _projectName = 'Project',
  onBackToChat,
  onClipToNotebook,
  onToggleDualStudio,
  isDualStudio = false,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isLoadingBinary, setIsLoadingBinary] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [textSearch, setTextSearch] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(13.5);
  const [selectedClipText, setSelectedClipText] = useState<string | null>(null);
  const [clipBadgePos, setClipBadgePos] = useState<{ x: number; y: number } | null>(null);

  const handleTextMouseUp = () => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectedClipText(null);
        setClipBadgePos(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length > 5) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedClipText(text);
        setClipBadgePos({
          x: Math.max(120, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1000) - 120, rect.left + rect.width / 2)),
          y: Math.max(60, rect.top - 8),
        });
      }
    }, 10);
  };

  // Esc key listener to quickly return to chat workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBackToChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBackToChat]);

  // Load binary file for native PDF rendering
  useEffect(() => {
    let active = true;

    async function loadBinary() {
      if (!source) return;

      const isPdf = source.name.toLowerCase().endsWith('.pdf') || source.type === 'pdf';

      if (!isPdf) {
        setViewMode('text');
        return;
      }

      setIsLoadingBinary(true);
      setLoadError(null);
      setPdfData(null);
      setPdfBase64(null);

      try {
        if (window.electronAPI?.readSourceFileBinary) {
          const res = await window.electronAPI.readSourceFileBinary({
            projectId,
            sourceName: source.name,
            filePath: source.path,
          });

          if (!active) return;

          if (res.success && (res.uint8Array || res.base64)) {
            if (res.uint8Array) {
              setPdfData(res.uint8Array);
            }
            if (res.base64) {
              setPdfBase64(res.base64);
            }
            setViewMode('visual');
          } else {
            console.warn('Binary read response:', res.error);
            setLoadError(res.error || 'Binary document unavailable on disk. Showing extracted notes.');
            setViewMode('text');
          }
        } else {
          // Fallback in web browser mode
          setViewMode('text');
        }
      } catch (err: any) {
        if (active) {
          console.error('Failed to load file binary:', err);
          setLoadError('Could not load binary preview. Showing extracted text content.');
          setViewMode('text');
        }
      } finally {
        if (active) {
          setIsLoadingBinary(false);
        }
      }
    }

    loadBinary();

    return () => {
      active = false;
    };
  }, [source, projectId]);

  const isPdf = source?.name.toLowerCase().endsWith('.pdf') || source?.type === 'pdf';

  const handleCopyText = (e?: React.MouseEvent) => {
    if (!source?.content) return;
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    navigator.clipboard.writeText(source.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInOS = async () => {
    if (source?.path && window.electronAPI?.openFileInOS) {
      await window.electronAPI.openFileInOS(source.path);
    }
  };

  const formattedSize = useMemo(() => {
    if (!source?.size) return '0 KB';
    if (source.size < 1024) return `${source.size} B`;
    if (source.size < 1024 * 1024) return `${(source.size / 1024).toFixed(1)} KB`;
    return `${(source.size / (1024 * 1024)).toFixed(1)} MB`;
  }, [source?.size]);

  // Filtered lines for text preview
  const textLines = useMemo(() => {
    if (!source?.content) return [];
    return source.content.split('\n');
  }, [source?.content]);

  const matchingLineIndices = useMemo(() => {
    if (!textSearch.trim()) return null;
    const q = textSearch.toLowerCase();
    const indices = new Set<number>();
    textLines.forEach((line, idx) => {
      if (line.toLowerCase().includes(q)) {
        // Include immediate context
        for (let i = Math.max(0, idx - 1); i <= Math.min(textLines.length - 1, idx + 1); i++) {
          indices.add(i);
        }
      }
    });
    return indices;
  }, [textLines, textSearch]);

  const matchCount = useMemo(() => {
    if (!textSearch.trim()) return 0;
    const q = textSearch.toLowerCase();
    return textLines.filter((l) => l.toLowerCase().includes(q)).length;
  }, [textLines, textSearch]);

  if (!source) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
          <Icon icon="lucide:file-text" className="text-2xl" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Document Selected</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          Select a document from the left sidebar or import lecture notes to view here.
        </p>
        <Button
          onClick={onBackToChat}
          variant="default"
          size="sm"
          className="mt-4"
        >
          <Icon icon="lucide:arrow-left" className="mr-1.5" />
          Return to Conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-white dark:bg-slate-950 select-text overflow-hidden transition-colors">
      {/* 1. Header Toolbar */}
      <header className="h-[48px] px-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shrink-0 select-none z-20 overflow-x-auto no-scrollbar whitespace-nowrap gap-2">
        {/* Left: Back Button & Document Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToChat}
            className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
            title="Switch back to Conversation Workspace (Esc)"
          >
            <Icon icon="lucide:arrow-left" className="mr-1 text-sm" />
            <span>Chat</span>
            <kbd className="ml-1 px-1 py-0.2 rounded text-[9.5px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700 hidden sm:inline">
              Esc
            </kbd>
          </Button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 shrink-0" />

          <div className="flex items-center gap-1.5 min-w-0">
            {isPdf ? (
              <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-[10px] font-bold px-1.5 py-0.5 shrink-0">
                PDF
              </Badge>
            ) : source.type === 'code' ? (
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-bold px-1.5 py-0.5 shrink-0">
                CODE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-[10px] font-bold px-1.5 py-0.5 shrink-0">
                DOC
              </Badge>
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[280px]" title={source.name}>
                {source.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {formattedSize}
              </span>
              {source.tokenCount ? (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  • ~{source.tokenCount.toLocaleString()} tokens
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Center: Mode Segmented Switcher with Motion Sliding Pill */}
        {isPdf && (
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 relative">
            <button
              onClick={() => setViewMode('visual')}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-[11.5px] font-medium transition-colors cursor-pointer ${
                viewMode === 'visual'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {viewMode === 'visual' && (
                <motion.div
                  layoutId="pdfViewMode"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs border border-slate-200/60 dark:border-slate-600 z-[-1]"
                />
              )}
              <Icon icon="lucide:eye" className="text-xs" />
              <span>Visual Reader</span>
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-md text-[11.5px] font-medium transition-colors cursor-pointer ${
                viewMode === 'text'
                  ? 'text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {viewMode === 'text' && (
                <motion.div
                  layoutId="pdfViewMode"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs border border-slate-200/60 dark:border-slate-600 z-[-1]"
                />
              )}
              <Icon icon="lucide:book-open" className="text-xs" />
              <span>Extracted Notes</span>
            </button>
          </div>
        )}

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          {viewMode === 'text' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 mr-1">
              <Icon icon="lucide:search" className="text-slate-400 text-xs shrink-0" />
              <input
                type="text"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Search notes..."
                className="bg-transparent border-none outline-hidden text-[11.5px] w-28 placeholder:text-slate-400"
              />
              {textSearch && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-mono">{matchCount}</span>
                  <button
                    onClick={() => setTextSearch('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'text' && (
            <div className="flex items-center gap-0.5 mr-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setFontSize((s) => Math.max(11, s - 1))}
                className="px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                title="Decrease font size"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(20, s + 1))}
                className="px-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded font-semibold transition-colors"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            title="Copy extracted text to clipboard"
            className="h-8 text-xs"
          >
            <Icon
              icon={copied ? 'lucide:check' : 'lucide:copy'}
              className={`mr-1.5 text-xs ${copied ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
            />
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </Button>

          {source.path && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInOS}
              title="Open file in default system application"
              className="h-8 text-xs"
            >
              <Icon icon="lucide:external-link" className="mr-1.5 text-xs" />
              <span>Open in System</span>
            </Button>
          )}

          {onToggleDualStudio && (
            <Button
              variant={isDualStudio ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleDualStudio}
              title={isDualStudio ? 'Exit Dual Studio' : 'Split-Screen Dual Studio (PDF ↔ Notes)'}
              className={`h-8 text-xs gap-1.5 cursor-pointer ${
                isDualStudio
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon icon="lucide:columns-2" className="text-xs" />
              <span>{isDualStudio ? 'Dual Active' : 'Dual Studio'}</span>
            </Button>
          )}
        </div>
      </header>

      {/* 2. Document Canvas Content */}
      <div className="flex-1 h-full overflow-hidden relative bg-slate-100/50 dark:bg-slate-950" onMouseUp={handleTextMouseUp}>
        {/* Notice alert if binary could not be loaded */}
        {loadError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 shadow-xs">
            <Icon icon="lucide:alert-circle" className="text-amber-600 dark:text-amber-400 text-sm shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* View Option 1: Native High-Performance PDF Canvas Viewer */}
        {isPdf && viewMode === 'visual' ? (
          isLoadingBinary ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon icon="lucide:loader-2" className="animate-spin text-slate-700 dark:text-slate-300 text-2xl" />
              <span>Loading document stream...</span>
            </div>
          ) : pdfData || pdfBase64 ? (
            <PdfViewer
              data={pdfData}
              base64={pdfBase64}
              filePath={source.path}
              fileName={source.name}
              onSwitchToNotes={() => setViewMode('text')}
              onOpenInOS={handleOpenInOS}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                <Icon icon="lucide:alert-circle" className="text-2xl" />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">PDF binary file not accessible on disk.</p>
              <p className="mt-1 max-w-sm text-slate-500 dark:text-slate-400">
                You can read the entire extracted text notes, outlines, and lecture summaries below.
              </p>
              <Button
                size="sm"
                variant="default"
                onClick={() => setViewMode('text')}
                className="mt-4"
              >
                <Icon icon="lucide:book-open" className="mr-1.5 text-xs" />
                Switch to Extracted Notes
              </Button>
            </div>
          )
        ) : (
          /* View Option 2: Formatted Text & Extracted Notes */
          <div className="h-full overflow-y-auto p-6 md:p-10 bg-white dark:bg-slate-900">
            <div className="max-w-4xl mx-auto font-sans leading-relaxed text-slate-800 dark:text-slate-200">
              {/* Document Header Metadata Banner */}
              <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium font-mono text-[11px]">
                    {source.name}
                  </span>
                  <span>• {textLines.length.toLocaleString()} lines</span>
                </div>
                <span>Uploaded {source.uploadedAt || 'recently'}</span>
              </div>

              {/* Text / Code Lines */}
              <div
                style={{ fontSize: `${fontSize}px` }}
                className="font-mono space-y-1 select-text"
              >
                {textLines.map((line, idx) => {
                  if (matchingLineIndices && !matchingLineIndices.has(idx)) {
                    return null;
                  }

                  const isMatch =
                    textSearch.trim() &&
                    line.toLowerCase().includes(textSearch.toLowerCase());

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-2 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        isMatch ? 'bg-amber-100/70 dark:bg-amber-950/50 text-slate-950 dark:text-amber-100 font-medium' : ''
                      }`}
                    >
                      <span className="w-10 text-right text-[11px] font-mono text-slate-300 dark:text-slate-600 select-none shrink-0 pt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
                        {line || '\u00A0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Floating Clip Excerpt to Notebook Badge */}
        {selectedClipText && clipBadgePos && onClipToNotebook && (
          <div
            style={{
              position: 'fixed',
              left: `${clipBadgePos.x}px`,
              top: `${clipBadgePos.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 100,
            }}
            className="filter drop-shadow-xl select-none"
          >
            <div className="flex items-center gap-1.5 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-xl px-3 py-1.5 text-xs shadow-2xl border border-slate-700 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  onClipToNotebook(selectedClipText, source?.name || 'PDF Document');
                  triggerMicroBurst(clipBadgePos.x, clipBadgePos.y, '#f59e0b');
                  setSelectedClipText(null);
                  setClipBadgePos(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer text-[12px]"
                title="Send excerpt to Ruled Notebook as Margin Sticky Note"
              >
                <span>📌 Clip to Notes</span>
              </button>
              <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => {
                  setSelectedClipText(null);
                  setClipBadgePos(null);
                }}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
