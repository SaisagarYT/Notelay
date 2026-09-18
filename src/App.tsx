import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { TitleBar } from './components/TitleBar';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { ConversationView } from './components/ConversationView';
import { FileViewer } from './components/FileViewer';
import { DocumentCanvas } from './components/DocumentCanvas';
import { SourceFilesModal } from './components/SourceFilesModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { ScheduledTasksModal } from './components/ScheduledTasksModal';
import { NewProjectModal } from './components/NewProjectModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { TrashModal } from './components/TrashModal';
import { OmniSearchModal } from './components/OmniSearchModal';
import { extractFlashcardsFromDocument } from './utils/flashcardExtractor';
import { exportDocumentToMarkdown } from './utils/documentGenerator';
import { MessageSquare, FileText, X } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { Conversation } from './types';

export const App: React.FC = () => {
  const {
    projects,
    activeProjectId,
    activeProject,
    activeConversation,
    activeDocument,
    sidebarOpen,
    setSidebarOpen,
    canvasOpen,
    setCanvasOpen,
    selectedModel,
    setSelectedModel,
    executionMode,
    setExecutionMode,
    settingsOpen,
    setSettingsOpen,
    historyOpen,
    setHistoryOpen,
    scheduledTasksOpen,
    setScheduledTasksOpen,
    newProjectOpen,
    setNewProjectOpen,
    sourceModalOpen,
    setSourceModalOpen,
    exportModalOpen,
    setExportModalOpen,
    trashOpen,
    setTrashOpen,
    deleteTarget,
    openDeleteConfirm,
    closeDeleteConfirm,
    totalTrashCount,
    togglePinProject,
    togglePinSource,
    softDeleteProject,
    softDeleteSource,
    restoreProject,
    restoreSource,
    hardDeleteProject,
    hardDeleteSource,
    emptyTrash,
    scheduledTasks,
    setScheduledTasks,
    availableModels,
    localLLMDiscovery,
    isDetectingModels,
    refreshLocalModels,
    storagePath,
    updateStoragePath,
    apiKeys,
    saveApiKeysConfig,
    toggleProjectExpansion,
    selectProject,
    addProject,
    clearActiveSession,
    addSourcesToActiveProject,
    openNativeFolderDialog,
    createAndSendMessage,
    activeMainView,
    setActiveMainView,
    activeSourceId,
    activeSource,
    selectSourceFile,
    openChatView,
    customizeSectionSelection,
    insertChapterAtPosition,
    deleteChapter,
    deleteSection,
    updateSectionContent,
    activeAgentRun,
    openTrainingLogsFolder,
  } = useAppStore();

  // Navigation history tracking for Back/Forward buttons
  const [navHistory, setNavHistory] = useState<string[]>([activeProjectId]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Step 5: Side-by-Side Dual Studio Workspace State
  const [isDualStudioMode, setIsDualStudioMode] = useState<boolean>(false);
  const [dualStudioRatio, setDualStudioRatio] = useState<'balanced' | 'pdf-focus' | 'notes-focus'>('balanced');
  const [canvasActiveTab, setCanvasActiveTab] = useState<'document' | 'outline' | 'flashcards' | 'graph' | 'sources' | 'activity'>('document');
  const [omniSearchOpen, setOmniSearchOpen] = useState<boolean>(false);

  const toggleDualStudioMode = useCallback(() => {
    setIsDualStudioMode((prev) => {
      const next = !prev;
      if (next) {
        setCanvasOpen(true);
        if (activeMainView !== 'file') {
          if (activeSource) {
            setActiveMainView('file');
          } else if (activeProject?.sources && activeProject.sources.length > 0) {
            selectSourceFile(activeProject.sources[0].id);
          }
        }
        if (window.innerWidth < 1360) {
          setSidebarOpen(false);
        }
      }
      return next;
    });
  }, [activeMainView, activeSource, activeProject?.sources, selectSourceFile, setActiveMainView, setCanvasOpen, setSidebarOpen]);

  const handleClipToNotebook = useCallback((text: string, sourceName: string) => {
    if (!activeDocument || !activeDocument.chapters || activeDocument.chapters.length === 0) return;
    const firstChapter = activeDocument.chapters[0];
    const firstSection = firstChapter.sections?.[0];
    const chapterId = firstChapter.id;
    const sectionId = firstSection?.id || '';

    try {
      const key = `notelay_sticky_notes_${activeDocument.id || 'default'}`;
      const saved = localStorage.getItem(key);
      const notes = saved ? JSON.parse(saved) : [];
      const newNote = {
        id: `sticky-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        chapterId,
        sectionId,
        text: `"${text.slice(0, 280)}${text.length > 280 ? '...' : ''}"\n\n— Excerpt from: ${sourceName}`,
        color: 'yellow',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      localStorage.setItem(key, JSON.stringify([...notes, newNote]));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed to save clipped note:', err);
    }

    setCanvasOpen(true);
  }, [activeDocument, setCanvasOpen]);

  // Persistent Left Sidebar Width with Drag-to-Resize
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notelay_sidebar_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 200 && val <= 460) return val;
      }
    } catch {}
    return 260;
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const isDraggingSidebarRef = useRef(false);

  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSidebar(true);
    isDraggingSidebarRef.current = true;
    window.document.body.style.cursor = 'col-resize';
    window.document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSidebarRef.current) return;
      const windowWidth = window.innerWidth;
      // Guarantee center workspace has at least 380px breathing room
      const maxAllowed = Math.max(200, Math.min(460, windowWidth - (canvasOpen ? 340 : 0) - 380));
      const clamped = Math.max(200, Math.min(maxAllowed, moveEvent.clientX));
      setSidebarWidth(clamped);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDraggingSidebar(false);
      isDraggingSidebarRef.current = false;
      window.document.body.style.cursor = '';
      window.document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const windowWidth = window.innerWidth;
      const maxAllowed = Math.max(200, Math.min(460, windowWidth - (canvasOpen ? 340 : 0) - 380));
      const clamped = Math.max(200, Math.min(maxAllowed, upEvent.clientX));
      try {
        localStorage.setItem('notelay_sidebar_width', clamped.toString());
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [canvasOpen]);

  const handleResetSidebarWidth = () => {
    setSidebarWidth(260);
    try {
      localStorage.setItem('notelay_sidebar_width', '260');
    } catch {}
  };

  // Clamp sidebar if window shrinks
  useEffect(() => {
    const handleWindowResize = () => {
      const windowWidth = window.innerWidth;
      const maxAllowed = Math.max(200, Math.min(460, windowWidth - (canvasOpen ? 340 : 0) - 380));
      setSidebarWidth((prev) => Math.max(200, Math.min(maxAllowed, prev)));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [canvasOpen]);

  const handleSelectProject = (projId: string) => {
    selectProject(projId);
    setNavHistory((prev) => [...prev.slice(0, historyIndex + 1), projId]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevProjId = navHistory[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      if (prevProjId) selectProject(prevProjId);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const nextProjId = navHistory[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      if (nextProjId) selectProject(nextProjId);
    }
  };

  // Global desktop keyboard shortcuts: Ctrl+B (sidebar), Ctrl+D (document canvas), Ctrl+N (new project)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      } else if (modKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setCanvasOpen(!canvasOpen);
      } else if (modKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setNewProjectOpen(true);
      } else if (modKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOmniSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, canvasOpen, setSidebarOpen, setCanvasOpen, setNewProjectOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#ffffff] text-[#0f172a] overflow-hidden select-none font-sans">
      {/* 1. Desktop Window Frame & Title Bar */}
      <TitleBar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewConversation={() => setNewProjectOpen(true)}
      />

      {/* 2. Top Navigation & Action Header */}
      <TopNav
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        canvasOpen={canvasOpen}
        onToggleCanvas={() => setCanvasOpen(!canvasOpen)}
        isDualStudio={isDualStudioMode}
        onToggleDualStudio={toggleDualStudioMode}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenOmniSearch={() => setOmniSearchOpen(true)}
        projectName={activeProject?.name}
        sessionTitle={activeProject?.session?.title}
        documentChapterCount={activeDocument?.chapters?.length || 0}
      />

      {/* 3. Main 3-Panel Body Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Panel 1: Left Sliding Project Tree Sidebar with Drag-to-Resize */}
        <aside
          style={{
            width: sidebarOpen ? `${sidebarWidth}px` : '0px',
          }}
          className={`h-full flex-shrink-0 flex flex-col relative z-20 select-none overflow-hidden ${
            isDraggingSidebar
              ? 'transition-none select-none'
              : 'transition-[width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'
          } ${
            sidebarOpen
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-full h-full relative">
            <Sidebar
              projects={projects}
              activeProjectId={activeProjectId}
              activeMainView={activeMainView}
              activeSourceId={activeSourceId}
              onSelectProject={handleSelectProject}
              onSelectSource={selectSourceFile}
              onOpenChat={openChatView}
              onToggleProject={toggleProjectExpansion}
              onOpenHistory={() => setHistoryOpen(true)}
              onOpenScheduledTasks={() => setScheduledTasksOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onNewProject={() => setNewProjectOpen(true)}
              onTogglePinProject={togglePinProject}
              onTogglePinSource={togglePinSource}
              onOpenDeleteConfirm={openDeleteConfirm}
              onOpenTrash={() => setTrashOpen(true)}
              totalTrashCount={totalTrashCount}
              onOpenSourceModal={() => setSourceModalOpen(true)}
              onOpenCanvas={() => setCanvasOpen(true)}
            />

            {/* Right-edge Drag-to-Resize Handle */}
            {sidebarOpen && (
              <div
                onMouseDown={startSidebarResize}
                onDoubleClick={handleResetSidebarWidth}
                title="Drag to resize sidebar (Double-click to reset to 260px)"
                className="absolute top-0 right-0 bottom-0 w-2 -mr-1 cursor-col-resize z-40 group flex items-center justify-center hover:bg-[#1a73e8]/20 transition-colors"
              >
                <div className="w-[1.5px] h-8 bg-transparent group-hover:bg-[#1a73e8] rounded-full transition-colors" />
              </div>
            )}
          </div>
        </aside>

        {/* Panel 2: Center Workspace (Seamless Switching between Chat and Embedded PDF/Document Viewer) */}
        <main className="flex-1 h-full min-w-0 overflow-hidden flex flex-col relative bg-white dark:bg-slate-950">
          {/* Top Quick-Switch Tab Bar when a source file is selected or active */}
          {activeSource && (
            <div className="h-[38px] px-3 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between select-none z-10 shrink-0">
              <div className="flex items-center gap-1 relative">
                <button
                  onClick={openChatView}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeMainView === 'chat'
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {activeMainView === 'chat' && (
                    <motion.div
                      layoutId="appQuickSwitchTab"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-200/60 dark:border-slate-700 z-[-1]"
                    />
                  )}
                  <MessageSquare size={13} className={activeMainView === 'chat' ? 'text-slate-900 dark:text-white' : 'text-slate-400'} />
                  <span>Knowledge Chat</span>
                </button>

                <button
                  onClick={() => setActiveMainView('file')}
                  className={`relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors max-w-[280px] cursor-pointer ${
                    activeMainView === 'file'
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {activeMainView === 'file' && (
                    <motion.div
                      layoutId="appQuickSwitchTab"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-2xs border border-slate-200/60 dark:border-slate-700 z-[-1]"
                    />
                  )}
                  <FileText
                    size={13}
                    className={activeMainView === 'file' ? 'text-slate-900 dark:text-white shrink-0' : 'text-slate-400 shrink-0'}
                  />
                  <span className="truncate">{activeSource.name}</span>
                </button>
              </div>

              {activeMainView === 'file' && (
                <button
                  onClick={openChatView}
                  className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close PDF view and return to chat (Esc)"
                >
                  <span>Return to Chat (Esc)</span>
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Dual-View Body Container: State-preserving concurrent mounting */}
          <div className="flex-1 relative overflow-hidden">
            {/* View A: Conversation & Prompt Workspace */}
            <div
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${
                activeMainView === 'chat'
                  ? 'opacity-100 pointer-events-auto z-10'
                  : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              <ConversationView
                conversation={activeConversation}
                projectName={activeProject?.name}
                sourcesCount={activeProject?.sources?.length || 0}
                canvasOpen={canvasOpen}
                onToggleCanvas={() => setCanvasOpen(!canvasOpen)}
                onOpenSourceModal={() => setSourceModalOpen(true)}
                onSendMessage={createAndSendMessage}
                onNewConversation={clearActiveSession}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                executionMode={executionMode}
                onSelectExecutionMode={setExecutionMode}
                availableModels={availableModels}
                isDetectingModels={isDetectingModels}
                onRefreshLocalModels={refreshLocalModels}
                onOpenSettings={() => setSettingsOpen(true)}
                activeAgentRun={activeAgentRun}
                onOpenLogsFolder={openTrainingLogsFolder}
                onOpenThinkingStudio={() => {
                  setCanvasOpen(true);
                  setCanvasActiveTab('activity');
                }}
              />
            </div>

            {/* View B: In-Place Document & PDF Viewer */}
            <div
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${
                activeMainView === 'file'
                  ? 'opacity-100 pointer-events-auto z-10'
                  : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              <FileViewer
                source={activeSource}
                projectId={activeProject.id}
                projectName={activeProject.name}
                onBackToChat={openChatView}
                onClipToNotebook={handleClipToNotebook}
                onToggleDualStudio={toggleDualStudioMode}
                isDualStudio={isDualStudioMode}
              />
            </div>
          </div>
        </main>

        {/* Panel 3: Right Collapsible Master Document Canvas */}
        <DocumentCanvas
          document={activeDocument}
          sources={activeProject.sources || []}
          projectName={activeProject.name}
          isOpen={canvasOpen}
          activeTab={canvasActiveTab}
          onTabChange={setCanvasActiveTab}
          sidebarWidth={sidebarOpen ? sidebarWidth : 0}
          onClose={() => {
            setCanvasOpen(false);
            setIsDualStudioMode(false);
          }}
          onOpenExportModal={() => setExportModalOpen(true)}
          onAddSource={() => setSourceModalOpen(true)}
          onSelectSource={(source) => {
            selectSourceFile(source.id);
            setActiveMainView('file');
          }}
          isDualStudio={isDualStudioMode}
          dualStudioRatio={dualStudioRatio}
          onSetDualStudioRatio={setDualStudioRatio}
          onRemoveSource={(sourceId) => {
            const src = activeProject.sources?.find((s) => s.id === sourceId);
            openDeleteConfirm({
              type: 'source',
              projectId: activeProject.id,
              sourceId,
              name: src?.name || 'source file',
            });
          }}
          onCustomizeSelection={customizeSectionSelection}
          onInsertPage={insertChapterAtPosition}
          onDeleteChapter={deleteChapter}
          onDeleteSection={deleteSection}
          onUpdateSectionContent={updateSectionContent}
          activeAgentRun={activeAgentRun}
          activityHistory={activeProject?.activityHistory || []}
          onOpenLogsFolder={openTrainingLogsFolder}
        />
      </div>

      {/* Modals & Dialogs */}
      <SourceFilesModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        projectName={activeProject?.name}
        projectId={activeProject?.id}
        sources={activeProject?.sources || []}
        onAddSources={addSourcesToActiveProject}
        onTogglePinSource={togglePinSource}
        onDeleteSource={openDeleteConfirm}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        document={activeDocument}
        projectName={activeProject?.name}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        availableModels={availableModels}
        localLLMDiscovery={localLLMDiscovery}
        isDetectingModels={isDetectingModels}
        onRefreshLocalModels={refreshLocalModels}
        storagePath={storagePath}
        onUpdateStoragePath={updateStoragePath}
        apiKeys={apiKeys}
        onSaveApiKeys={saveApiKeysConfig}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={projects.reduce((acc, p) => {
          if (p.session) acc[p.session.id] = p.session;
          return acc;
        }, {} as Record<string, Conversation>)}
        onSelectConversation={(id) => {
          const targetProj = projects.find((p) => p.session?.id === id);
          if (targetProj) handleSelectProject(targetProj.id);
          setHistoryOpen(false);
        }}
      />

      <ScheduledTasksModal
        isOpen={scheduledTasksOpen}
        onClose={() => setScheduledTasksOpen(false)}
        tasks={scheduledTasks}
        onAddTask={(task) => setScheduledTasks((prev) => [...prev, task])}
        onToggleTask={(id) =>
          setScheduledTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: t.status === 'Active' ? 'Paused' : 'Active' } : t))
          )
        }
        onDeleteTask={(id) => setScheduledTasks((prev) => prev.filter((t) => t.id !== id))}
        activeProjectName={activeProject?.name}
      />

      <NewProjectModal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onCreateProject={addProject}
        onBrowseFolder={openNativeFolderDialog}
      />

      {/* Delete Choice Modal (Soft vs Hard Delete) */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        target={deleteTarget}
        onClose={closeDeleteConfirm}
        onSoftDelete={(projId, srcId) => {
          if (deleteTarget?.type === 'project') {
            softDeleteProject(projId);
          } else if (srcId) {
            softDeleteSource(projId, srcId);
          }
        }}
        onHardDelete={(projId, srcId) => {
          if (deleteTarget?.type === 'project') {
            hardDeleteProject(projId);
          } else if (srcId) {
            hardDeleteSource(projId, srcId);
          }
        }}
      />

      {/* Trash Bin Manager Modal */}
      <TrashModal
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        projects={projects}
        onRestoreProject={restoreProject}
        onRestoreSource={restoreSource}
        onHardDeleteProject={hardDeleteProject}
        onHardDeleteSource={hardDeleteSource}
        onEmptyTrash={emptyTrash}
      />

      {/* Global Omni-Search Command Palette (Ctrl+K) */}
      <OmniSearchModal
        isOpen={omniSearchOpen}
        onClose={() => setOmniSearchOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        document={activeDocument}
        sources={activeProject?.sources || []}
        flashcards={activeDocument ? extractFlashcardsFromDocument(activeDocument) : []}
        stickyNotes={(() => {
          try {
            const saved = localStorage.getItem(`notelay_sticky_notes_${activeDocument?.id || 'default'}`);
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        })()}
        onJumpToChapter={(chapNum) => {
          setCanvasOpen(true);
          setCanvasActiveTab('document');
          setTimeout(() => {
            window.document.getElementById(`chapter-${chapNum}`)?.scrollIntoView({ behavior: 'smooth' });
          }, 120);
        }}
        onJumpToSection={(secId) => {
          setCanvasOpen(true);
          setCanvasActiveTab('document');
          setTimeout(() => {
            window.document.getElementById(`sec-${secId}`)?.scrollIntoView({ behavior: 'smooth' });
          }, 120);
        }}
        onOpenDualStudio={toggleDualStudioMode}
        onOpenExportModal={() => setExportModalOpen(true)}
        onQuickDownloadMarkdown={() => {
          if (!activeDocument) return;
          const md = exportDocumentToMarkdown(activeDocument);
          const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = `${(activeProject?.name || 'notes').toLowerCase().replace(/[^a-z0-9]/g, '-')}-master-notes.md`;
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }}
        onOpenAudioPlayer={() => {
          setCanvasOpen(true);
          setCanvasActiveTab('document');
        }}
        onOpenFlashcards={() => {
          setCanvasOpen(true);
          setCanvasActiveTab('flashcards');
        }}
        onSelectSource={(source) => {
          selectSourceFile(source.id);
          setActiveMainView('file');
        }}
        onAddSource={() => setSourceModalOpen(true)}
      />
    </div>
  );
};

export default App;

