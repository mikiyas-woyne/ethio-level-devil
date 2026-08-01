/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings, SavedProgress } from '../types';
import { allLevelsList, totalAvailableLevels } from '../data/levels';
import { audio } from '../utils/audio';
import { Volume2, Settings, Play, Users, Trophy, ChevronLeft, Star, Key, RefreshCw, Lock } from 'lucide-react';

interface MainMenuProps {
  progress: SavedProgress;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onSelectLevel: (levelId: number, isCoop: boolean) => void;
  onResetProgress: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  settings,
  onUpdateSettings,
  onSelectLevel,
  onResetProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'level-select' | 'settings' | 'keys-vault'>('main');
  const [coopMode, setCoopMode] = useState<boolean>(false);

  // Group levels by world
  const worlds: Record<string, typeof allLevelsList> = {
    PITS: allLevelsList.filter((l) => l.world === 'PITS'),
    COINS: allLevelsList.filter((l) => l.world === 'COINS'),
    SPRINGS: allLevelsList.filter((l) => l.world === 'SPRINGS'),
    GRAVITY: allLevelsList.filter((l) => l.world === 'GRAVITY'),
    WRAPAROUND: allLevelsList.filter((l) => l.world === 'WRAPAROUND'),
    INVERT: allLevelsList.filter((l) => l.world === 'INVERT'),
    FINAL: allLevelsList.filter((l) => l.world === 'FINAL'),
  };

  const handlePlayLevel = (levelId: number) => {
    audio.playSFX('click');
    onSelectLevel(levelId, coopMode);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    audio.playSFX('click');
    setActiveTab(tab);
  };

  const keysFoundCount = progress.keysCollected.filter(Boolean).length;

