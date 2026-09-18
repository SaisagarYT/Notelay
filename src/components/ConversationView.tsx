import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Mic,
  Sparkles,
  Paperclip,
  Image,
  FileCode,
  Monitor,
  Cloud,
  Box,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Conversation, Message, AIModel, AgentActivityRun } from '../types';
import { AVAILABLE_MODELS } from '../store/useAppStore';
import { DiagramRenderer } from './DiagramRenderer';
import { renderMarkdownBlocks } from '../utils/markdownParser';
import { AmbientAura } from './ui/ambient-aura';
import { triggerMicroBurst } from './ui/particle-burst';
import { Icon } from '@iconify/react';
import { AntigravityTrajectory } from './AntigravityTrajectory';

interface TypewriterMessageProps {
  content: string;
  isLatest: boolean;
  messageId: string;
  completedIds: Set<string>;
  onComplete: (id: string) => void;
  renderMarkdown: (content: string) => React.ReactNode;
  onScroll?: () => void;
}

const TypewriterMessage: React.FC<TypewriterMessageProps> = ({
  content,
  isLatest,
  messageId,
  completedIds,
  onComplete,
  renderMarkdown,
  onScroll,
}) => {
  const isAlreadyCompleted = completedIds.has(messageId);
  const shouldAnimate = isLatest && !isAlreadyCompleted;

  const [charIndex, setCharIndex] = useState(shouldAnimate ? 0 : content.length);
  const [isDone, setIsDone] = useState(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate || isDone) return;

    let currentIndex = 0;
    const totalLength = content.length;
    // Step size based on length so entire response reveals smoothly in ~1.5 - 2.5s
    const stepSize = Math.max(4, Math.ceil(totalLength / 55));

    const interval = setInterval(() => {
      currentIndex = Math.min(totalLength, currentIndex + stepSize);
      setCharIndex(currentIndex);
      onScroll?.();

      if (currentIndex >= totalLength) {
        clearInterval(interval);
        setIsDone(true);
        onComplete(messageId);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [shouldAnimate, content, isDone, messageId, onComplete, onScroll]);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCharIndex(content.length);
    setIsDone(true);
    onComplete(messageId);
    onScroll?.();
  };

  if (!shouldAnimate || isDone) {
    return (
      <div className="select-text pl-0.5">
        {renderMarkdown(content)}
      </div>
    );
  }

  const displayedContent = content.slice(0, charIndex);

  return (
    <div
      className="relative select-text pl-0.5 group/typewriter cursor-pointer"
      onClick={handleSkip}
      title="Click to reveal all immediately"
    >
      {renderMarkdown(displayedContent)}
      <span className="inline-block w-2 h-4 ml-1 bg-blue-600 dark:bg-blue-400 animate-pulse align-middle" />

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-sans border-t border-slate-100 dark:border-slate-800/60 pt-1.5">
        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
          <span>AI is typing line by line...</span>
        </span>
        <button
          type="button"
          onClick={handleSkip}
          className="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer font-medium"
        >
          <span>Skip</span>
          <span>⏩</span>
        </button>
      </div>
    </div>
  );
};

interface ConversationViewProps {
  conversation: Conversation;
  projectName?: string;
  sourcesCount?: number;
  canvasOpen?: boolean;
  onToggleCanvas?: () => void;
  onOpenSourceModal?: () => void;
  onSendMessage: (text: string) => void;
  onNewConversation?: () => void;
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  availableModels?: AIModel[];
  isDetectingModels?: boolean;
  onRefreshLocalModels?: () => void;
  onOpenSettings?: () => void;
  executionMode?: 'Local' | 'Cloud' | 'Sandbox';
  onSelectExecutionMode?: (mode: 'Local' | 'Cloud' | 'Sandbox') => void;
  activeAgentRun?: AgentActivityRun | null;
  onOpenLogsFolder?: () => void;
  onOpenThinkingStudio?: (runId?: string) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  projectName: _projectName = 'Notelay',
  sourcesCount: _sourcesCount = 0,
  canvasOpen = true,
  onToggleCanvas,
  onOpenSourceModal,
  onSendMessage,
  selectedModel,
  onSelectModel,
  availableModels = AVAILABLE_MODELS,
  isDetectingModels = false,
  onRefreshLocalModels,
  onOpenSettings,
  executionMode = 'Local',
  onSelectExecutionMode,
  activeAgentRun,
  onOpenLogsFolder: _onOpenLogsFolder,
  onOpenThinkingStudio,
}) => {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [copiedUserMsgId, setCopiedUserMsgId] = useState<string | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [completedTypewriterIds, setCompletedTypewriterIds] = useState<Set<string>>(() => new Set());
  const [liveSeconds, setLiveSeconds] = useState<number>(0);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (!activeAgentRun || activeAgentRun.status !== 'running') {
      setLiveSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      setLiveSeconds(Number(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(interval);
  }, [activeAgentRun?.status]);

  const handleTypewriterComplete = useCallback((id: string) => {
    setCompletedTypewriterIds((prev) => new Set(prev).add(id));
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleCopyUserMsg = (text: string, id: string, e: React.MouseEvent) => {
    navigator.clipboard.writeText(text);
    setCopiedUserMsgId(id);
    triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    setTimeout(() => setCopiedUserMsgId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = (e?: React.SyntheticEvent) => {
    const text = inputText.trim();
    if (!text) return;

    if (e && 'clientX' in e && (e as React.MouseEvent).clientX) {
      triggerMicroBurst((e as React.MouseEvent).clientX, (e as React.MouseEvent).clientY, '#2563eb');
    }

    onSendMessage(text);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const toggleMic = () => {
    const nextState = !isListening;
    setIsListening(nextState);

    if (nextState) {
      try {
        const SpeechRecognition =
          (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          alert('Speech recognition is not supported in this browser.');
          setIsListening(false);
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (transcript.trim()) {
            setInputText((prev) => (prev ? prev + ' ' : '') + transcript.trim());
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to initialize speech recognition:', err);
        setIsListening(false);
      }
    } else {
      setIsListening(false);
    }
  };

  // Render clean Antigravity Markdown with native document flow (Tables, Diagrams, Headings, Lists)
  const renderAgentMarkdown = (content: string) => {
    return (
      <div className="space-y-3.5 text-[14.5px] leading-[1.7] text-slate-800 dark:text-slate-200 font-normal selection:bg-blue-100 dark:selection:bg-blue-900/60">
        {renderMarkdownBlocks(content, {
          isNotebook: false,
          keyPrefix: 'msg',
          onRenderMermaid: (code, idx) => (
            <DiagramRenderer
              key={`diag-${idx}`}
              code={code}
              title="Dynamic Visual Conceptual Model & System Flow"
            />
          ),
        })}
      </div>
    );
  };

  return (
    <div
      className="flex-1 h-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden select-none transition-colors"
      onClick={() => {
        setModelDropdownOpen(false);
        setModeDropdownOpen(false);
        setAttachMenuOpen(false);
      }}
    >
      {/* Main Conversation Stream (Reading Column) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 custom-scrollbar">
        <div className="max-w-[760px] mx-auto space-y-5">
          {conversation.messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="py-28 flex flex-col items-center justify-center text-center select-none"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center mb-3 shadow-xs">
                <Icon icon="solar:magic-stick-3-bold" className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Notelay Knowledge Canvas
              </h3>
              <p className="text-[12.5px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                Ask questions, examine source documents, or compose comprehensive research notes.
              </p>
            </motion.div>
          )}

          {conversation.messages.map((message: Message, index: number) => {
            const isUser = message.sender === 'user';

            if (isUser) {
              /* Exact Antigravity User Prompt Card: Compact, natural padding, clean font */
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="w-full my-3 group/user"
                >
                  <div className="w-full bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl py-3.5 px-6 text-[14px] leading-relaxed text-slate-900 dark:text-slate-100 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all relative">
                    <p className="whitespace-pre-wrap select-text font-normal text-[14px] leading-relaxed pr-8 break-words overflow-hidden">
                      {message.content}
                    </p>

                    {/* Subtle action button on top-right of user card without taking vertical space */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleCopyUserMsg(message.content, message.id, e)}
                      className="absolute right-4 top-3 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-all opacity-0 group-hover/user:opacity-100"
                      title="Copy prompt"
                    >
                      {copiedUserMsgId === message.id ? (
                        <Check size={13} className="text-emerald-500" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              );
            }

            /* Clean, Industry-Level Agent Response with Antigravity Trajectory */
            const messageRun: AgentActivityRun | null = message.activityRun
              ? message.activityRun
              : message.thinking
              ? {
                  id: `run-${message.id}`,
                  projectId: '',
                  timestamp: message.timestamp,
                  prompt: '',
                  model: 'AI Model',
                  status: 'completed',
                  thinking: message.thinking,
                  steps: [],
                }
              : null;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full pt-1 pb-3"
              >
                {/* Antigravity-Style Clean Minimalist Trajectory */}
                {messageRun && (
                  <div className="mb-2">
                    <AntigravityTrajectory
                      run={messageRun}
                      defaultExpandedThought={false}
                      onOpenThinkingStudio={onOpenThinkingStudio}
                    />
                  </div>
                )}

                {/* Direct Markdown text rendering with smooth line-by-line typewriter reveal */}
                <TypewriterMessage
                  content={message.content}
                  isLatest={index === conversation.messages.length - 1}
                  messageId={message.id}
                  completedIds={completedTypewriterIds}
                  onComplete={handleTypewriterComplete}
                  renderMarkdown={renderAgentMarkdown}
                  onScroll={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                />

                {/* Interactive Master Document Canvas Synchronization Badge */}
                {message.canvasActionBadge && (
                  <div className="mt-3.5 pl-0.5">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!canvasOpen && onToggleCanvas) {
                          onToggleCanvas();
                        }
                        setTimeout(() => {
                          const chapEl = document.getElementById(
                            `chapter-${message.canvasActionBadge?.chapterNumber}`
                          );
                          if (chapEl) {
                            chapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 200);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-[12px] font-medium transition-all group shadow-2xs cursor-pointer"
                    >
                      <Sparkles size={13} className="text-slate-600 dark:text-slate-400 group-hover:rotate-12 transition-transform" />
                      <span>{message.canvasActionBadge.label}</span>
                      <ArrowRight size={12} className="text-slate-500 dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Active Running State: Antigravity Trajectory Stream */}
          {activeAgentRun && activeAgentRun.status === 'running' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full pt-1 pb-3"
            >
              <AntigravityTrajectory
                run={activeAgentRun}
                isLive={true}
                liveSeconds={liveSeconds}
                defaultExpandedThought={true}
                onOpenThinkingStudio={onOpenThinkingStudio}
              />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Bottom Prompt Input Container */}
      <div className="w-full px-6 pb-6 pt-2 shrink-0 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-950 dark:via-slate-950">
        <div className="max-w-[760px] mx-auto relative">
          {/* Ambient Glowing Particle Aura Shimmer */}
          <AmbientAura active={isFocused || isListening} intensity={isListening ? 'vibrant' : 'subtle'} />

          <div
            className={`w-full bg-white dark:bg-slate-900 border rounded-2xl p-3 shadow-card transition-all duration-200 ${
              isFocused
                ? 'border-blue-500/80 ring-2 ring-blue-500/15 shadow-md'
                : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Ask a question, enter instructions, or paste notes..."
              className="w-full resize-none outline-none text-[14px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-transparent font-normal selection:bg-blue-100 dark:selection:bg-blue-900/60"
            />

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
              {/* Left toolbar: Add button + Model Picker + Execution Mode */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Add attachment */}
                <div className="relative">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachMenuOpen(!attachMenuOpen);
                      setModelDropdownOpen(false);
                      setModeDropdownOpen(false);
                    }}
                    title="Add files or context"
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={16} strokeWidth={2.2} />
                  </motion.button>

                  <AnimatePresence>
                    {attachMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-dropdown py-1.5 w-52 text-[12.5px] z-50 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setAttachMenuOpen(false);
                            onOpenSourceModal?.();
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Paperclip size={14} className="text-slate-500" />
                          <span>Attach Files</span>
                        </button>
                        <button
                          onClick={() => setAttachMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <Image size={14} className="text-slate-500" />
                          <span>Upload Screenshot</span>
                        </button>
                        <button
                          onClick={() => setAttachMenuOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <FileCode size={14} className="text-slate-500" />
                          <span>Reference Symbol</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Model Picker Pill */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModelDropdownOpen(!modelDropdownOpen);
                      setModeDropdownOpen(false);
                      setAttachMenuOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs max-w-[160px]"
                  >
                    <span className="truncate max-w-[120px]">{selectedModel}</span>
                    <ChevronDown
                      size={12}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {modelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-dropdown py-2 w-80 z-50 text-[13px] max-h-[380px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Local Models Header */}
                        {availableModels.some((m) => m.isLocal) && (
                          <div className="px-3.5 py-1.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Local Models (Ollama / Local PC)</span>
                          </div>
                        )}
                        {availableModels
                          .filter((m) => m.isLocal)
                          .map((model) => {
                            const isSelected = selectedModel === model.name;
                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  onSelectModel(model.name);
                                  setModelDropdownOpen(false);
                                }}
                                className={`w-full flex flex-col text-left px-3.5 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                  isSelected ? 'bg-slate-100 dark:bg-slate-800' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                                    <Cpu size={13} className="text-emerald-600" />
                                    <span>{model.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                                      Local
                                    </span>
                                  </div>
                                  {isSelected && <Check size={14} className="text-slate-900 dark:text-white" />}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {model.description}
                                </p>
                              </button>
                            );
                          })}

                        {/* Cloud Models Header */}
                        <div className="px-3.5 py-1.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                          Cloud AI Models
                        </div>
                        {availableModels
                          .filter((m) => !m.isLocal)
                          .map((model) => {
                            const isSelected = selectedModel === model.name;
                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  onSelectModel(model.name);
                                  setModelDropdownOpen(false);
                                }}
                                className={`w-full flex flex-col text-left px-3.5 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                  isSelected ? 'bg-slate-100 dark:bg-slate-800' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                                    <Sparkles size={13} className="text-slate-600 dark:text-slate-400" />
                                    <span>{model.name}</span>
                                  </div>
                                  {isSelected && <Check size={14} className="text-slate-900 dark:text-white" />}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {model.description}
                                </p>
                              </button>
                            );
                          })}

                        {/* Footer Actions */}
                        <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 px-2.5 flex items-center justify-between text-[11px]">
                          {onRefreshLocalModels && (
                            <button
                              onClick={() => onRefreshLocalModels()}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <RefreshCw size={11} className={isDetectingModels ? 'animate-spin' : ''} />
                              <span>{isDetectingModels ? 'Scanning...' : 'Scan Ollama'}</span>
                            </button>
                          )}
                          {onOpenSettings && (
                            <button
                              onClick={() => {
                                setModelDropdownOpen(false);
                                onOpenSettings();
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 font-medium"
                            >
                              API Keys & Settings →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Execution Mode Pill */}
                {onSelectExecutionMode && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModeDropdownOpen(!modeDropdownOpen);
                        setModelDropdownOpen(false);
                        setAttachMenuOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors border border-slate-200/60 dark:border-slate-700/60 shadow-2xs max-w-[120px]"
                    >
                      {executionMode === 'Local' && <Monitor size={12} className="shrink-0" />}
                      {executionMode === 'Cloud' && <Cloud size={12} className="shrink-0" />}
                      {executionMode === 'Sandbox' && <Box size={12} className="shrink-0" />}
                      <span className="truncate max-w-[70px]">{executionMode}</span>
                      <ChevronDown size={11} className="text-slate-400 shrink-0" />
                    </button>

                    <AnimatePresence>
                      {modeDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-0 bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-dropdown py-1.5 w-52 z-50 text-[12.5px] overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Execution Mode
                          </div>
                          {(['Local', 'Cloud', 'Sandbox'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => {
                                onSelectExecutionMode(mode);
                                setModeDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors ${
                                executionMode === mode
                                  ? 'text-slate-900 dark:text-white font-semibold bg-slate-100 dark:bg-slate-800'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {mode === 'Local' && <Monitor size={14} />}
                                {mode === 'Cloud' && <Cloud size={14} />}
                                {mode === 'Sandbox' && <Box size={14} />}
                                <span>{mode === 'Local' ? 'Local System' : mode === 'Cloud' ? 'Cloud Sandbox' : 'Isolated Container'}</span>
                              </div>
                              {executionMode === mode && <Check size={13} className="text-slate-900 dark:text-white" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right toolbar: Mic + Send Button */}
              <div className="flex items-center gap-2">
                {isListening && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    <span>Listening...</span>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  title={isListening ? 'Stop listening' : 'Dictate with Voice'}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-400/40 scale-105'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Mic size={16} strokeWidth={1.8} />
                </motion.button>

                <motion.button
                  whileTap={inputText.trim() ? { scale: 0.92 } : undefined}
                  whileHover={inputText.trim() ? { scale: 1.05 } : undefined}
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  title="Send Prompt (Enter)"
                  className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                    inputText.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight size={15} strokeWidth={2.2} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
