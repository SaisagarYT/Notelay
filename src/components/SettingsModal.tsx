import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Terminal,
  ShieldCheck,
  Folder,
  RefreshCw,
  Cpu,
  Check,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { AIModel, LocalLLMDiscovery, ApiKeysConfig } from '../types';
import { motion } from 'motion/react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { triggerMicroBurst } from './ui/particle-burst';
import { Icon } from '@iconify/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: AIModel[];
  localLLMDiscovery: LocalLLMDiscovery | null;
  isDetectingModels: boolean;
  onRefreshLocalModels: () => Promise<void>;
  storagePath: string;
  onUpdateStoragePath: (newPath: string) => Promise<void>;
  apiKeys: ApiKeysConfig;
  onSaveApiKeys: (keys: ApiKeysConfig) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  availableModels,
  localLLMDiscovery,
  isDetectingModels,
  onRefreshLocalModels,
  storagePath,
  onUpdateStoragePath,
  apiKeys,
  onSaveApiKeys,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'terminal' | 'privacy'>('models');
  const [geminiKey, setGeminiKey] = useState(apiKeys.gemini || '');
  const [openaiKey, setOpenaiKey] = useState(apiKeys.openai || '');
  const [anthropicKey, setAnthropicKey] = useState(apiKeys.anthropic || '');
  const [qwenKey, setQwenKey] = useState(apiKeys.qwen || '');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showQwen, setShowQwen] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [autoRunCommands, setAutoRunCommands] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    setGeminiKey(apiKeys.gemini || '');
    setOpenaiKey(apiKeys.openai || '');
    setAnthropicKey(apiKeys.anthropic || '');
    setQwenKey(apiKeys.qwen || '');
  }, [apiKeys]);

  if (!isOpen) return null;

  const handleSaveKeys = async (e?: React.MouseEvent) => {
    if (e) triggerMicroBurst(e.clientX, e.clientY, '#10b981');
    await onSaveApiKeys({
      gemini: geminiKey.trim() || undefined,
      openai: openaiKey.trim() || undefined,
      anthropic: anthropicKey.trim() || undefined,
      qwen: qwenKey.trim() || undefined,
    });
    setSavedStatus('Keys encrypted & saved to Windows Vault');
    setTimeout(() => setSavedStatus(null), 2500);
  };

  const handleBrowseStorageFolder = async () => {
    if (window.electronAPI?.selectDirectory) {
      const result = await window.electronAPI.selectDirectory();
      if (result && result.path) {
        await onUpdateStoragePath(result.path);
      }
    }
  };

  const ollamaRunning = localLLMDiscovery?.ollama?.running;
  const ollamaModels = localLLMDiscovery?.ollama?.models || [];
  const lmstudioRunning = localLLMDiscovery?.lmstudio?.running;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Sliders size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Configure local LLMs, cloud API keys, and local storage
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-1 overflow-hidden min-h-[440px]">
        {/* Settings Nav Tabs with Motion Sliding Indicator */}
        <div className="w-52 bg-slate-50/70 dark:bg-slate-900/70 border-r border-slate-200/80 dark:border-slate-800 p-3 space-y-1 shrink-0 select-none">
          {(
            [
              { id: 'models', label: 'AI Models & Keys', icon: <Cpu size={15} /> },
              { id: 'general', label: 'Local Storage & Files', icon: <Sliders size={15} /> },
              { id: 'terminal', label: 'Execution & Shell', icon: <Terminal size={15} /> },
              { id: 'privacy', label: 'Security Vault', icon: <ShieldCheck size={15} /> },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-colors text-left relative cursor-pointer ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settingsNavTab"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/60 z-[-1]"
                  />
                )}
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-[13px]">
            {/* TAB: AI MODELS & KEYS */}
            {activeTab === 'models' && (
              <div className="space-y-6">
                {/* 1. Local LLM Detection Card */}
                <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-[#1a73e8]" />
                      <span className="font-semibold text-[#0f172a] text-[13.5px]">Local LLM Engines</span>
                    </div>
                    <button
                      onClick={() => onRefreshLocalModels()}
                      disabled={isDetectingModels}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#cbd5e1] text-[#475569] hover:text-[#0f172a] hover:bg-slate-50 text-[11.5px] font-medium transition-colors"
                    >
                      <RefreshCw size={12} className={isDetectingModels ? 'animate-spin' : ''} />
                      <span>{isDetectingModels ? 'Scanning...' : 'Scan Ports'}</span>
                    </button>
                  </div>

                  {/* Ollama Status */}
                  <div className="p-3 rounded-lg bg-white border border-[#e2e8f0] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            ollamaRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-medium text-[#0f172a]">Ollama Engine (127.0.0.1:11434)</span>
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          ollamaRunning
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ollamaRunning ? 'Active & Ready' : 'Not Detected'}
                      </span>
                    </div>

                    {ollamaRunning ? (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11.5px] text-[#64748b]">
                          Found {ollamaModels.length} installed model(s):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ollamaModels.map((m) => (
                            <button
                              key={m.name}
                              onClick={() => onSelectModel(m.name)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] transition-colors ${
                                selectedModel === m.name
                                  ? 'border-[#1a73e8] bg-[#eff6ff] text-[#1a73e8] font-semibold'
                                  : 'border-[#e2e8f0] bg-[#f8fafc] text-[#334155] hover:border-slate-400'
                              }`}
                            >
                              <span>{m.name}</span>
                              <span className="text-[10px] text-slate-400">
                                ({(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)
                              </span>
                              {selectedModel === m.name && <Check size={12} className="text-[#1a73e8]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11.5px] text-[#64748b]">
                        Install or start Ollama (<code className="bg-slate-100 px-1 py-0.5 rounded">ollama serve</code>) to run local LLMs like Llama 3, DeepSeek-R1, and Mistral with 100% offline privacy.
                      </p>
                    )}
                  </div>

                  {/* LM Studio Status */}
                  <div className="p-3 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          lmstudioRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-medium text-[#0f172a]">LM Studio (127.0.0.1:1234)</span>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        lmstudioRunning
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {lmstudioRunning ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* 2. Cloud AI Provider API Keys */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eceef1] pb-2">
                    <div className="flex items-center gap-2">
                      <Cloud size={16} className="text-[#1a73e8]" />
                      <span className="font-semibold text-[#0f172a] text-[13.5px]">Cloud AI API Keys</span>
                    </div>
                    <span className="text-[11px] text-[#64748b] bg-slate-100 px-2 py-0.5 rounded">
                      Encrypted via Windows DPAPI
                    </span>
                  </div>

                  {/* Qwen / Alibaba DashScope */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="simple-icons:alibabacloud" className="w-3.5 h-3.5 text-orange-600" />
                        <label className="font-medium text-[#202124]">Qwen / DashScope API Key</label>
                        {qwenKey && (
                          <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <a
                        href="https://dashscope.console.aliyun.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#1a73e8] hover:underline"
                      >
                        DashScope Console
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showQwen ? 'text' : 'password'}
                        value={qwenKey}
                        onChange={(e) => setQwenKey(e.target.value)}
                        placeholder="sk-ws-..."
                        className="w-full pl-3 pr-10 py-2 bg-white border border-[#dadce0] rounded-lg font-mono text-[12px] outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowQwen(!showQwen)}
                        className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569]"
                      >
                        {showQwen ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#64748b]">
                      Powers Qwen Plus, Qwen Max, Qwen Turbo, and Qwen 2.5 72B with verified live synthesis.
                    </p>
                  </div>

                  {/* Google Gemini */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="simple-icons:googlegemini" className="w-3.5 h-3.5 text-blue-600" />
                        <label className="font-medium text-[#202124]">Google Gemini API Key</label>
                      </div>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#1a73e8] hover:underline"
                      >
                        Get Free Key (Google AI Studio)
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showGemini ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full pl-3 pr-10 py-2 bg-white border border-[#dadce0] rounded-lg font-mono text-[12px] outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGemini(!showGemini)}
                        className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569]"
                      >
                        {showGemini ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* OpenAI */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="simple-icons:openai" className="w-3.5 h-3.5 text-emerald-600" />
                        <label className="font-medium text-[#202124]">OpenAI API Key</label>
                      </div>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#1a73e8] hover:underline"
                      >
                        Get Key (OpenAI Platform)
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showOpenai ? 'text' : 'password'}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-proj-..."
                        className="w-full pl-3 pr-10 py-2 bg-white border border-[#dadce0] rounded-lg font-mono text-[12px] outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenai(!showOpenai)}
                        className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569]"
                      >
                        {showOpenai ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Anthropic Claude */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="simple-icons:anthropic" className="w-3.5 h-3.5 text-amber-700" />
                        <label className="font-medium text-[#202124]">Anthropic Claude API Key</label>
                      </div>
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#1a73e8] hover:underline"
                      >
                        Get Key (Anthropic Console)
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showAnthropic ? 'text' : 'password'}
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full pl-3 pr-10 py-2 bg-white border border-[#dadce0] rounded-lg font-mono text-[12px] outline-none focus:border-[#1a73e8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnthropic(!showAnthropic)}
                        className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-[#475569]"
                      >
                        {showAnthropic ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Save API Keys Button */}
                  <div className="flex items-center justify-between pt-2">
                    {savedStatus ? (
                      <span className="text-[12px] text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={15} />
                        <span>{savedStatus}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#64748b]">
                        Keys are never transmitted anywhere except directly to model endpoints.
                      </span>
                    )}
                    <button
                      onClick={handleSaveKeys}
                      className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
                    >
                      Save Keys to Vault
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: GENERAL & LOCAL STORAGE */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Storage Location Card */}
                <div className="p-4 rounded-xl bg-white border border-[#dadce0] space-y-3">
                  <div className="flex items-center gap-2 text-[#0f172a]">
                    <Folder size={16} className="text-[#1a73e8]" />
                    <span className="font-semibold text-[13.5px]">Local System Storage Directory</span>
                  </div>
                  <p className="text-[12px] text-[#5f6368] leading-relaxed">
                    Notelay saves your projects, attached PDF/source files, and compiled master markdown documents directly to this folder on your hard drive.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={storagePath || 'Loading storage location...'}
                      className="flex-1 px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg font-mono text-[12px] text-[#334155] select-all outline-none"
                    />
                    <button
                      onClick={handleBrowseStorageFolder}
                      className="px-3 py-2 bg-white hover:bg-slate-50 border border-[#cbd5e1] text-[#334155] font-medium text-xs rounded-lg transition-colors shrink-0"
                    >
                      Change Folder...
                    </button>
                  </div>
                </div>

                {/* Default Model */}
                <div className="space-y-2">
                  <label className="font-medium text-[#202124] block">Default Active Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => onSelectModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#dadce0] rounded-lg text-[#202124] outline-none focus:border-[#1a73e8]"
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.isLocal ? `[Local] ${m.name}` : `[Cloud] ${m.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Theme Mode */}
                <div className="pt-3 border-t border-[#eceef1]">
                  <label className="font-medium text-[#202124] block mb-2">Appearance</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'system'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setThemeMode(mode)}
                        className={`px-3 py-2 border rounded-lg capitalize transition-colors ${
                          themeMode === mode
                            ? 'border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8] font-medium'
                            : 'border-[#dadce0] hover:bg-[#f8f9fa] text-[#3c4043]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TERMINAL */}
            {activeTab === 'terminal' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-[#202124] block">Auto-approve safe terminal commands</label>
                    <p className="text-[12px] text-[#5f6368]">
                      Allow Notelay to run read and build commands automatically.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRunCommands}
                    onChange={(e) => setAutoRunCommands(e.target.checked)}
                    className="h-4 w-4 text-[#1a73e8] rounded border-gray-300"
                  />
                </div>

                <div className="pt-3 border-t border-[#eceef1]">
                  <label className="font-medium text-[#202124] block mb-1">Default Shell</label>
                  <p className="font-mono text-[12px] text-[#5f6368] bg-[#f1f3f4] p-2 rounded">
                    powershell.exe (Windows)
                  </p>
                </div>
              </div>
            )}

            {/* TAB: PRIVACY & VAULT */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-700 font-medium">
                  <ShieldCheck size={18} />
                  <span>Hardware-Level DPAPI Encryption</span>
                </div>
                <p className="text-[#5f6368] text-[12.5px] leading-relaxed">
                  Notelay encrypts all private API keys using Electron's native <code className="bg-slate-100 px-1 py-0.5 rounded">safeStorage</code> API backed by Windows Data Protection (DPAPI). Your credentials can only be decrypted on your personal PC and user login session.
                </p>
                <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#475569] space-y-1.5">
                  <div className="font-semibold text-[#0f172a]">Data Sovereignty Guarantee:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>All projects, notes, and diagrams are stored locally in your filesystem.</li>
                    <li>Zero cloud sync or telemetry telemetry of your private documents.</li>
                    <li>Ollama models run 100% locally with zero internet packets sent.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <span className="text-[11.5px] text-slate-500">Notelay v1.0.0 • Local Architecture</span>
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
    </Dialog>
  );
};
