import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AgentActivityRun } from '../types';
import { AntigravityTrajectory } from './AntigravityTrajectory';

interface AgentThinkingStudioProps {
  activeAgentRun?: AgentActivityRun | null;
  activityHistory?: AgentActivityRun[];
  onOpenLogsFolder?: () => void;
  onJumpToChapter?: (chapterNum: number) => void;
}

export const AgentThinkingStudio: React.FC<AgentThinkingStudioProps> = ({
  activeAgentRun,
  activityHistory = [],
  onOpenLogsFolder,
  onJumpToChapter,
}) => {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showJsonSample, setShowJsonSample] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Derive the active run or selected historical run
  const displayRun = selectedRunId
    ? activityHistory.find((r) => r.id === selectedRunId) || activeAgentRun
    : activeAgentRun || activityHistory[0];

  const handleCopyJson = (jsonObj: any) => {
    navigator.clipboard.writeText(JSON.stringify(jsonObj, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-4 text-[13px] font-sans select-none">
      {/* 1. Clean Antigravity Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Icon icon="solar:brain-bold" className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>AI Thinking & Trajectory</span>
              {activeAgentRun && activeAgentRun.status === 'running' && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live
                </span>
              )}
            </h3>
            <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
              Cognitive steps, file exploration & synthesis traces
            </p>
          </div>
        </div>

        {onOpenLogsFolder && (
          <button
            onClick={onOpenLogsFolder}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
            title="Open training logs folder"
          >
            <Icon icon="solar:folder-with-files-linear" className="w-3.5 h-3.5 text-slate-500" />
            <span>Logs</span>
          </button>
        )}
      </div>

      {/* 2. Run History Tabs (if multiple turns) */}
      {activityHistory.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11.5px]">
          {activityHistory.map((run, idx) => {
            const isSelected = (displayRun?.id === run.id);
            return (
              <button
                key={run.id || idx}
                onClick={() => setSelectedRunId(run.id)}
                className={`shrink-0 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <span>Run {activityHistory.length - idx}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                  "{run.prompt}"
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Trajectory Card for the Active / Selected Turn */}
      {displayRun ? (
        <div className="space-y-3">
          {/* Metadata pill bar */}
          <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {displayRun.model}
              </span>
              <span>•</span>
              <span>
                {displayRun.durationMs ? `${(displayRun.durationMs / 1000).toFixed(1)}s` : 'Active'}
              </span>
              {displayRun.evalCount ? (
                <>
                  <span>•</span>
                  <span>{displayRun.evalCount} tokens</span>
                </>
              ) : null}
            </div>
          </div>

          {/* User Directive preview */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-[12px] text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 mr-1.5 font-medium">Prompt:</span>
            <span className="italic select-text">"{displayRun.prompt}"</span>
          </div>

          {/* The Antigravity Trajectory Component */}
          <div className="pt-1">
            <AntigravityTrajectory
              run={displayRun}
              isLive={activeAgentRun?.id === displayRun.id && activeAgentRun.status === 'running'}
              defaultExpandedThought={true}
              defaultExpandedExplore={false}
              onJumpToChapter={onJumpToChapter}
            />
          </div>

          {/* Canvas Mutation Action Summary (if any) */}
          {displayRun.actionTaken && displayRun.actionTaken !== 'NONE' && (
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <Icon icon="solar:document-add-linear" className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  {displayRun.actionTaken === 'CREATE_CHAPTER'
                    ? `Synthesized Chapter ${displayRun.targetChapterNumber || 1} on Canvas`
                    : displayRun.actionTaken === 'UPDATE_SECTION'
                    ? 'Updated Section in Master Notes Canvas'
                    : 'Canvas Updated'}
                </span>
              </div>

              {onJumpToChapter && displayRun.targetChapterNumber && (
                <button
                  onClick={() => onJumpToChapter(displayRun.targetChapterNumber!)}
                  className="text-primary hover:underline text-[11.5px] font-medium cursor-pointer"
                >
                  View Canvas →
                </button>
              )}
            </div>
          )}

          {/* Clean Fine-Tuning Sample Drawer */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <button
              onClick={() => setShowJsonSample(!showJsonSample)}
              className="flex items-center gap-1.5 text-[11.5px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              <Icon
                icon={showJsonSample ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                className="w-3 h-3"
              />
              <span>Dataset export preview (JSON)</span>
            </button>

            {showJsonSample && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[11px] relative">
                <button
                  onClick={() =>
                    handleCopyJson({
                      prompt: displayRun.prompt,
                      thinking: displayRun.thinking,
                      steps: displayRun.steps,
                      durationMs: displayRun.durationMs,
                    })
                  }
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Copy JSON"
                >
                  <Icon icon={copiedJson ? 'solar:check-read-linear' : 'solar:copy-linear'} className="w-3.5 h-3.5" />
                </button>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                  {JSON.stringify(
                    {
                      model: displayRun.model,
                      prompt: displayRun.prompt,
                      thinking: displayRun.thinking,
                      stepsCount: displayRun.steps?.length || 0,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-slate-400">
          <Icon icon="solar:clock-circle-linear" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-[12.5px]">No execution trajectories recorded yet.</p>
          <p className="text-[11px] mt-0.5 text-slate-400">
            Send a prompt to observe live model thinking and steps.
          </p>
        </div>
      )}
    </div>
  );
};
