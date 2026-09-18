import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icon } from '@iconify/react';
import { AgentActivityRun } from '../types';

export interface AntigravityTrajectoryProps {
  run: AgentActivityRun;
  isLive?: boolean;
  liveSeconds?: number;
  defaultExpandedThought?: boolean;
  defaultExpandedExplore?: boolean;
  onOpenThinkingStudio?: (runId?: string) => void;
  onJumpToChapter?: (chapterNum: number) => void;
}

/**
 * Cleans up raw LLM thought output:
 * - Strips <think> / </think> tags
 * - Strips raw JSON formatting blocks or meta directives
 * - Returns clean, readable narrative prose
 */
export function cleanThoughtText(raw?: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip <think> and </think> tags
  cleaned = cleaned.replace(/<\/?think>/gi, '').trim();

  // If there's an explicit "Thinking": "..." field inside raw JSON
  const thinkingMatch = cleaned.match(/(?:Thinking|thought)["']?\s*:\s*["']([^"'\n]+(?:[\r\n]+[^"'\n]+)*)["']/i);
  if (thinkingMatch && thinkingMatch[1] && thinkingMatch[1].length > 20) {
    return thinkingMatch[1].trim();
  }

  // Remove markdown code fences if they enclose json or code
  cleaned = cleaned.replace(/```(?:json)?[\s\S]*?```/g, '').trim();

  // Remove meta instructions from prompts
  cleaned = cleaned
    .replace(/^Draft the response:?/gim, '')
    .replace(/^Finally,?\s*enclose.*$/gim, '')
    .replace(/^- (?:Action|ChatResponse):.*$/gim, '')
    .replace(/^- Thinking:\s*/gim, '')
    .trim();

  // Remove extra leading/trailing quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();

  return cleaned || raw;
}

interface ProcessedStep {
  id: string;
  verb: string;
  target: string;
  isFolder: boolean;
  detail?: string;
  diff?: { added: number; removed: number };
}

export const AntigravityTrajectory: React.FC<AntigravityTrajectoryProps> = ({
  run,
  isLive = false,
  liveSeconds = 0,
  defaultExpandedThought = false,
  defaultExpandedExplore = false,
  onOpenThinkingStudio,
  onJumpToChapter,
}) => {
  const [isThoughtExpanded, setIsThoughtExpanded] = useState<boolean>(defaultExpandedThought);
  const [isExploreExpanded, setIsExploreExpanded] = useState<boolean>(defaultExpandedExplore);

  const rawThought = run.thinking || '';
  const cleanedThought = cleanThoughtText(rawThought);
  const hasThought = Boolean(cleanedThought.trim().length > 0 || (isLive && run.status === 'running'));

  // Compute duration in seconds
  const durationSec = isLive && run.status === 'running'
    ? (liveSeconds > 0 ? liveSeconds.toFixed(0) : '1')
    : run.durationMs
    ? `${Math.max(1, Math.round(run.durationMs / 1000))}`
    : '6';

  // Process steps into clean Antigravity lines
  const processedSteps: ProcessedStep[] = React.useMemo(() => {
    const list: ProcessedStep[] = [];
    const rawSteps = run.steps || [];

    // Filter out initial plan or duplicate think steps from action list
    const actionOnlySteps = rawSteps.filter((s) => s.type !== 'plan' && s.id !== 'step-reasoning');

    if (actionOnlySteps.length > 0) {
      actionOnlySteps.forEach((st) => {
        const isFolder =
          Boolean(st.verb?.toLowerCase().includes('folder') ||
          st.target?.includes('\\') ||
          st.target?.includes('/') ||
          st.type === 'explore' && !st.target?.includes('.'));

        list.push({
          id: st.id,
          verb: st.verb || (st.type === 'edit' ? 'Edited' : st.type === 'synthesize' ? 'Synthesized' : 'Analyzed'),
          target: st.target || st.label,
          isFolder,
          detail: st.detail,
          diff: st.diff,
        });
      });
    } else {
      // Clean default realistic trajectory lines
      list.push({
        id: 'step-root',
        verb: 'Analyzed',
        target: 'Workspace Sources & Knowledge Index',
        isFolder: true,
      });

      if (run.actionTaken && run.actionTaken !== 'NONE') {
        list.push({
          id: 'step-notes',
          verb: 'Analyzed',
          target: 'Master Document Notes Canvas',
          isFolder: false,
        });

        if (run.actionTaken === 'CREATE_CHAPTER') {
          list.push({
            id: 'step-create',
            verb: 'Synthesized',
            target: `Chapter ${run.targetChapterNumber || 1}: Master Notes`,
            isFolder: false,
          });
        } else if (run.actionTaken === 'UPDATE_SECTION') {
          list.push({
            id: 'step-edit',
            verb: 'Updated',
            target: 'Master Notes Document Canvas',
            isFolder: false,
          });
        }
      }
    }

    return list;
  }, [run.steps, run.actionTaken, run.targetChapterNumber]);

  // Derive exploration counts
  const exploreItemCount = Math.max(1, processedSteps.filter((s) => !s.isFolder).length);
  const exploreFolderCount = Math.max(1, processedSteps.filter((s) => s.isFolder).length);

  return (
    <div className="w-full my-2 font-sans select-none text-[13px] leading-normal text-slate-600 dark:text-slate-400">
      {/* 1. Exploring Header */}
      <div className="flex items-center gap-1.5 py-0.5">
        <button
          type="button"
          onClick={() => setIsExploreExpanded(!isExploreExpanded)}
          className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer text-left"
        >
          <span className="font-normal text-slate-600 dark:text-slate-400">
            Exploring {exploreItemCount} file{exploreItemCount === 1 ? '' : 's'}, {exploreFolderCount} folder{exploreFolderCount === 1 ? '' : 's'}
          </span>
          <Icon
            icon={isExploreExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
            className="w-3.5 h-3.5 text-slate-400 transition-transform"
          />
        </button>
      </div>

      {/* Expanded Exploration List */}
      <AnimatePresence>
        {isExploreExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="overflow-hidden pl-3 py-1 space-y-1"
          >
            {processedSteps.map((st) => (
              <div key={`exp-${st.id}`} className="flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-400">
                {st.isFolder ? (
                  <Icon icon="solar:folder-bold" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : (
                  <Icon icon="solar:file-text-bold" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
                <span className="font-mono text-[12px] text-slate-700 dark:text-slate-300 truncate">
                  {st.target}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Thought Header & Studio Trigger */}
      {hasThought && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenThinkingStudio) {
                onOpenThinkingStudio(run.id);
              } else {
                setIsThoughtExpanded(!isThoughtExpanded);
              }
            }}
            className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer text-left group shadow-2xs"
            title="Open AI Thinking & Reasoning Studio"
          >
            <Icon icon="solar:brain-bold" className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span className="font-medium text-[12px] text-slate-700 dark:text-slate-300">
              Thought for {durationSec}s
            </span>
            <Icon
              icon="solar:alt-arrow-right-linear"
              className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform"
            />
          </button>

          {/* Clean Indented Thought Body (Antigravity style fallback if inline) */}
          <AnimatePresence>
            {isThoughtExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="my-1.5 pl-3 border-l-2 border-slate-200 dark:border-slate-800 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 font-sans select-text max-w-3xl">
                  <p className="whitespace-pre-wrap">
                    {cleanedThought || 'Reasoning through prompt requirements and organizing conceptual structure...'}
                  </p>

                  {onOpenThinkingStudio && (
                    <button
                      type="button"
                      onClick={() => onOpenThinkingStudio(run.id)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline cursor-pointer pt-1"
                    >
                      <span>View in AI Thinking studio →</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. Action Rows (Analyzed, Edited, Created, etc.) */}
      <div className="mt-1 space-y-0.5">
        {processedSteps.map((st) => (
          <div
            key={st.id}
            className="flex items-center gap-1.5 py-0.5 text-[13px] text-slate-700 dark:text-slate-300"
          >
            <span className="text-slate-500 dark:text-slate-400">{st.verb}</span>

            {st.isFolder ? (
              <Icon icon="solar:folder-bold" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Icon icon="solar:file-text-bold" className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            )}

            <span className="font-mono text-[12.5px] text-slate-800 dark:text-slate-200 truncate max-w-[420px]">
              {st.target}
            </span>

            {onJumpToChapter && st.verb === 'Synthesized' && (
              <button
                type="button"
                onClick={() => onJumpToChapter(run.targetChapterNumber || 1)}
                className="hover:text-primary transition-colors cursor-pointer"
                title="Jump to note"
              >
                <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        ))}

        {/* 4. Active Working Indicator */}
        {isLive && run.status === 'running' && (
          <div className="flex items-center gap-1.5 py-0.5 text-[13px] text-slate-800 dark:text-slate-200 font-medium">
            <span>Working.</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
