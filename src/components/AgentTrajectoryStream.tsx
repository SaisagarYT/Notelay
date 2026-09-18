import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { AgentActivityRun } from '../types';

interface AgentTrajectoryStreamProps {
  run: AgentActivityRun;
  isLive?: boolean;
  onJumpToChapter?: (chapterNum: number) => void;
  onOpenLogsFolder?: () => void;
}

export const AgentTrajectoryStream: React.FC<AgentTrajectoryStreamProps> = ({
  run,
  isLive = false,
  onJumpToChapter,
  onOpenLogsFolder,
}) => {
  // Automatically expand thoughts while streaming or running, or if user toggles
  const [thinkingExpanded, setThinkingExpanded] = useState<boolean>(isLive && run.status === 'running');
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [liveDurationSec, setLiveDurationSec] = useState<number>(0);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);

  // Live timer tick when running
  useEffect(() => {
    if (run.status !== 'running') {
      if (run.durationMs) {
        setLiveDurationSec(Number((run.durationMs / 1000).toFixed(1)));
      }
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      setLiveDurationSec(Number(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);

    return () => clearInterval(interval);
  }, [run.status, run.durationMs]);

  // Keep thoughts auto-scrolled to bottom while streaming
  useEffect(() => {
    if (isLive && run.status === 'running' && thinkingExpanded && thinkingScrollRef.current) {
      thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
    }
  }, [run.thinking, isLive, run.status, thinkingExpanded]);

  // Collapse thoughts automatically after run finishes (unless user explicitly leaves it open)
  useEffect(() => {
    if (!isLive && run.status === 'completed') {
      setThinkingExpanded(false);
    }
  }, [isLive, run.status]);

  const toggleStep = (stepId: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const isRunning = run.status === 'running';
  const hasThinking = Boolean(run.thinking && run.thinking.trim().length > 0);
  const actionSteps = run.steps.filter((s) => s.type !== 'plan');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="w-full my-2.5 select-none rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-sm shadow-2xs overflow-hidden"
    >
      {/* 1. Header Bar: Model Identity, Live Status & Token Metrics */}
      <div className="px-3.5 py-2.5 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between gap-3 text-[12.5px]">
        {/* Left: Model Pill with Live Pulse Beacon */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center">
            {isRunning ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            ) : (
              <div className="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {run.model || 'AI Model'}
            </span>
            {run.model.toLowerCase().includes('local') || run.model.toLowerCase().includes('ollama') ? (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
                Local
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 shrink-0">
                Cloud
              </span>
            )}
          </div>
        </div>

        {/* Right: Live Timer, Token Counts & Training Logs Button */}
        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {isRunning ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Icon icon="solar:clock-circle-linear" className="w-3 h-3 animate-spin" />
              <span>{liveDurationSec.toFixed(1)}s</span>
            </span>
          ) : (
            run.durationMs && (
              <span className="flex items-center gap-1">
                <Icon icon="solar:clock-circle-linear" className="w-3 h-3" />
                <span>{(run.durationMs / 1000).toFixed(1)}s</span>
              </span>
            )
          )}

          {run.evalCount ? (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Icon icon="solar:bolt-linear" className="w-3 h-3 text-amber-500" />
              <span>{run.evalCount} tok</span>
              {run.speedTokPerSec && (
                <span className="text-slate-400">({run.speedTokPerSec} t/s)</span>
              )}
            </span>
          ) : null}

          {onOpenLogsFolder && (
            <button
              onClick={onOpenLogsFolder}
              title="Open Fine-Tuning Training Dataset folder on disk"
              className="hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-md transition-colors cursor-pointer"
            >
              <Icon icon="solar:folder-with-files-bold" className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* 2. Genuine Action Rows (Only real events: Ingested sources, Real Canvas Edits) */}
        {actionSteps.length > 0 && (
          <div className="space-y-1">
            {actionSteps.map((step, sIdx) => {
              const isExpanded = expandedStepIds[step.id] ?? false;
              const isStepRunning = step.status === 'running';
              const hasSubItems = Boolean(step.items && step.items.length > 0);

              return (
                <div
                  key={step.id || sIdx}
                  className={`rounded-xl px-2.5 py-1.5 transition-colors ${
                    isStepRunning
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    onClick={() => (hasSubItems || step.detail) && toggleStep(step.id)}
                    className={`flex items-center justify-between text-[12.5px] select-none ${
                      hasSubItems || step.detail ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {isStepRunning ? (
                        <Icon icon="solar:refresh-circle-bold" className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : step.type === 'edit' ? (
                        <div className="w-4 h-4 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon icon="solar:pen-new-square-linear" className="w-2.5 h-2.5" />
                        </div>
                      ) : step.type === 'explore' ? (
                        <div className="w-4 h-4 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Icon icon="solar:document-text-linear" className="w-2.5 h-2.5" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <Icon icon="solar:check-read-linear" className="w-2.5 h-2.5" />
                        </div>
                      )}

                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        {step.verb || step.label}
                      </span>

                      {step.fileExt && (
                        <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 rounded font-mono font-bold bg-indigo-600 text-white shrink-0">
                          {step.fileExt}
                        </span>
                      )}

                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {step.target || step.label}
                      </span>

                      {step.diff && (
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] shrink-0">
                          {step.diff.added > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              +{step.diff.added}
                            </span>
                          )}
                          {step.diff.removed > 0 && (
                            <span className="text-rose-500 dark:text-rose-400 font-semibold">
                              -{step.diff.removed}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {(hasSubItems || step.detail) && (
                      <div className="text-slate-400 pl-2 shrink-0">
                        <Icon
                          icon={isExpanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
                          className="w-3.5 h-3.5"
                        />
                      </div>
                    )}
                  </div>

                  {/* Expandable sub-items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="overflow-hidden mt-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 pl-6 space-y-1"
                      >
                        {step.detail && (
                          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {step.detail}
                          </p>
                        )}
                        {step.items && step.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11.5px] font-mono text-slate-600 dark:text-slate-300">
                            <Icon icon="solar:file-linear" className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{it}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Authentic Live Cognitive Thinking Accordion (Streams Real Thoughts) */}
        {(hasThinking || (isLive && isRunning)) && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setThinkingExpanded(!thinkingExpanded)}
              className="w-full px-3 py-2 flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md ${isRunning ? 'bg-primary/10 text-primary animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Icon icon="solar:brain-bold-duotone" className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {isRunning ? 'Reasoning Process' : 'Thought Process'}
                </span>
                {isRunning ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 font-medium">
                    Streaming live...
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'Completed'}
                  </span>
                )}
              </div>

              <Icon
                icon={thinkingExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                className="w-3.5 h-3.5 text-slate-400"
              />
            </button>

            <AnimatePresence>
              {thinkingExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div
                    ref={thinkingScrollRef}
                    className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 max-h-56 overflow-y-auto text-[11.5px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text custom-scrollbar bg-slate-50/40 dark:bg-black/30"
                  >
                    {run.thinking ? (
                      <>
                        {run.thinking}
                        {isRunning && (
                          <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse align-middle" />
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">
                        Listening to model reasoning tokens...
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 4. Canvas Quick Navigation Button (if action modified a chapter) */}
        {run.targetChapterNumber && onJumpToChapter && (
          <div className="pt-0.5">
            <button
              onClick={() => onJumpToChapter(run.targetChapterNumber!)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11.5px] font-medium transition-colors cursor-pointer group"
            >
              <Icon icon="solar:arrow-right-linear" className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
              <span>Reveal Chapter #{run.targetChapterNumber} on Master Canvas</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
