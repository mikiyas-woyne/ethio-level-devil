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
        return { ...t, state: 'idle', timer: 0 };
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
        let pNear = false;

        playersRef.current.forEach((p) => {
          if (p.isAlive && p.x > triggerPos) {
            pNear = true;
          }
        });

        if (pNear && trap.state === 'idle') {
          trap.state = 'warning';
          trap.timer = 9; // ~0.15s warning duration
          audio.playSFX('click');
        }

        if (trap.state === 'warning') {
          trap.timer--;
          if (trap.timer <= 0) {
            trap.state = 'active';
            trap.timer = 120; // remain active for 2 seconds
          }
        }

        if (trap.state === 'active') {
          trap.timer--;
          if (trap.timer <= 0) {
            trap.state = 'retracting';
            trap.timer = 15;
          }

          // Check spike collision
          playersRef.current.forEach((p, idx) => {
            if (!p.isAlive) return;
            const spikeHitbox = {
              x: trap.tileX * 16,
              y: trap.tileY * 16,
              w: 16,
              h: 16,
            };
            if (isOverlapping(p.x, p.y, p.width, p.height, spikeHitbox.x, spikeHitbox.y, spikeHitbox.w, spikeHitbox.h)) {
              killPlayer(idx);
            }
          });
        }

        if (trap.state === 'retracting') {
          trap.timer--;
          if (trap.timer <= 0) {
            trap.state = 'idle';
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

      // Patrol Buzzsaws
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

    // 6. Update Crumbling/Collapsing Platforms
    crumblingTilesRef.current = crumblingTilesRef.current
      .map((block) => {
        if (block.state === 'shaking') {
          block.timer -= 1 / 60;
          if (block.timer <= 0) {
            block.state = 'crumbled';
            // destroy the tile on grid
            currentGridRef.current[block.tileY][block.tileX] = 0;
            audio.playSFX('death'); // crumble sound
            createSparkles(block.tileX * 16 + 8, block.tileY * 16 + 8, '#BF360C');
          }
        }
        return block;
      })
      .filter((b) => b.state !== 'crumbled');

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

  // HTML5 Canvas Graphics Rendering
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

    // A. Draw Background (Level Devil signature burnt-orange sky)
    ctx.fillStyle = '#CF6839';
    ctx.fillRect(0, 0, 480, 272);

    // B. Draw Level Grid
    for (let r = 0; r < 17; r++) {
      for (let c = 0; c < 30; c++) {
        const tile = currentGridRef.current[r][c];
        const tx = c * 16;
        const ty = r * 16;

        switch (tile) {
          case 1: {
            // FLOOR: Level Devil dark chocolate brown ground
            ctx.fillStyle = '#351C12';
            ctx.fillRect(tx, ty, 16, 16);
            break;
          }
          case 2: {
            // WALL: Level Devil dark chocolate brown wall
            ctx.fillStyle = '#351C12';
            ctx.fillRect(tx, ty, 16, 16);
            break;
          }
          case 3: {
            // SPIKE UP: warning red triangles
            ctx.fillStyle = '#D50000';
            ctx.beginPath();
            ctx.moveTo(tx, ty + 16);
            ctx.lineTo(tx + 8, ty);
            ctx.lineTo(tx + 16, ty + 16);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 4: {
            // SPIKE DOWN
            ctx.fillStyle = '#D50000';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 8, ty + 16);
            ctx.lineTo(tx + 16, ty);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 5: {
            // SPIKE LEFT
            ctx.fillStyle = '#D50000';
            ctx.beginPath();
            ctx.moveTo(tx + 16, ty);
            ctx.lineTo(tx, ty + 8);
            ctx.lineTo(tx + 16, ty + 16);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 6: {
            // SPIKE RIGHT
            ctx.fillStyle = '#D50000';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + 16, ty + 8);
            ctx.lineTo(tx, ty + 16);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 8: {
            // SPRING launcher
            ctx.fillStyle = '#381D38'; // Dark base
            ctx.fillRect(tx + 4, ty + 8, 8, 8);
            ctx.fillStyle = '#15803D'; // Green launch cap
            ctx.fillRect(tx + 1, ty + 4, 14, 4);
            break;
          }
          case 11:
          case 12: {
            // COIN (Real / Fake)
            const bobOffset = Math.sin(activeFrameRef.current * 0.1) * 2;
            ctx.fillStyle = '#FAC835'; // Gold
            ctx.beginPath();
            ctx.arc(tx + 8, ty + 8 + bobOffset, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(tx + 6, ty + 5 + bobOffset, 2, 2);
            break;
          }
          case 14: {
            // Turret Left
            ctx.fillStyle = '#381D38';
            ctx.fillRect(tx + 4, ty + 2, 12, 12);
            ctx.fillStyle = '#212121';
            ctx.fillRect(tx, ty + 6, 6, 4);
            break;
          }
          case 15: {
            // Turret Right
            ctx.fillStyle = '#381D38';
            ctx.fillRect(tx, ty + 2, 12, 12);
            ctx.fillStyle = '#212121';
            ctx.fillRect(tx + 10, ty + 6, 6, 4);
            break;
          }
          case 17: {
            // Breakable wall
            ctx.fillStyle = '#8A3416';
            ctx.fillRect(tx, ty, 16, 16);
            ctx.fillStyle = '#FAC835';
            ctx.fillRect(tx, ty, 16, 2);
            ctx.strokeStyle = '#501D0B';
            ctx.strokeRect(tx, ty, 16, 16);
            break;
          }
          case 18: {
            // Rhythm platforms
            const isPlatformActive = Math.floor(activeFrameRef.current / (level.rhythmInterval || 60)) % 2 === 0;
            ctx.save();
            ctx.globalAlpha = isPlatformActive ? 1.0 : 0.25;
            ctx.fillStyle = '#7C4DFF';
            ctx.fillRect(tx, ty, 16, 16);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(tx, ty, 16, 16);
            ctx.restore();
            break;
          }
          case 20: {
            // Gravity Flip zone
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#E040FB';
            ctx.fillRect(tx, ty, 16, 16);
            ctx.restore();
            break;
          }
        }
      }
    }

    // CHEVRON ARROWS ON MAIN GROUND BLOCK (> > > > > >) - Exact match to reference image
    ctx.strokeStyle = '#4A1C0A'; // Dark brown chevron stroke
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // C. Draw Door at doorPosRef.current (Level Devil Green Arched Landscape Portal)
    const dx = doorPosRef.current.x;
    const dy = doorPosRef.current.y;

    // Green arched outer frame
    ctx.fillStyle = '#2EA052';
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 8, 8, Math.PI, 0);
    ctx.rect(dx, dy + 8, 16, 24);
    ctx.fill();

    // Inner landscape portal
    ctx.save();
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 8, 6, Math.PI, 0);
    ctx.rect(dx + 2, dy + 8, 12, 22);
    ctx.clip();

    // Sky inside door
    ctx.fillStyle = '#5DADE2';
    ctx.fillRect(dx + 2, dy + 2, 12, 28);

    // Green hills inside door
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.arc(dx + 4, dy + 26, 8, 0, Math.PI * 2);
    ctx.arc(dx + 12, dy + 28, 8, 0, Math.PI * 2);
    ctx.fill();

    // Small tree inside door
    ctx.fillStyle = '#795548';
    ctx.fillRect(dx + 10, dy + 20, 2, 6);
    ctx.fillStyle = '#27AE60';
    ctx.beginPath();
    ctx.arc(dx + 11, dy + 18, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // D. Top-Left ESC Button UI (exact match to Level Devil screenshot)
    const btnX = 10;
    const btnY = 8;
    ctx.fillStyle = '#351C12'; // Dark brown box
    ctx.fillRect(btnX, btnY, 14, 14);

    // Yellow left triangle arrow
    ctx.fillStyle = '#FAC835';
    ctx.beginPath();
    ctx.moveTo(btnX + 10, btnY + 3);
    ctx.lineTo(btnX + 4, btnY + 7);
    ctx.lineTo(btnX + 10, btnY + 11);
    ctx.closePath();
    ctx.fill();

    // "esc" text under button
    ctx.fillStyle = '#FAC835';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('esc', btnX + 7, btnY + 23);

    // D. Draw Pop up Spikes & Custom Traps
    trapsRef.current.forEach((trap) => {
      const tx = trap.tileX * 16;
      const ty = trap.tileY * 16;

      if (trap.type === 'pop_up_spikes') {
        ctx.fillStyle = '#D50000'; // Bright warning red
        if (trap.state === 'warning') {
          const shakeOffset = Math.sin(activeFrameRef.current * 0.8) * 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty + 16);
          ctx.lineTo(tx + 8, ty + 12 + shakeOffset);
          ctx.lineTo(tx + 16, ty + 16);
          ctx.closePath();
          ctx.fill();
        } else if (trap.state === 'active') {
          ctx.beginPath();
          ctx.moveTo(tx, ty + 16);
          ctx.lineTo(tx + 8, ty);
          ctx.lineTo(tx + 16, ty + 16);
          ctx.closePath();
          ctx.fill();
        } else if (trap.state === 'retracting') {
          ctx.beginPath();
          ctx.moveTo(tx, ty + 16);
          ctx.lineTo(tx + 8, ty + 8);
          ctx.lineTo(tx + 16, ty + 16);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (trap.type === 'falling_ceiling') {
        ctx.fillStyle = '#8A3416';
        ctx.fillRect(tx, trap.currentY, 16, 16);
        ctx.fillStyle = '#FAC835';
        ctx.strokeRect(tx, trap.currentY, 16, 16);
      }

      if (trap.type === 'moving_wall') {
        ctx.fillStyle = '#381D38';
        ctx.fillRect(trap.currentX, trap.currentY, trap.width, trap.height);
      }

      if (trap.type === 'buzzsaw') {
        ctx.save();
        ctx.translate(trap.x + 16, trap.y + 16);
        ctx.rotate((activeFrameRef.current * 15 * Math.PI) / 180);
        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath();
        ctx.arc(0, 0, trap.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // E. Draw Crates
    cratesRef.current.forEach((crate) => {
      ctx.fillStyle = '#8A3416';
      ctx.fillRect(crate.x, crate.y, crate.width, crate.height);
      ctx.strokeStyle = '#FAC835';
      ctx.strokeRect(crate.x, crate.y, crate.width, crate.height);
    });

    // F. Draw Bullets
    bulletsRef.current.forEach((bullet) => {
      ctx.fillStyle = '#212121';
      ctx.fillRect(bullet.x, bullet.y, 6, 4);
    });

    // G. Draw Bombs
    bombsRef.current.forEach((bomb) => {
      if (bomb.isExploded) return;
      const bx = bomb.tileX * 16 + 8;
      const by = bomb.tileY * 16 + 8;
      ctx.fillStyle = bomb.isLit && activeFrameRef.current % 10 < 5 ? '#D50000' : '#212121';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // H. Draw Absolute Keys
    if (level.keyLocation && isKeyAvailableRef.current) {
      const kx = level.keyLocation.x * 16 + 8;
      const ky = level.keyLocation.y * 16 + 8 + Math.sin(activeFrameRef.current * 0.1) * 2;
      ctx.fillStyle = '#FAC835';
      ctx.beginPath();
      ctx.arc(kx, ky, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // I. Draw Anime Protagonist Character (Blue Coat, Messy Black Spiky Hair, Maroon Shirt, Dark Pants)
    playersRef.current.forEach((p) => {
      if (!p.isAlive) return;

      // Update facing direction
      if (p.vx > 0.1) p.facingRight = true;
      else if (p.vx < -0.1) p.facingRight = false;
      if (p.facingRight === undefined) p.facingRight = true;

      ctx.save();

      const cx = p.x + p.width / 2;
      const bottomY = p.y + p.height; // ground contact
      const isMoving = Math.abs(p.vx) > 0.15;
      const isJumping = !p.isGrounded;
      const frame = activeFrameRef.current;

      ctx.translate(cx, bottomY);
      if (!p.facingRight) {
        ctx.scale(-1, 1);
      }

      // Color scheme from sprite sheet:
      const coatColor = p.isP2 ? '#7C3AED' : '#0284C7'; // Blue coat for P1, Purple for P2
      const coatDark = p.isP2 ? '#5B21B6' : '#0369A1';
      const shirtColor = '#881337'; // Maroon / burgundy shirt
      const pantsColor = '#1F2937'; // Dark charcoal pants
      const skinColor = '#FED7AA'; // Peach skin
      const hairColor = '#1E232A'; // Messy spiky black hair
      const hairHighlight = '#3F3F46';
      const eyeColor = '#2563EB'; // Blue anime eye

      // Animation parameters
      const runCycle = Math.sin(frame * 0.4);
      const coatFlap = isMoving ? Math.sin(frame * 0.5) * 2.5 : Math.sin(frame * 0.1) * 0.8;

      // 1. Coat Back Flap (flapping behind character)
      ctx.fillStyle = coatDark;
      ctx.beginPath();
      if (isJumping) {
        ctx.moveTo(-2, -10);
        ctx.lineTo(-9, -12 + coatFlap);
        ctx.lineTo(-6, -4 + coatFlap);
        ctx.lineTo(-2, -5);
      } else if (isMoving) {
        ctx.moveTo(-2, -10);
        ctx.lineTo(-8 - Math.abs(p.vx) * 1.5, -6 + coatFlap);
        ctx.lineTo(-6, -2 + coatFlap);
        ctx.lineTo(-2, -5);
      } else {
        ctx.moveTo(-2, -9);
        ctx.lineTo(-5, -3 + coatFlap);
        ctx.lineTo(-1, -3);
      }
      ctx.closePath();
      ctx.fill();

      // 2. Legs & Pants
      ctx.fillStyle = pantsColor;
      if (isJumping) {
        // Mid-air bent knees / split stance
        ctx.fillRect(-4, -6, 3, 5);
        ctx.fillRect(1, -7, 3, 6);
        // Boots
        ctx.fillStyle = '#111827';
        ctx.fillRect(-5, -2, 4, 2);
        ctx.fillRect(1, -2, 4, 2);
      } else if (isMoving) {
        // Running leg animation
        const legLeftX = -3.5 + runCycle * 3;
        const legRightX = 0.5 - runCycle * 3;
        ctx.fillRect(legLeftX, -7, 3, 5.5);
        ctx.fillRect(legRightX, -7, 3, 5.5);
        // Boots
        ctx.fillStyle = '#111827';
        ctx.fillRect(legLeftX - 1, -2, 4, 2);
        ctx.fillRect(legRightX, -2, 4, 2);
      } else {
        // Standing legs
        ctx.fillRect(-3.5, -6, 3, 5);
        ctx.fillRect(0.5, -6, 3, 5);
        // Boots
        ctx.fillStyle = '#111827';
        ctx.fillRect(-4, -1, 4, 2);
        ctx.fillRect(0, -1, 4, 2);
      }

      // 3. Inner Shirt (Maroon / Burgundy)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(-2, -12, 4.5, 6);

      // 4. Blue Coat / Jacket Body
      ctx.fillStyle = coatColor;
      // Left lapel
      ctx.beginPath();
      ctx.moveTo(-4, -13);
      ctx.lineTo(-1, -13);
      ctx.lineTo(-2, -5);
      ctx.lineTo(-5, -6);
      ctx.closePath();
      ctx.fill();

      // Right lapel
      ctx.beginPath();
      ctx.moveTo(1, -13);
      ctx.lineTo(4, -13);
      ctx.lineTo(5, -6);
      ctx.lineTo(2, -5);
      ctx.closePath();
      ctx.fill();

      // Coat Hood/Collar behind neck
      ctx.fillStyle = coatDark;
      ctx.fillRect(-3.5, -14, 7, 2);

      // 5. Arms & Sleeves
      ctx.fillStyle = coatColor;
      if (isJumping) {
        // Arms up / spread out
        ctx.fillRect(-5, -13, 3, 5);
        ctx.fillRect(2, -13, 3, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(-5, -15, 2, 2);
        ctx.fillRect(3, -15, 2, 2);
      } else if (isMoving) {
        // Running arm pumping
        const armX = 1 + runCycle * 2.5;
        ctx.fillRect(armX, -11, 3, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(armX + 0.5, -7, 2, 2);
      } else {
        // Idle arm at side
        ctx.fillRect(1, -11, 2.5, 5);
        ctx.fillStyle = skinColor;
        ctx.fillRect(1.5, -7, 2, 2);
      }

      // 6. Head & Face Skin Tone
      ctx.fillStyle = skinColor;
      ctx.fillRect(-2.5, -19, 6, 6); // face block
      ctx.fillRect(2, -17, 2, 3); // nose/jaw contour

      // Anime Eye
      ctx.fillStyle = eyeColor;
      ctx.fillRect(1.5, -17, 1.8, 2.5);
      ctx.fillStyle = '#FFFFFF'; // Eye shine highlight
      ctx.fillRect(2, -17, 1, 1);

      // 7. Spiky Messy Anime Hair (matching sprite sheet)
      ctx.fillStyle = hairColor;
      // Hair dome
      ctx.beginPath();
      ctx.arc(0, -18, 4.5, Math.PI, 0);
      ctx.fill();

      // Spiky tufts
      ctx.beginPath();
      ctx.moveTo(-4, -18);
      ctx.lineTo(-1, -14.5); // front bangs spike down
      ctx.lineTo(1, -18);
      ctx.lineTo(2.8, -15.5); // second bang spike
      ctx.lineTo(4, -17);
      ctx.lineTo(5, -19.5); // side spike
      ctx.lineTo(3, -22); // top right spike
      ctx.lineTo(0, -22.5); // top center spike
      ctx.lineTo(-3, -21.5); // top left spike
      ctx.lineTo(-5, -18); // back spike
      ctx.closePath();
      ctx.fill();

      // Hair highlights
      ctx.fillStyle = hairHighlight;
      ctx.fillRect(-1.5, -21.5, 2, 2);
      ctx.fillRect(1, -20.5, 1.5, 1.5);

      ctx.restore();
    });

    // J. Draw Particles
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // K. Draw environmental warning overlay if controls inverted
    if (isInvertedControlsRef.current) {
      ctx.fillStyle = 'rgba(255, 23, 68, 0.08)';
      ctx.fillRect(0, 0, 480, 272);
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
