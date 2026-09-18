import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Lightbulb, GitBranch, Table, MessageSquare, Send, X, Loader2 } from 'lucide-react';

export interface FloatingSelectionToolbarProps {
  position: { x: number; y: number } | null;
  selectedText: string;
  onAction: (action: 'deepen' | 'analogy' | 'diagram' | 'table' | 'custom', customPrompt?: string) => Promise<void>;
  onHighlight?: (color: 'yellow' | 'green' | 'pink' | 'blue') => void;
  onClose: () => void;
  isSynthesizing: boolean;
  statusMessage?: string;
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  position,
  selectedText,
  onAction,
  onHighlight,
  onClose,
  isSynthesizing,
  statusMessage = 'AI Synthesizing...',
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  if (!position || !selectedText) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onAction('custom', customPrompt.trim());
    setIsCustomMode(false);
    setCustomPrompt('');
  };

  const clampedX = Math.max(160, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1000) - 160, position.x));
  const clampedY = Math.max(70, position.y);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 6 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: `${clampedX}px`,
          top: `${clampedY}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: 100,
        }}
        className="pointer-events-auto filter drop-shadow-2xl"
      >
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 backdrop-blur-md flex flex-col gap-1.5 min-w-[280px] max-w-[420px]">
          {isSynthesizing ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-slate-200 text-[12px]">Synthesizing notes...</span>
                <span className="text-[10.5px] text-slate-400 truncate">{statusMessage}</span>
              </div>
            </div>
          ) : isCustomMode ? (
            <form onSubmit={handleCustomSubmit} className="flex items-center gap-1 px-1 py-0.5">
              <input
                ref={inputRef}
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Explain, deepen, rewrite, or simplify..."
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!customPrompt.trim()}
                className="p-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer font-medium"
                title="Apply prompt"
              >
                <Send className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-0.5">
              <div className="px-2 py-0.5 text-[11px] font-medium text-slate-400 border-r border-slate-700/80 mr-1 select-none">
                Enhance
              </div>

              <button
                onClick={() => onAction('deepen')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Deepen & expand theoretical mechanics"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Deepen</span>
              </button>

              <button
                onClick={() => onAction('analogy')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Create intuitive real-world mental model"
              >
                <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
                <span>Analogy</span>
              </button>

              <button
                onClick={() => onAction('diagram')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Convert to Mermaid Block Diagram or Flowchart"
              >
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                <span>Diagram</span>
              </button>

              <button
                onClick={() => onAction('table')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Convert to comparison table matrix"
              >
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>Table</span>
              </button>

              <button
                onClick={() => setIsCustomMode(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                title="Custom prompt"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom</span>
              </button>

              {/* Highlighter Palette */}
              {onHighlight && (
                <div className="flex items-center gap-1 border-l border-slate-700/80 pl-1.5 ml-1 select-none">
                  <button
                    type="button"
                    onClick={() => onHighlight('yellow')}
                    className="w-3.5 h-3.5 rounded-full bg-yellow-300 hover:scale-125 transition-transform shadow-xs cursor-pointer border border-yellow-400"
                    title="Highlight Yellow"
                  />
                  <button
                    type="button"
                    onClick={() => onHighlight('green')}
                    className="w-3.5 h-3.5 rounded-full bg-emerald-300 hover:scale-125 transition-transform shadow-xs cursor-pointer border border-emerald-400"
                    title="Highlight Emerald"
                  />
                  <button
                    type="button"
                    onClick={() => onHighlight('pink')}
                    className="w-3.5 h-3.5 rounded-full bg-pink-300 hover:scale-125 transition-transform shadow-xs cursor-pointer border border-pink-400"
                    title="Highlight Pink"
                  />
                  <button
                    type="button"
                    onClick={() => onHighlight('blue')}
                    className="w-3.5 h-3.5 rounded-full bg-sky-300 hover:scale-125 transition-transform shadow-xs cursor-pointer border border-sky-400"
                    title="Highlight Blue"
                  />
                </div>
              )}

              <button
                onClick={onClose}
                className="p-1 ml-0.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Little downward arrow pointer */}
          <div className="w-2.5 h-2.5 bg-slate-900 border-b border-r border-slate-700/80 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
