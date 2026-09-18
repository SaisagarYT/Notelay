import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from './ui/button';

// Set worker source using Vite's asset bundling
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerProps {
  data: Uint8Array | null;
  base64?: string | null;
  filePath?: string | null;
  fileName: string;
  onSwitchToNotes?: () => void;
  onOpenInOS?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  data,
  base64,
  filePath: _filePath,
  fileName: _fileName,
  onSwitchToNotes,
  onOpenInOS,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Helper to convert base64 to Uint8Array if needed
  const getUint8Array = useCallback((): Uint8Array | null => {
    if (data && data.length > 0) return data;
    if (base64) {
      try {
        const bin = atob(base64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
      } catch (err) {
        console.error('Failed to decode base64 PDF bytes:', err);
      }
    }
    return null;
  }, [data, base64]);

  // Load PDF document proxy
  useEffect(() => {
    let cancelled = false;
    const bytes = getUint8Array();

    if (!bytes || bytes.length === 0) {
      setIsLoading(false);
      setRenderError('No PDF binary data available to render.');
      return;
    }

    setIsLoading(true);
    setRenderError(null);

    // Create a copy of the bytes to avoid transferring memory ownership issues
    const dataCopy = new Uint8Array(bytes);

    const loadingTask = pdfjsLib.getDocument({
      data: dataCopy,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setPageInput('1');
        setIsLoading(false);

        // Pre-generate thumbnail URLs for the sidebar
        generateThumbnails(doc);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('PDF.js loading error:', err);
        setRenderError(err.message || 'Failed to parse PDF document.');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [getUint8Array]);

  // Generate lightweight thumbnail previews for the sidebar drawer
  const generateThumbnails = async (doc: any) => {
    const thumbs: string[] = [];
    const count = Math.min(doc.numPages, 30); // Up to first 30 pages for fast rendering
    const thumbCanvas = document.createElement('canvas');
    const thumbContext = thumbCanvas.getContext('2d');

    if (!thumbContext) return;

    for (let i = 1; i <= count; i++) {
      try {
        const page = await doc.getPage(i);
        const thumbViewport = page.getViewport({ scale: 0.2 });
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;

        await page.render({
          canvasContext: thumbContext,
          viewport: thumbViewport,
        }).promise;

        thumbs.push(thumbCanvas.toDataURL());
      } catch (err) {
        console.warn(`Could not generate thumbnail for page ${i}:`, err);
        thumbs.push('');
      }
    }
    setPageThumbnails(thumbs);
  };

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || currentPage < 1 || currentPage > numPages) return;

    let isCancelled = false;

    async function renderPage() {
      // Cancel prior render if still running
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const viewport = page.getViewport({ scale, rotation });
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform || undefined,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Canvas render error:', err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, scale, rotation, numPages]);

  // Page Navigation
  const goToPage = (p: number) => {
    const pageNum = Math.max(1, Math.min(numPages, p));
    setCurrentPage(pageNum);
    setPageInput(pageNum.toString());
  };

  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handlePageInputCommit = () => {
    const val = parseInt(pageInput, 10);
    if (!isNaN(val)) {
      goToPage(val);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Zoom Controls
  const zoomIn = () => setScale((s) => Math.min(3.0, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)));
  const resetZoom = () => setScale(1.0);

  const fitWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const containerWidth = containerRef.current.clientWidth - 80;
      if (containerWidth > 0 && unscaledViewport.width > 0) {
        const newScale = containerWidth / unscaledViewport.width;
        setScale(Math.max(0.5, Math.min(2.5, +newScale.toFixed(2))));
      }
    } catch {}
  };

  const fitPage = async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const containerHeight = containerRef.current.clientHeight - 100;
      if (containerHeight > 0 && unscaledViewport.height > 0) {
        const newScale = containerHeight / unscaledViewport.height;
        setScale(Math.max(0.5, Math.min(2.5, +newScale.toFixed(2))));
      }
    } catch {}
  };

  const rotateClockwise = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(numPages);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-100/50 dark:bg-slate-950 select-none">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <Icon icon="lucide:loader-2" className="animate-spin text-slate-700 dark:text-slate-200 text-2xl" />
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Rendering Document Canvas</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Initializing high-definition vector stream...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (renderError) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-100/50 dark:bg-slate-950 select-none text-center">
        <div className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
            <Icon icon="lucide:alert-circle" className="text-2xl" />
          </div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Direct PDF Preview Unavailable</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {renderError}
          </p>
          <div className="flex items-center gap-2 mt-4">
            {onSwitchToNotes && (
              <Button size="sm" variant="default" onClick={onSwitchToNotes}>
                <Icon icon="lucide:book-open" className="mr-1.5 text-sm" />
                Read Extracted Notes
              </Button>
            )}
            {onOpenInOS && (
              <Button size="sm" variant="outline" onClick={onOpenInOS}>
                <Icon icon="lucide:external-link" className="mr-1.5 text-sm" />
                Open in System
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 h-full flex overflow-hidden bg-slate-100/70 dark:bg-slate-950 select-none">
      {/* 1. Collapsible Thumbnail Sidebar Drawer */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 170, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            className="h-full border-r border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col overflow-hidden z-20 shrink-0"
          >
            <div className="h-10 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pages ({numPages})</span>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon icon="lucide:x" className="text-xs" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: numPages }, (_, idx) => {
                const pNum = idx + 1;
                const isSelected = pNum === currentPage;
                const thumb = pageThumbnails[idx];

                return (
                  <button
                    key={pNum}
                    onClick={() => goToPage(pNum)}
                    className={`w-full text-left p-1.5 rounded-lg transition-all group flex flex-col items-center cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="w-full aspect-3/4 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center relative shadow-2xs">
                      {thumb ? (
                        <img src={thumb} alt={`Page ${pNum}`} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">P. {pNum}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono mt-1 font-medium">Page {pNum}</span>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Main PDF Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 h-full overflow-auto p-6 md:p-8 flex flex-col items-center justify-start relative"
      >
        {/* Document Canvas Sheet */}
        <div className="relative my-auto transition-transform duration-150 ease-out">
          <canvas
            ref={canvasRef}
            className="rounded-sm shadow-xl dark:shadow-2xl dark:shadow-black/70 bg-white border border-slate-300/70 dark:border-slate-700"
          />
        </div>

        {/* 3. Floating Reader Controls Pill Bar */}
        <div className="sticky bottom-4 z-30 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg backdrop-blur-md text-xs select-none">
          {/* Toggle Thumbnails */}
          <Button
            variant={showThumbnails ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Toggle Page Thumbnails"
            className="h-7 w-7"
          >
            <Icon icon="lucide:layout-grid" className="text-sm" />
          </Button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Page Navigation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            title="Previous Page (Left Arrow)"
            className="h-7 w-7"
          >
            <Icon icon="lucide:chevron-left" className="text-sm" />
          </Button>

          <div className="flex items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputCommit}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputCommit()}
              className="w-8 text-center bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 py-0.5 font-medium outline-hidden"
            />
            <span className="text-slate-400">/ {numPages || 1}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            title="Next Page (Right Arrow)"
            className="h-7 w-7"
          >
            <Icon icon="lucide:chevron-right" className="text-sm" />
          </Button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out (-)"
            className="h-7 w-7"
          >
            <Icon icon="lucide:minus" className="text-xs" />
          </Button>

          <button
            onClick={resetZoom}
            className="px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] text-center"
            title="Reset Zoom to 100% (0)"
          >
            {Math.round(scale * 100)}%
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 3.0}
            title="Zoom In (+)"
            className="h-7 w-7"
          >
            <Icon icon="lucide:plus" className="text-xs" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fitWidth}
            title="Fit to Page Width"
            className="h-7 w-7"
          >
            <Icon icon="lucide:scan" className="text-xs" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={fitPage}
            title="Fit Entire Page"
            className="h-7 w-7"
          >
            <Icon icon="lucide:minimize-2" className="text-xs" />
          </Button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Rotation */}
          <Button
            variant="ghost"
            size="icon"
            onClick={rotateClockwise}
            title="Rotate Clockwise 90°"
            className="h-7 w-7"
          >
            <Icon icon="lucide:rotate-cw" className="text-xs" />
          </Button>

          {/* Extracted Notes Shortcut */}
          {onSwitchToNotes && (
            <>
              <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSwitchToNotes}
                title="View Extracted Notes & Text"
                className="h-7 text-xs px-2"
              >
                <Icon icon="lucide:book-open" className="mr-1 text-xs" />
                <span>Notes</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
