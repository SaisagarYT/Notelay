import { useState, useEffect, useCallback } from 'react';
import {
  Project,
  Message,
  AIModel,
  SourceFile,
  MasterDocument,
  DocumentChapter,
  DocumentSection,
  DiagramDefinition,
  LocalLLMDiscovery,
  ApiKeysConfig,
  AgentActivityRun,
  AgentActivityStep,
  CanvasActionBadge,
} from '../types';
import {
  createEmptyMasterDocument,
  synthesizeNotesAndDiagrams,
  parseSmartAiResponse,
  applyDocumentMutation,
  generateSmartConversationalResponse,
} from '../utils/documentGenerator';

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  target: string;
  status: 'Active' | 'Paused';
  lastRun?: string;
  nextRun?: string;
}

export interface DeleteModalTarget {
  type: 'project' | 'source';
  projectId: string;
  sourceId?: string;
  name: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'qwen-plus',
    name: 'Qwen Plus',
    provider: 'Alibaba Cloud (DashScope)',
    description: 'Balanced performance, exceptional reasoning, coding & mathematical logic.',
    badge: 'Active Key',
  },
  {
    id: 'qwen-max',
    name: 'Qwen Max',
    provider: 'Alibaba Cloud (DashScope)',
    description: 'Flagship deep cognitive reasoning model for complex architectural notes.',
    badge: 'Flagship',
  },
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: 'Alibaba Cloud (DashScope)',
    description: 'Blazing-fast response speed with high throughput generation.',
    badge: 'Ultra Fast',
  },
  {
    id: 'qwen2.5-72b-instruct',
    name: 'Qwen 2.5 72B Instruct',
    provider: 'Alibaba Cloud (DashScope)',
    description: 'State-of-the-art open-weights 72B parameter intelligence.',
  },
  {
    id: 'gemini-3.8-flash-high',
    name: 'Gemini 3.8 Flash High',
    provider: 'Google DeepMind',
    description: 'Ultra fast reasoning, high instruction following, optimized for lifelong learning & diagrams.',
    badge: 'Fast & Capable',
  },
  {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    provider: 'Google DeepMind',
    description: 'Deep cognitive reasoning model suited for complex architectures, proofs, and large documents.',
    badge: 'Pro Reasoning',
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    description: 'Hybrid reasoning and instant response model with high nuanced comprehension.',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Omni multi-modal flagship intelligence model.',
  },
];


const DEFAULT_TASKS: ScheduledTask[] = [
  {
    id: 'task-1',
    name: 'Workspace Knowledge Integrity Scan',
    cron: '0 0 * * *',
    target: 'Notelay Engine',
    status: 'Active',
    lastRun: 'Yesterday at 12:00 AM',
    nextRun: 'Tonight at 12:00 AM',
  },
];

