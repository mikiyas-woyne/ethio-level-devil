/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, ArrowRight, RotateCcw, Home, HelpCircle, Film, Sparkles, AlertCircle } from 'lucide-react';
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
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    const mil = Math.floor(ms % 1000).toString().padStart(3, '0');
    return `${m}:${s}.${mil}`;
  };

  const hasUnlockSecretEnding = isLastLevel && keysFoundCount === 10;

  // Funny roast depending on deaths
  const getRoast = () => {
    if (deaths === 0) return '🏅 PERFECT RUN! Are you a speedrunner?';
    if (deaths <= 2) return '👍 Decent. Only a few betrayals!';
    if (deaths <= 5) return '😐 You fell for the obvious traps, didn\'t you?';
    if (deaths <= 10) return '💀 Dying is part of the experience. A big part for you.';
    return '🔥 Pure Rage! Level Devil completely broke you.';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center text-white p-6 z-50 rounded-xl select-none backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -30 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm bg-neutral-900/90 border border-white/10 p-6 rounded-2xl text-center shadow-2xl flex flex-col items-center backdrop-blur-xl"
      >
        {/* Glow Stars Animation */}
        <div className="flex gap-2.5 mb-6 justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring' }}
          >
            <Star size={24} className="text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1.2, y: -4 }}
            transition={{ delay: 0.25, type: 'spring' }}
            className="relative"
          >
            <Star size={36} className="text-amber-400 fill-amber-400 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: 30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.35, type: 'spring' }}
          >
            <Star size={24} className="text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </motion.div>
        </div>

        <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-orange-500">
          Stage {levelNumber} Cleared
        </span>
        <h2 className="text-2xl font-black text-white mt-1.5 mb-5 tracking-wide">
          {levelName}
        </h2>

        {/* Scorecard Stats block */}
        <div className="w-full space-y-3 bg-neutral-950/60 border border-white/5 p-4 rounded-xl text-xs mb-5 font-sans">
          <div className="flex justify-between items-center text-neutral-400">
            <span>Deaths on level:</span>
            <strong className="text-red-400 font-mono font-bold text-sm">💀 {deaths}</strong>
          </div>
          {timeMs !== undefined && (
            <div className="flex justify-between items-center text-neutral-400">
              <span>Completed Time:</span>
              <strong className="text-amber-400 font-mono font-bold text-sm">⏱️ {formatTimer(timeMs)}</strong>
            </div>
          )}
          <div className="text-[10px] text-orange-400/90 font-bold border-t border-white/5 pt-2.5 text-center leading-normal">
            {getRoast()}
          </div>
        </div>

        {/* Custom secret true ending check message */}
        {isLastLevel && (
          <div className="w-full mb-5 p-3 rounded-xl text-xs font-bold leading-normal bg-amber-950/30 border border-amber-500/20 text-amber-200">
            {hasUnlockSecretEnding ? (
              <span className="flex items-center justify-center gap-1.5 animate-pulse">
                <Sparkles size={14} /> ALL 10 KEYS COLLECTED! ENTER TRUE ENDING...
              </span>
            ) : (
              <span>Locked: True Ending requires all 10 Golden Keys. Current: {keysFoundCount}/10</span>
            )}
          </div>
        )}

        {/* Buttons Nav controls */}
        <div className="w-full space-y-2">
          {!isLastLevel && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                audio.playSFX('click');
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 border border-orange-400/20 rounded-xl text-xs font-extrabold text-white transition shadow-lg shadow-orange-950/20 cursor-pointer"
            >
              Next Level <ArrowRight size={14} />
            </motion.button>
          )}

          {isLastLevel && hasUnlockSecretEnding && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                audio.playSFX('click');
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/20 rounded-xl text-xs font-extrabold text-white transition shadow-lg shadow-purple-950/20 cursor-pointer animate-pulse"
            >
              TRUE SECRET ENDING <Trophy size={14} />
            </motion.button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                audio.playSFX('click');
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition text-neutral-200 cursor-pointer"
            >
              <RotateCcw size={13} /> Replay
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                audio.playSFX('click');
                onMainMenu();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition text-neutral-200 cursor-pointer"
            >
              <Home size={13} /> Menu
            </motion.button>
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
          onSkipConfirm(); // skip once ad completed!
          return 100;
        }
        return prev + 1.5;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [isPlayingAd]);

  return (
    <AnimatePresence>
      <div className="absolute bottom-4 right-4 z-40">
        {!isPlayingAd ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="bg-neutral-900/90 border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 text-white max-w-[280px] font-sans backdrop-blur-xl border-l-4 border-l-orange-500"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
              <HelpCircle size={20} />
            </div>
            <div className="flex-grow text-left">
              <div className="text-xs font-bold text-neutral-100">Stuck on this level?</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Skip this level for free</div>
              <div className="flex gap-2 mt-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startAdSkip}
                  className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 font-bold rounded-lg text-[10px] text-white transition cursor-pointer"
                >
                  <Film size={10} /> Skip Stage
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    audio.playSFX('click');
                    onDismiss();
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-neutral-400 border border-white/5 transition cursor-pointer"
                >
                  Cancel
                </motion.button>
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
              {/* Premium Simulated Brand Header */}
              <div className="flex items-center justify-center gap-2 mb-8 bg-white/5 border border-white/5 py-2 px-4 rounded-xl max-w-xs mx-auto text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <AlertCircle size={12} className="text-orange-500" /> Sponsored Promotion
              </div>

              <div className="w-20 h-20 bg-neutral-900 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-orange-500 animate-bounce text-3xl shadow-xl shadow-orange-950/10">
                📺
              </div>
              <h3 className="text-xl font-black mb-1.5 tracking-wide">LEVEL DEVIL ADVISORY</h3>
              <p className="text-xs text-neutral-400 mb-8 max-w-xs mx-auto leading-relaxed">
                Skipping level... Rewarded skip will be granted immediately when progress finishes.
              </p>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-neutral-900 border border-white/5 rounded-full overflow-hidden mb-3 p-[2px]">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                  style={{ width: `${adProgress}%` }}
                />
              </div>

              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-right font-bold">
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
      className="absolute inset-0 bg-neutral-950/80 flex flex-col items-center justify-center text-white p-6 z-50 rounded-xl select-none backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="w-full max-w-xs bg-neutral-900/90 border border-white/10 p-6 rounded-2xl text-center shadow-2xl backdrop-blur-xl"
      >
        <h2 className="text-xl font-black mb-6 text-neutral-200 tracking-wider uppercase flex items-center justify-center gap-2">
          ⏸️ PAUSED
        </h2>

        <div className="space-y-2.5 flex flex-col">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playSFX('click');
              onKeepPlaying();
            }}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 border border-orange-400/20 rounded-xl text-xs font-extrabold transition text-white cursor-pointer shadow-lg shadow-orange-950/10"
          >
            Resume Game
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playSFX('click');
              onRestart();
            }}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition text-neutral-100 cursor-pointer"
          >
            Restart Level (R)
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              audio.playSFX('click');
              onMainMenu();
            }}
            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition text-neutral-300 cursor-pointer"
          >
            Exit to Main Menu
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
