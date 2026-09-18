import React, { useState } from 'react';
import { Search, MessageSquare, Clock, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Conversation } from '../types';
import { Dialog } from './ui/dialog';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Record<string, Conversation>;
  onSelectConversation: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
}) => {
  const [search, setSearch] = useState('');

  const convList = Object.values(conversations).filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.projectId.toLowerCase().includes(search.toLowerCase())
  );

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
              Knowledge History
            </h2>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-normal">
              Review and jump back into past project knowledge sessions
            </p>
          </div>
        </div>
      }
    >
      {/* Search */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search past conversations..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 transition-all"
            autoFocus
          />
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
        {convList.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No conversations matched your search query.
          </div>
        ) : (
          convList.map((conv) => (
            <motion.div
              key={conv.id}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                onSelectConversation(conv.id);
                onClose();
              }}
              className="group flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-all shadow-2xs"
            >
              <div className="flex items-start gap-3 truncate">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                  <MessageSquare size={16} />
                </div>
                <div className="truncate">
                  <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {conv.title}
                  </h4>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    Workspace: <span className="font-mono text-slate-600 dark:text-slate-300">{conv.projectId}</span> • {conv.createdAt}
                  </p>
                </div>
              </div>

              <div className="text-slate-400 group-hover:text-blue-600 flex-shrink-0 ml-2">
                <ArrowUpRight size={16} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Dialog>
  );
};

export default HistoryModal;
