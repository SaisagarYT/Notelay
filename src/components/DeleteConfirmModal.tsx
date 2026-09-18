import React from 'react';
import { AlertTriangle, Trash2, Archive, Folder, FileText } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { DeleteModalTarget } from '../store/useAppStore';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  target: DeleteModalTarget | null;
  onClose: () => void;
  onSoftDelete: (projectId: string, sourceId?: string) => void;
  onHardDelete: (projectId: string, sourceId?: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  target,
  onClose,
  onSoftDelete,
  onHardDelete,
}) => {
  if (!target) return null;

  const isFolder = target.type === 'project';

  const handleSoftDelete = () => {
    onSoftDelete(target.projectId, target.sourceId);
    onClose();
  };

  const handleHardDelete = () => {
    onHardDelete(target.projectId, target.sourceId);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              {isFolder ? 'Delete Project Workspace' : 'Delete Source Document'}
            </h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Select deletion mode
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-4 text-[13px]">
        {/* Item Target Display */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 shadow-2xs">
            {isFolder ? <Folder size={16} className="text-amber-600" /> : <FileText size={16} className="text-blue-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">
              {isFolder ? 'Project Workspace' : 'Source File'}
            </span>
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">{target.name}</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {/* Option 1: Soft Delete */}
          <button
            onClick={handleSoftDelete}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/80 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors mt-0.5">
              <Archive size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Move to Trash (Soft Delete)
                </span>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                  Recommended
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Safely removes it to the Trash Bin. You can restore it anytime with 1 click.
              </p>
            </div>
          </button>

          {/* Option 2: Hard Delete */}
          <button
            onClick={handleHardDelete}
            className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-all flex items-start gap-3 group cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60 text-slate-600 dark:text-slate-300 group-hover:text-rose-600 flex items-center justify-center shrink-0 transition-colors mt-0.5">
              <Trash2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">
                Permanently Delete (Hard Delete)
              </span>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Irreversibly deletes this item from disk and vault storage.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmModal;
