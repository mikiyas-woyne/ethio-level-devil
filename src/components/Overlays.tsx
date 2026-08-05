/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, ArrowRight, RotateCcw, Home, HelpCircle, Film } from 'lucide-react';
import { audio } from '../utils/audio';

interface LevelCompleteOverlayProps {
  levelName: string;
  levelNumber: number;
  deaths: number;
  timeMs?: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
  isLastLevel: boolean;
  keysFoundCount: number;
}

export const LevelCompleteOverlay: React.FC<LevelCompleteOverlayProps> = ({
  levelName,
  levelNumber,
  deaths,
  timeMs,
  onNextLevel,
  onReplay,
  onMainMenu,
  isLastLevel,
  keysFoundCount,
}) => {
  // Format speedrun timer
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    const mil = Math.floor(ms % 1000).toString().padStart(3, '0');
    return `${m}:${s}.${mil}`;
  };

  const hasUnlockSecretEnding = isLastLevel && keysFoundCount === 10;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-neutral-950/85 flex flex-col items-center justify-center text-white p-6 z-50 rounded-lg select-none"
    >
      <motion.div
        initial={{ scale: 0.9, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -15 }}
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-6 rounded-xl text-center shadow-2xl flex flex-col items-center"
      >
        {/* Glow Stars Animation */}
        <div className="flex gap-2 mb-4 justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
          >
            <Star size={24} className="text-amber-500 fill-amber-500" />
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1.3 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative"
          >
            <Star size={32} className="text-amber-500 fill-amber-500 -mt-2" />
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <Star size={24} className="text-amber-500 fill-amber-500" />
          </motion.div>
        </div>

        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500">
          Stage {levelNumber} Cleared
        </span>
        <h2 className="text-2xl font-display font-bold text-neutral-100 mt-1 mb-6">
          {levelName}
        </h2>

        {/* Scorecard Stats block */}
        <div className="w-full space-y-2.5 bg-neutral-950/60 border border-neutral-850 p-4 rounded-lg text-sm mb-6 font-sans">
          <div className="flex justify-between items-center text-neutral-400">
            <span>Deaths on level:</span>
            <strong className="text-rose-400 font-mono font-bold">💀 {deaths}</strong>
          </div>
          {timeMs !== undefined && (
            <div className="flex justify-between items-center text-neutral-400">
              <span>Completed Time:</span>
              <strong className="text-amber-400 font-mono font-bold">⏱️ {formatTimer(timeMs)}</strong>
            </div>
          )}
        </div>

        {/* Custom secret true ending check message */}
        {isLastLevel && (
          <div className="mb-6 p-3 rounded-lg text-xs font-semibold leading-relaxed bg-amber-950/40 border border-amber-900/50 text-amber-200">
            {hasUnlockSecretEnding ? (
              <span>👑 ALL 10 KEYS COLLECTED! Entering the True Simulation Glitch Ending...</span>
            ) : (
              <span>🔒 Secret Ending Locked. Collect all 10 Golden Keys hidden in preceding worlds. Current: {keysFoundCount}/10</span>
            )}
          </div>
        )}

        {/* Buttons Nav controls */}
        <div className="w-full space-y-2">
          {!isLastLevel && (
            <button
              onClick={() => {
                audio.playSFX('click');
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border border-orange-500 rounded-lg text-sm font-bold text-white transition shadow-lg shadow-orange-950/30"
            >
              Next Level <ArrowRight size={16} />
            </button>
          )}

          {isLastLevel && hasUnlockSecretEnding && (
            <button
              onClick={() => {
                audio.playSFX('click');
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500 rounded-lg text-sm font-bold text-white transition shadow-lg shadow-purple-950/30"
            >
              TRUE SECRET ENDING <Trophy size={16} />
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                audio.playSFX('click');
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-semibold transition text-neutral-200"
            >
              <RotateCcw size={14} /> Replay
            </button>
            <button
              onClick={() => {
                audio.playSFX('click');
                onMainMenu();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs font-semibold transition text-neutral-200"
            >
              <Home size={14} /> Menu
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface SkipPromptOverlayProps {
  onSkipConfirm: () => void;
  onDismiss: () => void;
}

export const SkipPromptOverlay: React.FC<SkipPromptOverlayProps> = ({
  onSkipConfirm,
  onDismiss,
}) => {
  const [isPlayingAd, setIsPlayingAd] = useState<boolean>(false);
  const [adProgress, setAdProgress] = useState<number>(0);

  const startAdSkip = () => {
    audio.playSFX('click');
    setIsPlayingAd(true);
    setAdProgress(0);
  };

  useEffect(() => {
    if (!isPlayingAd) return;

    // Simulate Poki/Rewarded ad timer (3 seconds)
    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onSkipConfirm(); // confirm skip once ad completed!
          return 100;
        }
        return prev + 1.5; // slow build
      });
    }, 45);

    return () => clearInterval(interval);
  }, [isPlayingAd]);

  return (
    <AnimatePresence>
      <div className="absolute bottom-4 right-4 z-40">
        {!isPlayingAd ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-2xl flex items-center gap-4 text-white max-w-xs font-sans border-l-4 border-l-orange-500"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-950 flex items-center justify-center text-orange-500">
              <HelpCircle size={20} />
            </div>
            <div className="flex-grow text-left">
              <div className="text-xs font-bold text-neutral-200">Stuck on this level?</div>
              <div className="text-[10px] text-neutral-500">Skip this level for free</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={startAdSkip}
                  className="flex items-center gap-1 px-2.5 py-1 bg-orange-600 hover:bg-orange-500 font-bold rounded text-[10px] text-white transition"
                >
                  <Film size={10} /> Skip Level
                </button>
                <button
                  onClick={() => {
                    audio.playSFX('click');
                    onDismiss();
                  }}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] text-neutral-400 transition"
                >
                  No, thanks
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* High-Fidelity Poki-Style Fake Ad Player Overlay */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-neutral-950 z-50 flex flex-col items-center justify-center p-6 select-none"
          >
            <div className="w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-500 animate-pulse text-2xl">
                📺
              </div>
              <h3 className="text-lg font-display font-bold mb-1">PROMOTIONAL OFFER</h3>
              <p className="text-xs text-neutral-500 mb-6 font-sans">
                Skipping level... Ad will finish in a few seconds.
              </p>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: `${adProgress}%` }}
                />
              </div>

              <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest text-right">
                {Math.ceil((100 - adProgress) / 30)}s REMAINING
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

interface PauseOverlayProps {
  onKeepPlaying: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  onKeepPlaying,
  onRestart,
  onMainMenu,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-neutral-950/85 flex flex-col items-center justify-center text-white p-6 z-50 rounded-lg select-none"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-xs bg-neutral-900 border border-neutral-850 p-6 rounded-xl text-center shadow-2xl"
      >
        <h2 className="text-xl font-display font-bold mb-6 text-neutral-300 tracking-wider uppercase">
          ⏸️ PAUSED
        </h2>

        <div className="space-y-2 flex flex-col">
          <button
            onClick={() => {
              audio.playSFX('click');
              onKeepPlaying();
            }}
            className="w-full px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 rounded-lg text-xs font-bold transition text-neutral-100"
          >
            Resume Game
          </button>
          <button
            onClick={() => {
              audio.playSFX('click');
              onRestart();
            }}
            className="w-full px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 rounded-lg text-xs font-bold transition text-neutral-100"
          >
            Restart Level (R)
          </button>
          <button
            onClick={() => {
              audio.playSFX('click');
              onMainMenu();
            }}
            className="w-full px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-750 rounded-lg text-xs font-bold transition text-neutral-100"
          >
            Exit to Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
