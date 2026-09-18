import React, { useState } from 'react';
import { Trash2, RotateCcw, Folder, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { Project } from '../types';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { triggerMicroBurst } from './ui/particle-burst';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onRestoreProject: (projectId: string) => void;
  onRestoreSource: (projectId: string, sourceId: string) => void;
  onHardDeleteProject: (projectId: string) => void;
  onHardDeleteSource: (projectId: string, sourceId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  projects,
  onRestoreProject,
  onRestoreSource,
  onHardDeleteProject,
  onHardDeleteSource,
  onEmptyTrash,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'folders' | 'files'>('all');
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  // Gather all soft-deleted projects
  const deletedProjects = projects.filter((p) => p.isDeleted);

  // Gather all soft-deleted sources
  const deletedSources: Array<{
    projectId: string;
    projectName: string;
    source: any;
  }> = [];

  projects.forEach((p) => {
    (p.sources || []).forEach((s) => {
      if (s.isDeleted) {
        deletedSources.push({
          projectId: p.id,
          projectName: p.name,
          source: s,
        });
      }
    });
  });

  const totalItems = deletedProjects.length + deletedSources.length;

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  const handleEmptyTrash = (e: React.MouseEvent) => {
    if (!confirmEmpty) {
      setConfirmEmpty(true);
      return;
    }
    triggerMicroBurst(e.clientX, e.clientY, '#e11d48');
    onEmptyTrash();
    setConfirmEmpty(false);
  };

  const handleRestoreProj = (id: string, e: React.MouseEvent) => {
    triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    onRestoreProject(id);
  };

  const handleRestoreSrc = (projId: string, srcId: string, e: React.MouseEvent) => {
    triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    onRestoreSource(projId, srcId);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Trash2 size={16} />
            </div>
            <div>
              <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">Trash Bin</h2>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in trash. Restore anytime or delete permanently.
              </p>
            </div>
          </div>

          {totalItems > 0 && (
            <Button
              variant={confirmEmpty ? 'destructive' : 'outline'}
              size="sm"
              onClick={handleEmptyTrash}
              className={confirmEmpty ? 'animate-pulse' : 'text-rose-600 border-rose-200 dark:border-rose-900'}
            >
              <Trash2 size={13} className="mr-1" />
              <span>{confirmEmpty ? 'Confirm Empty?' : 'Empty Trash'}</span>
            </Button>
          )}
        </div>
      }
    >
      {/* Tab Filters with Motion Sliding Pill */}
      <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-600">
        {(
          [
            { id: 'all', label: 'All Items', count: totalItems, icon: <Trash2 size={12} /> },
            { id: 'folders', label: 'Folders', count: deletedProjects.length, icon: <Folder size={12} /> },
            { id: 'files', label: 'Files', count: deletedSources.length, icon: <FileText size={12} /> },
          ] as Array<{ id: 'all' | 'folders' | 'files'; label: string; count: number; icon: React.ReactNode }>
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="trashTab"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/60 dark:border-slate-700 z-[-1]"
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
              <span className="text-[10px] bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.2 rounded-full text-slate-700 dark:text-slate-300 ml-0.5">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="p-6 overflow-y-auto flex-1 space-y-2 max-h-[50vh] custom-scrollbar">
        {totalItems === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-3">
              <Trash2 size={22} strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Trash Bin is Empty</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              Items you soft-delete will appear here for easy 1-click recovery.
            </p>
          </div>
        ) : (
          <>
            {/* Deleted Projects */}
            {(activeTab === 'all' || activeTab === 'folders') &&
              deletedProjects.map((p) => (
                <div
                  key={`del-proj-${p.id}`}
                  className="p-3 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70 text-amber-600 flex items-center justify-center shrink-0">
                      <Folder size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {p.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">Folder</Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{p.sources?.length || 0} files</span>
                        <span>•</span>
                        <span>{p.document?.chapters?.length || 0} chapters</span>
                        <span>•</span>
                        <span>Deleted {formatTime(p.deletedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRestoreProj(p.id, e)}
                      className="text-xs"
                    >
                      <RotateCcw size={12} className="mr-1" />
                      <span>Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onHardDeleteProject(p.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}

            {/* Deleted Sources */}
            {(activeTab === 'all' || activeTab === 'files') &&
              deletedSources.map(({ projectId, projectName, source }) => (
                <div
                  key={`del-src-${source.id}`}
                  className="p-3 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/70 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {source.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">{source.type?.toUpperCase() || 'FILE'}</Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Project: {projectName}</span>
                        <span>•</span>
                        <span>Deleted {formatTime(source.deletedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRestoreSrc(projectId, source.id, e)}
                      className="text-xs"
                    >
                      <RotateCcw size={12} className="mr-1" />
                      <span>Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onHardDeleteSource(projectId, source.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </Dialog>
  );
};

export default TrashModal;
