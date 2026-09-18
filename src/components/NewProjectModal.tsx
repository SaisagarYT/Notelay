import React, { useState } from 'react';
import { FolderPlus, FolderSearch } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { triggerMicroBurst } from './ui/particle-burst';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => void;
  onBrowseFolder?: () => Promise<string | null>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onBrowseFolder,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if ('clientX' in e && (e as any).clientX) {
      triggerMicroBurst((e as any).clientX, (e as any).clientY, '#2563eb');
    }
    onCreateProject(name.trim());
    setName('');
    onClose();
  };

  const handleBrowse = async () => {
    if (onBrowseFolder) {
      const folderName = await onBrowseFolder();
      if (folderName) {
        onClose();
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <FolderPlus size={18} />
          </div>
          <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            Add Project Workspace
          </span>
        </div>
      }
      description="Create a dedicated project workspace or open an existing directory."
    >
      <div className="p-6 space-y-4 text-[13px]">
        {/* Quick Native Folder Browser */}
        <button
          type="button"
          onClick={handleBrowse}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed hover:border-blue-500 rounded-xl text-slate-800 dark:text-slate-200 font-medium transition-all group cursor-pointer"
        >
          <FolderSearch size={16} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Open Existing Folder from PC...</span>
        </button>

        <div className="flex items-center gap-2 text-slate-400">
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 flex-1" />
          <span className="text-[11px] font-medium uppercase tracking-wider">or create workspace</span>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI-Research-Notes"
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 transition-all text-[13.5px]"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={!name.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default NewProjectModal;