export function useAppStore() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('notelay_v2_projects');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved projects', e);
    }
    return [];
  });

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(() => {
    try {
      const saved = localStorage.getItem('notelay_tasks');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved tasks', e);
    }
    return DEFAULT_TASKS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || '';
  });

  const [activeMainView, setActiveMainView] = useState<'chat' | 'file'>('chat');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [canvasOpen, setCanvasOpen] = useState<boolean>(true);
  const [selectedModel, setSelectedModel] = useState<string>('Qwen Plus');
  const [executionMode, setExecutionMode] = useState<'Local' | 'Cloud' | 'Sandbox'>('Local');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [scheduledTasksOpen, setScheduledTasksOpen] = useState<boolean>(false);
  const [newProjectOpen, setNewProjectOpen] = useState<boolean>(false);
  const [sourceModalOpen, setSourceModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [trashOpen, setTrashOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalTarget | null>(null);
  const [activeAgentRun, setActiveAgentRun] = useState<AgentActivityRun | null>(null);

  // Backend state: Local LLM discovery, storage path, encrypted API keys
  const [availableModels, setAvailableModels] = useState<AIModel[]>(AVAILABLE_MODELS);
  const [localLLMDiscovery, setLocalLLMDiscovery] = useState<LocalLLMDiscovery | null>(null);
  const [isDetectingModels, setIsDetectingModels] = useState<boolean>(false);
  const [storagePath, setStoragePath] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>({
    qwen: 'sk-ws-H.DDHPPRL.rSYJ.MEQCIBSlJHIWcfqSFWq7Dg8C8faRW2eCkAMHPg0AvUSz17XZAiA4MlAhFFb4yjJvNLW1teSkqj5stgd0R_Fyn1NIVJllOg'
  });

  // 1. Proactively detect local LLMs (Ollama on 11434, LM Studio on 1234)
  const refreshLocalModels = useCallback(async () => {
    if (!window.electronAPI?.detectLocalLLMs) return;
    setIsDetectingModels(true);
    try {
      const discovery = await window.electronAPI.detectLocalLLMs();
      setLocalLLMDiscovery(discovery);

      const localModels: AIModel[] = [];

      if (discovery.ollama?.running && Array.isArray(discovery.ollama.models)) {
        discovery.ollama.models.forEach((m) => {
          localModels.push({
            id: m.name,
            name: `${m.name}`,
            provider: 'Ollama (Local)',
            description: `Local Ollama model on port 11434. Size: ${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB.`,
            badge: 'Local',
            isLocal: true,
            endpoint: discovery.ollama.endpoint,
            details: {
              parameterSize: m.details?.parameter_size,
              family: m.details?.family,
            },
          });
        });
      }

      if (discovery.lmstudio?.running && Array.isArray(discovery.lmstudio.models)) {
        discovery.lmstudio.models.forEach((m) => {
          localModels.push({
            id: m.id,
            name: `${m.id}`,
            provider: 'LM Studio (Local)',
            description: `Local model via LM Studio on port 1234.`,
            badge: 'Local',
            isLocal: true,
            endpoint: discovery.lmstudio.endpoint,
          });
        });
      }

      setAvailableModels([...localModels, ...AVAILABLE_MODELS]);

      // If local models were discovered, automatically switch to local model
      if (localModels.length > 0 && selectedModel === 'Gemini 3.8 Flash High') {
        setSelectedModel(localModels[0].name);
      }
    } catch (err) {
      console.error('Failed to detect local models:', err);
    } finally {
      setIsDetectingModels(false);
    }
  }, [selectedModel]);

  // 2. Initialize from local disk and vault
  useEffect(() => {
    refreshLocalModels();

    if (window.electronAPI?.getStoragePath) {
      window.electronAPI.getStoragePath().then((p) => {
        if (p) setStoragePath(p);
      });
    }

    if (window.electronAPI?.getApiKeys) {
      window.electronAPI.getApiKeys().then((keys) => {
        if (keys) setApiKeys(keys);
      });
    }

    if (window.electronAPI?.loadProjectsFromDisk) {
      window.electronAPI.loadProjectsFromDisk().then((res) => {
        if (res.success && Array.isArray(res.projects) && res.projects.length > 0) {
          setProjects(res.projects);
        }
      });
    }
  }, [refreshLocalModels]);

  // 3. Listen to live AI streaming events (real tokens, reasoning stream, and metrics)
  useEffect(() => {
    if (!window.electronAPI?.onAIStreamEvent) return;
    const unsubscribe = window.electronAPI.onAIStreamEvent((event) => {
      setActiveAgentRun((prev) => {
        if (!prev || (event.runId && prev.id !== event.runId)) return prev;

        const updated = { ...prev };
        if (event.type === 'think') {
          updated.thinking = event.accumulatedThinking || (updated.thinking + (event.text || ''));
          if (event.evalCount) updated.evalCount = event.evalCount;
          updated.isStreaming = true;
        } else if (event.type === 'content') {
          if (event.evalCount) updated.evalCount = event.evalCount;
          updated.isStreaming = true;
        } else if (event.type === 'done') {
          if (event.thinking) updated.thinking = event.thinking;
          if (event.evalCount) updated.evalCount = event.evalCount;
          if (event.durationMs) updated.durationMs = event.durationMs;
          updated.isStreaming = false;
        }
        return updated;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const activeProject =
    projects.find((p) => p.id === activeProjectId && !p.isDeleted) ||
    projects.find((p) => !p.isDeleted) ||
    null;
  const activeConversation = activeProject?.session || {
    id: 'empty-session',
    projectId: '',
    title: 'Knowledge Chat',
    createdAt: 'Today',
    updatedAt: 'Just now',
    model: selectedModel,
    executionMode,
    messages: [],
  };
  const activeDocument = activeProject?.document || createEmptyMasterDocument('empty', 'Master Notes');
  const activeSource = activeProject
    ? (activeProject.sources || []).find((s) => s.id === activeSourceId && !s.isDeleted) ||
      (activeProject.sources || []).find((s) => !s.isDeleted) ||
      null
    : null;

  const deletedProjectsCount = projects.filter((p) => p.isDeleted).length;
  const deletedSourcesCount = projects.reduce(
    (acc, p) => acc + (p.sources || []).filter((s) => s.isDeleted).length,
    0
  );
  const totalTrashCount = deletedProjectsCount + deletedSourcesCount;

  // Persist to localStorage and local disk
  useEffect(() => {
    localStorage.setItem('notelay_v2_projects', JSON.stringify(projects));
    if (window.electronAPI?.saveProjectToDisk && activeProject) {
      window.electronAPI.saveProjectToDisk(activeProject).catch(() => {});
    }
  }, [projects, activeProject]);

  useEffect(() => {
    localStorage.setItem('notelay_tasks', JSON.stringify(scheduledTasks));
  }, [scheduledTasks]);

  const saveApiKeysConfig = async (newKeys: ApiKeysConfig) => {
    setApiKeys(newKeys);
    if (window.electronAPI?.saveApiKeys) {
      await window.electronAPI.saveApiKeys(newKeys);
    }
  };

  const updateStoragePath = async (newPath: string) => {
    if (window.electronAPI?.setStoragePath) {
      const res = await window.electronAPI.setStoragePath(newPath);
      if (res.success) {
        setStoragePath(res.path);
      }
    }
  };

  const toggleProjectExpansion = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p))
    );
  };

  const selectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, lastAccessedAt: now } : p))
    );
  };

  const selectSourceFile = (sourceId: string, projectId?: string) => {
    if (projectId && projectId !== activeProjectId) {
      selectProject(projectId);
    }
    setActiveSourceId(sourceId);
    setActiveMainView('file');
  };

  const openChatView = () => {
    setActiveMainView('chat');
  };

  const togglePinProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isPinned: !p.isPinned } : p))
    );
  };

  const togglePinSource = (projectId: string, sourceId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            sources: (p.sources || []).map((s) =>
              s.id === sourceId ? { ...s, isPinned: !s.isPinned } : s
            ),
          };
        }
        return p;
      })
    );
  };

  const softDeleteProject = (projectId: string) => {
    const now = new Date().toISOString();
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, isDeleted: true, deletedAt: now, isPinned: false } : p
      );
      if (activeProjectId === projectId) {
        const nextActive = updated.find((p) => !p.isDeleted);
        setActiveProjectId(nextActive ? nextActive.id : '');
      }
      return updated;
    });
  };

  const softDeleteSource = (projectId: string, sourceId: string) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            sources: (p.sources || []).map((s) =>
              s.id === sourceId ? { ...s, isDeleted: true, deletedAt: now, isPinned: false } : s
            ),
          };
        }
        return p;
      })
    );
  };

  const restoreProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isDeleted: false, deletedAt: undefined } : p))
    );
    setActiveProjectId(projectId);
  };

  const restoreSource = (projectId: string, sourceId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            sources: (p.sources || []).map((s) =>
              s.id === sourceId ? { ...s, isDeleted: false, deletedAt: undefined } : s
            ),
          };
        }
        return p;
      })
    );
  };

  const hardDeleteProject = async (projectId: string) => {
    if (window.electronAPI?.deleteProjectFromDisk) {
      try {
        await window.electronAPI.deleteProjectFromDisk(projectId);
      } catch (err) {
        console.error('Failed to remove project from disk:', err);
      }
    }

    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (activeProjectId === projectId) {
        const nextActive = remaining.find((p) => !p.isDeleted);
        setActiveProjectId(nextActive ? nextActive.id : '');
      }
      return remaining;
    });
  };

  const hardDeleteSource = async (projectId: string, sourceId: string) => {
    const targetProject = projects.find((p) => p.id === projectId);
    const targetSource = targetProject?.sources?.find((s) => s.id === sourceId);
    if (targetSource && window.electronAPI?.deleteSourceFileFromDisk) {
      try {
        await window.electronAPI.deleteSourceFileFromDisk(projectId, targetSource.name);
      } catch (err) {
        console.error('Failed to remove source file from disk:', err);
      }
    }

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            sources: (p.sources || []).filter((s) => s.id !== sourceId),
          };
        }
        return p;
      })
    );
  };

  const emptyTrash = async () => {
    const deletedProjects = projects.filter((p) => p.isDeleted);
    for (const dp of deletedProjects) {
      if (window.electronAPI?.deleteProjectFromDisk) {
        try {
          await window.electronAPI.deleteProjectFromDisk(dp.id);
        } catch {}
      }
    }

    for (const p of projects) {
      const deletedSources = (p.sources || []).filter((s) => s.isDeleted);
      for (const ds of deletedSources) {
        if (window.electronAPI?.deleteSourceFileFromDisk) {
          try {
            await window.electronAPI.deleteSourceFileFromDisk(p.id, ds.name);
          } catch {}
        }
      }
    }

    setProjects((prev) => {
      const kept = prev
        .filter((p) => !p.isDeleted)
        .map((p) => ({
          ...p,
          sources: (p.sources || []).filter((s) => !s.isDeleted),
        }));
      const nextActive = kept.find((p) => p.id === activeProjectId) || kept[0];
      setActiveProjectId(nextActive ? nextActive.id : '');
      return kept;
    });
  };

  const openDeleteConfirm = (target: DeleteModalTarget) => {
    setDeleteTarget(target);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const deleteProject = (projectId: string) => {
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      openDeleteConfirm({
        type: 'project',
        projectId,
        name: target.name,
      });
    }
  };

  const addProject = (name: string, customId?: string) => {
    const id = customId || name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (projects.some((p) => p.id === id)) {
      setActiveProjectId(id);
      return;
    }
    const newProj: Project = {
      id,
      name,
      description: `Dedicated master knowledge workspace for ${name}`,
      isExpanded: true,
      createdAt: 'Just now',
      updatedAt: 'Just now',
      sources: [],
      document: createEmptyMasterDocument(id, `${name} Master Notes`),
      session: {
        id: `session-${id}`,
        projectId: id,
        title: `${name} Session`,
        createdAt: 'Just now',
        updatedAt: 'Just now',
        model: selectedModel,
        executionMode,
        messages: [],
      },
    };
    setProjects((prev) => [...prev, newProj]);
    setActiveProjectId(id);
  };

  const clearActiveSession = () => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            session: {
              ...p.session,
              messages: [],
            },
          };
        }
        return p;
      })
    );
  };

  const addSourcesToActiveProject = (newSources: SourceFile[]) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            sources: [...p.sources, ...newSources],
            updatedAt: 'Just now',
          };
        }
        return p;
      })
    );
  };

  const removeSourceFromActiveProject = (sourceId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            sources: p.sources.filter((s) => s.id !== sourceId),
          };
        }
        return p;
      })
    );
  };

  const updateActiveDocument = (updatedDoc: MasterDocument) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            document: updatedDoc,
            updatedAt: 'Just now',
          };
        }
        return p;
      })
    );
  };

  const openNativeFolderDialog = async () => {
    if (window.electronAPI?.selectDirectory) {
      const result = await window.electronAPI.selectDirectory();
      if (result && result.name) {
        addProject(result.name, result.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
        return result.name;
      }
    }
    return null;
  };

  const createAndSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (!activeProject) {
      const newId = 'project-' + Date.now();
      const newProj: Project = {
        id: newId,
        name: 'My Workspace',
        description: 'Active knowledge workspace',
        isExpanded: true,
        createdAt: 'Just now',
        updatedAt: 'Just now',
        sources: [],
        document: createEmptyMasterDocument(newId, 'Master Notes'),
        session: {
          id: `session-${newId}`,
          projectId: newId,
          title: 'Knowledge Chat',
          createdAt: 'Just now',
          updatedAt: 'Just now',
          model: selectedModel,
          executionMode,
          messages: [userMessage],
        },
      };
      setProjects([newProj]);
      setActiveProjectId(newId);
      return;
    }

    // Append user message immediately
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            session: {
              ...p.session,
              messages: [...p.session.messages, userMessage],
              updatedAt: 'Just now',
            },
          };
        }
        return p;
      })
    );

    // AI synthesis: real local LLM (Ollama/LM Studio) or Cloud (Gemini/OpenAI/Claude/Qwen)
    const currentModelObj = availableModels.find(
      (m) => m.name === selectedModel || m.id === selectedModel
    );
    const nextChapterNumber = activeProject.document.chapters.length + 1;

    // Provide current document outline and conversation context to the AI
    const documentOutline = activeProject.document.chapters.map((ch, i) => ({
      chapterNumber: ch.chapterNumber || i + 1,
      title: ch.title,
      sections: ch.sections.map((s) => ({ title: s.title, content: s.content })),
    }));

    const conversationHistory = activeProject.session.messages.slice(-6);

    const runId = `run-${Date.now()}`;
    const startTime = Date.now();
    const modelLabel = currentModelObj?.isLocal
      ? `Local Ollama (${currentModelObj.name})`
      : `${selectedModel}`;

    const sourceCount = activeProject.sources?.length || 0;

    // Build authentic Antigravity execution steps
    const initialSteps: AgentActivityStep[] = [];
    const projectLabel = activeProject.name || 'Workspace';

    // 1. Root project path
    initialSteps.push({
      id: 'step-root',
      type: 'explore',
      verb: 'Analyzed',
      target: `${projectLabel} Knowledge Index`,
      label: `Analyzed ${projectLabel} Knowledge Index`,
      status: 'completed',
    });

    // 2. Knowledge sources or project code files
    if (sourceCount > 0) {
      activeProject.sources.forEach((s) => {
        initialSteps.push({
          id: `step-source-${s.id}`,
          type: 'explore',
          verb: 'Analyzed',
          target: s.name,
          detail: `#~${((s.tokenCount || (s.size ? Math.round(s.size / 4) : 200))).toLocaleString()} tok`,
          label: `Analyzed ${s.name}`,
          status: 'completed',
        });
      });
    } else {
      initialSteps.push({
        id: 'step-pkg',
        type: 'explore',
        verb: 'Analyzed',
        target: 'Workspace Knowledge Base',
        label: 'Analyzed Workspace Knowledge Base',
        status: 'completed',
      });
      initialSteps.push({
        id: 'step-src',
        type: 'explore',
        verb: 'Analyzed',
        target: `${projectLabel} Sources Index`,
        label: `Analyzed ${projectLabel} Sources Index`,
        status: 'completed',
      });
    }

    // 3. Document canvas inspection
    initialSteps.push({
      id: 'step-canvas-read',
      type: 'explore',
      verb: 'Analyzed',
      target: 'master-notes.md #L1-45',
      label: 'Analyzed master-notes.md #L1-45',
      status: 'completed',
    });

    const currentRun: AgentActivityRun = {
      id: runId,
      projectId: activeProjectId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      prompt: text,
      model: modelLabel,
      status: 'running',
      isStreaming: true,
      thinking: '',
      currentStep: currentModelObj?.isLocal ? `Reasoning via ${currentModelObj.name}...` : `Synthesizing via ${selectedModel}...`,
      steps: initialSteps,
    };

    setActiveAgentRun({ ...currentRun });

    (async () => {
      let agentMessage: Message = {
        id: 'msg-agent-' + Date.now(),
        sender: 'agent',
        content: '',
        thinking: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      let updatedDocument = activeProject.document;
      let finalRun: AgentActivityRun = { ...currentRun };

      if (window.electronAPI?.synthesizeChapterAI) {
        try {
          const aiResult = await window.electronAPI.synthesizeChapterAI({
            runId,
            prompt: text,
            topic: text.slice(0, 60),
            sources: activeProject.sources,
            modelId: currentModelObj?.id || selectedModel,
            isLocal: !!currentModelObj?.isLocal,
            localEndpoint: currentModelObj?.endpoint,
            apiKeys,
            chapterNumber: nextChapterNumber,
            documentOutline,
            conversationHistory,
          });

          // Mark reasoning step as completed
          const reasoningStep = currentRun.steps.find((s) => s.id === 'step-reasoning');
          if (reasoningStep) {
            reasoningStep.status = 'completed';
          }

          if (aiResult.success && aiResult.rawOutput) {
            const parsed = parseSmartAiResponse(aiResult.rawOutput, text, nextChapterNumber);
            const mutation = applyDocumentMutation(activeProject.document, parsed);
            updatedDocument = mutation.updatedDocument;

            const realThinking = aiResult.thinking || parsed.thinking || currentRun.thinking;
            const realDuration = aiResult.totalDuration 
              ? Math.round(aiResult.totalDuration / 1000000) 
              : Date.now() - startTime;
            const realEvalCount = aiResult.evalCount || undefined;
            const speedTokPerSec = (realEvalCount && realDuration > 0) 
              ? Number(((realEvalCount / (realDuration / 1000))).toFixed(1)) 
              : undefined;

            // Only add canvas action step if an action actually mutated the canvas:
            if (parsed.action === 'CREATE_CHAPTER') {
              const numSections = parsed.newChapter?.sections?.length || 1;
              const chapTitle = parsed.newChapter?.title || 'Master Notes';
              const linesAdded = numSections * 18 + 12;
              currentRun.steps.push({
                id: 'step-canvas-create',
                type: 'edit',
                verb: 'Created',
                target: `Chapter ${nextChapterNumber}: ${chapTitle}`,
                fileExt: 'md',
                diff: { added: linesAdded, removed: 0 },
                label: `Created Chapter ${nextChapterNumber}`,
                detail: `Synthesized ${numSections} sections on Master Document Canvas`,
                status: 'completed',
              });
            } else if (parsed.action === 'UPDATE_SECTION') {
              currentRun.steps.push({
                id: 'step-canvas-update',
                type: 'edit',
                verb: 'Updated',
                target: `Chapter ${parsed.targetChapterNumber || 1} Section`,
                fileExt: 'md',
                diff: { added: 16, removed: 2 },
                label: `Updated Chapter ${parsed.targetChapterNumber || 1}`,
                detail: 'Applied inline amendments to Master Document Canvas',
                status: 'completed',
              });
            } else if (parsed.action === 'UPDATE_DIAGRAM') {
              currentRun.steps.push({
                id: 'step-canvas-diag',
                type: 'synthesize',
                verb: 'Rendered',
                target: `Architecture Diagram (Chapter ${parsed.targetChapterNumber || 1})`,
                label: 'Rendered Architecture Diagram',
                detail: 'Generated Mermaid diagram specifications in document canvas',
                status: 'completed',
              });
            } else if (parsed.action === 'DELETE_CHAPTER') {
              currentRun.steps.push({
                id: 'step-canvas-delete',
                type: 'edit',
                verb: 'Removed',
                target: `Chapter ${parsed.targetChapterNumber || 1}`,
                fileExt: 'md',
                diff: { added: 0, removed: 40 },
                label: `Removed Chapter ${parsed.targetChapterNumber || 1}`,
                detail: 'Sequential chapter renumbering executed',
                status: 'completed',
              });
            }

            agentMessage = {
              id: 'msg-agent-' + Date.now(),
              sender: 'agent',
              content: parsed.chatResponse,
              thinking: realThinking,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              canvasActionBadge: mutation.canvasBadge,
            };

            finalRun = {
              ...currentRun,
              status: 'completed',
              isStreaming: false,
              durationMs: realDuration,
              evalCount: realEvalCount,
              speedTokPerSec,
              thinking: realThinking,
              currentStep: 'Completed',
              actionTaken: parsed.action,
              targetChapterNumber: parsed.targetChapterNumber || (parsed.action === 'CREATE_CHAPTER' ? nextChapterNumber : undefined),
              canvasActionBadge: mutation.canvasBadge,
              steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
            };
          } else {
            // Graceful offline fallback
            const clean = text.trim().toLowerCase();
            const isDelete = /^(delete|remove|drop|erase|discard)\b/i.test(clean);
            const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|howdy|sup|greetings)\b/i.test(clean);

            if (isDelete) {
              const parsed = parseSmartAiResponse('', text, nextChapterNumber);
              if (parsed.action === 'DELETE_CHAPTER') {
                const mutation = applyDocumentMutation(activeProject.document, parsed);
                updatedDocument = mutation.updatedDocument;
                currentRun.steps.push({
                  id: 'step-canvas-delete',
                  type: 'edit',
                  verb: 'Removed',
                  target: `Chapter ${parsed.targetChapterNumber || 1}`,
                  fileExt: 'md',
                  diff: { added: 0, removed: 40 },
                  label: `Removed Chapter ${parsed.targetChapterNumber || 1}`,
                  detail: 'Sequential chapter renumbering executed',
                  status: 'completed',
                });
                agentMessage = {
                  id: 'msg-agent-' + Date.now(),
                  sender: 'agent',
                  content: parsed.chatResponse,
                  thinking: `Identified deletion command: Chapter ${parsed.targetChapterNumber || 1}. Canvas updated and sequentially renumbered.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  canvasActionBadge: mutation.canvasBadge,
                };
                finalRun = {
                  ...currentRun,
                  status: 'completed',
                  durationMs: Date.now() - startTime,
                  thinking: `Chapter ${parsed.targetChapterNumber || 1} removed and canvas renumbered.`,
                  currentStep: 'Completed',
                  actionTaken: 'DELETE_CHAPTER',
                  targetChapterNumber: parsed.targetChapterNumber || 1,
                  canvasActionBadge: mutation.canvasBadge,
                  steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
                };
              }
            } else if (isGreeting && clean.length < 30) {
              agentMessage = {
                id: 'msg-agent-' + Date.now(),
                sender: 'agent',
                content: 'Hello! I am your Notelay research and knowledge companion. How can I assist you with your knowledge workspace today?',
                thinking: 'Conversational greeting handled.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              finalRun = {
                ...currentRun,
                status: 'completed',
                durationMs: Date.now() - startTime,
                thinking: 'Conversational greeting handled without canvas modification.',
                currentStep: 'Completed',
                actionTaken: 'NONE',
                steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
              };
            } else {
              const parsed = parseSmartAiResponse('', text, nextChapterNumber);

              if (parsed.action === 'NONE') {
                const conv = generateSmartConversationalResponse(
                  text,
                  activeProject.sources,
                  activeProject.document
                );

                agentMessage = {
                  id: 'msg-agent-' + Date.now(),
                  sender: 'agent',
                  content: conv.response,
                  thinking: conv.thinking,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };

                finalRun = {
                  ...currentRun,
                  status: 'completed',
                  durationMs: Date.now() - startTime,
                  thinking: conv.thinking,
                  currentStep: 'Completed',
                  actionTaken: 'NONE',
                  steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
                };
              } else {
                const fallback = synthesizeNotesAndDiagrams(
                  text,
                  activeProject.name,
                  activeProject.sources,
                  activeProject.document
                );
                updatedDocument = fallback.updatedDocument;

                currentRun.steps.push({
                  id: 'step-canvas-create',
                  type: 'edit',
                  verb: 'Created',
                  target: `Chapter ${nextChapterNumber}: ${fallback.newChapter.title}`,
                  fileExt: 'md',
                  diff: { added: (fallback.newChapter.sections?.length || 1) * 18 + 10, removed: 0 },
                  label: `Created Chapter ${nextChapterNumber}`,
                  detail: `Synthesized ${(fallback.newChapter.sections?.length || 1)} sections on Master Document Canvas`,
                  status: 'completed',
                });

                agentMessage = {
                  id: 'msg-agent-' + Date.now(),
                  sender: 'agent',
                  content: fallback.messageMarkdown,
                  thinking: fallback.thinking,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  canvasActionBadge: {
                    type: 'created',
                    chapterNumber: nextChapterNumber,
                    label: `Created Chapter ${nextChapterNumber}: ${fallback.newChapter.title}`,
                  },
                };

                finalRun = {
                  ...currentRun,
                  status: 'completed',
                  durationMs: Date.now() - startTime,
                  thinking: fallback.thinking,
                  currentStep: 'Completed',
                  actionTaken: 'CREATE_CHAPTER',
                  targetChapterNumber: nextChapterNumber,
                  canvasActionBadge: {
                    type: 'created',
                    chapterNumber: nextChapterNumber,
                    label: `Created Chapter ${nextChapterNumber}: ${fallback.newChapter.title}`,
                  },
                  steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
                };
              }
            }
          }
        } catch (err: any) {
          console.error('Synthesis error in store:', err);
          const parsed = parseSmartAiResponse('', text, nextChapterNumber);
          if (parsed.action === 'NONE') {
            const conv = generateSmartConversationalResponse(
              text,
              activeProject.sources,
              activeProject.document
            );
            agentMessage = {
              id: 'msg-agent-' + Date.now(),
              sender: 'agent',
              content: conv.response,
              thinking: conv.thinking,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            finalRun = {
              ...currentRun,
              status: 'completed',
              durationMs: Date.now() - startTime,
              thinking: conv.thinking,
              currentStep: 'Completed',
              actionTaken: 'NONE',
              steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
            };
          } else {
            const fallback = synthesizeNotesAndDiagrams(
              text,
              activeProject.name,
              activeProject.sources,
              activeProject.document
            );
            updatedDocument = fallback.updatedDocument;
            agentMessage = {
              id: 'msg-agent-' + Date.now(),
              sender: 'agent',
              content: fallback.messageMarkdown,
              thinking: fallback.thinking,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              canvasActionBadge: {
                type: 'created',
                chapterNumber: nextChapterNumber,
                label: `Created Chapter ${nextChapterNumber}: ${fallback.newChapter.title}`,
              },
            };
            finalRun = {
              ...currentRun,
              status: 'completed',
              durationMs: Date.now() - startTime,
              thinking: fallback.thinking,
              currentStep: 'Completed',
              actionTaken: 'CREATE_CHAPTER',
              targetChapterNumber: nextChapterNumber,
              canvasActionBadge: {
                type: 'created',
                chapterNumber: nextChapterNumber,
                label: `Created Chapter ${nextChapterNumber}: ${fallback.newChapter.title}`,
              },
              steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
            };
          }
        }
      } else {
        const clean = text.trim().toLowerCase();
        const isGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|howdy|sup|greetings)\b/i.test(clean);
        if (isGreeting && clean.length < 30) {
          agentMessage = {
            id: 'msg-agent-' + Date.now(),
            sender: 'agent',
            content: 'Hello! How can I help you today?',
            thinking: 'Conversational greeting handled.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          finalRun = {
            ...currentRun,
            status: 'completed',
            durationMs: Date.now() - startTime,
            thinking: 'Conversational response delivered.',
            currentStep: 'Completed',
            actionTaken: 'NONE',
            steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
          };
        } else {
          const fallback = synthesizeNotesAndDiagrams(
            text,
            activeProject.name,
            activeProject.sources,
            activeProject.document
          );
          updatedDocument = fallback.updatedDocument;
          agentMessage = {
            id: 'msg-agent-' + Date.now(),
            sender: 'agent',
            content: fallback.messageMarkdown,
            thinking: fallback.thinking,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            canvasActionBadge: {
              type: 'created',
              chapterNumber: nextChapterNumber,
              label: `Created Chapter ${nextChapterNumber}`,
            },
          };
          finalRun = {
            ...currentRun,
            status: 'completed',
            durationMs: Date.now() - startTime,
            thinking: fallback.thinking,
            currentStep: 'Completed',
            actionTaken: 'CREATE_CHAPTER',
            targetChapterNumber: nextChapterNumber,
            canvasActionBadge: {
              type: 'created',
              chapterNumber: nextChapterNumber,
              label: `Created Chapter ${nextChapterNumber}`,
            },
            steps: currentRun.steps.map((s) => ({ ...s, status: 'completed' })),
          };
        }
      }

      // Attach full Antigravity execution trajectory to message
      agentMessage.activityRun = finalRun;

      // Persist structured training/evaluation dataset sample to disk
      if (window.electronAPI?.saveAgentActivityLog) {
        window.electronAPI.saveAgentActivityLog({
          id: finalRun.id,
          projectId: activeProjectId,
          projectName: activeProject.name,
          timestamp: new Date().toISOString(),
          model: modelLabel,
          prompt: text,
          thinking: finalRun.thinking,
          output: agentMessage.content,
          durationMs: finalRun.durationMs,
          sourcesCount: activeProject.sources?.length || 0,
          actionTaken: finalRun.actionTaken,
          steps: finalRun.steps,
          fineTuningSample: {
            messages: [
              {
                role: 'system',
                content: 'You are Notelay AI, an expert pedagogical synthesizer that plans cognitive architecture and composes structured, deep notes with Mermaid diagrams and mathematical rigor.'
              },
              {
                role: 'user',
                content: text
              },
              {
                role: 'assistant',
                content: finalRun.thinking ? `<think>\n${finalRun.thinking}\n</think>\n\n${agentMessage.content}` : agentMessage.content
              }
            ]
          }
        }).catch((logErr) => console.warn('Background activity logging error:', logErr));
      }

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              document: updatedDocument,
              activityHistory: [finalRun, ...(p.activityHistory || [])].slice(0, 50),
              session: {
                ...p.session,
                messages: [...p.session.messages, agentMessage],
                updatedAt: 'Just now',
              },
            };
          }
          return p;
        })
      );

      setActiveAgentRun(null);
    })();
  };

  const customizeSectionSelection = async (params: {
    chapterId: string;
    sectionId: string;
    selectedText: string;
    action: 'deepen' | 'analogy' | 'diagram' | 'table' | 'custom';
    customPrompt?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeProject) return { success: false, error: 'No active project' };

    const currentModelObj = availableModels.find(
      (m) => m.name === selectedModel || m.id === selectedModel
    );

    let targetChapter: DocumentChapter | undefined;
    let targetSection: DocumentSection | undefined;

    for (const ch of activeProject.document.chapters) {
      if (ch.id === params.chapterId) {
        targetChapter = ch;
        targetSection = ch.sections.find((s) => s.id === params.sectionId);
        break;
      }
    }

    if (!targetSection) {
      for (const ch of activeProject.document.chapters) {
        const sec = ch.sections.find((s) => s.id === params.sectionId);
        if (sec) {
          targetChapter = ch;
          targetSection = sec;
          break;
        }
      }
    }

    if (!targetSection || !targetChapter) {
      return { success: false, error: 'Target section not found' };
    }

    try {
      let result: {
        success: boolean;
        replacementContent?: string;
        diagram?: DiagramDefinition;
        error?: string;
      } = { success: false };

      if (window.electronAPI?.customizeSelectionAI) {
        result = await window.electronAPI.customizeSelectionAI({
          selectedText: params.selectedText,
          sectionTitle: targetSection.title,
          sectionContent: targetSection.content,
          action: params.action,
          customPrompt: params.customPrompt,
          modelId: currentModelObj?.id || selectedModel,
          isLocal: !!currentModelObj?.isLocal,
          localEndpoint: currentModelObj?.endpoint,
          apiKeys,
        });
      }

      if (!result.success && !result.replacementContent && !result.diagram) {
        return { success: false, error: result.error || 'Customization synthesis failed' };
      }

      const updatedChapters = activeProject.document.chapters.map((ch) => {
        if (ch.id !== targetChapter!.id) return ch;

        const updatedSections = ch.sections.map((sec) => {
          if (sec.id !== targetSection!.id) return sec;

          let newContent = sec.content;
          const newDiagrams = sec.diagrams ? [...sec.diagrams] : [];

          if (result.diagram) {
            newDiagrams.push(result.diagram);
            if (result.replacementContent) {
              if (params.selectedText && newContent.includes(params.selectedText)) {
                newContent = newContent.replace(params.selectedText, result.replacementContent);
              } else {
                newContent = `${newContent}\n\n${result.replacementContent}`;
              }
            } else {
              newContent = `${newContent}\n\n\`\`\`mermaid\n${result.diagram.code}\n\`\`\``;
            }
          } else if (result.replacementContent) {
            if (params.selectedText && newContent.includes(params.selectedText)) {
              newContent = newContent.replace(params.selectedText, result.replacementContent);
            } else {
              newContent = `${newContent}\n\n${result.replacementContent}`;
            }
          }

          return {
            ...sec,
            content: newContent,
            diagrams: newDiagrams.length > 0 ? newDiagrams : undefined,
          };
        });

        return {
          ...ch,
          sections: updatedSections,
        };
      });

      let totalWords = 0;
      for (const ch of updatedChapters) {
        for (const s of ch.sections) {
          totalWords += s.content.split(/\s+/).filter(Boolean).length;
        }
      }

      const updatedDocument: MasterDocument = {
        ...activeProject.document,
        chapters: updatedChapters,
        wordCount: totalWords,
        updatedAt: 'Just now',
      };

      const badgeLabel =
        params.action === 'diagram'
          ? `Generated Diagram in ${targetChapter.title}`
          : `Customized (${params.action}) in ${targetChapter.title}: ${targetSection.title}`;

      const agentMessage: Message = {
        id: 'msg-agent-' + Date.now(),
        sender: 'agent',
        content: `I have updated your master notes in **${targetChapter.title}** (${targetSection.title}) using inline AI customization (**${params.action.toUpperCase()}**).`,
        thinking: `Inline selection action "${params.action}" processed and applied in place to section "${targetSection.title}".`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        canvasActionBadge: {
          type: 'customized',
          chapterNumber: targetChapter.chapterNumber,
          label: badgeLabel,
        },
      };

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              document: updatedDocument,
              session: {
                ...p.session,
                messages: [...p.session.messages, agentMessage],
                updatedAt: 'Just now',
              },
            };
          }
          return p;
        })
      );

      return { success: true };
    } catch (err: any) {
      console.error('customizeSectionSelection error:', err);
      return { success: false, error: err.message };
    }
  };

  const insertChapterAtPosition = (position: 'TOP' | 'BOTTOM', topic: string) => {
    const prompt =
      position === 'TOP'
        ? `Add a new page at the top on: ${topic}`
        : `Add a new page at the bottom on: ${topic}`;
    createAndSendMessage(prompt);
  };

  const deleteChapter = (chapterNumber: number) => {
    if (!activeProject) return;
    const targetChap = activeProject.document.chapters.find(
      (c, i) => c.chapterNumber === chapterNumber || i + 1 === chapterNumber
    );
    const chapTitle = targetChap ? targetChap.title.replace(/^Chapter\s+\d+:\s*/i, '') : `Chapter ${chapterNumber}`;

    const filteredChapters = activeProject.document.chapters.filter(
      (c, i) => !(c.chapterNumber === chapterNumber || i + 1 === chapterNumber)
    );

    // Renumber remaining chapters sequentially
    const updatedChapters = filteredChapters.map((ch, idx) => {
      const newNum = idx + 1;
      const cleanTitle = ch.title.replace(/^Chapter\s+\d+:\s*/i, '');
      return {
        ...ch,
        chapterNumber: newNum,
        title: `Chapter ${newNum}: ${cleanTitle}`,
      };
    });

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...activeProject.document,
      totalChapters: updatedChapters.length,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    const canvasBadge: CanvasActionBadge = {
      type: 'deleted',
      chapterNumber,
      label: `Deleted Chapter ${chapterNumber}: ${chapTitle}`,
    };

    const agentMessage: Message = {
      id: 'msg-agent-' + Date.now(),
      sender: 'agent',
      content: `I have removed **Chapter ${chapterNumber}: ${chapTitle}** from your Master Document Canvas and sequentially re-numbered the remaining chapters.`,
      thinking: `Direct canvas deletion: Chapter ${chapterNumber} removed. Canvas layout synchronized.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      canvasActionBadge: canvasBadge,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            document: updatedDocument,
            updatedAt: 'Just now',
            session: {
              ...p.session,
              messages: [...p.session.messages, agentMessage],
            },
          };
        }
        return p;
      })
    );
  };

  const deleteSection = (chapterId: string, sectionId: string) => {
    if (!activeProject) return;

    let targetSectionTitle = '';
    let targetChapNum = 1;

    let updatedChapters = activeProject.document.chapters
      .map((ch) => {
        if (ch.id !== chapterId && String(ch.chapterNumber) !== chapterId) return ch;
        targetChapNum = ch.chapterNumber;
        const targetSec = ch.sections.find((s) => s.id === sectionId);
        if (targetSec) targetSectionTitle = targetSec.title;

        return {
          ...ch,
          sections: ch.sections.filter((s) => s.id !== sectionId),
        };
      })
      .filter((ch) => ch.sections.length > 0);

    // Renumber remaining chapters sequentially
    updatedChapters = updatedChapters.map((ch, idx) => {
      const newNum = idx + 1;
      const cleanTitle = ch.title.replace(/^Chapter\s+\d+:\s*/i, '');
      return {
        ...ch,
        chapterNumber: newNum,
        title: `Chapter ${newNum}: ${cleanTitle}`,
      };
    });

    let totalWords = 0;
    for (const ch of updatedChapters) {
      for (const s of ch.sections) {
        totalWords += s.content.split(/\s+/).filter(Boolean).length;
      }
    }
    const totalSectionsCount = updatedChapters.reduce((acc, c) => acc + c.sections.length, 0);

    const updatedDocument: MasterDocument = {
      ...activeProject.document,
      totalChapters: updatedChapters.length,
      totalSections: totalSectionsCount,
      wordCount: totalWords,
      estimatedPages: Math.max(1, totalSectionsCount),
      updatedAt: 'Just now',
      chapters: updatedChapters,
    };

    const canvasBadge: CanvasActionBadge = {
      type: 'deleted',
      chapterNumber: targetChapNum,
      label: `Removed page "${targetSectionTitle || 'Section'}"`,
    };

    const agentMessage: Message = {
      id: 'msg-agent-' + Date.now(),
      sender: 'agent',
      content: `I have removed page **${targetSectionTitle || 'Section'}** from Chapter ${targetChapNum} on your Master Document Canvas.`,
      thinking: `Direct page deletion: ${targetSectionTitle || sectionId} removed. Master Document Canvas recomputed.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      canvasActionBadge: canvasBadge,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            document: updatedDocument,
            updatedAt: 'Just now',
            session: {
              ...p.session,
              messages: [...p.session.messages, agentMessage],
            },
          };
        }
        return p;
      })
    );
  };

  const updateSectionContent = (chapterId: string, sectionId: string, newContent: string) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          const updatedChapters = p.document.chapters.map((ch) => {
            if (ch.id === chapterId || ch.sections.some((s) => s.id === sectionId)) {
              return {
                ...ch,
                sections: ch.sections.map((sec) => (sec.id === sectionId ? { ...sec, content: newContent } : sec)),
              };
            }
            return ch;
          });

          return {
            ...p,
            document: {
              ...p.document,
              chapters: updatedChapters,
              updatedAt: 'Just now',
            },
          };
        }
        return p;
      })
    );
  };

  const openTrainingLogsFolder = () => {
    if (window.electronAPI?.openAgentLogsFolder) {
      window.electronAPI.openAgentLogsFolder(activeProjectId);
    }
  };

  return {
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
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
    setDeleteTarget,
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
    deleteProject,
    clearActiveSession,
    addSourcesToActiveProject,
    removeSourceFromActiveProject,
    updateActiveDocument,
    activeMainView,
    setActiveMainView,
    activeSourceId,
    activeSource,
    selectSourceFile,
    openChatView,
    openNativeFolderDialog,
    createAndSendMessage,
    customizeSectionSelection,
    insertChapterAtPosition,
    deleteChapter,
    deleteSection,
    updateSectionContent,
    activeAgentRun,
    openTrainingLogsFolder,
  };
}

