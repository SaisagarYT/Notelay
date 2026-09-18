export interface ToolCall {
  id: string;
  name: string;
  summary: string;
  status: 'running' | 'completed' | 'error';
  output?: string;
}

export interface CanvasActionBadge {
  type: 'created' | 'updated' | 'diagram' | 'inserted_top' | 'inserted_bottom' | 'customized' | 'deleted' | 'revised';
  chapterNumber: number;
  sectionIndex?: number;
  label: string;
}

export interface AgentActivityStep {
  id: string;
  type?: 'plan' | 'explore' | 'edit' | 'run' | 'think' | 'synthesize';
  verb?: string; // 'Proceeded with' | 'Explored' | 'Edited' | 'Ran' | 'Synthesized'
  target?: string; // 'Implementation Plan' | 'master-notes.md' | '8 files' | 'synthesize-chapter-ai'
  fileExt?: 'ts' | 'js' | 'json' | 'py' | 'md' | 'css' | 'html' | 'pdf';
  diff?: { added: number; removed: number };
  items?: string[]; // e.g. list of explored files or details
  label: string;
  detail?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp?: string;
}

export interface AgentActivityRun {
  id: string;
  projectId: string;
  timestamp: string;
  prompt: string;
  model: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
  thinking: string;
  currentStep?: string;
  steps: AgentActivityStep[];
  actionTaken?: 'NONE' | 'CREATE_CHAPTER' | 'UPDATE_SECTION' | 'UPDATE_DIAGRAM' | 'DELETE_CHAPTER' | 'REVISE_NOTES';
  targetChapterNumber?: number;
  canvasActionBadge?: CanvasActionBadge;
  evalCount?: number;
  evalDuration?: number;
  speedTokPerSec?: number;
  isStreaming?: boolean;
}

export interface AIStreamEvent {
  runId: string;
  type: 'think' | 'content' | 'step' | 'done' | 'error';
  text?: string;
  accumulatedThinking?: string;
  accumulatedContent?: string;
  thinking?: string;
  evalCount?: number;
  durationMs?: number;
  error?: string;
}

export interface AgentTrainingLogEntry {
  id: string;
  projectId: string;
  projectName?: string;
  timestamp: string;
  model: string;
  prompt: string;
  thinking: string;
  output: string;
  durationMs?: number;
  sourcesCount?: number;
  actionTaken?: string;
  steps: AgentActivityStep[];
  fineTuningSample: {
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };
}

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  isGeneratingNotes?: boolean;
  canvasActionBadge?: CanvasActionBadge;
  activityRun?: AgentActivityRun;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  model: string;
  executionMode: 'Local' | 'Cloud' | 'Sandbox';
}

export interface SourceFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'txt' | 'md' | 'code' | 'raw';
  size: number;
  uploadedAt: string;
  content: string;
  path?: string;
  tokenCount?: number;
  isPinned?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  lastAccessedAt?: string;
}

export interface DiagramDefinition {
  id: string;
  type: 'flowchart' | 'mindmap' | 'sequence' | 'state' | 'class' | 'er' | 'git' | 'other';
  title: string;
  code: string; // Mermaid syntax
  caption?: string;
}

export interface DocumentRecallQuestion {
  question: string;
  answer: string;
}

export interface Flashcard {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle?: string;
  front: string; // Question, term, or prompt
  back: string; // Combined answer and explanation
  directAnswer?: string; // Specific concise target answer (Top)
  explanation?: string; // Detailed description & explanation (Bottom)
  category?: 'takeaway' | 'definition' | 'recall' | 'formula';
  masteryLevel: 'unlearned' | 'learning' | 'mastered';
  reviewCount: number;
  lastReviewed?: string;
  interval?: number; // SM-2 days until next review
  repetition?: number; // SM-2 consecutive successful reviews
  easeFactor?: number; // SM-2 ease factor (default 2.5)
  dueDate?: string; // SM-2 next review ISO timestamp
  lapses?: number; // SM-2 total lapses (times forgotten)
}

