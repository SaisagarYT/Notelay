import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Clipboard, Pin, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SourceFile } from '../types';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { triggerMicroBurst } from './ui/particle-burst';

interface SourceFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId?: string;
  sources?: SourceFile[];
  onAddSources: (newSources: SourceFile[]) => void;
  onTogglePinSource?: (projectId: string, sourceId: string) => void;
  onDeleteSource?: (target: {
    type: 'source';
    projectId: string;
    sourceId: string;
    name: string;
  }) => void;
}

export const SourceFilesModal: React.FC<SourceFilesModalProps> = ({
  isOpen,
  onClose,
  projectName,
  projectId = '',
  sources = [],
  onAddSources,
  onTogglePinSource,
  onDeleteSource,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'current'>('upload');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nonDeletedSources = sources.filter((s) => !s.isDeleted);

  const handleNativeSelectFiles = async (e?: React.MouseEvent) => {
    if (window.electronAPI?.selectFiles) {
      try {
        setIsProcessing(true);
        const files = await window.electronAPI.selectFiles();
        if (files && files.length > 0) {
          if (e) triggerMicroBurst(e.clientX, e.clientY, '#2563eb');
          const newSources: SourceFile[] = files.map((f) => ({
            id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: f.name,
            type: (['pdf', 'doc', 'txt', 'md'].includes(f.ext) ? f.ext : 'raw') as any,
            size: f.size,
            uploadedAt: 'Just now',
            content: f.content,
            path: f.path,
            tokenCount: Math.ceil(f.content.length / 4),
          }));
          onAddSources(newSources);
          onClose();
        }
      } catch (err) {
        console.error('Failed to pick files:', err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleHtmlFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const sourcePromises: Promise<SourceFile>[] = Array.from(files).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = typeof reader.result === 'string' ? reader.result : '';
          const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
          resolve({
            id: `source-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: (['pdf', 'doc', 'txt', 'md'].includes(ext) ? ext : 'raw') as any,
            size: file.size,
            uploadedAt: 'Just now',
            content,
            tokenCount: Math.ceil(content.length / 4),
          });
        };
        reader.readAsText(file);
      });
    });

    Promise.all(sourcePromises).then((newSources) => {
      onAddSources(newSources);
      onClose();
    });
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    const newSource: SourceFile = {
      id: `source-${Date.now()}`,
      name: pasteTitle.trim() || `Notes ${new Date().toLocaleDateString()}`,
      type: 'txt',
      size: pasteContent.length,
      uploadedAt: 'Just now',
      content: pasteContent.trim(),
      tokenCount: Math.ceil(pasteContent.length / 4),
    };

    onAddSources([newSource]);
    setPasteTitle('');
    setPasteContent('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText size={16} />
          </div>
          <div>
            <h2 className="text-[14.5px] font-semibold text-slate-900 dark:text-slate-100">
              Knowledge Sources & Documents
            </h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Manage documents, lecture notes, and PDFs attached to {projectName}
            </p>
          </div>
        </div>
      }
    >
      {/* Tab Switcher with Motion Sliding Pill */}
      <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 px-6 py-2 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium text-slate-600">
        {(
          [
            { id: 'upload', label: 'Upload Files & PDFs', icon: <UploadCloud size={13} /> },
            { id: 'paste', label: 'Paste Raw Notes', icon: <Clipboard size={13} /> },
            { id: 'current', label: `Current Sources (${nonDeletedSources.length})`, icon: <FileText size={13} /> },
          ] as const
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
                  layoutId="sourcesTab"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs border border-slate-200/60 dark:border-slate-700 z-[-1]"
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleHtmlFileInput}
          multiple
          className="hidden"
          accept=".pdf,.txt,.md,.doc,.docx"
        />

        {/* Tab 1: Upload Files */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  fileInputRef.current!.files = e.dataTransfer.files;
                  handleHtmlFileInput({
                    target: fileInputRef.current!,
                  } as React.ChangeEvent<HTMLInputElement>);
                }
              }}
              onClick={handleNativeSelectFiles}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-900/40'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <UploadCloud size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'Reading and Extracting File Content...' : 'Choose files or drag & drop here'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports PDF, Markdown (.md), Plain Text (.txt), and Word documents
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 bg-white dark:bg-slate-800 shadow-xs"
                disabled={isProcessing}
              >
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: Paste Raw Notes */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Title (Optional)
              </label>
              <input
                type="text"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Lecture Notes"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Raw Text Content
              </label>
              <textarea
                rows={6}
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste notes, transcripts, or reference summaries here..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                type="submit"
                disabled={!pasteContent.trim()}
              >
                Add Notes
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Current Sources */}
        {activeTab === 'current' && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {nonDeletedSources.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                No sources attached to this workspace yet.
              </div>
            ) : (
              nonDeletedSources.map((source) => (
                <div
                  key={source.id}
                  className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 break-all" title={source.name}>
                          {source.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{source.type?.toUpperCase()}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {source.size} • {source.uploadedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {onTogglePinSource && projectId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onTogglePinSource(projectId, source.id)}
                        className={`h-7 w-7 ${source.isPinned ? 'text-blue-600' : 'text-slate-400'}`}
                      >
                        <Pin size={12} className={source.isPinned ? 'rotate-45' : ''} />
                      </Button>
                    )}
                    {onDeleteSource && projectId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          onDeleteSource({
                            type: 'source',
                            projectId,
                            sourceId: source.id,
                            name: source.name,
                          })
                        }
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SourceFilesModal;
