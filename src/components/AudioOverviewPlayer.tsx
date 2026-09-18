import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MasterDocument, PodcastEpisode } from '../types';
import { generatePodcastScript } from '../utils/podcastGenerator';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  FileText,
  Radio,
  GraduationCap,
} from 'lucide-react';
import { Badge } from './ui/badge';

interface AudioOverviewPlayerProps {
  document: MasterDocument;
  isOpen: boolean;
  onClose: () => void;
  onSyncNotebookSection?: (chapterNumber: number, sectionId?: string) => void;
}

export const AudioOverviewPlayer: React.FC<AudioOverviewPlayerProps> = ({
  document,
  isOpen,
  onClose,
  onSyncNotebookSection,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<number | 'ALL'>('ALL');
  const [mode, setMode] = useState<'podcast' | 'lecture'>('podcast');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Generate episode script
  const episode: PodcastEpisode = useMemo(() => {
    return generatePodcastScript(document, selectedChapter, mode);
  }, [document, selectedChapter, mode]);

  const currentTurn = episode.dialogue[currentTurnIndex] || null;

  // Speech Synthesis References
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  // Load system voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        voicesRef.current = window.speechSynthesis.getVoices();
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Sync with notebook canvas when turn changes
  useEffect(() => {
    if (currentTurn && currentTurn.chapterNumber && onSyncNotebookSection) {
      onSyncNotebookSection(currentTurn.chapterNumber, currentTurn.sectionId);
    }
  }, [currentTurnIndex, currentTurn, onSyncNotebookSection]);

  // Execute speech utterance for a specific turn index
  const speakTurn = useCallback((turnIdx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    if (turnIdx >= episode.dialogue.length) {
      setIsPlaying(false);
      setCurrentTurnIndex(0);
      return;
    }

    const turn = episode.dialogue[turnIdx];
    if (!turn) return;

    setCurrentTurnIndex(turnIdx);

    if (isMutedRef.current) return;

    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.rate = speedRef.current;

    // Pick distinct voice profiles for Alex vs Sam
    const voices = voicesRef.current;
    if (turn.speaker === 'Alex') {
      utterance.pitch = 1.12; // Slightly higher, bright inquisitive pitch
      const femaleOrAltVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google US English'))
      );
      if (femaleOrAltVoice) utterance.voice = femaleOrAltVoice;
    } else {
      utterance.pitch = 0.92; // Slightly deeper, measured explanatory pitch
      const maleOrBaseVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Natural'))
      );
      if (maleOrBaseVoice) utterance.voice = maleOrBaseVoice;
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        // Automatically progress to next dialogue turn
        speakTurn(turnIdx + 1);
      }
    };

    utterance.onerror = (e) => {
      // Ignore interruption cancels
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('SpeechSynthesis error:', e);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [episode.dialogue]);

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakTurn(currentTurnIndex);
    }
  };

  const handleNextTurn = () => {
    const next = Math.min(episode.dialogue.length - 1, currentTurnIndex + 1);
    setCurrentTurnIndex(next);
    if (isPlaying) speakTurn(next);
  };

  const handlePrevTurn = () => {
    const prev = Math.max(0, currentTurnIndex - 1);
    setCurrentTurnIndex(prev);
    if (isPlaying) speakTurn(prev);
  };

  const handleRestart = () => {
    setCurrentTurnIndex(0);
    if (isPlaying) speakTurn(0);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      speakTurn(currentTurnIndex);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else if (!next && isPlaying) {
        speakTurn(currentTurnIndex);
      }
      return next;
    });
  };

  // Cleanup speech on unmount or close
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-200/80 dark:border-blue-900/80 shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Transcript Drawer */}
      {showTranscript && (
        <div className="max-h-60 overflow-y-auto p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>Audio Transcript ({episode.dialogue.length} turns)</span>
            <button
              onClick={() => setShowTranscript(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
          {episode.dialogue.map((t, idx) => {
            const isCurrent = idx === currentTurnIndex;
            return (
              <div
                key={t.id}
                onClick={() => {
                  setCurrentTurnIndex(idx);
                  if (isPlaying) speakTurn(idx);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer flex items-start gap-2 ${
                  isCurrent
                    ? 'bg-blue-100/70 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    t.speaker === 'Alex'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {t.speaker}
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Player Body */}
      <div className="p-3.5 space-y-3">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Radio size={14} className={isPlaying ? 'animate-pulse' : ''} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {episode.title}
                </span>
                <Badge variant="secondary" className="text-[9.5px] px-1.5 py-0 h-4 uppercase">
                  ~{Math.round(episode.durationEstimateSeconds / 60)} min
                </Badge>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                {currentTurn?.sectionTitle || currentTurn?.chapterTitle || document.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10.5px]">
              <button
                onClick={() => {
                  setMode('podcast');
                  if (isPlaying) {
                    window.speechSynthesis.cancel();
                    setIsPlaying(false);
                  }
                }}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  mode === 'podcast'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <Radio size={11} />
                <span>Podcast</span>
              </button>
              <button
                onClick={() => {
                  setMode('lecture');
                  if (isPlaying) {
                    window.speechSynthesis.cancel();
                    setIsPlaying(false);
                  }
                }}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  mode === 'lecture'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                <GraduationCap size={11} />
                <span>Lecture</span>
              </button>
            </div>

            {/* Chapter Filter */}
            <select
              value={selectedChapter}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10);
                setSelectedChapter(val);
                setCurrentTurnIndex(0);
                if (isPlaying) {
                  window.speechSynthesis.cancel();
                  setIsPlaying(false);
                }
              }}
              className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Chapters</option>
              {document.chapters.map((ch) => (
                <option key={ch.id} value={ch.chapterNumber}>
                  Ch. {ch.chapterNumber}
                </option>
              ))}
            </select>

            <button
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Close Player"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Spoken Subtitle with Active Speaker Badge */}
        <div className="bg-blue-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-blue-100 dark:border-slate-800 flex items-start gap-2.5">
          {/* Animated Audio Frequency Bars */}
          <div className="flex items-end gap-0.5 h-6 pt-1 shrink-0">
            {[1, 2, 3, 4, 5].map((bar) => (
              <span
                key={bar}
                style={{
                  height: isPlaying ? `${Math.max(20, (bar * 20) % 100)}%` : '20%',
                  animationDuration: `${0.4 + bar * 0.15}s`,
                }}
                className={`w-1 rounded-full bg-blue-600 dark:bg-blue-400 transition-all ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
              />
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  currentTurn?.speaker === 'Alex'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {currentTurn?.speaker} 🎙️
              </span>
              <span className="text-[10px] text-slate-400">
                Turn {currentTurnIndex + 1} of {episode.dialogue.length}
              </span>
            </div>
            <p className="text-[12.5px] text-slate-800 dark:text-slate-200 font-sans leading-relaxed line-clamp-2">
              "{currentTurn?.text}"
            </p>
          </div>
        </div>

        {/* Player Controls Bar */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Left: Speed Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10.5px]">
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  playbackSpeed === s
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Restart from beginning"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={handlePrevTurn}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Previous Turn"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={handleNextTurn}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Next Turn"
            >
              <SkipForward size={16} />
            </button>
            <button
              onClick={handleToggleMute}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          {/* Right: Transcript Button */}
          <button
            onClick={() => setShowTranscript((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-lg border transition-colors cursor-pointer ${
              showTranscript
                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText size={12} />
            <span>Script</span>
          </button>
        </div>
      </div>
    </div>
  );
};