  return (
    <div id="main-menu-container" className="glass-panel relative w-full max-w-3xl mx-auto min-h-[580px] flex flex-col justify-between p-8 text-white overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)]">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4 z-10">
        <motion.div 
          onClick={() => handleTabChange('main')}
          className="flex items-center gap-3 cursor-pointer group"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center rounded-xl text-lg font-bold shadow-lg shadow-orange-950/40">
            😈
          </div>
          <span className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-neutral-50 to-neutral-200 bg-clip-text text-transparent">
            LEVEL DEVIL
          </span>
        </motion.div>

        <div className="flex gap-2">
          {activeTab !== 'main' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabChange('main')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10 transition"
            >
              <ChevronLeft size={14} /> Back
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTabChange('keys-vault')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition ${
              activeTab === 'keys-vault'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-neutral-950 shadow-lg shadow-amber-950/20'
                : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
            }`}
          >
            <Key size={14} className={keysFoundCount > 0 ? 'text-amber-300 animate-pulse' : 'text-neutral-400'} />
            Vault ({keysFoundCount}/10)
          </motion.button>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="flex-grow flex flex-col justify-center my-6 z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="text-center flex flex-col items-center justify-center"
            >
              <div className="mb-10 text-center">
                <motion.h1 
                  className="text-7xl font-black tracking-tight bg-gradient-to-b from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent filter drop-shadow-[0_4px_16px_rgba(255,94,34,0.15)] glow-text-orange"
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 100 }}
                >
                  LEVEL DEVIL
                </motion.h1>
                <div className="text-[10px] font-mono tracking-[0.35em] text-orange-500/80 uppercase font-extrabold mt-3">
                  ⚠️ NOT A TROLL GAME. TRUST US.
                </div>
              </div>

              {/* Game Modes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-xl mb-10">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCoopMode(false);
                    handleTabChange('level-select');
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neutral-900/40 border border-white/5 hover:border-orange-500/40 hover:bg-neutral-900/60 transition-all text-center cursor-pointer shadow-lg hover:shadow-orange-950/20"
                >
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:bg-orange-500/20">
                    <Play size={24} className="fill-orange-400/20" />
                  </div>
                  <span className="font-extrabold text-base text-neutral-100">Single Player</span>
                  <span className="text-[11px] text-neutral-400 mt-2 max-w-[200px] leading-relaxed">
                    Test your reflexes against invisible traps and surprises.
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCoopMode(true);
                    handleTabChange('level-select');
                  }}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neutral-900/40 border border-white/5 hover:border-emerald-500/40 hover:bg-neutral-900/60 transition-all text-center cursor-pointer shadow-lg hover:shadow-emerald-950/20"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/20">
                    <Users size={24} className="fill-emerald-400/20" />
                  </div>
                  <span className="font-extrabold text-base text-neutral-100">Local Co-Op</span>
                  <span className="text-[11px] text-emerald-400 mt-2 max-w-[200px] leading-relaxed">
                    2 players local play. Both must survive to win!
                  </span>
                </motion.button>
              </div>

              {/* Auxiliary Settings */}
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTabChange('settings')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-neutral-300 transition"
                >
                  <Settings size={14} /> Settings
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    audio.playSFX('click');
                    onUpdateSettings({
                      ...settings,
                      showSpeedrunTimer: !settings.showSpeedrunTimer,
                    });
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-xs font-bold transition ${
                    settings.showSpeedrunTimer
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-md shadow-amber-950/10'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  <Trophy size={14} /> Timer: {settings.showSpeedrunTimer ? 'ON' : 'OFF'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'level-select' && (
            <motion.div
              key="level-select"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-grow flex flex-col h-[400px]"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-3">
                  📂 Choose Stage {coopMode && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-mono uppercase font-bold tracking-wider">CO-OP</span>}
                </h2>
                <div className="text-xs text-neutral-400 font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                  Stage: {progress.unlockedLevel - 1} / {totalAvailableLevels}
                </div>
              </div>

              {/* Levels grid grouped by thematic Worlds */}
              <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {Object.keys(worlds).map((worldKey) => {
                  const worldLevels = worlds[worldKey];
                  if (worldLevels.length === 0) return null;

                  return (
                    <div key={worldKey} className="bg-neutral-900/30 border border-white/5 rounded-2xl p-4">
                      {/* World Banner Header */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                        <span className="font-extrabold text-[10px] tracking-[0.15em] text-orange-500 uppercase">
                          🌎 World: {worldKey}
                        </span>
                      </div>

                      {/* Levels list cells */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                        {worldLevels.map((lvl) => {
                          const isUnlocked = lvl.id <= progress.unlockedLevel;
                          const isCompleted = progress.deaths[lvl.id] !== undefined;

                          return (
                            <motion.button
                              key={lvl.id}
                              disabled={!isUnlocked}
                              onClick={() => handlePlayLevel(lvl.id)}
                              whileHover={isUnlocked ? { scale: 1.04, y: -2 } : {}}
                              whileTap={isUnlocked ? { scale: 0.98 } : {}}
                              className={`relative group flex flex-col justify-between p-3.5 h-20 rounded-xl border text-left transition-all ${
                                isUnlocked
                                  ? 'bg-neutral-900/60 border-white/10 hover:border-orange-500/40 hover:bg-neutral-900/90 cursor-pointer'
                                  : 'bg-neutral-950/40 border-white/5 text-neutral-600 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className={`text-[10px] font-mono font-extrabold ${isUnlocked ? 'text-neutral-400' : 'text-neutral-700'}`}>
                                  Lvl {lvl.id}
                                </span>
                                {isCompleted && (
                                  <Star size={11} className="text-amber-500 fill-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]" />
                                )}
                              </div>
                              <div className={`text-[11px] font-bold truncate w-full mt-1.5 ${isUnlocked ? 'text-neutral-100' : 'text-neutral-700'}`}>
                                {isUnlocked ? lvl.name : 'Locked'}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto w-full bg-neutral-900/30 border border-white/5 rounded-2xl p-6 shadow-xl"
            >
              <h2 className="text-lg font-black mb-6 flex items-center gap-3">
                ⚙️ Configurations
              </h2>

              <div className="space-y-5 text-sm">
                {/* Audio volume sliders */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-bold text-neutral-200">
                    <span>Music Volume</span>
                    <span className="font-mono text-orange-500">{settings.musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.musicVolume}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      onUpdateSettings({ ...settings, musicVolume: v });
                      audio.setVolume(settings.sfxVolume, v);
                    }}
                    className="w-full h-1.5 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-bold text-neutral-200">
                    <span>SFX Volume</span>
                    <span className="font-mono text-orange-500">{settings.sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.sfxVolume}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      onUpdateSettings({ ...settings, sfxVolume: v });
                      audio.setVolume(v, settings.musicVolume);
                      if (activeFrameRefForSfxPlay % 8 === 0) {
                        audio.playSFX('click');
                      }
                    }}
                    className="w-full h-1.5 bg-white/5 border border-white/5 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
                  />
                </div>

