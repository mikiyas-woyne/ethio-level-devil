/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameSettings, SavedProgress } from '../types';
import { allLevelsList, totalAvailableLevels } from '../data/levels';
import { audio } from '../utils/audio';
import { Volume2, Settings, Play, Users, Trophy, ChevronLeft, Star, Key, RefreshCw } from 'lucide-react';

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

  // Counting total keys found
  const keysFoundCount = progress.keysCollected.filter(Boolean).length;

  return (
    <div id="main-menu-container" className="relative w-full max-w-4xl mx-auto min-h-[500px] flex flex-col justify-between bg-neutral-950 border-4 border-neutral-800 rounded-2xl shadow-2xl p-6 text-white overflow-hidden font-sans">
      {/* Dynamic Animated Background Clouds for authentic retro feel */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-[-150px] w-64 h-16 bg-white rounded-full blur-sm animate-[drift_25s_linear_infinite]" />
        <div className="absolute top-36 left-[-150px] w-80 h-20 bg-white rounded-full blur-sm animate-[drift_35s_linear_infinite_5s]" />
        <div className="absolute top-72 left-[-150px] w-48 h-12 bg-white rounded-full blur-sm animate-[drift_20s_linear_infinite_10s]" />
      </div>

      <style>{`
        @keyframes drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(1100px); }
        }
      `}</style>

      {/* Top Header / Nav */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-4 z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleTabChange('main')}>
          <div className="w-8 h-8 bg-orange-600 flex items-center justify-center rounded text-lg font-display font-bold">
            😈
          </div>
          <span className="font-display font-bold tracking-tight text-lg text-neutral-200">
            LEVEL DEVIL
          </span>
        </div>

        <div className="flex gap-2">
          {activeTab !== 'main' && (
            <button
              onClick={() => handleTabChange('main')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold border border-neutral-800 transition"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={() => handleTabChange('keys-vault')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              activeTab === 'keys-vault'
                ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Key size={14} className={keysFoundCount > 0 ? 'text-amber-400' : ''} />
            Secret Vault ({keysFoundCount}/10)
          </button>
        </div>
      </div>

      {/* Main Container Content with AnimatePresence transitions */}
      <div className="flex-grow flex flex-col justify-center my-6 z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="text-center flex flex-col items-center justify-center"
            >
              {/* Retro Hero Brand Block */}
              <div className="mb-8">
                <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tight bg-gradient-to-b from-orange-500 to-red-600 bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(239,68,68,0.2)]">
                  LEVEL DEVIL
                </h1>
                <p className="text-sm font-mono tracking-widest text-neutral-500 uppercase mt-2">
                  NOT A Troll Game
                </p>
              </div>

              {/* Game Modes Cards / Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
                <button
                  onClick={() => {
                    setCoopMode(false);
                    handleTabChange('level-select');
                  }}
                  className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all text-left"
                >
                  <Play className="text-orange-500 mb-2" size={28} />
                  <span className="font-bold text-sm">Campaign Mode</span>
                  <span className="text-[11px] text-neutral-500 mt-1">Single player trap adventure</span>
                </button>

                <button
                  onClick={() => {
                    setCoopMode(true);
                    handleTabChange('level-select');
                  }}
                  className="flex flex-col items-center justify-center p-5 rounded-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(33,150,243,0.15)] transition-all text-left"
                >
                  <Users className="text-blue-500 mb-2" size={28} />
                  <span className="font-bold text-sm">2-Player Local Co-Op</span>
                  <span className="text-[11px] text-neutral-500 mt-1">Couch play with dual controls</span>
                </button>
              </div>

              {/* Auxiliary Controls */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handleTabChange('settings')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-300 transition"
                >
                  <Settings size={14} /> Settings
                </button>

                {/* Speedrun timer quick indicator toggle */}
                <button
                  onClick={() => {
                    audio.playSFX('click');
                    onUpdateSettings({
                      ...settings,
                      showSpeedrunTimer: !settings.showSpeedrunTimer,
                    });
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-semibold transition ${
                    settings.showSpeedrunTimer
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <Trophy size={14} /> Speedrun Timer:{' '}
                  <strong className="uppercase">{settings.showSpeedrunTimer ? 'On' : 'Off'}</strong>
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'level-select' && (
            <motion.div
              key="level-select"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  ⚔️ Select Level {coopMode && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-sans uppercase">Co-Op Enabled</span>}
                </h2>
                <div className="text-xs text-neutral-400 font-mono">
                  Progress: {progress.unlockedLevel - 1} / {totalAvailableLevels} Completed
                </div>
              </div>

              {/* Levels grid grouped by thematic Worlds */}
              <div className="space-y-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(worlds).map((worldKey) => {
                  const worldLevels = worlds[worldKey];
                  if (worldLevels.length === 0) return null;

                  return (
                    <div key={worldKey} className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4">
                      {/* World Banner Header */}
                      <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2 mb-3">
                        <span className="font-display font-bold text-xs tracking-wider text-orange-500 uppercase">
                          🌎 World {worldKey}
                        </span>
                      </div>

                      {/* Levels list cells */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {worldLevels.map((lvl) => {
                          const isUnlocked = lvl.id <= progress.unlockedLevel;
                          const isCompleted = progress.deaths[lvl.id] !== undefined;

                          return (
                            <button
                              key={lvl.id}
                              disabled={!isUnlocked}
                              onClick={() => handlePlayLevel(lvl.id)}
                              className={`relative group flex flex-col justify-between p-3 h-18 rounded-lg border text-left transition-all ${
                                isUnlocked
                                  ? 'bg-neutral-900 border-neutral-800 hover:border-orange-500 hover:bg-neutral-850 cursor-pointer'
                                  : 'bg-neutral-950/60 border-neutral-900/80 text-neutral-600 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className={`text-xs font-mono font-bold ${isUnlocked ? 'text-neutral-400' : 'text-neutral-700'}`}>
                                  Lvl {lvl.id}
                                </span>
                                {isCompleted && (
                                  <Star size={12} className="text-amber-500 fill-amber-500" />
                                )}
                              </div>
                              <div className={`text-[10px] font-sans truncate font-medium w-full mt-1 ${isUnlocked ? 'text-white' : 'text-neutral-700'}`}>
                                {isUnlocked ? lvl.name : 'LOCKED'}
                              </div>
                            </button>
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
              className="max-w-lg mx-auto w-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-6"
            >
              <h2 className="text-lg font-display font-bold mb-5 flex items-center gap-2">
                ⚙️ Game Settings
              </h2>

              <div className="space-y-4 text-sm">
                {/* Audio volume sliders */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Music Volume</span>
                    <span className="font-mono text-neutral-400">{settings.musicVolume}%</span>
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
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between font-medium">
                    <span>SFX Volume</span>
                    <span className="font-mono text-neutral-400">{settings.sfxVolume}%</span>
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
                    className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <hr className="border-neutral-800 my-4" />

                {/* HUD Checkbox toggles */}
                <div className="flex items-center justify-between py-1">
                  <span className="font-medium">Show Death Counter</span>
                  <input
                    type="checkbox"
                    checked={settings.showDeathCounter}
                    onChange={(e) => {
                      audio.playSFX('click');
                      onUpdateSettings({ ...settings, showDeathCounter: e.target.checked });
                    }}
                    className="w-4 h-4 bg-neutral-800 border-neutral-700 rounded text-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="font-medium">Show Speedrun Timer</span>
                  <input
                    type="checkbox"
                    checked={settings.showSpeedrunTimer}
                    onChange={(e) => {
                      audio.playSFX('click');
                      onUpdateSettings({ ...settings, showSpeedrunTimer: e.target.checked });
                    }}
                    className="w-4 h-4 bg-neutral-800 border-neutral-700 rounded text-orange-500 focus:ring-orange-500"
                  />
                </div>

                <hr className="border-neutral-800 my-4" />

                {/* Reset local data */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-neutral-500">
                    Warning: This resets your completed levels and keys!
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to reset all game data?')) {
                        onResetProgress();
                        audio.playSFX('death');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-500/30 text-red-300 rounded-lg text-xs font-bold transition"
                  >
                    <RefreshCw size={12} /> Reset Data
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'keys-vault' && (
            <motion.div
              key="keys-vault"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-xl mx-auto w-full bg-neutral-900/60 border border-neutral-800 rounded-xl p-6 text-center"
            >
              <h2 className="text-xl font-display font-bold mb-1 flex justify-center items-center gap-2">
                🗝️ Secret Vault
              </h2>
              <p className="text-xs text-neutral-400 mb-6 font-sans">
                Collect secret golden keys hidden across the levels. Find all 10 to unlock the True Ending!
              </p>

              {/* 10 Key Slots Grid */}
              <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto mb-6">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const hasKey = progress.keysCollected[idx];

                  return (
                    <div
                      key={idx}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border-2 transition ${
                        hasKey
                          ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-800'
                      }`}
                    >
                      <Key size={hasKey ? 22 : 16} className={hasKey ? 'text-amber-400' : 'text-neutral-800'} />
                      <span className="text-[9px] font-mono font-bold mt-1 text-neutral-500">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>

              {keysFoundCount === 10 ? (
                <div className="bg-amber-950/30 border border-amber-500/20 text-amber-200 text-xs p-3 rounded-lg font-medium leading-relaxed max-w-md mx-auto">
                  🎉 Congratulations! All 10 Secret Keys found. Enter the true secret ending once completing Level 15!
                </div>
              ) : (
                <div className="text-xs text-neutral-500 font-sans">
                  {10 - keysFoundCount} keys remaining. Hunt them in hidden spike pits, under falling crushers, and off-screen spaces!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Meta Credits */}
      <div className="border-t border-neutral-900 pt-4 flex justify-between items-center text-xs text-neutral-600 font-mono mt-4 z-10">
        <div>Replication by Google AI Studio</div>
        <div>Original Music by Brad Erkkila</div>
      </div>
    </div>
  );
};

// Variable for tracking sliders ticks to optimize SFX play rate
let activeFrameRefForSfxPlay = 0;
setInterval(() => {
  activeFrameRefForSfxPlay++;
}, 50);
