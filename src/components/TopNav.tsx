import React from 'react';
import { PanelLeft, PanelRight, ArrowLeft, ArrowRight, Settings2, Columns2, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface TopNavProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  canvasOpen?: boolean;
  onToggleCanvas?: () => void;
  isDualStudio?: boolean;
  onToggleDualStudio?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onOpenSettings?: () => void;
  onOpenOmniSearch?: () => void;
  projectName?: string;
  sessionTitle?: string;
  documentChapterCount?: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  sidebarOpen,
  onToggleSidebar,
  canvasOpen,
  onToggleCanvas,
  isDualStudio = false,
  onToggleDualStudio,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onOpenSettings,
  onOpenOmniSearch,
  projectName,
  sessionTitle,
  documentChapterCount,
}) => {
  return (
    <header className="h-[42px] w-full px-3 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 select-none z-30 transition-colors">
      {/* Left controls + Breadcrumbs */}
      <div className="flex items-center gap-1 min-w-0">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onToggleSidebar}
          title="Toggle Sidebar (Ctrl+B)"
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            sidebarOpen
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <PanelLeft size={16} strokeWidth={1.8} />
        </motion.button>

        <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

        <motion.button
          whileTap={canGoBack ? { scale: 0.92 } : undefined}
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back"
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            canGoBack
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer'
              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
          }`}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
        </motion.button>

        <motion.button
          whileTap={canGoForward ? { scale: 0.92 } : undefined}
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Forward"
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            canGoForward
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer'
              : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
          }`}
        >
          <ArrowRight size={15} strokeWidth={1.8} />
        </motion.button>

        {/* Antigravity Executive Breadcrumbs */}
        {projectName && (
          <div className="flex items-center gap-1.5 ml-2.5 text-[12.5px] text-slate-500 dark:text-slate-400 min-w-0 overflow-hidden">
            <span className="font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer truncate max-w-[120px] sm:max-w-[200px] transition-colors shrink-0">
              {projectName}
            </span>
            <span className="text-slate-300 dark:text-slate-700 select-none font-light shrink-0">/</span>
            <span className="text-slate-600 dark:text-slate-300 truncate font-normal max-w-[140px] sm:max-w-[240px]">
              {sessionTitle || 'Knowledge Session'}
            </span>
          </div>
        )}
      </div>

      {/* Global Omni-Search Pill Button (Ctrl+K) */}
      {onOpenOmniSearch && (
        <button
          type="button"
          onClick={onOpenOmniSearch}
          title="Global Omni-Search (Ctrl+K)"
          className="hidden md:flex items-center gap-2 px-2.5 py-1 text-xs text-slate-400 dark:text-slate-500 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 rounded-md border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer select-none mx-2 max-w-[280px] flex-1"
        >
          <Search size={13} className="text-slate-400 shrink-0" />
          <span className="truncate flex-1 text-left text-slate-400 dark:text-slate-500">Search chapters, cards, sources...</span>
          <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0 shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      )}

      {/* Right controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onOpenOmniSearch && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onOpenOmniSearch}
            title="Global Omni-Search (Ctrl+K)"
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <Search size={16} strokeWidth={1.8} />
          </motion.button>
        )}

        {onToggleCanvas && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleCanvas}
            title={canvasOpen ? 'Collapse Document Canvas (Ctrl+D)' : 'Expand Document Canvas (Ctrl+D)'}
            className={`p-1.5 rounded-lg transition-colors shrink-0 relative ${
              canvasOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <PanelRight size={16} strokeWidth={1.8} />
            {documentChapterCount !== undefined && documentChapterCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                title={`${documentChapterCount} chapters generated`}
              />
            )}
          </motion.button>
        )}

        {onToggleDualStudio && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onToggleDualStudio}
            title={isDualStudio ? 'Exit Split View' : 'Side-by-side Dual View (Source & Notes)'}
            className={`px-2.5 py-1 rounded-md transition-colors shrink-0 flex items-center gap-1.5 text-xs font-medium cursor-pointer border ${
              isDualStudio
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs font-semibold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Columns2 size={14} strokeWidth={1.8} className={isDualStudio ? 'text-white dark:text-slate-900' : 'text-slate-500'} />
            <span className="hidden sm:inline">{isDualStudio ? 'Split View' : 'Split View'}</span>
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onOpenSettings}
          title="Settings & Preferences (Ctrl+,)"
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <Settings2 size={16} strokeWidth={1.8} />
        </motion.button>
      </div>
    </header>
  );
};

export default TopNav;
