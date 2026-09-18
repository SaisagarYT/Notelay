import React, { useState } from 'react';
import { NotebookStickyNote } from '../types';
import { Trash2, Pin, Check, Edit2 } from 'lucide-react';

interface NotebookStickyNoteCardProps {
  note: NotebookStickyNote;
  onUpdateText: (id: string, newText: string) => void;
  onUpdateColor: (id: string, color: 'yellow' | 'pink' | 'green' | 'blue') => void;
  onDelete: (id: string) => void;
}

export const NotebookStickyNoteCard: React.FC<NotebookStickyNoteCardProps> = ({
  note,
  onUpdateText,
  onUpdateColor,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);

  const colorStyles = {
    yellow: {
      bg: 'bg-[#fef08a]/90 dark:bg-[#fef08a]/20',
      border: 'border-[#fde047] dark:border-[#eab308]/60',
      text: 'text-[#713f12] dark:text-[#fef08a]',
      tape: 'bg-[#fef08a]/60',
      shadow: 'shadow-amber-200/50 dark:shadow-none',
    },
    pink: {
      bg: 'bg-[#fbcfe8]/90 dark:bg-[#fbcfe8]/20',
      border: 'border-[#f472b6] dark:border-[#ec4899]/60',
      text: 'text-[#831843] dark:text-[#fbcfe8]',
      tape: 'bg-[#fbcfe8]/60',
      shadow: 'shadow-pink-200/50 dark:shadow-none',
    },
    green: {
      bg: 'bg-[#bbf7d0]/90 dark:bg-[#bbf7d0]/20',
      border: 'border-[#86efac] dark:border-[#22c55e]/60',
      text: 'text-[#14532d] dark:text-[#bbf7d0]',
      tape: 'bg-[#bbf7d0]/60',
      shadow: 'shadow-emerald-200/50 dark:shadow-none',
    },
    blue: {
      bg: 'bg-[#bae6fd]/90 dark:bg-[#bae6fd]/20',
      border: 'border-[#7dd3fc] dark:border-[#0ea5e9]/60',
      text: 'text-[#0c4a6e] dark:text-[#bae6fd]',
      tape: 'bg-[#bae6fd]/60',
      shadow: 'shadow-sky-200/50 dark:shadow-none',
    },
  };

  const style = colorStyles[note.color] || colorStyles.yellow;

  const handleSave = () => {
    if (editText.trim()) {
      onUpdateText(note.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`relative rounded-xl border p-3 shadow-md transition-all select-text font-sans text-xs ${style.bg} ${style.border} ${style.shadow} group/sticky my-2`}
    >
      {/* Top Adhesive Strip */}
      <div
        className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-12 h-3 rounded-sm opacity-70 backdrop-blur-xs ${style.tape}`}
      />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-1 mb-2 select-none border-b border-black/5 pb-1">
        <div className="flex items-center gap-1">
          <Pin size={11} className={`${style.text} opacity-70`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.text} opacity-80`}>
            Sticky Note
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover/sticky:opacity-100 transition-opacity">
          {/* Color Switcher */}
          {(['yellow', 'pink', 'green', 'blue'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdateColor(note.id, c)}
              className={`w-2.5 h-2.5 rounded-full border border-black/10 transition-transform ${
                note.color === c ? 'scale-125 ring-1 ring-black/30' : 'hover:scale-110'
              } ${
                c === 'yellow'
                  ? 'bg-amber-300'
                  : c === 'pink'
                  ? 'bg-pink-300'
                  : c === 'green'
                  ? 'bg-emerald-300'
                  : 'bg-sky-300'
              }`}
              title={`Switch to ${c}`}
            />
          ))}

          <button
            type="button"
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            className={`p-1 rounded hover:bg-black/5 ${style.text}`}
            title={isEditing ? 'Save' : 'Edit note'}
          >
            {isEditing ? <Check size={11} /> : <Edit2 size={11} />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="p-1 rounded hover:bg-red-500/10 text-red-600 dark:text-red-400"
            title="Delete sticky note"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-1.5">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSave();
              }
            }}
            rows={3}
            autoFocus
            className={`w-full p-1.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-black/10 text-xs ${style.text} focus:outline-none resize-none leading-relaxed`}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[10px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <p
          onDoubleClick={() => setIsEditing(true)}
          className={`leading-relaxed whitespace-pre-wrap ${style.text} cursor-pointer`}
          title="Double-click to edit note"
        >
          {note.text}
        </p>
      )}

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between text-[9px] opacity-60 select-none">
        <span>{note.createdAt}</span>
        <span className="italic">Click to edit</span>
      </div>
    </div>
  );
};
