import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TitleBarProps {
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onNewConversation?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onToggleSidebar,
  onOpenSettings,
  onNewConversation,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      const unsubscribe = window.electronAPI.onWindowStateChange((state) => {
        setIsMaximized(state.isMaximized);
      });
      return unsubscribe;
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximize().then(setIsMaximized);
    } else {
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <div
      className="h-[34px] w-full bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-300 select-none drag-region relative z-50 px-2.5 transition-colors"
      onClick={() => setActiveMenu(null)}
    >
      {/* Left menus & brand */}
      <div className="flex items-center gap-1 no-drag">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800/50 cursor-default transition-colors">
          <span className="h-2 w-2 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xs" />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-[12.5px] tracking-tight">
            Notelay
          </span>
        </div>

        {/* File Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'file' ? null : 'file');
            }}
            className={`px-2 py-0.5 rounded-md text-[12px] font-medium transition-all ${
              activeMenu === 'file'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            File
          </button>
          <AnimatePresence>
            {activeMenu === 'file' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 2 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-0 top-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-dropdown py-1.5 w-52 text-[12px] z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onNewConversation?.();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors"
                >
                  <span className="font-medium">New Project / Chat</span>
                  <kbd className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Ctrl+N</kbd>
                </button>
                <button
                  onClick={() => {
                    onOpenSettings?.();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors"
                >
                  <span className="font-medium">Settings</span>
                  <kbd className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Ctrl+,</kbd>
                </button>
                <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={handleClose}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors"
                >
                  <span className="font-medium">Exit</span>
                  <kbd className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Alt+F4</kbd>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'view' ? null : 'view');
            }}
            className={`px-2 py-0.5 rounded-md text-[12px] font-medium transition-all ${
              activeMenu === 'view'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            View
          </button>
          <AnimatePresence>
            {activeMenu === 'view' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 2 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-0 top-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-dropdown py-1.5 w-48 text-[12px] z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    onToggleSidebar?.();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex justify-between items-center transition-colors"
                >
                  <span className="font-medium">Toggle Sidebar</span>
                  <kbd className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Ctrl+B</kbd>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Window Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === 'window' ? null : 'window');
            }}
            className={`px-2 py-0.5 rounded-md text-[12px] font-medium transition-all ${
              activeMenu === 'window'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300'
            }`}
          >
            Window
          </button>
          <AnimatePresence>
            {activeMenu === 'window' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 2 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-0 top-[28px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-dropdown py-1.5 w-44 text-[12px] z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    handleMinimize();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
                >
                  Minimize
                </button>
                <button
                  onClick={() => {
                    handleMaximize();
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition-colors"
                >
                  {isMaximized ? 'Restore' : 'Maximize'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Middle drag area */}
      <div className="flex-1 h-full" />

      {/* Right: Window Controls */}
      <div className="flex items-center no-drag h-full -mr-2.5">
        <button
          onClick={handleMinimize}
          title="Minimize"
          className="h-full w-[46px] flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <Minus size={13} strokeWidth={1.5} />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="h-full w-[46px] flex items-center justify-center hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          {isMaximized ? (
            <Copy size={11} strokeWidth={1.5} className="rotate-90" />
          ) : (
            <Square size={11} strokeWidth={1.5} />
          )}
        </button>

        <button
          onClick={handleClose}
          title="Close"
          className="h-full w-[46px] flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-500 transition-colors"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