                <hr className="border-white/5 my-4" />

                {/* HUD Checkbox toggles */}
                <div className="flex items-center justify-between py-1">
                  <span className="font-bold text-neutral-200">Show Death Counter</span>
                  <input
                    type="checkbox"
                    checked={settings.showDeathCounter}
                    onChange={(e) => {
                      audio.playSFX('click');
                      onUpdateSettings({ ...settings, showDeathCounter: e.target.checked });
                    }}
                    className="w-4.5 h-4.5 bg-neutral-900 border-white/10 rounded-md text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="font-bold text-neutral-200">Show Speedrun Timer</span>
                  <input
                    type="checkbox"
                    checked={settings.showSpeedrunTimer}
                    onChange={(e) => {
                      audio.playSFX('click');
                      onUpdateSettings({ ...settings, showSpeedrunTimer: e.target.checked });
                    }}
                    className="w-4.5 h-4.5 bg-neutral-900 border-white/10 rounded-md text-orange-500 focus:ring-orange-500 cursor-pointer"
                  />
                </div>

                <hr className="border-white/5 my-4" />

                {/* Reset data */}
                <div className="flex justify-between items-center gap-4">
                  <div className="text-[11px] text-neutral-500 leading-normal max-w-[200px]">
                    This will erase all levels and keys progress.
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all game data?')) {
                        onResetProgress();
                        audio.playSFX('death');
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-extrabold transition cursor-pointer"
                  >
                    <RefreshCw size={12} /> Reset Data
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys-vault' && (
            <motion.div
              key="keys-vault"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg mx-auto w-full bg-neutral-900/30 border border-white/5 rounded-2xl p-6 text-center"
            >
              <h2 className="text-xl font-black mb-1 flex justify-center items-center gap-2 text-amber-400 glow-text-gold">
                🗝️ Gold Keys Vault
              </h2>
              <p className="text-xs text-neutral-400 mb-6 max-w-sm mx-auto leading-relaxed">
                Golden keys are hidden in deep pits or dangerous secret locations. Find all 10 to unlock the True Simulation Ending.
              </p>

              {/* 10 Key Slots Grid */}
              <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto mb-6">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const hasKey = progress.keysCollected[idx];

                  return (
                    <motion.div
                      key={idx}
                      whileHover={hasKey ? { scale: 1.08, rotate: 5 } : {}}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
                        hasKey
                          ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-amber-300'
                          : 'bg-neutral-950/60 border-white/5 text-neutral-800'
                      }`}
                    >
                      {hasKey ? (
                        <Key size={24} className="text-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                      ) : (
                        <Lock size={16} className="text-neutral-700" />
                      )}
                      <span className="text-[9px] font-mono font-bold mt-1 text-neutral-500">
                        #{idx + 1}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {keysFoundCount === 10 ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3.5 rounded-xl font-bold leading-normal max-w-md mx-auto animate-pulse">
                  🏆 All 10 keys collected! Beat Stage 15 to trigger the True Secret Glitch Ending.
                </div>
              ) : (
                <div className="text-xs text-neutral-500 font-medium">
                  Find keys in hidden voids, off-camera ceilings, or under crushers. {10 - keysFoundCount} keys left.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Meta Credits */}
      <div className="border-t border-white/5 pt-4 flex justify-between items-center text-[10px] text-neutral-600 font-mono mt-4 z-10">
        <div>Developer Sandbox Console</div>
        <div>Original Levels 1–15 Clone</div>
      </div>
    </div>
  );
};

// Variable for tracking sliders ticks to optimize SFX play rate
let activeFrameRefForSfxPlay = 0;
setInterval(() => {
  activeFrameRefForSfxPlay++;
}, 50);
