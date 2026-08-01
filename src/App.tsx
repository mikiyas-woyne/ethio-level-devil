/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { LevelCompleteOverlay, SkipPromptOverlay, PauseOverlay } from './components/Overlays';
import { getLevel } from './data/levels';
import { SavedProgress, GameSettings } from './types';
import { audio } from './utils/audio';

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 50,
  sfxVolume: 60,
  showDeathCounter: true,
  showSpeedrunTimer: false,
  buttonOpacity: 0.8,
};

const DEFAULT_PROGRESS: SavedProgress = {
  unlockedLevel: 1,
  deaths: {},
  keysCollected: Array(10).fill(false),
  bestTimes: {},
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const stored = localStorage.getItem('ethio_ld_settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [progress, setProgress] = useState<SavedProgress>(() => {
    try {
      const stored = localStorage.getItem('ethio_ld_progress');
      return stored ? JSON.parse(stored) : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  });

  const [currentLevelId, setCurrentLevelId] = useState<number | null>(null);
  const [isCoop, setIsCoop] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'complete'>('menu');
  const [deathsThisLevel, setDeathsThisLevel] = useState<number>(0);
  const [speedrunTimeMs, setSpeedrunTimeMs] = useState<number | undefined>(undefined);
  const [showSkipPrompt, setShowSkipPrompt] = useState<boolean>(false);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('ethio_ld_settings', JSON.stringify(settings));
    audio.setVolume(settings.sfxVolume, settings.musicVolume);
  }, [settings]);

  // Sync progress to localStorage
  useEffect(() => {
    localStorage.setItem('ethio_ld_progress', JSON.stringify(progress));
  }, [progress]);

  // Music management
  useEffect(() => {
    audio.init();
    if (gameState === 'menu') {
      audio.startBGM('MENU');
    } else if (gameState === 'playing' && currentLevelId !== null) {
      const level = getLevel(currentLevelId);
      if (level) {
        audio.startBGM(level.world);
      }
    } else {
      audio.stopBGM();
    }
    return () => audio.stopBGM();
  }, [gameState, currentLevelId]);

  // Keyboard listener for pause / esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') {
        if (gameState === 'playing') {
          audio.playSFX('click');
          setGameState('paused');
        } else if (gameState === 'paused') {
          audio.playSFX('click');
          setGameState('playing');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
  };

  const handleSelectLevel = (levelId: number, coop: boolean) => {
    setCurrentLevelId(levelId);
    setIsCoop(coop);
    setDeathsThisLevel(0);
    setSpeedrunTimeMs(undefined);
    setShowSkipPrompt(false);
    setGameState('playing');
  };

  const handleResetProgress = () => {
    setProgress(DEFAULT_PROGRESS);
  };

  const handleDeath = () => {
    setDeathsThisLevel((prev) => {
      const newVal = prev + 1;
      if (newVal >= 3) {
        setShowSkipPrompt(true);
      }
      return newVal;
    });

    // Update global progress deaths count
    if (currentLevelId !== null) {
      setProgress((prev) => {
        const currentLevelDeaths = prev.deaths[currentLevelId] || 0;
        return {
          ...prev,
          deaths: {
            ...prev.deaths,
            [currentLevelId]: currentLevelDeaths + 1,
          },
        };
      });
    }
  };

  const handleKeyCollected = (keyIndex: number) => {
    setProgress((prev) => {
      const newKeys = [...prev.keysCollected];
      newKeys[keyIndex] = true;
      return {
        ...prev,
        keysCollected: newKeys,
      };
    });
  };

  const handleLevelComplete = (deaths: number, timeMs?: number) => {
    setSpeedrunTimeMs(timeMs);
    setGameState('complete');

    if (currentLevelId !== null) {
      setProgress((prev) => {
        // Unlock next level
        const nextLevel = Math.max(prev.unlockedLevel, currentLevelId + 1);
        
        // Save best time
        const newBestTimes = { ...prev.bestTimes };
        if (timeMs !== undefined) {
          const prevBest = prev.bestTimes[currentLevelId];
          if (prevBest === undefined || timeMs < prevBest) {
            newBestTimes[currentLevelId] = timeMs;
          }
        }

        return {
          ...prev,
          unlockedLevel: nextLevel,
          bestTimes: newBestTimes,
        };
      });
    }
  };

  const handleNextLevel = () => {
    if (currentLevelId !== null) {
      const nextId = currentLevelId + 1;
      const nextLevel = getLevel(nextId);
      if (nextLevel) {
        setCurrentLevelId(nextId);
        setDeathsThisLevel(0);
        setSpeedrunTimeMs(undefined);
        setShowSkipPrompt(false);
        setGameState('playing');
      } else {
        // No more levels, back to menu
        setGameState('menu');
        setCurrentLevelId(null);
      }
    }
  };

  const handleReplayLevel = () => {
    setDeathsThisLevel(0);
    setSpeedrunTimeMs(undefined);
    setShowSkipPrompt(false);
    setGameState('playing');
  };

  const handleSkipLevelConfirm = () => {
    audio.playSFX('chime');
    setShowSkipPrompt(false);
    handleNextLevel();
  };

  const handleMainMenu = () => {
    setGameState('menu');
    setCurrentLevelId(null);
  };

  const currentLevelDef = currentLevelId !== null ? getLevel(currentLevelId) : null;
  const keysFoundCount = progress.keysCollected.filter(Boolean).length;

  return (
    <div className="w-full min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      {gameState === 'menu' && (
        <MainMenu
          progress={progress}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onSelectLevel={handleSelectLevel}
          onResetProgress={handleResetProgress}
        />
      )}

      {gameState !== 'menu' && currentLevelDef && (
        <div className="relative">
          <GameCanvas
            level={currentLevelDef}
            isCoop={isCoop}
            settings={settings}
            onDeath={handleDeath}
            onLevelComplete={handleLevelComplete}
            onKeyCollected={handleKeyCollected}
            keysCollected={progress.keysCollected}
            onRestartLevel={handleReplayLevel}
          />

          {gameState === 'paused' && (
            <PauseOverlay
              onKeepPlaying={() => setGameState('playing')}
              onRestart={handleReplayLevel}
              onMainMenu={handleMainMenu}
            />
          )}

          {gameState === 'complete' && (
            <LevelCompleteOverlay
              levelName={currentLevelDef.name}
              levelNumber={currentLevelDef.id}
              deaths={deathsThisLevel}
              timeMs={speedrunTimeMs}
              onNextLevel={handleNextLevel}
              onReplay={handleReplayLevel}
              onMainMenu={handleMainMenu}
              isLastLevel={currentLevelDef.id === 15}
              keysFoundCount={keysFoundCount}
            />
          )}

          {showSkipPrompt && gameState === 'playing' && (
            <SkipPromptOverlay
              onSkipConfirm={handleSkipLevelConfirm}
              onDismiss={() => setShowSkipPrompt(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