export interface QuizQuestion {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PodcastDialogueTurn {
  id: string;
  speaker: 'Alex' | 'Sam';
  text: string;
  chapterNumber?: number;
  chapterTitle?: string;
  sectionId?: string;
  sectionTitle?: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  topic: string;
  mode: 'podcast' | 'lecture';
  durationEstimateSeconds: number;
  dialogue: PodcastDialogueTurn[];
}

export interface NotebookStickyNote {
  id: string;
  chapterId: string;
  sectionId: string;
  text: string;
  color: 'yellow' | 'pink' | 'green' | 'blue';
  createdAt: string;
}

export interface NotebookHighlight {
  id: string;
  chapterId: string;
  sectionId: string;
  text: string;
  color: 'yellow' | 'green' | 'pink' | 'blue';
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number; // 2 for h2, 3 for h3
  content: string; // Rich markdown content
  diagrams?: DiagramDefinition[];
  keyTakeaways?: string[];
  recallQuestions?: DocumentRecallQuestion[];
}

export interface DocumentChapter {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle?: string;
  estimatedReadTime?: string;
  sections: DocumentSection[];
  summary?: string;
}

export interface MasterDocument {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  totalChapters: number;
  totalSections: number;
  wordCount: number;
  estimatedPages: number;
  chapters: DocumentChapter[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  path?: string;
  isExpanded?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
  session: Conversation; // Exactly 1 knowledge & chat session per project folder!
  sources: SourceFile[];
  document: MasterDocument;
  activityHistory?: AgentActivityRun[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  badge?: string;
  isLocal?: boolean;
  endpoint?: string;
  details?: {
    parameterSize?: string;
    family?: string;
    quantization?: string;
  };
}

export interface LocalLLMDiscovery {
  ollama: {
    running: boolean;
    endpoint: string;
    models: Array<{
      name: string;
      size: number;
      details?: { parameter_size?: string; family?: string };
    }>;
  };
  lmstudio: {
    running: boolean;
    endpoint: string;
    models: Array<{
      id: string;
      object?: string;
    }>;
  };
}

export interface ApiKeysConfig {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  qwen?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => Promise<void>;
      maximize: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      onWindowStateChange: (callback: (state: { isMaximized: boolean }) => void) => () => void;
      selectDirectory?: () => Promise<{ path: string; name: string } | null>;
      selectFiles?: () => Promise<Array<{ path: string; name: string; ext: string; size: number; content: string }>>;
      parseFilesFromPaths?: (filePaths: string[]) => Promise<Array<{ path: string; name: string; ext: string; size: number; content: string }>>;
      printToPDF?: (options?: { pageSize?: string; defaultPath?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      exportDocumentPDF?: (payload: { htmlContent: string; defaultPath?: string; pageSize?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      detectLocalLLMs?: () => Promise<LocalLLMDiscovery>;
      getStoragePath?: () => Promise<string>;
      setStoragePath?: (newPath: string) => Promise<{ success: boolean; path: string }>;
      saveProjectToDisk?: (project: Project) => Promise<{ success: boolean; path?: string; error?: string }>;
      loadProjectsFromDisk?: () => Promise<{ success: boolean; projects: Project[] }>;
      deleteProjectFromDisk?: (projectId: string) => Promise<{ success: boolean; error?: string }>;
      deleteSourceFileFromDisk?: (projectId: string, fileName: string) => Promise<{ success: boolean; error?: string }>;
      saveApiKeys?: (keys: ApiKeysConfig) => Promise<{ success: boolean; error?: string }>;
      getApiKeys?: () => Promise<ApiKeysConfig>;
      synthesizeChapterAI?: (payload: {
        runId?: string;
        prompt: string;
        topic: string;
        sources: SourceFile[];
        modelId: string;
        isLocal?: boolean;
        localEndpoint?: string;
        apiKeys?: ApiKeysConfig;
        chapterNumber: number;
        documentOutline?: Array<{ chapterNumber: number; title: string; sections: Array<{ title: string; content: string }> }>;
        conversationHistory?: Message[];
      }) => Promise<{
        success: boolean;
        rawOutput?: string;
        thinking?: string;
        evalCount?: number;
        totalDuration?: number;
        newChapter?: DocumentChapter;
        error?: string;
      }>;
      onAIStreamEvent?: (callback: (event: AIStreamEvent) => void) => () => void;
      readSourceFileBinary?: (params: {
        projectId?: string;
        sourceName?: string;
        filePath?: string;
      }) => Promise<{
        success: boolean;
        base64?: string;
        uint8Array?: Uint8Array;
        mimeType?: string;
        size?: number;
        path?: string;
        name?: string;
        error?: string;
      }>;
      openFileInOS?: (filePath: string) => Promise<{ success: boolean; error?: string | null }>;
      customizeSelectionAI?: (payload: {
        selectedText: string;
        sectionTitle: string;
        sectionContent: string;
        action: 'deepen' | 'analogy' | 'diagram' | 'table' | 'custom';
        customPrompt?: string;
        modelId: string;
        isLocal?: boolean;
        localEndpoint?: string;
        apiKeys?: ApiKeysConfig;
      }) => Promise<{
        success: boolean;
        replacementContent?: string;
        diagram?: DiagramDefinition;
        error?: string;
      }>;
      saveAgentActivityLog?: (logEntry: AgentTrainingLogEntry) => Promise<{ success: boolean; path?: string; datasetPath?: string; error?: string }>;
      openAgentLogsFolder?: (projectId?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}
