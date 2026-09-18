import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Mic,
  ArrowRight,
  Monitor,
  Cloud,
  Box,
  Sparkles,
  Check,
  Paperclip,
  Image,
  FileCode,
} from 'lucide-react';
import { Project } from '../types';
import { AVAILABLE_MODELS } from '../store/useAppStore';

interface PromptCanvasProps {
  activeProject?: Project;
  projects?: Project[];
  onSelectProject?: (projectId: string) => void;
  selectedModel: string;
  onSelectModel: (modelName: string) => void;
  executionMode: 'Local' | 'Cloud' | 'Sandbox';
  onSelectExecutionMode: (mode: 'Local' | 'Cloud' | 'Sandbox') => void;
  onSubmitPrompt: (text: string) => void;
  onOpenSourceModal?: () => void;
}

export const PromptCanvas: React.FC<PromptCanvasProps> = ({
  selectedModel,
  onSelectModel,
  executionMode,
  onSelectExecutionMode,
  onSubmitPrompt,
  onOpenSourceModal,
}) => {
  const [promptText, setPromptText] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 280)}px`;
    }
  }, [promptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!promptText.trim()) return;
    onSubmitPrompt(promptText);
  };

  const toggleMic = () => {
    setIsListening(!isListening);
    if (!isListening) {
      if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as unknown as {
          webkitSpeechRecognition: new () => {
            start: () => void;
            onresult: (e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
            onerror: () => void;
          };
        }).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.start();
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setPromptText((prev) => prev + ' ' + transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
      }
    }
  };

  return (
    <div
      className="flex-1 h-full bg-[#ffffff] flex flex-col items-center justify-center p-6 overflow-y-auto select-none"
      onClick={() => {
        setModelDropdownOpen(false);
        setModeDropdownOpen(false);
        setAttachMenuOpen(false);
      }}
    >
      <div className="w-full max-w-[700px] flex flex-col items-center gap-6 transition-all">
        {/* Central Antigravity Prompt Container */}
        <div className="w-full bg-white rounded-2xl border border-[#dadce0] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.03)] hover:border-[#bdc1c6] focus-within:border-[#1a73e8] focus-within:shadow-[0_8px_28px_rgba(26,115,232,0.12),0_0_0_1px_rgba(26,115,232,0.25)] transition-all p-4 flex flex-col gap-3">
          {/* Main Multiline Input Textarea */}
          <textarea
            ref={textareaRef}
            rows={3}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Ask a question, enter instructions, or paste notes..."
            className="w-full resize-none outline-none text-[14.5px] leading-relaxed text-[#0f172a] placeholder-[#9ca3af] bg-transparent font-normal selection:bg-[#dbeafe]"
          />

          {/* Integrated Inside-Card Toolbar (Matches Antigravity) */}
          <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
            {/* Left toolbar: Add button + Model Picker + Execution Mode */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Add attachment button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachMenuOpen(!attachMenuOpen);
                    setModelDropdownOpen(false);
                    setModeDropdownOpen(false);
                  }}
                  title="Add files or context"
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
                >
                  <Plus size={17} strokeWidth={2.2} />
                </button>

                {attachMenuOpen && (
                  <div
                    className="absolute left-0 bottom-full mb-2 bg-white border border-[#e2e8f0] rounded-xl shadow-dropdown py-1.5 w-56 text-[12.5px] z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setAttachMenuOpen(false);
                        onOpenSourceModal?.();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#f8fafc] text-[#334155] transition-colors"
                    >
                      <Paperclip size={14} className="text-[#64748b]" />
                      <span>Attach Knowledge Files / Notes</span>
                    </button>
                    <button
                      onClick={() => setAttachMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#f8fafc] text-[#334155] transition-colors"
                    >
                      <Image size={14} className="text-[#64748b]" />
                      <span>Upload Screenshot</span>
                    </button>
                    <button
                      onClick={() => setAttachMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#f8fafc] text-[#334155] transition-colors"
                    >
                      <FileCode size={14} className="text-[#64748b]" />
                      <span>Reference Code / Notes</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Model Selector Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModelDropdownOpen(!modelDropdownOpen);
                    setAttachMenuOpen(false);
                    setModeDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-[12px] text-[#334155] font-medium transition-colors"
                >
                  <Sparkles size={12} className="text-[#5f6368]" />
                  <span>{selectedModel}</span>
                  <ChevronDown size={12} className="text-[#94a3b8]" />
                </button>

                {modelDropdownOpen && (
                  <div
                    className="absolute left-0 bottom-full mb-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-dropdown py-2 w-72 z-50 text-[13px] animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                      AI Model Selection
                    </div>
                    {AVAILABLE_MODELS.map((model) => {
                      const isSelected = selectedModel === model.name;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            onSelectModel(model.name);
                            setModelDropdownOpen(false);
                          }}
                          className={`w-full flex flex-col text-left px-3.5 py-2.5 transition-colors hover:bg-[#f8fafc] ${
                            isSelected ? 'bg-[#eff6ff]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-medium text-[#0f172a]">
                              <Sparkles size={14} className="text-[#1a73e8]" />
                              <span>{model.name}</span>
                            </div>
                            {isSelected && <Check size={14} className="text-[#1a73e8]" />}
                          </div>
                          <p className="text-[11.5px] text-[#64748b] mt-0.5 line-clamp-1">
                            {model.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Execution Mode Pill */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModeDropdownOpen(!modeDropdownOpen);
                    setModelDropdownOpen(false);
                    setAttachMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg text-[12px] text-[#475569] font-medium transition-colors"
                >
                  {executionMode === 'Local' && <Monitor size={12} />}
                  {executionMode === 'Cloud' && <Cloud size={12} />}
                  {executionMode === 'Sandbox' && <Box size={12} />}
                  <span>{executionMode}</span>
                  <ChevronDown size={11} className="text-[#94a3b8]" />
                </button>

                {modeDropdownOpen && (
                  <div
                    className="absolute left-0 bottom-full mb-2 bg-white border border-[#e2e8f0] rounded-xl shadow-dropdown py-1.5 w-52 z-50 text-[12.5px] animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                      Execution Mode
                    </div>
                    <button
                      onClick={() => {
                        onSelectExecutionMode('Local');
                        setModeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#f8fafc] text-left transition-colors ${
                        executionMode === 'Local'
                          ? 'text-[#1a73e8] font-medium bg-[#eff6ff]'
                          : 'text-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Monitor size={14} />
                        <span>Local System</span>
                      </div>
                      {executionMode === 'Local' && <Check size={13} className="text-[#1a73e8]" />}
                    </button>

                    <button
                      onClick={() => {
                        onSelectExecutionMode('Cloud');
                        setModeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#f8fafc] text-left transition-colors ${
                        executionMode === 'Cloud'
                          ? 'text-[#1a73e8] font-medium bg-[#eff6ff]'
                          : 'text-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Cloud size={14} />
                        <span>Cloud Sandbox</span>
                      </div>
                      {executionMode === 'Cloud' && <Check size={13} className="text-[#1a73e8]" />}
                    </button>

                    <button
                      onClick={() => {
                        onSelectExecutionMode('Sandbox');
                        setModeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#f8fafc] text-left transition-colors ${
                        executionMode === 'Sandbox'
                          ? 'text-[#1a73e8] font-medium bg-[#eff6ff]'
                          : 'text-[#334155]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Box size={14} />
                        <span>Isolated Container</span>
                      </div>
                      {executionMode === 'Sandbox' && <Check size={13} className="text-[#1a73e8]" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right toolbar: Mic + Antigravity Blue Round Send Button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMic}
                title={isListening ? 'Stop listening' : 'Dictate with Voice'}
                className={`p-1.5 rounded-full transition-colors ${
                  isListening
                    ? 'bg-red-100 text-red-600 animate-pulse'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                }`}
              >
                <Mic size={16} strokeWidth={1.8} />
              </button>

              <button
                onClick={handleSubmit}
                disabled={!promptText.trim()}
                title="Send Prompt (Enter)"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  promptText.trim()
                    ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-2xs cursor-pointer'
                    : 'bg-[#f1f3f4] text-[#9aa0a6] cursor-not-allowed'
                }`}
              >
                <ArrowRight size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
