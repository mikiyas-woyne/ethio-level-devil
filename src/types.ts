/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  showDeathCounter: boolean;
  showSpeedrunTimer: boolean;
  buttonOpacity: number;
}

export interface PlayerState {
  x: number; // coordinates in pixels
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  isAlive: boolean;
  respawnTimer: number;
  isP2: boolean;
  color: string;
  facingRight?: boolean;
}

export interface CrateState {
  id: string;
  x: number; // pixel coords
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}

export interface BombState {
  id: string;
  tileX: number;
  tileY: number;
  fuseTimer: number; // 3.0 seconds counting down
  isLit: boolean;
  isExploded: boolean;
  blastRadius: number; // in pixels
}

export interface RollingBallState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isSpawned: boolean;
  triggerX: number; // Player X threshold
}

export type TrapState =
  | {
      id: string;
      type: 'pop_up_spikes';
      tileX: number;
      tileY: number;
      triggerX: number; // player tile X range
      state: 'idle' | 'warning' | 'active' | 'retracting';
      timer: number;
    }
  | {
      id: string;
      type: 'falling_ceiling';
      tileX: number;
      tileY: number;
      startY: number; // pixel Y
      currentY: number; // pixel Y
      triggerX: number; // player tile X range
      state: 'idle' | 'warning' | 'falling' | 'grounded';
      timer: number;
    }
  | {
      id: string;
      type: 'moving_wall';
      startX: number; // pixel X
      startY: number; // pixel Y
      currentX: number;
      currentY: number;
      width: number;
      height: number;
      targetX: number;
      triggerX: number;
      state: 'idle' | 'moving' | 'returning';
      speed: number;
    }
  | {
      id: string;
      type: 'buzzsaw';
      x: number; // pixel X
      y: number; // pixel Y
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      speed: number;
      direction: 1 | -1;
      radius: number;
      triggerRadius?: number; // if trigger based
      isChasing?: boolean;
    };

export interface CrumblingTileState {
  tileX: number;
  tileY: number;
  timer: number; // 0.3s
  state: 'idle' | 'shaking' | 'crumbled';
}

export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  world: 'PITS' | 'COINS' | 'SPRINGS' | 'GRAVITY' | 'WRAPAROUND' | 'INVERT' | 'FINAL';
  grid: number[][]; // 17 rows by 30 columns
  startX: number; // tile X
  startY: number; // tile Y
  doorX: number; // tile X
  doorY: number; // tile Y
  hasWraparound?: boolean;
  hasInvertedControls?: boolean;
  startGravityFlipped?: boolean;
  keyLocation?: { x: number; y: number }; // tile X, Y
  keyIndex?: number; // 0 to 9 index
  customTraps?: Omit<TrapState, 'state' | 'timer' | 'currentY' | 'currentX' | 'direction' | 'isChasing'>[];
  doorMoveLocations?: { x: number; y: number }[]; // coordinates where door teleports on approach
  invisiblePits?: { x: number; y: number }[]; // tiles that become pits when stepped on
  rhythmInterval?: number; // in frames, e.g., 60 frames (1 second)
}

export interface SavedProgress {
  unlockedLevel: number;
  deaths: Record<number, number>;
  keysCollected: boolean[]; // size 10
  bestTimes: Record<number, number>; // for speedruns
}
