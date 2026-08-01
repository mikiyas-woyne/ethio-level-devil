/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  LevelDefinition,
  PlayerState,
  CrateState,
  BulletState,
  BombState,
  TrapState,
  CrumblingTileState,
  ParticleState,
  GameSettings,
} from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  level: LevelDefinition;
  isCoop: boolean;
  settings: GameSettings;
  onDeath: (playerIndex: number) => void;
  onLevelComplete: (deathsThisLevel: number, speedrunTimeMs?: number) => void;
  onKeyCollected: (keyIndex: number) => void;
  keysCollected: boolean[];
  onRestartLevel: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  isCoop,
  settings,
  onDeath,
  onLevelComplete,
  onKeyCollected,
  keysCollected,
  onRestartLevel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game Loop State (held in refs for high-frequency 60fps updates)
  const playersRef = useRef<PlayerState[]>([]);
  const cratesRef = useRef<CrateState[]>([]);
  const bulletsRef = useRef<BulletState[]>([]);
  const bombsRef = useRef<BombState[]>([]);
  const trapsRef = useRef<TrapState[]>([]);
  const crumblingTilesRef = useRef<CrumblingTileState[]>([]);
  const particlesRef = useRef<ParticleState[]>([]);
  const keysCollectedRef = useRef<boolean[]>(keysCollected);

  // Runtime Level Override States (so we don't mutate original level grid directly)
  const currentGridRef = useRef<number[][]>([]);
  const isGravityFlippedRef = useRef<boolean>(false);
  const isInvertedControlsRef = useRef<boolean>(false);
  const isKeyAvailableRef = useRef<boolean>(true);
  const deathsThisLevelRef = useRef<number>(0);
  const timerStartRef = useRef<number>(0);
  const activeFrameRef = useRef<number>(0);

  // Door status
  const doorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const doorMoveCountRef = useRef<number>(0);

  // Screen shake
  const screenShakeRef = useRef<number>(0);

  // Keys currently held
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Render trigger for React overlays (like speedrun timer or deaths)
  const [, setTick] = useState(0);

  // Sync keys list
  useEffect(() => {
    keysCollectedRef.current = keysCollected;
  }, [keysCollected]);

  // Handle inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressedRef.current[k] = true;

      // Handle Quick Restart via 'r'
      if (k === 'r') {
        audio.playSFX('click');
        resetLevelState();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressedRef.current[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [level]);

  // Initialize and Reset Level States
  const resetLevelState = () => {
    audio.init();

    // Reset grid
    currentGridRef.current = level.grid.map((row) => [...row]);

    // Set spawn coordinates (16px per tile)
    const p1: PlayerState = {
      x: level.startX * 16 + 3,
      y: level.startY * 16 + 1,
      vx: 0,
      vy: 0,
      width: 10,
      height: 14,
      isGrounded: false,
      isAlive: true,
      respawnTimer: 0,
      isP2: false,
      color: '#FFFFFF',
    };

    const p2: PlayerState = {
      x: level.startX * 16 + 3,
      y: level.startY * 16 + 1,
      vx: 0,
      vy: 0,
      width: 10,
      height: 14,
      isGrounded: false,
      isAlive: true,
      respawnTimer: 0,
      isP2: true,
      color: '#2196F3', // player 2 is Blue
    };

    playersRef.current = isCoop ? [p1, p2] : [p1];

    // Reset collectibles
    isKeyAvailableRef.current = level.keyIndex !== undefined && !keysCollectedRef.current[level.keyIndex];

    // Reset environmental settings
    isGravityFlippedRef.current = level.startGravityFlipped || false;
    isInvertedControlsRef.current = level.hasInvertedControls || false;

    // Door setup
    doorPosRef.current = { x: level.doorX * 16, y: level.doorY * 16 };
    doorMoveCountRef.current = 0;

    // Spawn crates
    cratesRef.current = [];
    for (let r = 0; r < 17; r++) {
      for (let c = 0; c < 30; c++) {
        if (currentGridRef.current[r][c] === 13) {
          // Crate
          cratesRef.current.push({
            id: Math.random().toString(),
            x: c * 16,
            y: r * 16,
            vx: 0,
            vy: 0,
            width: 16,
            height: 16,
            isGrounded: false,
          });
          currentGridRef.current[r][c] = 0; // replace with dynamic crate entity
        }
      }
    }

    // Reset bombs
    bombsRef.current = [];
    for (let r = 0; r < 17; r++) {
      for (let c = 0; c < 30; c++) {
        if (currentGridRef.current[r][c] === 16) {
          bombsRef.current.push({
            id: Math.random().toString(),
            tileX: c,
            tileY: r,
            fuseTimer: 3.0,
            isLit: false,
            isExploded: false,
            blastRadius: 48,
          });
          currentGridRef.current[r][c] = 0; // handle as dynamic bombs
        }
      }
    }

    // Spawn traps
    trapsRef.current = (level.customTraps || []).map((t) => {
      if (t.type === 'pop_up_spikes') {
        return { ...t, state: 'idle', timer: 0, currentY: t.tileY * 16 + 16 };
      } else if (t.type === 'falling_ceiling') {
        return { ...t, currentY: t.startY, state: 'idle', timer: 0 };
      } else if (t.type === 'moving_wall') {
        return { ...t, currentX: t.startX, currentY: t.startY, state: 'idle', speed: t.speed || 3 };
      } else {
        // buzzsaw
        return { ...t, direction: 1 };
      }
    }) as TrapState[];

    crumblingTilesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    timerStartRef.current = Date.now();
    activeFrameRef.current = 0;
    screenShakeRef.current = 0;
  };

  // Run on level changes
  useEffect(() => {
    resetLevelState();
    deathsThisLevelRef.current = 0;
  }, [level, isCoop]);

  // Main Canvas Tick Loop
  useEffect(() => {
    let animId: number;

    const tickLoop = () => {
      updatePhysics();
      renderGame();
      activeFrameRef.current++;
      setTick((prev) => prev + 1); // trigger state refresh for HUD elements (speedrun timer)
      animId = requestAnimationFrame(tickLoop);
    };

    animId = requestAnimationFrame(tickLoop);
    return () => cancelAnimationFrame(animId);
  }, [level, isCoop]);

  // Generate spark particle on collecting coin or key
  const createSparkles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 20 + 15,
      });
    }
  };

  // Generate death particle poof
  const createDeathPoof = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#FFFFFF',
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 30 + 20,
      });
    }
  };

  // Handle Player Death
  const killPlayer = (playerIndex: number) => {
    const p = playersRef.current[playerIndex];
    if (!p || !p.isAlive) return;

    p.isAlive = false;
    p.respawnTimer = 25; // short delay before reset (about 0.4s at 60fps)
    createDeathPoof(p.x + p.width / 2, p.y + p.height / 2);
    audio.playSFX('death');
    deathsThisLevelRef.current++;
    onDeath(playerIndex);

    // In Co-Op, if one player dies, the other must die too to trigger a synchronized level reset
    if (isCoop) {
      const otherIdx = playerIndex === 0 ? 1 : 0;
      const other = playersRef.current[otherIdx];
      if (other && other.isAlive) {
        other.isAlive = false;
        other.respawnTimer = 25;
        createDeathPoof(other.x + other.width / 2, other.y + other.height / 2);
      }
    }
  };

  // Check if coordinates overlap with a solid block (Tile 1, 2, or active Rhythm block 18)
  const isSolid = (x: number, y: number): boolean => {
    const tileX = Math.floor(x / 16);
    const tileY = Math.floor(y / 16);

    // Bound check
    if (tileX < 0 || tileX >= 30) {
      // If wraparound world, we wrap. Otherwise treat out-of-bounds as empty
      return false;
    }
    if (tileY < 0 || tileY >= 17) {
      return false;
    }

    const tileType = currentGridRef.current[tileY][tileX];

    // Solid blocks
    if (tileType === 1 || tileType === 2 || tileType === 17) return true;

    // Rhythm Platform solid states
    if (tileType === 18) {
      // solid based on frame interval cycle
      const isPlatformActive = Math.floor(activeFrameRef.current / (level.rhythmInterval || 60)) % 2 === 0;
      return isPlatformActive;
    }

    return false;
  };

  // Check overlap of player bounding box with any solid elements
  const checkSolidOverlap = (x: number, y: number, w: number, h: number): boolean => {
    const left = x;
    const right = x + w;
    const top = y;
    const bottom = y + h;

    // Check four corners of the bounding box
    if (isSolid(left, top)) return true;
    if (isSolid(right, top)) return true;
    if (isSolid(left, bottom)) return true;
    if (isSolid(right, bottom)) return true;

    // Check intermediate edges
    if (isSolid(left, top + h / 2)) return true;
    if (isSolid(right, top + h / 2)) return true;
    if (isSolid(left + w / 2, top)) return true;
    if (isSolid(left + w / 2, bottom)) return true;

    return false;
  };

  // Check overlap of bounding box with crates
  const checkCrateOverlap = (x: number, y: number, w: number, h: number, ignoreCrateId?: string): boolean => {
    return cratesRef.current.some(c => c.id !== ignoreCrateId && isOverlapping(x, y, w, h, c.x, c.y, c.width, c.height));
  };

  // AABB AABB Collision detection
  const isOverlapping = (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  };

  // Handle all gameplay ticks
  const updatePhysics = () => {
    // 1. Process Particles
    particlesRef.current = particlesRef.current
      .map((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        return p;
      })
      .filter((p) => p.life < p.maxLife);

    // 2. Process Fuses / Bombs
    bombsRef.current.forEach((bomb) => {
      if (bomb.isExploded) return;

      // Check if players are nearby to light fuse
      playersRef.current.forEach((p) => {
        if (!p.isAlive) return;
        const dist = Math.hypot(p.x - bomb.tileX * 16, p.y - bomb.tileY * 16);
        if (dist < 64) {
          bomb.isLit = true;
        }
      });

      if (bomb.isLit) {
        bomb.fuseTimer -= 1 / 60;
        if (activeFrameRef.current % 12 === 0) {
          audio.playSFX('fuse');
          // emit fuse particles
          createSparkles(bomb.tileX * 16 + 8, bomb.tileY * 16 + 2, '#FF5722');
        }

        if (bomb.fuseTimer <= 0) {
          // BOOM!
          bomb.isExploded = true;
          audio.playSFX('explosion');
          screenShakeRef.current = 15;

          // Check damage to players
          playersRef.current.forEach((p, idx) => {
            if (!p.isAlive) return;
            const dist = Math.hypot((p.x + p.width / 2) - (bomb.tileX * 16 + 8), (p.y + p.height / 2) - (bomb.tileY * 16 + 8));
            if (dist < bomb.blastRadius) {
              killPlayer(idx);
            }
          });

          // Destroy breakable walls nearby (O / 17)
          const blastTiles = 3;
          for (let dy = -blastTiles; dy <= blastTiles; dy++) {
            for (let dx = -blastTiles; dx <= blastTiles; dx++) {
              const tx = bomb.tileX + dx;
              const ty = bomb.tileY + dy;
              if (tx >= 0 && tx < 30 && ty >= 0 && ty < 17) {
                if (currentGridRef.current[ty][tx] === 17) {
                  currentGridRef.current[ty][tx] = 0; // destroy wall block!
                  createSparkles(tx * 16 + 8, ty * 16 + 8, '#795548');
                }
              }
            }
          }
        }
      }
    });

    // 3. Update Traps
    trapsRef.current.forEach((trap) => {
      // Pop Up Spikes Trigger
      if (trap.type === 'pop_up_spikes') {
        const triggerPos = trap.triggerX * 16;
        const targetY = trap.tileY * 16;
        const hiddenY = targetY + 16;
        
        let pNear = false;
        playersRef.current.forEach((p) => {
          if (p.isAlive && p.x > triggerPos) {
            pNear = true;
          }
        });

        if (pNear && trap.state === 'idle') {
          trap.state = 'warning';
          trap.timer = 12; // ~0.2s warning duration
          audio.playSFX('click');
        }

        if (trap.state === 'warning') {
          trap.timer--;
          // Jitter slightly above the floor block level
          trap.currentY = targetY + 12.5 + Math.sin(activeFrameRef.current * 1.5) * 1.5;
          if (trap.timer <= 0) {
            trap.state = 'active';
            trap.timer = 120; // remain active for 2 seconds
          }
        }

        if (trap.state === 'active') {
          trap.timer--;
          // Smoothly slide spikes up
          trap.currentY = Math.max(targetY, (trap.currentY || hiddenY) - 3.8);
          
          if (trap.timer <= 0) {
            trap.state = 'retracting';
            trap.timer = 15;
          }

          // Check spike collision (only kill if the spike has emerged enough to touch the feet)
          if ((trap.currentY || hiddenY) < targetY + 8) {
            playersRef.current.forEach((p, idx) => {
              if (!p.isAlive) return;
              const spikeHitbox = {
                x: trap.tileX * 16,
                y: targetY,
                w: 16,
                h: 16,
              };
              if (isOverlapping(p.x, p.y, p.width, p.height, spikeHitbox.x, spikeHitbox.y, spikeHitbox.w, spikeHitbox.h)) {
                killPlayer(idx);
              }
            });
          }
        }

        if (trap.state === 'retracting') {
          trap.timer--;
          // Smoothly slide spikes back into the floor
          trap.currentY = Math.min(hiddenY, (trap.currentY || targetY) + 1.5);
          if (trap.timer <= 0) {
            trap.state = 'idle';
            trap.currentY = hiddenY;
          }
        }
      }

      // Falling Ceilings Trigger
      if (trap.type === 'falling_ceiling') {
        let shouldFall = false;
        playersRef.current.forEach((p) => {
          if (p.isAlive && p.x >= (trap.triggerX - 1) * 16 && p.x <= (trap.triggerX + 1) * 16) {
            shouldFall = true;
          }
        });

        if (shouldFall && trap.state === 'idle') {
          trap.state = 'warning';
          trap.timer = 18; // wobble/shake
          audio.playSFX('click');
        }

        if (trap.state === 'warning') {
          trap.timer--;
          // create ceiling shake particles
          if (activeFrameRef.current % 4 === 0) {
            createSparkles(trap.tileX * 16 + 8, trap.currentY / 16 + 16, '#90A4AE');
          }
          if (trap.timer <= 0) {
            trap.state = 'falling';
            trap.timer = 0; // velocity cap
          }
        }

        if (trap.state === 'falling') {
          trap.timer += 0.5; // acceleration
          trap.currentY += trap.timer;

          // Hit ground solid block check
          const blockBottomTileY = Math.floor((trap.currentY + 16) / 16);
          if (blockBottomTileY >= 17 || currentGridRef.current[blockBottomTileY][trap.tileX] === 1) {
            trap.state = 'grounded';
            audio.playSFX('land');
            // Write block to grid as solid so players can walk on it!
            const finalTy = Math.floor(trap.currentY / 16);
            if (finalTy >= 0 && finalTy < 17) {
              currentGridRef.current[finalTy][trap.tileX] = 1;
            }
          }

          // Check if crushed players underneath
          playersRef.current.forEach((p, idx) => {
            if (!p.isAlive) return;
            if (isOverlapping(p.x, p.y, p.width, p.height, trap.tileX * 16, trap.currentY, 16, 16)) {
              killPlayer(idx);
            }
          });
        }
      }

      // Moving Walls/Crushers
      if (trap.type === 'moving_wall') {
        let triggerPassed = false;
        playersRef.current.forEach((p) => {
          if (p.isAlive && p.x > trap.triggerX * 16) {
            triggerPassed = true;
          }
        });

        if (triggerPassed && trap.state === 'idle') {
          trap.state = 'moving';
          audio.playSFX('click');
        }

        if (trap.state === 'moving') {
          if (trap.currentX > trap.targetX) {
            trap.currentX -= trap.speed;
            if (trap.currentX <= trap.targetX) {
              trap.state = 'returning';
            }
          } else {
            trap.currentX += trap.speed;
            if (trap.currentX >= trap.targetX) {
              trap.state = 'returning';
            }
          }

          // Collision Check
          playersRef.current.forEach((p, idx) => {
            if (!p.isAlive) return;
            if (isOverlapping(p.x, p.y, p.width, p.height, trap.currentX, trap.currentY, trap.width, trap.height)) {
              killPlayer(idx);
            }
          });
        }

        if (trap.state === 'returning') {
          if (trap.currentX < trap.startX) {
            trap.currentX += 1;
          } else if (trap.currentX > trap.startX) {
            trap.currentX -= 1;
          } else {
            trap.state = 'idle'; // back home
          }
        }
      }

      // Patrol Buzzsaws (Spiked wooden wheels)
      if (trap.type === 'buzzsaw') {
        if (activeFrameRef.current % 15 === 0) {
          // Play hum if close to player
          playersRef.current.forEach((p) => {
            if (p.isAlive) {
              const d = Math.hypot(p.x - trap.x, p.y - trap.y);
              if (d < 120) audio.playSFX('buzz');
            }
          });
        }

        const prevX = trap.x;
        const prevY = trap.y;

        // Horizontal patrolling
        if (trap.startX !== trap.targetX) {
          trap.x += trap.speed * trap.direction;
          if (trap.direction === 1 && trap.x >= trap.targetX) {
            trap.direction = -1;
          } else if (trap.direction === -1 && trap.x <= trap.startX) {
            trap.direction = 1;
          }
        }

        // Vertical patrolling
        if (trap.startY !== trap.targetY) {
          trap.y += trap.speed * trap.direction;
          if (trap.direction === 1 && trap.y >= trap.targetY) {
            trap.direction = -1;
          } else if (trap.direction === -1 && trap.y <= trap.startY) {
            trap.direction = 1;
          }
        }

        // Emit warm sand/dust particles behind the wheel rotation
        const isMoving = Math.abs(trap.x - prevX) > 0.01 || Math.abs(trap.y - prevY) > 0.01;
        if (isMoving && activeFrameRef.current % 2 === 0) {
          const dustX = trap.x + 16;
          const dustY = trap.y + 16 + (trap.radius || 16);
          const moveDirX = trap.x > prevX ? 1 : (trap.x < prevX ? -1 : 0);
          const pushDirection = moveDirX !== 0 ? -moveDirX : (Math.random() > 0.5 ? 1 : -1);

          particlesRef.current.push({
            x: dustX + (Math.random() * 6 - 3),
            y: dustY - 1,
            vx: pushDirection * (Math.random() * 1.5 + 0.3),
            vy: -Math.random() * 0.8 - 0.2,
            color: Math.random() > 0.5 ? '#d97706' : '#eab308',
            size: Math.random() * 2.8 + 1.2,
            alpha: 0.85,
            life: 0,
            maxLife: Math.random() * 15 + 8,
          });
        }

        // Check saw collision with players
        playersRef.current.forEach((p, idx) => {
          if (!p.isAlive) return;
          const dist = Math.hypot((p.x + p.width / 2) - (trap.x + 16), (p.y + p.height / 2) - (trap.y + 16));
          if (dist < trap.radius) {
            killPlayer(idx);
          }
        });
      }
    });

    // 4. Update Bullets & Turrets
    if (activeFrameRef.current % 90 === 0) {
      // Fire turrets (Tile types 14 = Left, 15 = Right)
      for (let r = 0; r < 17; r++) {
        for (let c = 0; c < 30; c++) {
          const type = currentGridRef.current[r][c];
          if (type === 14) {
            // fire left
            bulletsRef.current.push({
              id: Math.random().toString(),
              x: c * 16 - 4,
              y: r * 16 + 6,
              vx: -3,
              vy: 0,
              trail: [],
            });
            audio.playSFX('click');
          } else if (type === 15) {
            // fire right
            bulletsRef.current.push({
              id: Math.random().toString(),
              x: c * 16 + 16,
              y: r * 16 + 6,
              vx: 3,
              vy: 0,
              trail: [],
            });
            audio.playSFX('click');
          }
        }
      }
    }

    // Move bullets and check collisions
    bulletsRef.current = bulletsRef.current
      .map((b) => {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 5) b.trail.shift();

        b.x += b.vx;
        b.y += b.vy;

        // Collision with solid blocks
        const tileX = Math.floor(b.x / 16);
        const tileY = Math.floor(b.y / 16);
        let active = true;

        if (tileX < 0 || tileX >= 30 || tileY < 0 || tileY >= 17) {
          active = false;
        } else if (isSolid(b.x, b.y)) {
          active = false; // bullet hit solid ground
        }

        // Check overlap with players
        playersRef.current.forEach((p, idx) => {
          if (p.isAlive && isOverlapping(p.x, p.y, p.width, p.height, b.x, b.y, 6, 4)) {
            killPlayer(idx);
            active = false;
          }
        });

        return { bullet: b, active };
      })
      .filter((wrap) => wrap.active)
      .map((wrap) => wrap.bullet);

    // 5. Update Crates (Pushable physics)
    cratesRef.current.forEach((crate) => {
      // Apply gravity to crates
      const gravityForce = isGravityFlippedRef.current ? -0.2 : 0.2;
      crate.vy += gravityForce;
      if (Math.abs(crate.vy) > 6) crate.vy = Math.sign(crate.vy) * 6;

      // Vertical Move & Collision
      crate.y += crate.vy;
      if (checkSolidOverlap(crate.x, crate.y, crate.width, crate.height) ||
          checkCrateOverlap(crate.x, crate.y, crate.width, crate.height, crate.id)) {
        crate.y -= crate.vy;
        crate.vy = 0;
        crate.isGrounded = true;
      } else {
        crate.isGrounded = false;
      }

      // Check if crate falls on top of player (crushing them)
      playersRef.current.forEach((p, idx) => {
        if (!p.isAlive) return;

        if (isOverlapping(p.x, p.y, p.width, p.height, crate.x, crate.y, crate.width, crate.height)) {
          const movingDown = crate.vy > 0;
          if (movingDown && p.y + p.height > crate.y + crate.height) {
            p.y += crate.vy;
            if (checkSolidOverlap(p.x, p.y, p.width, p.height)) {
              killPlayer(idx);
            }
          }
        }
      });
    });

    // 6. Update Crumbling/Collapsing Platforms (Smooth fall off screen)
    crumblingTilesRef.current = crumblingTilesRef.current
      .map((block) => {
        if (block.state === 'shaking') {
          block.timer -= 1 / 60;
          if (block.timer <= 0) {
            block.state = 'falling';
            block.y = block.tileY * 16;
            block.vy = 0;
            // destroy the tile on grid so player falls through
            currentGridRef.current[block.tileY][block.tileX] = 0;
            audio.playSFX('death'); // crumble sound
            createSparkles(block.tileX * 16 + 8, block.tileY * 16 + 8, '#BF360C');
          }
        } else if (block.state === 'falling') {
          block.y = (block.y || 0) + (block.vy || 0);
          block.vy = (block.vy || 0) + 0.28; // gravity for falling block
        }
        return block;
      })
      .filter((b) => b.state !== 'falling' || (b.y || 0) < 288);

    // 7. Process Player Movement & Collisions
    let anyPlayerDeadAndTimerExpired = false;
    playersRef.current.forEach((p) => {
      if (!p.isAlive) {
        p.respawnTimer--;
        if (p.respawnTimer <= 0) {
          anyPlayerDeadAndTimerExpired = true;
        }
      }
    });

    if (anyPlayerDeadAndTimerExpired) {
      resetLevelState();
      return;
    }

      // Determine controls mapped to player keys
      let keys = { left: false, right: false, jump: false };

      if (!isCoop) {
        // Single player: can use either WASD or Arrow Keys
        keys.left = keysPressedRef.current['a'] || keysPressedRef.current['arrowleft'];
        keys.right = keysPressedRef.current['d'] || keysPressedRef.current['arrowright'];
        keys.jump = keysPressedRef.current[' '] || keysPressedRef.current['w'] || keysPressedRef.current['arrowup'];
      } else {
        if (!p.isP2) {
          // Player 1 in Co-Op: WASD / Space only
          keys.left = keysPressedRef.current['a'];
          keys.right = keysPressedRef.current['d'];
          keys.jump = keysPressedRef.current[' '] || keysPressedRef.current['w'];
        } else {
          // Player 2 in Co-Op: Arrow Keys only
          keys.left = keysPressedRef.current['arrowleft'];
          keys.right = keysPressedRef.current['arrowright'];
          keys.jump = keysPressedRef.current['arrowup'];
        }
      }

      // Swap movement if controls inverted
      if (isInvertedControlsRef.current) {
        const temp = keys.left;
        keys.left = keys.right;
        keys.right = temp;
      }

      // Move Left/Right (tuned for Level Devil snappiness)
      if (keys.left) {
        p.vx = -2.2;
      } else if (keys.right) {
        p.vx = 2.2;
      } else {
        p.vx = 0;
      }

      // Gravity calculations (tuned for Level Devil snappiness)
      const gravityStrength = isGravityFlippedRef.current ? -0.25 : 0.25;
      p.vy += gravityStrength;

      // Clamp max vertical fall speed
      const terminalSpeed = 5.5;
      if (isGravityFlippedRef.current) {
        if (p.vy < -terminalSpeed) p.vy = -terminalSpeed;
      } else {
        if (p.vy > terminalSpeed) p.vy = terminalSpeed;
      }

      // Jump Trigger (tuned for Level Devil snappiness)
      if (keys.jump && p.isGrounded) {
        audio.playSFX('jump');
        p.vy = isGravityFlippedRef.current ? 4.8 : -4.8;
        p.isGrounded = false;
      }

      // Horizontal update & collisions
      p.x += p.vx;

      // Handle Screen Wraparound
      if (level.hasWraparound) {
        const canvasWidth = 480;
        if (p.x < -p.width) {
          p.x = canvasWidth;
        } else if (p.x > canvasWidth) {
          p.x = -p.width;
        }
      }

      // Check crate collisions and pushing
      cratesRef.current.forEach((crate) => {
        if (isOverlapping(p.x, p.y, p.width, p.height, crate.x, crate.y, crate.width, crate.height)) {
          const pushX = p.vx;
          if (pushX !== 0) {
            const targetX = crate.x + pushX;
            // Check if crate is blocked by solids or other crates
            const blocked = checkSolidOverlap(targetX, crate.y, crate.width, crate.height) ||
                            checkCrateOverlap(targetX, crate.y, crate.width, crate.height, crate.id);
            if (!blocked) {
              crate.x = targetX;
            } else {
              // Crate is blocked, player cannot move it and is blocked horizontally
              p.x -= p.vx;
            }
          } else {
            // Player overlaps while stationary (e.g. crate pushed or fell horizontally into them)
            const pMid = p.x + p.width / 2;
            const cMid = crate.x + crate.width / 2;
            if (pMid < cMid) {
              p.x = crate.x - p.width;
            } else {
              p.x = crate.x + crate.width;
            }
          }
        }
      });

      if (checkSolidOverlap(p.x, p.y, p.width, p.height)) {
        // Slide out of solid tile
        p.x -= p.vx;
      }

      // Vertical update & collisions
      p.y += p.vy;

      // Check vertical screen boundaries (Wraparound vs Void Death)
      if (level.hasWraparound) {
        const canvasHeight = 272;
        if (p.y < -p.height) {
          p.y = canvasHeight;
        } else if (p.y > canvasHeight) {
          p.y = -p.height;
        }
      } else {
        // Standard falling into pit check
        if (p.y > 280 || p.y < -30) {
          killPlayer(idx);
          return;
        }
      }

      // Collision checks
      if (checkSolidOverlap(p.x, p.y, p.width, p.height)) {
        // land or hit ceiling
        p.y -= p.vy;

        // Ground check based on gravity direction
        const movingUp = p.vy < 0;
        const movingDown = p.vy > 0;

        if (isGravityFlippedRef.current) {
          if (movingUp) {
            p.isGrounded = true;
          }
          p.vy = 0;
        } else {
          if (movingDown) {
            p.isGrounded = true;
          }
          p.vy = 0;
        }
      } else {
        p.isGrounded = false;
      }

      // Collisions with other player: make sure players can pass through, but share triggers
      // Collisions with Crates: support walking on top of crates
      cratesRef.current.forEach((crate) => {
        if (isOverlapping(p.x, p.y + p.vy, p.width, p.height, crate.x, crate.y, crate.width, crate.height)) {
          // Landed on crate
          const movingDown = p.vy > 0;
          const movingUp = p.vy < 0;

          if (isGravityFlippedRef.current && movingUp) {
            p.y = crate.y + crate.height + 0.1;
            p.vy = 0;
            p.isGrounded = true;
          } else if (!isGravityFlippedRef.current && movingDown) {
            p.y = crate.y - p.height - 0.1;
            p.vy = 0;
            p.isGrounded = true;
          }
        }
      });

      // 8. Handle Tile-Specific Touches (Key, Coins, Springs, Spikes, Teleporters)
      const minTileX = Math.max(0, Math.floor(p.x / 16));
      const maxTileX = Math.min(29, Math.floor((p.x + p.width) / 16));
      const minTileY = Math.max(0, Math.floor(p.y / 16));
      const maxTileY = Math.min(16, Math.floor((p.y + p.height) / 16));

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tileType = currentGridRef.current[ty][tx];

          // Spike collisions (precise hitboxes: type 3: UP, 4: DOWN, 5: LEFT, 6: RIGHT)
          if (tileType >= 3 && tileType <= 6) {
            let spikeBox = { x: tx * 16, y: ty * 16, w: 16, h: 16 };
            if (tileType === 3) spikeBox = { x: tx * 16 + 2, y: ty * 16 + 6, w: 12, h: 10 };
            else if (tileType === 4) spikeBox = { x: tx * 16 + 2, y: ty * 16, w: 12, h: 10 };
            else if (tileType === 5) spikeBox = { x: tx * 16, y: ty * 16 + 2, w: 10, h: 12 };
            else if (tileType === 6) spikeBox = { x: tx * 16 + 6, y: ty * 16 + 2, w: 10, h: 12 };

            if (isOverlapping(p.x, p.y, p.width, p.height, spikeBox.x, spikeBox.y, spikeBox.w, spikeBox.h)) {
              killPlayer(idx);
              return;
            }
          }

          // Crumbling tiles (Floor 17 shakes and disintegrates on stand)
          if (tileType === 17) {
            const feetBox = isGravityFlippedRef.current
              ? { x: p.x, y: p.y - 2, w: p.width, h: 4 }
              : { x: p.x, y: p.y + p.height - 2, w: p.width, h: 4 };

            if (isOverlapping(feetBox.x, feetBox.y, feetBox.w, feetBox.h, tx * 16, ty * 16, 16, 16)) {
              const activeCrumble = crumblingTilesRef.current.find(
                (ct) => ct.tileX === tx && ct.tileY === ty
              );
              if (!activeCrumble) {
                crumblingTilesRef.current.push({
                  tileX: tx,
                  tileY: ty,
                  timer: 0.3, // 0.3 seconds to collapse
                  state: 'shaking',
                });
              }
            }
          }

          // Key collection (type 10)
          if (tileType === 10 && isKeyAvailableRef.current) {
            if (isOverlapping(p.x, p.y, p.width, p.height, tx * 16, ty * 16, 16, 16)) {
              isKeyAvailableRef.current = false;
              audio.playSFX('ding');
              createSparkles(tx * 16 + 8, ty * 16 + 8, '#FFD700');
              if (level.keyIndex !== undefined) {
                onKeyCollected(level.keyIndex);
              }
            }
          }

          // Real coin collection (type 11)
          if (tileType === 11) {
            if (isOverlapping(p.x, p.y, p.width, p.height, tx * 16, ty * 16, 16, 16)) {
              currentGridRef.current[ty][tx] = 0; // collect
              audio.playSFX('ding');
              createSparkles(tx * 16 + 8, ty * 16 + 8, '#FFD700');
            }
          }

          // Fake coin collection (type 12 - disappear silently)
          if (tileType === 12) {
            if (isOverlapping(p.x, p.y, p.width, p.height, tx * 16, ty * 16, 16, 16)) {
              currentGridRef.current[ty][tx] = 0; // collect fake
              createSparkles(tx * 16 + 8, ty * 16 + 8, '#B0BEC5');
            }
          }

          // Springs launch (type 8)
          if (tileType === 8) {
            const movingDown = p.vy > 0;
            const movingUp = p.vy < 0;
            const springTriggered = isGravityFlippedRef.current
              ? (movingUp && p.y <= (ty + 1) * 16 && p.y >= ty * 16)
              : (movingDown && p.y + p.height >= ty * 16 && p.y + p.height <= (ty + 1) * 16 + 4);

            if (springTriggered && isOverlapping(p.x, p.y, p.width, p.height, tx * 16, ty * 16, 16, 16)) {
              p.vy = isGravityFlippedRef.current ? 6.2 : -6.2;
              p.isGrounded = false;
              audio.playSFX('jump');
              createSparkles(tx * 16 + 8, ty * 16 + (isGravityFlippedRef.current ? 4 : 12), '#4CAF50');
            }
          }

          // Gravity Flip Zone (type 20)
          if (tileType === 20) {
            if (isOverlapping(p.x, p.y, p.width, p.height, tx * 16, ty * 16, 16, 16)) {
              if (!isGravityFlippedRef.current) {
                isGravityFlippedRef.current = true;
                audio.playSFX('gravity');
                createSparkles(p.x + p.width / 2, p.y + p.height / 2, '#9C27B0');
              }
            }
          }
        }
      }

      // Invisible Pits trigger check (makes platform disappear)
      if (level.invisiblePits) {
        level.invisiblePits.forEach((pit) => {
          const feetBox = isGravityFlippedRef.current
            ? { x: p.x, y: p.y - 2, w: p.width, h: 4 }
            : { x: p.x, y: p.y + p.height - 2, w: p.width, h: 4 };

          if (isOverlapping(feetBox.x, feetBox.y, feetBox.w, feetBox.h, pit.x * 16, pit.y * 16, 16, 16)) {
            // Stepped on an invisible pit! Drop block immediately
            if (currentGridRef.current[pit.y][pit.x] === 1) {
              currentGridRef.current[pit.y][pit.x] = 0; // instantly empty!
              audio.playSFX('death');
              createSparkles(pit.x * 16 + 8, pit.y * 16 + 8, '#D84315');
            }
          }
        });
      }

      // Check key overlap (if key is rendered at an absolute key location rather than a grid tile)
      if (level.keyLocation && isKeyAvailableRef.current) {
        const keyPixelX = level.keyLocation.x * 16;
        const keyPixelY = level.keyLocation.y * 16;
        if (isOverlapping(p.x, p.y, p.width, p.height, keyPixelX, keyPixelY, 16, 16)) {
          isKeyAvailableRef.current = false;
          audio.playSFX('ding');
          createSparkles(keyPixelX + 8, keyPixelY + 8, '#FFD700');
          if (level.keyIndex !== undefined) {
            onKeyCollected(level.keyIndex);
          }
        }
      }

      // Door Approach & Escape / Teleport Trolls
      const distToDoor = Math.hypot((p.x + p.width / 2) - (doorPosRef.current.x + 8), (p.y + p.height / 2) - (doorPosRef.current.y + 16));
      if (distToDoor < 48) {
        // Door vanishes/teleports away if configured!
        if (level.doorMoveLocations && level.doorMoveLocations.length > 0 && doorMoveCountRef.current < level.doorMoveLocations.length) {
          const nextLoc = level.doorMoveLocations[doorMoveCountRef.current];
          doorPosRef.current = { x: nextLoc.x * 16, y: nextLoc.y * 16 };
          doorMoveCountRef.current++;
          audio.playSFX('glitch');
          createSparkles(doorPosRef.current.x + 8, doorPosRef.current.y + 16, '#9C27B0');
        }
      }

      // Direct collision with Door -> Level Win Condition!
      if (isOverlapping(p.x, p.y, p.width, p.height, doorPosRef.current.x + 4, doorPosRef.current.y, 8, 32)) {
        if (isCoop) {
          // In co-op, both players must be alive and touch door
          const otherIdx = idx === 0 ? 1 : 0;
          const other = playersRef.current[otherIdx];
          if (other && other.isAlive && isOverlapping(other.x, other.y, other.width, other.height, doorPosRef.current.x, doorPosRef.current.y, 16, 32)) {
            triggerLevelComplete();
          }
        } else {
          triggerLevelComplete();
        }
      }
    });

    // Reduce screen shake decay
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
    }
  };

  const triggerLevelComplete = () => {
    audio.playSFX('chime');
    const elapsed = Date.now() - timerStartRef.current;
    onLevelComplete(deathsThisLevelRef.current, elapsed);
  };

  const resetPlayerToStart = (playerIndex: number) => {
    const p = playersRef.current[playerIndex];
    if (!p) return;
    p.x = level.startX * 16 + 3;
    p.y = level.startY * 16 + 1;
    p.vx = 0;
    p.vy = 0;
    p.isAlive = true;
    p.isGrounded = false;
    createSparkles(p.x + p.width / 2, p.y + p.height / 2, '#4CAF50');
  };

  // HTML5 Canvas Graphics Rendering (Redesigned with Premium Vector Aesthetics)
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Screen & Apply Shake
    ctx.save();
    ctx.clearRect(0, 0, 480, 272);

    if (screenShakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * screenShakeRef.current;
      const dy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(dx, dy);
    }

    // A. Draw Background (Level Devil signature warm sunset gradient)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 272);
    skyGrad.addColorStop(0, '#f97316'); // Warm orange
    skyGrad.addColorStop(0.6, '#ea580c');
    skyGrad.addColorStop(1, '#b45309'); // Darker bottom
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 480, 272);

    // Dynamic horizontal sun rays/dust in background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.fillRect(0, 40, 480, 20);
    ctx.fillRect(0, 110, 480, 35);
    ctx.fillRect(0, 190, 480, 15);

    // B. Draw Level Grid
    for (let r = 0; r < 17; r++) {
      for (let c = 0; c < 30; c++) {
        const tile = currentGridRef.current[r][c];
        
        // Compute visual shaking offset for crumbling tiles
        const crumble = crumblingTilesRef.current.find((b) => b.tileX === c && b.tileY === r && b.state === 'shaking');
        const shakeX = crumble ? Math.sin(activeFrameRef.current * 1.6) * 1.4 : 0;

        const tx = c * 16 + shakeX;
        const ty = r * 16;

        switch (tile) {
          case 1:
          case 2: {
            // FLOOR/WALL: Dark structural chocolate brown blocks with top shadow highlights
            ctx.fillStyle = '#29130b';
            ctx.fillRect(tx, ty, 16, 16);
            // Highlight top lip
            ctx.fillStyle = '#452013';
            ctx.fillRect(tx, ty, 16, 2.5);
            // Bottom shadow line
            ctx.fillStyle = '#140804';
            ctx.fillRect(tx, ty + 14.5, 16, 1.5);
            break;
          }
          case 3: {
            // SPIKE UP: Metallic facets with highlight shine and ruby red base
            ctx.fillStyle = '#2d3748'; // Shadow facet
            ctx.beginPath();
            ctx.moveTo(tx, ty + 16);
            ctx.lineTo(tx + 8, ty);
            ctx.lineTo(tx + 8, ty + 16);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#4a5568'; // Light facet
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty + 16);
            ctx.lineTo(tx + 8, ty);
            ctx.lineTo(tx + 16, ty + 16);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#cbd5e0'; // Shine edge
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty + 16);
            ctx.lineTo(tx + 8, ty);
            ctx.stroke();

            ctx.fillStyle = '#ef4444'; // Red base trim
            ctx.fillRect(tx, ty + 15, 16, 1);
            break;
          }
          case 4: {
            // SPIKE DOWN
            ctx.fillStyle = '#2d3748';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 8, ty + 16);
            ctx.lineTo(tx + 8, ty);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty);
            ctx.lineTo(tx + 8, ty + 16);
            ctx.lineTo(tx + 16, ty);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 8, ty + 16);
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx, ty, 16, 1);
            break;
          }
          case 5: {
            // SPIKE LEFT
            ctx.fillStyle = '#2d3748';
            ctx.beginPath();
            ctx.moveTo(tx + 16, ty);
            ctx.lineTo(tx, ty + 8);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.moveTo(tx + 16, ty + 8);
            ctx.lineTo(tx, ty + 8);
            ctx.lineTo(tx + 16, ty + 16);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx + 16, ty);
            ctx.lineTo(tx, ty + 8);
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx + 15, ty, 1, 16);
            break;
          }
          case 6: {
            // SPIKE RIGHT
            ctx.fillStyle = '#2d3748';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.lineTo(tx, ty + 8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.moveTo(tx, ty + 8);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.lineTo(tx, ty + 16);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#cbd5e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.stroke();

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx, ty, 1, 16);
            break;
          }
          case 8: {
            // SPRING launcher: detailed compression mechanism
            ctx.fillStyle = '#1e293b'; // dark metal base
            ctx.fillRect(tx + 2, ty + 12, 12, 4);

            ctx.strokeStyle = '#94a3b8'; // steel coil wire
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tx + 5, ty + 12);
            ctx.lineTo(tx + 11, ty + 9);
            ctx.lineTo(tx + 5, ty + 6);
            ctx.lineTo(tx + 11, ty + 4.5);
            ctx.stroke();

            ctx.fillStyle = '#10b981'; // Emerald launcher cap
            ctx.fillRect(tx + 1, ty + 2.5, 14, 2.5);
            ctx.fillStyle = '#34d399'; // green cap highlight
            ctx.fillRect(tx + 1, ty + 2.5, 14, 0.8);
            break;
          }
          case 10:
          case 11:
          case 12: {
            // COLLECTIBLE KEY / COINS: Spinning golden vectors
            const bobOffset = Math.sin(activeFrameRef.current * 0.08) * 2.2;
            const kx = tx + 8;
            const ky = ty + 8 + bobOffset;

            ctx.save();
            ctx.translate(kx, ky);

            if (tile === 10) {
              // Detailed golden key
              ctx.rotate((activeFrameRef.current * 1.8 * Math.PI) / 180);
              ctx.fillStyle = '#fbbf24';
              // Head
              ctx.beginPath();
              ctx.arc(0, -3, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = skyGrad; // cut inside head
              ctx.beginPath();
              ctx.arc(0, -3, 1.2, 0, Math.PI * 2);
              ctx.fill();

              // Shaft
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(-0.8, -1, 1.6, 8);
              // Teeth
              ctx.fillRect(0.8, 3, 2, 1.2);
              ctx.fillRect(0.8, 5.2, 2, 1.2);
            } else {
              // Real (11) and Fake (12) Coin: Rotating shiny discs
              ctx.rotate((activeFrameRef.current * 3 * Math.PI) / 180);
              ctx.fillStyle = tile === 11 ? '#f59e0b' : '#94a3b8'; // Gold vs Silver-grey
              ctx.beginPath();
              ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
              ctx.fill();
              // Inner pattern
              ctx.fillStyle = tile === 11 ? '#fbbf24' : '#cbd5e0';
              ctx.beginPath();
              ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
              ctx.fill();
              // Highlight shine glint
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(-1.5, -2, 1, 1);
            }

            ctx.restore();
            break;
          }
          case 14:
          case 15: {
            // TURRETS: Steel mechanical casings
            const isLeft = tile === 14;
            ctx.fillStyle = '#1e293b'; // Base steel block
            ctx.fillRect(tx + (isLeft ? 4 : 0), ty + 2, 12, 12);
            ctx.fillStyle = '#475569';
            ctx.fillRect(tx + (isLeft ? 6 : 2), ty + 4, 8, 8);
            
            // Cannon barrel
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(tx + (isLeft ? 0 : 10), ty + 6, 6, 4);
            break;
          }
          case 17: {
            // BREAKABLE WALL: Cracked brick wall layout
            ctx.fillStyle = '#5c2211';
            ctx.fillRect(tx, ty, 16, 16);
            ctx.fillStyle = '#8f331b';
            ctx.fillRect(tx, ty, 16, 2);
            // Draw mortar crack lines
            ctx.strokeStyle = '#290f07';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, 16, 16);
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty);
            ctx.lineTo(tx + 8, ty + 8);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.moveTo(tx, ty + 8);
            ctx.lineTo(tx + 4, ty + 8);
            ctx.lineTo(tx + 4, ty + 16);
            ctx.stroke();
            break;
          }
          case 18: {
            // RHYTHM PLATFORM: Pulsing grid neon platforms
            const isPlatformActive = Math.floor(activeFrameRef.current / (level.rhythmInterval || 60)) % 2 === 0;
            ctx.save();
            ctx.globalAlpha = isPlatformActive ? 1.0 : 0.22;
            
            // Neon cyan block
            ctx.fillStyle = '#06b6d4';
            ctx.fillRect(tx, ty, 16, 16);
            
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(tx, ty, 16, 16);
            
            // Inner grid tech lines
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(tx + 3, ty + 3, 10, 10);
            ctx.restore();
            break;
          }
          case 20: {
            // GRAVITY FLIP ZONE: Glowing translucent field
            ctx.save();
            ctx.globalAlpha = 0.25 + Math.sin(activeFrameRef.current * 0.1) * 0.08;
            ctx.fillStyle = '#d946ef';
            ctx.fillRect(tx, ty, 16, 16);
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 1;
            ctx.strokeRect(tx, ty, 16, 16);
            
            // Draw floating arrow inside zone
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.moveTo(tx + 8, ty + (isGravityFlippedRef.current ? 4 : 12));
            ctx.lineTo(tx + 4, ty + (isGravityFlippedRef.current ? 10 : 6));
            ctx.lineTo(tx + 12, ty + (isGravityFlippedRef.current ? 10 : 6));
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
      }
    }

    // B2. Draw Falling Crumbling Blocks
    crumblingTilesRef.current.forEach((block) => {
      if (block.state === 'falling') {
        const tx = block.tileX * 16;
        const ty = block.y !== undefined ? block.y : block.tileY * 16;

        // Draw standard floor block styling at its falling Y coordinate
        ctx.fillStyle = '#29130b';
        ctx.fillRect(tx, ty, 16, 16);
        // Highlight top lip
        ctx.fillStyle = '#452013';
        ctx.fillRect(tx, ty, 16, 2.5);
        // Bottom shadow line
        ctx.fillStyle = '#140804';
        ctx.fillRect(tx, ty + 14.5, 16, 1.5);
      }
    });

    // C. Draw Door/Portal (Arched Emerald vortex gateway)
    const dx = doorPosRef.current.x;
    const dy = doorPosRef.current.y;

    // Green arched outer gate post
    ctx.fillStyle = '#065f46';
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 8, 8, Math.PI, 0);
    ctx.rect(dx, dy + 8, 16, 24);
    ctx.fill();

    ctx.fillStyle = '#059669'; // Mid shade
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 8, 6.8, Math.PI, 0);
    ctx.rect(dx + 1.2, dy + 8, 13.6, 22.8);
    ctx.fill();

    // Swirling portal void
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 8, 5, Math.PI, 0);
    ctx.rect(dx + 3, dy + 8, 10, 22);
    ctx.clip();

    ctx.fillStyle = '#022c22'; // deep green void base
    ctx.fillRect(dx + 3, dy + 3, 10, 27);

    // Swirling portal concentric lines
    ctx.translate(dx + 8, dy + 14);
    ctx.rotate((activeFrameRef.current * 4 * Math.PI) / 180);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#059669';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Golden lock keyhole if stage locked
    if (level.keyIndex !== undefined && !keysCollected[level.keyIndex]) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(dx + 8, dy + 13, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(dx + 7.2, dy + 13, 1.6, 4.2);
    }

    // D. Pause Indicator esc button UI
    const btnX = 12;
    const btnY = 10;
    ctx.fillStyle = '#29130b';
    ctx.fillRect(btnX, btnY, 15, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(btnX + 11, btnY + 3.5);
    ctx.lineTo(btnX + 4.5, btnY + 7);
    ctx.lineTo(btnX + 11, btnY + 10.5);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('esc', btnX + 7.5, btnY + 23);

    // E. Draw Pop up Spikes & Obstacle traps
    trapsRef.current.forEach((trap) => {
      const tx = trap.tileX * 16;
      const ty = trap.tileY * 16;

      if (trap.type === 'pop_up_spikes') {
        // Red pop-up warning spikes
        ctx.fillStyle = '#ef4444';
        const sy = trap.currentY !== undefined ? trap.currentY : ty + 16;
        if (trap.state !== 'idle') {
          ctx.beginPath();
          ctx.moveTo(tx, ty + 16);
          ctx.lineTo(tx + 8, sy);
          ctx.lineTo(tx + 16, ty + 16);
          ctx.closePath();
          ctx.fill();
          
          // Spike outline highlights
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty + 16);
          ctx.lineTo(tx + 8, sy);
          ctx.stroke();
        }
      }

      if (trap.type === 'falling_ceiling') {
        // Concrete block with cracks
        ctx.fillStyle = '#475569';
        ctx.fillRect(tx, trap.currentY, 16, 16);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(tx, trap.currentY, 16, 2.5);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tx, trap.currentY, 16, 16);
      }

      if (trap.type === 'moving_wall') {
        // Concrete moving wall crusher
        ctx.fillStyle = '#334155';
        ctx.fillRect(trap.currentX, trap.currentY, trap.width, trap.height);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(trap.currentX, trap.currentY, trap.width, trap.height);
      }

      if (trap.type === 'buzzsaw') {
        ctx.save();
        ctx.translate(trap.x + 16, trap.y + 16);
        ctx.rotate((activeFrameRef.current * 7.5 * Math.PI) / 180); // Slower, more impactful rotation

        const radius = trap.radius || 16;

        // 1. Spikes (8 metallic spikes protruding from the wooden rim)
        const spikeCount = 8;
        for (let i = 0; i < spikeCount; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / spikeCount);

          const baseWidth = 5.2;
          const spikeHeight = 6.2;

          // Draw 3D-shaded metallic spikes (Left side shadow, Right side highlight)
          ctx.fillStyle = '#9ca3af'; // Dark silver shadow
          ctx.beginPath();
          ctx.moveTo(-baseWidth / 2, -radius + 2);
          ctx.lineTo(0, -radius - spikeHeight);
          ctx.lineTo(0, -radius + 2);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f3f4f6'; // Bright silver highlight
          ctx.beginPath();
          ctx.moveTo(0, -radius + 2);
          ctx.lineTo(0, -radius - spikeHeight);
          ctx.lineTo(baseWidth / 2, -radius + 2);
          ctx.closePath();
          ctx.fill();

          // Outer tip highlights
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-baseWidth / 2, -radius + 2);
          ctx.lineTo(0, -radius - spikeHeight);
          ctx.lineTo(baseWidth / 2, -radius + 2);
          ctx.stroke();

          ctx.restore();
        }

        // 2. Wooden Wheel Rim (Dark brown ring)
        ctx.fillStyle = '#451a03'; 
        ctx.beginPath();
        ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
        ctx.fill();

        // 3. Wooden Inner Face (Medium warm brown)
        ctx.fillStyle = '#78350f'; 
        ctx.beginPath();
        ctx.arc(0, 0, radius - 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner circular band/grain line
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 6.5, 0, Math.PI * 2);
        ctx.stroke();

        // 4. Golden Star Pattern (8-point star around the center core)
        ctx.fillStyle = '#eab308'; // Bright gold
        const starPoints = 8;
        ctx.beginPath();
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints;
          const r = i % 2 === 0 ? 7.2 : 3.8;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // 5. Central Gold Core Rivet
        ctx.fillStyle = '#fbbf24'; 
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Core reflection glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-0.8, -1.2, 0.8, 0.8);

        ctx.restore();
      }
    });

    // F. Draw Crates
    cratesRef.current.forEach((crate) => {
      // Textured wooden box
      ctx.fillStyle = '#78350f';
      ctx.fillRect(crate.x, crate.y, crate.width, crate.height);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(crate.x, crate.y, crate.width, crate.height);
      
      // Crisscross boards
      ctx.beginPath();
      ctx.moveTo(crate.x + 2, crate.y + 2);
      ctx.lineTo(crate.x + crate.width - 2, crate.y + crate.height - 2);
      ctx.moveTo(crate.x + crate.width - 2, crate.y + 2);
      ctx.lineTo(crate.x + 2, crate.y + crate.height - 2);
      ctx.stroke();
    });

    // G. Draw Bullets
    bulletsRef.current.forEach((bullet) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bullet.x, bullet.y, 6, 4);
    });

    // H. Draw Bombs
    bombsRef.current.forEach((bomb) => {
      if (bomb.isExploded) return;
      const bx = bomb.tileX * 16 + 8;
      const by = bomb.tileY * 16 + 8;
      
      // Lit blinking animation
      ctx.fillStyle = bomb.isLit && activeFrameRef.current % 12 < 6 ? '#ef4444' : '#1e293b';
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Spark fuse
      if (bomb.isLit) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by - 5);
        ctx.quadraticCurveTo(bx + 4, by - 9, bx + 5 + Math.sin(activeFrameRef.current * 0.8) * 1.5, by - 10);
        ctx.stroke();
      }
    });

    // I. Draw Absolute Keys
    if (level.keyLocation && isKeyAvailableRef.current) {
      const kx = level.keyLocation.x * 16 + 8;
      const ky = level.keyLocation.y * 16 + 8 + Math.sin(activeFrameRef.current * 0.08) * 2;
      
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate((activeFrameRef.current * 1.8 * Math.PI) / 180);
      
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skyGrad;
      ctx.beginPath();
      ctx.arc(0, -3, 1.2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-0.8, -1, 1.6, 8);
      ctx.fillRect(0.8, 3, 2, 1.2);
      ctx.fillRect(0.8, 5.2, 2, 1.2);
      
      ctx.restore();
    }

    // J. Draw Anime Player with Squash & Stretch + Cape sways
    playersRef.current.forEach((p) => {
      if (!p.isAlive) return;

      if (p.vx > 0.1) p.facingRight = true;
      else if (p.vx < -0.1) p.facingRight = false;
      if (p.facingRight === undefined) p.facingRight = true;

      ctx.save();

      const cx = p.x + p.width / 2;
      const bottomY = p.y + p.height;
      const isMoving = Math.abs(p.vx) > 0.15;
      const isJumping = !p.isGrounded;
      const frame = activeFrameRef.current;

      // Squash and Stretch Logic
      p.squashTimer = p.squashTimer || 0;
      if (p.isGrounded) {
        if (p.wasJumping) {
          p.squashTimer = 10;
          p.wasJumping = false;
        }
      } else {
        p.wasJumping = true;
      }
      if (p.squashTimer > 0) p.squashTimer--;

      let scaleY = 1.0;
      let scaleX = 1.0;

      if (p.isGrounded && p.squashTimer > 0) {
        // Squashed on land
        scaleY = 1.0 - (p.squashTimer / 10) * 0.15;
        scaleX = 1.0 + (p.squashTimer / 10) * 0.15;
      } else if (!p.isGrounded) {
        // Stretched in mid-air
        scaleY = 1.0 + Math.min(0.2, Math.abs(p.vy) * 0.04);
        scaleX = 1.0 - Math.min(0.15, Math.abs(p.vy) * 0.03);
      }

      ctx.translate(cx, bottomY);
      if (!p.facingRight) {
        ctx.scale(-1, 1);
      }

      // Coat theme colors
      const coatColor = p.isP2 ? '#8b5cf6' : '#f97316'; // P1: Devil Orange, P2: Purple
      const coatDark = p.isP2 ? '#6d28d9' : '#c2410c';
      const pantsColor = '#1e293b';
      const skinColor = '#ffedd5';
      const hairColor = '#0f172a';
      const scarfColor = '#ef4444'; // Red scarf

      const runCycle = Math.sin(frame * 0.4);
      const scarfSway = Math.sin(frame * 0.25) * 3;

      // 1. Red flowing scarf/cape
      ctx.fillStyle = scarfColor;
      ctx.beginPath();
      ctx.moveTo(-1.5 * scaleX, -13 * scaleY);
      ctx.quadraticCurveTo(-6 * scaleX + scarfSway, -10 * scaleY, -10 * scaleX + scarfSway, -12 * scaleY);
      ctx.lineTo(-9 * scaleX + scarfSway, -8 * scaleY);
      ctx.quadraticCurveTo(-5 * scaleX + scarfSway, -9 * scaleY, -1 * scaleX, -10 * scaleY);
      ctx.closePath();
      ctx.fill();

      // 2. Legs & Boots
      ctx.fillStyle = pantsColor;
      if (isJumping) {
        ctx.fillRect(-3.5 * scaleX, -7 * scaleY, 2.5 * scaleX, 5 * scaleY);
        ctx.fillRect(1 * scaleX, -7 * scaleY, 2.5 * scaleX, 5 * scaleY);
        ctx.fillStyle = '#020617';
        ctx.fillRect(-4.5 * scaleX, -2 * scaleY, 3.5 * scaleX, 2 * scaleY);
        ctx.fillRect(0.5 * scaleX, -2 * scaleY, 3.5 * scaleX, 2 * scaleY);
      } else if (isMoving) {
        const leftLegOffset = runCycle * 3;
        ctx.fillRect((-3 + leftLegOffset) * scaleX, -7 * scaleY, 2.5 * scaleX, 5.5 * scaleY);
        ctx.fillRect((0.5 - leftLegOffset) * scaleX, -7 * scaleY, 2.5 * scaleX, 5.5 * scaleY);
        ctx.fillStyle = '#020617';
        ctx.fillRect((-4 + leftLegOffset) * scaleX, -1.8 * scaleY, 3.5 * scaleX, 1.8 * scaleY);
        ctx.fillRect((-0.5 - leftLegOffset) * scaleX, -1.8 * scaleY, 3.5 * scaleX, 1.8 * scaleY);
      } else {
        ctx.fillRect(-3.5 * scaleX, -6 * scaleY, 2.5 * scaleX, 5 * scaleY);
        ctx.fillRect(0.5 * scaleX, -6 * scaleY, 2.5 * scaleX, 5 * scaleY);
        ctx.fillStyle = '#020617';
        ctx.fillRect(-4 * scaleX, -1 * scaleY, 3.2 * scaleX, 1.2 * scaleY);
        ctx.fillRect(0.2 * scaleX, -1 * scaleY, 3.2 * scaleX, 1.2 * scaleY);
      }

      // 3. Torso & Coat
      ctx.fillStyle = coatColor;
      ctx.fillRect(-3 * scaleX, -14 * scaleY, 6 * scaleX, 8 * scaleY);
      
      // Collar detail
      ctx.fillStyle = coatDark;
      ctx.fillRect(-3 * scaleX, -15 * scaleY, 6 * scaleX, 1.5 * scaleY);

      // 4. Arms
      ctx.fillStyle = coatColor;
      if (isJumping) {
        ctx.fillRect(-5 * scaleX, -13 * scaleY, 2.2 * scaleX, 5 * scaleY);
        ctx.fillRect(2.8 * scaleX, -13 * scaleY, 2.2 * scaleX, 5 * scaleY);
      } else {
        const armSwing = isMoving ? runCycle * 1.5 : 0;
        ctx.fillRect((2.2 + armSwing) * scaleX, -12 * scaleY, 2.2 * scaleX, 5 * scaleY);
      }

      // 5. Head & Skin
      ctx.fillStyle = skinColor;
      ctx.fillRect(-2.2 * scaleX, -20 * scaleY, 4.4 * scaleX, 5 * scaleY);

      // Cute blinking eye
      ctx.fillStyle = p.isP2 ? '#8b5cf6' : '#3b82f6';
      ctx.fillRect(1.2 * scaleX, -18 * scaleY, 1.5 * scaleX, 2 * scaleY);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1.5 * scaleX, -18 * scaleY, 0.7 * scaleX, 0.7 * scaleY);

      // 6. Hair
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -19.5 * scaleY, 4 * scaleX, Math.PI, 0);
      ctx.fill();

      // Messy spikes
      ctx.beginPath();
      ctx.moveTo(-4 * scaleX, -19.5 * scaleY);
      ctx.lineTo(-1 * scaleX, -15.5 * scaleY);
      ctx.lineTo(2.2 * scaleX, -19 * scaleY);
      ctx.lineTo(3.2 * scaleX, -16 * scaleY);
      ctx.lineTo(4.5 * scaleX, -20.5 * scaleY);
      ctx.lineTo(2 * scaleX, -23 * scaleY);
      ctx.lineTo(-1 * scaleX, -22.5 * scaleY);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // K. Draw Particles
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // L. Draw Ambient glow lighting & screen vignette
    drawAmbientLighting();

    // M. Inverted Warning overlay
    if (isInvertedControlsRef.current) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(0, 0, 480, 272);
    }

    ctx.restore();
  };

  // Light composite and vignette helper
  const drawAmbientLighting = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Dark Vignette border
    const vignette = ctx.createRadialGradient(240, 136, 130, 240, 136, 260);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 480, 272);

    // 2. Translucent Ambient Screen-composite Glows
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Player glows (Orange)
    playersRef.current.forEach((p) => {
      if (!p.isAlive) return;
      const playerGlow = ctx.createRadialGradient(p.x + p.width / 2, p.y + p.height / 2, 2, p.x + p.width / 2, p.y + p.height / 2, 38);
      playerGlow.addColorStop(0, 'rgba(251, 146, 60, 0.16)');
      playerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = playerGlow;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 38, 0, Math.PI * 2);
      ctx.fill();
    });

    // Green portal exit glow
    const portalGlow = ctx.createRadialGradient(doorPosRef.current.x + 8, doorPosRef.current.y + 16, 4, doorPosRef.current.x + 8, doorPosRef.current.y + 16, 52);
    portalGlow.addColorStop(0, 'rgba(52, 211, 153, 0.22)');
    portalGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = portalGlow;
    ctx.beginPath();
    ctx.arc(doorPosRef.current.x + 8, doorPosRef.current.y + 16, 52, 0, Math.PI * 2);
    ctx.fill();

    // Golden keys/coins glows
    for (let r = 0; r < 17; r++) {
      for (let c = 0; c < 30; c++) {
        const tile = currentGridRef.current[r][c];
        if (tile === 10 || tile === 11) {
          const kx = c * 16 + 8;
          const ky = r * 16 + 8;
          const keyGlow = ctx.createRadialGradient(kx, ky, 2, kx, ky, 22);
          keyGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
          keyGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = keyGlow;
          ctx.beginPath();
          ctx.arc(kx, ky, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };


  // Human-readable speedrun timer formatter
  const formatTimer = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    const mil = Math.floor(ms % 1000).toString().padStart(3, '0');
    return `${m}:${s}.${mil}`;
  };

  const speedrunTime = Date.now() - timerStartRef.current;

  return (
    <div id="game-canvas-container" className="relative flex flex-col items-center select-none bg-neutral-900 border-4 border-neutral-800 rounded-lg shadow-2xl p-1">
      {/* Top HUD bar */}
      <div className="w-full flex justify-between items-center bg-neutral-950 px-4 py-2 border-b-2 border-neutral-800 rounded-t-md text-white font-display text-sm">
        <div className="flex items-center gap-3">
          <span className="bg-orange-600 px-2 py-0.5 rounded text-xs font-bold font-sans">
            WORLD {level.world}
          </span>
          <span className="font-bold text-neutral-200">
            Lvl {level.id} - {level.name}
          </span>
        </div>

        {/* Dynamic Speedrun Timer */}
        {settings.showSpeedrunTimer && (
          <div className="font-mono text-amber-400 font-bold bg-amber-950/40 border border-amber-900/50 px-3 py-0.5 rounded tracking-wider">
            ⏱️ {formatTimer(speedrunTime)}
          </div>
        )}

        <div className="flex items-center gap-4 font-mono text-neutral-300">
          {level.keyIndex !== undefined && (
            <span className="flex items-center gap-1">
              🔑 {keysCollected[level.keyIndex] ? '1/1' : '0/1'}
            </span>
          )}
          {settings.showDeathCounter && (
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              💀 {deathsThisLevelRef.current}
            </span>
          )}
        </div>
      </div>

      {/* Render Canvas element */}
      <div className="relative overflow-hidden bg-neutral-950">
        <canvas
          ref={canvasRef}
          width={480}
          height={272}
          id="devil-web-stage"
          className="pixel-border block w-[720px] h-[408px] bg-neutral-950 max-w-full cursor-none"
        />

        {/* Overlay warnings for Inverted Controls */}
        {isInvertedControlsRef.current && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/30 text-red-200 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded shadow-lg animate-pulse">
            ⚠️ WARNING: INVERTED CONTROLS ⚠️
          </div>
        )}
      </div>

      {/* In-game Mobile Controls / Desktop Quick Keys Info */}
      <div className="w-full flex justify-between items-center text-xs text-neutral-500 font-sans px-4 py-2 bg-neutral-950/50 rounded-b-md">
        <div>
          <span>P1 keys: <strong className="text-neutral-300">A / D / W</strong> or <strong className="text-neutral-300">Space</strong></span>
          {isCoop && <span className="ml-4">P2 keys: <strong className="text-neutral-300">← / → / ↑</strong></span>}
        </div>
        <div>
          <span>Press <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300 border border-neutral-700">R</kbd> to quick restart</span>
        </div>
      </div>
    </div>
  );
};
