import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { Maximize2, Minimize2, Download, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { animate, stagger } from 'animejs';
import { sanitizeMermaidCode, cleanupStrayMermaidElements, getDiagramTypeInfo } from '../utils/mermaidUtils';
import { triggerMicroBurst } from './ui/particle-burst';

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  themeVariables: {
    fontSize: '13px',
    primaryColor: '#f8fafc',
    primaryTextColor: '#0f172a',
    primaryBorderColor: '#cbd5e1',
    lineColor: '#64748b',
    secondaryColor: '#ffffff',
    tertiaryColor: '#f1f5f9',
    noteBkgColor: '#f8fafc',
    noteTextColor: '#334155',
    noteBorderColor: '#e2e8f0',
  },
});

interface DiagramRendererProps {
  code: string;
  title?: string;
  className?: string;
}

export const DiagramRenderer: React.FC<DiagramRendererProps> = ({
  code,
  title = 'Visual Diagram',
  className = '',
}) => {
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const cleanCode = code.trim();
  const typeInfo = getDiagramTypeInfo(cleanCode);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!cleanCode) return;
      // Preemptively remove any stray error elements from previous renders
      cleanupStrayMermaidElements();

      const sanitized = sanitizeMermaidCode(cleanCode);
      const renderId = `mermaid-svg-${uniqueId}-${Date.now()}`;

      try {
        setError(null);
        const { svg } = await mermaid.render(renderId, sanitized);
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: unknown) {
        // Immediately purge any error bomb/syntax notice elements Mermaid appended to document.body
        cleanupStrayMermaidElements();

        if (isMounted) {
          console.warn('Mermaid render notice:', err);
          setError(err instanceof Error ? err.message : 'Visual diagram rendering notice.');
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
      cleanupStrayMermaidElements();
    };
  }, [cleanCode, uniqueId]);

  // Anime.js progressive drawing and stagger reveal for diagram elements
  useEffect(() => {
    if (!svgHtml || !containerRef.current) return;

    try {
      const nodes = containerRef.current.querySelectorAll('.node, .cluster, .actor, .statediagram-state, rect.basic, polygon');
      if (nodes && nodes.length > 0) {
        animate(Array.from(nodes), {
          opacity: [0, 1],
          scale: [0.96, 1],
          duration: 400,
          delay: stagger(25),
          ease: 'outQuad',
        });
      }

      const paths = containerRef.current.querySelectorAll('path.edgePath, path.flowchart-link, path.messageLine0, path.messageLine1');
      if (paths && paths.length > 0) {
        animate(Array.from(paths), {
          opacity: [0, 1],
          duration: 450,
          ease: 'linear',
        });
      }
    } catch {
      // ignore
    }
  }, [svgHtml]);

  const handleCopyCode = (e?: React.MouseEvent) => {
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = (e?: React.MouseEvent) => {
    if (!svgHtml) return;
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
    const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`my-4 rounded-xl border border-[#e2e8f0] bg-white overflow-hidden shadow-xs transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 flex flex-col bg-white/95 backdrop-blur-md shadow-2xl border-slate-300'
          : className
      }`}
    >
      {/* Diagram Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs text-[#64748b]">
        <div className="flex items-center gap-2 font-medium text-slate-700 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#64748b] inline-block shrink-0" />
          <span className="truncate">{title}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 border border-slate-300/50 shrink-0">
            {typeInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isFullscreen && (
            <div className="flex items-center gap-1 mr-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                className="px-1 hover:bg-slate-300 rounded font-bold"
              >
                -
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                className="px-1 hover:bg-slate-300 rounded font-bold"
              >
                +
              </button>
              <button
                onClick={() => setZoom(1)}
                className="ml-1 text-[10px] text-slate-500 hover:text-slate-800"
              >
                Reset
              </button>
            </div>
          )}

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e2e8f0] text-slate-600 hover:text-slate-900 transition-colors"
            title="Copy Mermaid Code"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadSVG}
            disabled={!svgHtml}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e2e8f0] text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-40"
            title="Download Vector SVG"
          >
            <Download size={12} />
            <span className="text-[11px]">SVG</span>
          </button>

          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setZoom(1);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#e2e8f0] text-slate-600 hover:text-slate-900 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center p-4 sm:p-6 bg-white overflow-x-auto min-w-0 max-w-full ${
          isFullscreen ? 'flex-1 p-10 max-h-none' : 'max-h-[500px]'
        }`}
      >
        {error ? (
          <div className="w-full max-w-md p-4 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#334155] text-xs">
            <div className="flex items-center gap-2 font-medium mb-1 text-[#0f172a]">
              <AlertTriangle size={14} className="text-[#64748b]" />
              <span>Diagram Rendering Notice</span>
            </div>
            <p className="mb-2 text-[#64748b] leading-relaxed font-mono text-[11px] break-words">
              {error}
            </p>
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer text-[#475569] font-semibold hover:underline">
                View Raw Mermaid Source
              </summary>
              <pre className="mt-2 p-2 rounded bg-[#f1f5f9] border border-[#e2e8f0] overflow-x-auto font-mono text-[11px] text-[#334155]">
                {cleanCode}
              </pre>
            </details>
          </div>
        ) : svgHtml ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full min-w-0 max-w-full flex justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:drop-shadow-xs"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="flex items-center gap-2 py-8 text-xs text-slate-400">
            <RefreshCw size={14} className="animate-spin text-blue-500" />
            <span>Rendering visual diagram...</span>
          </div>
        )}
      </div>
    </div>
  );
};