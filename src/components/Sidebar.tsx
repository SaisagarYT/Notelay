import React, { useState } from 'react';
import {
  Plus,
  History,
  Clock,
  Folder,
  FolderOpen,
  FolderPlus,
  Filter,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Trash2,
  BookOpen,
  MessageSquare,
  FileCode,
  FileText,
  Pin,
  PinOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';
import { Button } from './ui/button';
import { Icon } from '@iconify/react';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string;
  activeMainView?: 'chat' | 'file';
  activeSourceId?: string | null;
  onSelectProject: (projectId: string) => void;
  onSelectSource?: (sourceId: string, projectId: string) => void;
  onOpenChat?: () => void;
  onToggleProject: (projectId: string) => void;
  onOpenHistory: () => void;
  onOpenScheduledTasks: () => void;
  onOpenSettings: () => void;
  onNewProject: () => void;
  onTogglePinProject: (projectId: string) => void;
  onTogglePinSource: (projectId: string, sourceId: string) => void;
  onOpenDeleteConfirm: (target: {
    type: 'project' | 'source';
    projectId: string;
    sourceId?: string;
    name: string;
  }) => void;
  onOpenTrash: () => void;
  totalTrashCount: number;
  onOpenSourceModal?: () => void;
  onOpenCanvas?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  activeMainView = 'chat',
  activeSourceId = null,
  onSelectProject,
  onSelectSource,
  onOpenChat,
  onToggleProject,
  onOpenHistory,
  onOpenScheduledTasks,
  onOpenSettings,
  onNewProject,
  onTogglePinProject,
  onTogglePinSource,
  onOpenDeleteConfirm,
  onOpenTrash,
  totalTrashCount,
  onOpenSourceModal,
  onOpenCanvas,
}) => {
  const [viewMode, setViewMode] = useState<'all' | 'recent'>('all');
  const [filterActive, setFilterActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Only non-deleted items belong in active workspace view
  const activeProjects = projects.filter((p) => !p.isDeleted);

  // Gather pinned projects and files
  const pinnedProjects = activeProjects.filter((p) => p.isPinned);
  const pinnedSources: Array<{ projectId: string; projectName: string; source: any }> = [];
  activeProjects.forEach((p) => {
    (p.sources || []).forEach((s) => {
      if (!s.isDeleted && s.isPinned) {
        pinnedSources.push({
          projectId: p.id,
          projectName: p.name,
          source: s,
        });
      }
    });
  });
  const hasPinnedItems = pinnedProjects.length > 0 || pinnedSources.length > 0;

  // Process project list according to view mode (all vs recent) and search
  let displayProjects = [...activeProjects];
  if (viewMode === 'recent') {
    displayProjects.sort((a, b) => {
      const timeA = new Date(a.lastAccessedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastAccessedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }

  if (searchTerm.trim()) {
    const query = searchTerm.toLowerCase();
    displayProjects = displayProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sources?.some((s) => !s.isDeleted && s.name.toLowerCase().includes(query)) ||
        p.session?.title?.toLowerCase().includes(query)
    );
  }

  return (
    <aside className="w-full h-full flex flex-col bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800/80 text-[13px] select-none shrink-0 transition-colors overflow-hidden">
      {/* Top Action Header: New Conversation Button */}
      <div className="p-3 pb-1.5">
        <Button
          variant="default"
          onClick={onNewProject}
          className="w-full justify-center gap-2 py-2 h-9 text-[13px] font-medium shadow-xs"
        >
          <Icon icon="solar:add-circle-bold" className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Main Navigation Items */}
      <div className="px-2.5 py-1 space-y-0.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenHistory}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-normal transition-colors text-left"
        >
          <History size={15} strokeWidth={1.8} className="text-slate-500" />
          <span>Knowledge History</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenScheduledTasks}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-normal transition-colors text-left"
        >
          <Clock size={15} strokeWidth={1.8} className="text-slate-500" />
          <span>Scheduled Tasks</span>
        </motion.button>
      </div>

      {/* View Switcher: All Projects vs Recent with Motion Sliding Pill */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg text-[11.5px] font-medium text-slate-600 dark:text-slate-400 relative">
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 py-1 px-2 rounded-md transition-colors relative z-10 flex items-center justify-center gap-1 cursor-pointer ${
              viewMode === 'all'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {viewMode === 'all' && (
              <motion.div
                layoutId="sidebarActiveTab"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs z-[-1] border border-slate-200/60 dark:border-slate-600/60"
              />
            )}
            <Folder size={11} />
            <span>All Folders</span>
          </button>
          <button
            onClick={() => setViewMode('recent')}
            className={`flex-1 py-1 px-2 rounded-md transition-colors relative z-10 flex items-center justify-center gap-1 cursor-pointer ${
              viewMode === 'recent'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {viewMode === 'recent' && (
              <motion.div
                layoutId="sidebarActiveTab"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-xs z-[-1] border border-slate-200/60 dark:border-slate-600/60"
              />
            )}
            <Clock size={11} />
            <span>Recent</span>
          </button>
        </div>
      </div>

      {/* Projects Section Header & Search */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-slate-500">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {viewMode === 'recent' ? 'Recently Accessed' : 'Project Folders'}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setFilterActive(!filterActive)}
            title="Filter folders and files"
            className={`p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors ${
              filterActive ? 'text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800' : 'text-slate-500'
            }`}
          >
            <Filter size={12} strokeWidth={1.8} />
          </button>
          <button
            onClick={onNewProject}
            title="New Project Folder"
            className="p-1 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <FolderPlus size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Filter Search Input with AnimatePresence */}
      <AnimatePresence>
        {filterActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 pb-2 pt-0.5 overflow-hidden"
          >
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search folders & files..."
                className="w-full pl-7 pr-7 py-1 text-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200 shadow-xs"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-700"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Tree Container */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1 custom-scrollbar">
        {/* Pinned Section */}
        {hasPinnedItems && !searchTerm && (
          <div className="mb-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            <div className="px-2 py-0.5 text-[10.5px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
              <Pin size={10} className="rotate-45" />
              <span>Pinned Favorites</span>
            </div>

            {pinnedProjects.map((p) => {
              const isSelected = activeProjectId === p.id && activeMainView === 'chat';
              return (
                <div
                  key={`pin-proj-${p.id}`}
                  onClick={() => {
                    onSelectProject(p.id);
                    onOpenChat?.();
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group text-[12.5px] ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinProject(p.id);
                    }}
                    title="Unpin project"
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-opacity"
                  >
                    <PinOff size={11} />
                  </button>
                </div>
              );
            })}

            {pinnedSources.map(({ projectId, projectName, source }) => {
              const isSelected =
                activeProjectId === projectId &&
                activeSourceId === source.id &&
                activeMainView === 'file';
              return (
                <div
                  key={`pin-src-${source.id}`}
                  onClick={() => onSelectSource?.(source.id, projectId)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group text-[12.5px] ${
                    isSelected
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText size={13} className="text-rose-500 shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{source.name}</span>
                      <span className="text-[10px] text-slate-400 truncate">{projectName}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinSource(projectId, source.id);
                    }}
                    title="Unpin file"
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-opacity"
                  >
                    <PinOff size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Project Folders */}
        {displayProjects.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs">
            {searchTerm ? 'No matching projects or files' : 'No project folders yet'}
          </div>
        ) : (
          displayProjects.map((project) => {
            const isSelectedProject = activeProjectId === project.id;
            const sources = (project.sources || []).filter((s) => !s.isDeleted);
            const sourcesCount = sources.length;
            const chapterCount = project.document?.chapters?.length || 0;

            return (
              <div key={project.id} className="space-y-0.5">
                {/* Project Header Item */}
                <div
                  onClick={() => onSelectProject(project.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all group ${
                    isSelectedProject
                      ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-2xs'
                      : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleProject(project.id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-transform"
                    >
                      {project.isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>

                    {project.isExpanded ? (
                      <FolderOpen size={14} className="text-blue-500 shrink-0" />
                    ) : (
                      <Folder size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    )}

                    <span className="truncate text-[12.5px]">{project.name}</span>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinProject(project.id);
                      }}
                      title={project.isPinned ? 'Unpin Folder' : 'Pin Folder to Top'}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-black/5"
                    >
                      <Pin size={11} className={project.isPinned ? 'rotate-45 text-blue-600' : ''} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDeleteConfirm({
                          type: 'project',
                          projectId: project.id,
                          name: project.name,
                        });
                      }}
                      title="Delete Folder"
                      className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-black/5"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Expanded Folder Contents with Motion Accordion */}
                <AnimatePresence>
                  {project.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="pl-5 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-3.5 my-0.5 overflow-hidden"
                    >
                      {/* Active Chat Session */}
                      <div
                        onClick={() => {
                          onSelectProject(project.id);
                          onOpenChat?.();
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-[12px] transition-all group ${
                          isSelectedProject && activeMainView === 'chat'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs border border-slate-200/80 dark:border-slate-700'
                            : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <MessageSquare size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                          <span className="truncate">
                            {project.session?.title || 'Knowledge Chat'}
                          </span>
                        </div>
                      </div>

                      {/* Source Files list */}
                      {sources.map((source) => {
                        const isSelectedSource =
                          isSelectedProject &&
                          activeSourceId === source.id &&
                          activeMainView === 'file';
                        const isPdf = source.type === 'pdf' || source.name.toLowerCase().endsWith('.pdf');

                        return (
                          <div
                            key={source.id}
                            onClick={() => onSelectSource?.(source.id, project.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-[12px] transition-all group ${
                              isSelectedSource
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs border border-slate-200/80 dark:border-slate-700'
                                : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isPdf ? (
                                <FileText size={12} className="text-rose-500 shrink-0" />
                              ) : (
                                <FileCode size={12} className="text-slate-500 shrink-0" />
                              )}
                              <span className="truncate">{source.name}</span>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePinSource(project.id, source.id);
                                }}
                                title="Pin File"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-black/5"
                              >
                                <Pin size={10} className={source.isPinned ? 'rotate-45 text-blue-600' : ''} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDeleteConfirm({
                                    type: 'source',
                                    projectId: project.id,
                                    sourceId: source.id,
                                    name: source.name,
                                  });
                                }}
                                title="Delete File"
                                className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-black/5"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Clean secondary links */}
                      <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(project.id);
                            onOpenCanvas?.();
                          }}
                          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          title="Open Master Document Canvas"
                        >
                          <BookOpen size={11} className="text-slate-400" />
                          <span>{chapterCount} chapters</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(project.id);
                            onOpenSourceModal?.();
                          }}
                          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          title="Add/Manage Knowledge Sources"
                        >
                          <Plus size={11} className="text-slate-400" />
                          <span>Sources ({sourcesCount})</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Bar: Trash Bin & Settings */}
      <div className="p-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 space-y-0.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenTrash}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-normal transition-colors text-left group"
        >
          <div className="flex items-center gap-2.5">
            <Trash2
              size={15}
              strokeWidth={1.8}
              className={`transition-colors ${
                totalTrashCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
              }`}
            />
            <span>Trash Bin</span>
          </div>
          {totalTrashCount > 0 && (
            <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              {totalTrashCount}
            </span>
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-normal transition-colors text-left"
        >
          <Settings size={15} strokeWidth={1.8} className="text-slate-500" />
          <span>Settings</span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;
