import React, { useState } from 'react';
import { Clock, CheckCircle2, PauseCircle, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduledTask } from '../store/useAppStore';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { triggerMicroBurst } from './ui/particle-burst';

interface ScheduledTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduledTask[];
  onAddTask?: (task: ScheduledTask) => void;
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  activeProjectName?: string;
}

export const ScheduledTasksModal: React.FC<ScheduledTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  activeProjectName = 'Notelay',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskCron, setTaskCron] = useState('0 9 * * 1');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    if ('clientX' in e && (e as any).clientX) {
      triggerMicroBurst((e as any).clientX, (e as any).clientY, '#10b981');
    }

    onAddTask?.({
      id: 'task-' + Date.now(),
      name: taskName.trim(),
      cron: taskCron.trim() || '0 0 * * *',
      target: activeProjectName,
      status: 'Active',
      lastRun: 'Never',
      nextRun: 'Scheduled',
    });
    setTaskName('');
    setIsAdding(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              Scheduled Tasks & Automation
            </h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Configure automated background routines, syncs, and summaries
            </p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-4 text-[13px]">
        <div className="flex justify-end">
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="text-xs"
            >
              <Plus size={13} className="mr-1.5" />
              <span>Schedule New Task</span>
            </Button>
          )}
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3 overflow-hidden shadow-2xs"
            >
              <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                Schedule New Recurring Task
              </h4>
              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. Daily Document Synthesis or Workspace Backup"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={taskCron}
                  onChange={(e) => setTaskCron(e.target.value)}
                  placeholder="0 9 * * 1 (Every Monday at 9:00 AM)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-mono outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={!taskName.trim()}
                >
                  Save Schedule
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Task List */}
        <div className="space-y-2 max-h-[48vh] overflow-y-auto custom-scrollbar">
          {tasks.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No scheduled automation tasks configured yet.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {task.name}
                      </span>
                      <Badge
                        variant={task.status === 'Active' ? 'success' : 'secondary'}
                        dot
                        className="text-[10px]"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Cron: {task.cron} • Target: {task.target}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  {onToggleTask && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleTask(task.id)}
                      className="text-xs"
                    >
                      {task.status === 'Active' ? (
                        <>
                          <PauseCircle size={12} className="mr-1 text-amber-500" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} className="mr-1 text-emerald-500" />
                          <span>Resume</span>
                        </>
                      )}
                    </Button>
                  )}

                  {onDeleteTask && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteTask(task.id)}
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
      </div>
    </Dialog>
  );
};

export default ScheduledTasksModal;
