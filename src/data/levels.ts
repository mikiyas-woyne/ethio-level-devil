/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelDefinition, TrapState } from '../types';

// Character maps used to represent our 17 rows by 30 columns grids:
// ' ' or '.' : Empty Air (0)
// '#' : Floor Block (1)
// 'W' : Wall Block (2)
// '^' : Spike Up (3)
// 'v' : Spike Down (4)
// '<' : Spike Left (5)
// '>' : Spike Right (6)
// 'D' : Exit Door (7)
// 'S' : Spring (8)
// 'F' : Fake Floor (9)
// 'K' : Key (10)
// 'C' : Real Coin (11)
// 'x' : Fake Coin (12)
// 'I' : Crate / Pushable Box (13)
// '[' : Turret Left (14)
// ']' : Turret Right (15)
// 'B' : Bomb (16)
// 'O' : Breakable Wall (17)
// 'r' : Rhythm Platform (18)
// 'g' : Gravity Flip Zone (20)
// 'P' : Player Spawn Point (replaced with Air during parsing)

const rawLevels: {
  id: number;
  name: string;
  world: LevelDefinition['world'];
  hasWraparound?: boolean;
  hasInvertedControls?: boolean;
  startGravityFlipped?: boolean;
  keyLocation?: { x: number; y: number };
  keyIndex?: number;
  doorMoveLocations?: { x: number; y: number }[];
  invisiblePits?: { x: number; y: number }[];
  rhythmInterval?: number;
  customTraps?: any[];
  layout: string[];
}[] = [
  // ==========================================
  // PITS WORLD (Levels 1 - 3)
  // ==========================================
  {
    id: 1,
    name: "The First Betrayal",
    world: "PITS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P                 D      W",
      "W############################W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The player will fall through tiles 15, 16, and 17 from the left!
    invisiblePits: [
      { x: 14, y: 15 },
      { x: 15, y: 15 },
      { x: 16, y: 15 }
    ]
  },
  {
    id: 2,
    name: "Spikes From Nowhere",
    world: "PITS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             ^              W",
      "W   P         #       D      W",
      "W######   #########   #######W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // When the player gets near x=18 to x=22 (just before the door), pop-up spikes emerge!
    customTraps: [
      {
        id: "popup_spike_1",
        type: "pop_up_spikes",
        tileX: 20,
        tileY: 15,
        triggerX: 18 // Triggered once player advances past column 18
      }
    ]
  },
  {
    id: 3,
    name: "Crusher Ceiling",
    world: "PITS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W      W                     W",
      "W      W                     W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P                 D      W",
      "W#######   #   #   ##########W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // A huge wall tile block falls from the ceiling when the player gets past column 11
    customTraps: [
      {
        id: "falling_ceiling_1",
        type: "falling_ceiling",
        tileX: 13,
        tileY: 1, // falls from the top
        startY: 16, // starting Y offset (pixel coord, grid row 1 = 16px)
        triggerX: 11
      }
    ]
  },
  {
    id: 4,
    name: "Faith Leap Pit",
    world: "PITS",
    keyIndex: 0, // Hidden Key 1 is here!
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P                 D      W",
      "W######^^v^^######^^#########W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The key is hidden in the middle spike pit, but wait!
    // The floor under those spikes is a FAKE platform!
    // If you jump directly into the middle spikes, they are actually fake and there is a key at the bottom!
    // Let's configure key inside the pit (tile X=10, Y=14)
    keyLocation: { x: 8, y: 13 }
  },

  // ==========================================
  // COINS WORLD (Levels 5 - 7)
  // ==========================================
  {
    id: 5,
    name: "Lured by Greed",
    world: "COINS",
    keyIndex: 1, // Key 2 is hidden here!
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W       C                    W",
      "W      ###         x         W",
      "W   P             ###   D    W",
      "W#######vvv#####vvvvvv#######W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The "x" is a fake coin. The "C" is a real coin.
    // However, stepping on the middle platform (column 18-20) to grab the fake coin triggers collapsing tiles!
    invisiblePits: [
      { x: 17, y: 13 },
      { x: 18, y: 13 },
      { x: 19, y: 13 }
    ],
    keyLocation: { x: 11, y: 15 } // Key 2 is actually inside the left spike pit, but those spikes are fake!
  },
  {
    id: 6,
    name: "The False Exit",
    world: "COINS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             W              W",
      "W             W              W",
      "W   C   C     W              W",
      "W  ### ###    W              W",
      "W             W              W",
      "W             W              W",
      "W             W       D      W",
      "W   P         W       ^      W",
      "W##########   W##############W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The visible door has a spike block underneath it that pops up right when you land near it!
    // But there is a hidden warp behind the left brick wall that opens up when you walk against it!
    customTraps: [
      {
        id: "fake_door_spike",
        type: "pop_up_spikes",
        tileX: 22,
        tileY: 15,
        triggerX: 20
      }
    ],
    doorMoveLocations: [
      { x: 2, y: 14 }, // teleports to start area behind the player once they approach the trap door!
    ]
  },
  {
    id: 7,
    name: "The Slide Crusher",
    world: "COINS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             W              W",
      "W             W              W",
      "W             W              W",
      "W             W              W",
      "W             W              W",
      "W      C      W       D      W",
      "W   P  x      W              W",
      "W#############W##############W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // Walking past the fake coin 'x' trigger a crusher wall sliding in from the right wall
    customTraps: [
      {
        id: "side_crusher_1",
        type: "moving_wall",
        startX: 416, // column 26
        startY: 224, // row 14
        width: 32,
        height: 16,
        targetX: 200, // slide deep left
        triggerX: 9,
        speed: 4
      }
    ]
  },

  // ==========================================
  // SPRINGS WORLD (Levels 8 - 10)
  // ==========================================
  {
    id: 8,
    name: "Spring into Spikes",
    world: "SPRINGS",
    keyIndex: 2, // Key 3 is here!
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W          vvvvv             W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P       S         D      W",
      "W############################W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // Spikes are right above the spring on the ceiling!
    // If you bounce normally, you die. You must drift hard left or right after launching.
    keyLocation: { x: 3, y: 4 } // hidden high up on the left wall ledge
  },
  {
    id: 9,
    name: "Buzzsaw Bounce",
    world: "SPRINGS",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P       S   S     D      W",
      "W#######^^^^#####^^^^########W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // We add a patrolling Buzzsaw right above the second spring!
    customTraps: [
      {
        id: "buzzsaw_1",
        type: "buzzsaw",
        startX: 256, // pixel coords
        startY: 96,
        targetX: 128,
        targetY: 96,
        speed: 3,
        radius: 14
      }
    ]
  },

  // ==========================================
  // GRAVITY WORLD (Levels 10 - 11)
  // ==========================================
  {
    id: 10,
    name: "Gravity Flip",
    world: "GRAVITY",
    keyIndex: 3, // Key 4 is here!
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W             vv             W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             g              W",
      "W   P                 D      W",
      "W########^^^^^^^^############W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The middle path is spike-covered. Player must walk into the 'g' gravity flip zone
    // to fall up to the ceiling, walk across, and walk into another 'g' or jump to fall back down.
    keyLocation: { x: 15, y: 3 } // hidden in a ceiling alcove
  },

  // ==========================================
  // WRAPAROUND WORLD (Levels 11 - 12)
  // ==========================================
  {
    id: 11,
    name: "The Infinite Loop",
    world: "WRAPAROUND",
    hasWraparound: true,
    keyIndex: 4, // Key 5 is here!
    layout: [
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             W              W",
      "W             W              W",
      "W      W      W      W       W",
      "W      W      W      W       W",
      "W      W      W      W       W",
      "W      W             W       W",
      "W      W             W       W",
      "W   P  W             W    D  W",
      "W#######             #########W",
      "WWWWWWWW             WWWWWWWWW"
    ],
    // Walk left from start to emerge on the right door, but the door is blocked by a wall!
    // You must jump into the pit in the middle, wrap around vertically (falls through bottom, emerges at top!)
    // and guide your fall onto the central pillar.
    keyLocation: { x: 15, y: 3 }
  },

  // ==========================================
  // INVERT WORLD (Levels 12 - 13)
  // ==========================================
  {
    id: 12,
    name: "Left is Right",
    world: "INVERT",
    hasInvertedControls: true,
    keyIndex: 8, // Key 9 is here!
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             ^              W",
      "W            ###             W",
      "W   P                 D      W",
      "W########^^^^^^^^############W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    keyLocation: { x: 15, y: 10 }
  },

  // ==========================================
  // FINAL WORLD (Levels 13 - 15)
  // ==========================================
  {
    id: 13,
    name: "Demolition Fuse",
    world: "FINAL",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P         B     O   D    W",
      "W###################O########W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ]
  },
  {
    id: 14,
    name: "Rhythm Hops",
    world: "FINAL",
    rhythmInterval: 60, // toggles every 60 frames (1 second at 60 FPS)
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W   P     r     r     r  D   W",
      "W######^^^^^^^^^^^^^^^^######W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ]
  },
  {
    id: 15,
    name: "The Ultimate Devilry",
    world: "FINAL",
    layout: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W                            W",
      "W             ^              W",
      "W            ###             W",
      "W   P  [              ]  D   W",
      "W############################W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
    ],
    // The door is fake and teleports! Turrets shoot bullets constantly!
    customTraps: [
      {
        id: "ultimate_spike_1",
        type: "pop_up_spikes",
        tileX: 25,
        tileY: 15,
        triggerX: 22
      }
    ],
    doorMoveLocations: [
      { x: 3, y: 11 }, // teleports to high ceiling platform when approached!
    ]
  }
];

// Helper parser to convert raw layout arrays of strings into a numeric matrix and initial player states
export function getLevel(levelId: number): LevelDefinition | null {
  const raw = rawLevels.find((l) => l.id === levelId);
  if (!raw) return null;

  // 17 rows, 30 columns
  const grid: number[][] = Array(17)
    .fill(null)
    .map(() => Array(30).fill(0));
  let startX = 2;
  let startY = 14;
  let doorX = 26;
  let doorY = 14;

  const charToTileMap: Record<string, number> = {
    '#': 1, // Floor
    'W': 2, // Wall
    '^': 3, // Spike Up
    'v': 4, // Spike Down
    '<': 5, // Spike Left
    '>': 6, // Spike Right
    'D': 7, // Door (represented in-game as an interactive object)
    'S': 8, // Spring
    'F': 9, // Fake Floor
    'K': 10, // Key
    'C': 11, // Real Coin
    'x': 12, // Fake Coin
    'I': 13, // Crate
    '[': 14, // Turret Left
    ']': 15, // Turret Right
    'B': 16, // Bomb
    'O': 17, // Breakable Wall
    'r': 18, // Rhythm Platform
    'g': 20, // Gravity Flip Trigger Zone
  };

  for (let r = 0; r < 17; r++) {
    const rowStr = raw.layout[r] || "";
    for (let c = 0; c < 30; c++) {
      const char = rowStr[c] || " ";
      if (char === 'P') {
        startX = c;
        startY = r;
        grid[r][c] = 0; // replace with Air
      } else if (char === 'D') {
        doorX = c;
        doorY = r;
        grid[r][c] = 7; // door tile
      } else {
        grid[r][c] = charToTileMap[char] || 0;
      }
    }
  }

  // Parse traps
  const traps: LevelDefinition['customTraps'] = (raw.customTraps || []).map((t) => {
    if (t.type === 'pop_up_spikes') {
      return {
        id: t.id,
        type: 'pop_up_spikes',
        tileX: t.tileX,
        tileY: t.tileY,
        triggerX: t.triggerX,
      };
    } else if (t.type === 'falling_ceiling') {
      return {
        id: t.id,
        type: 'falling_ceiling',
        tileX: t.tileX,
        tileY: t.tileY,
        startY: t.startY * 16,
        triggerX: t.triggerX,
      };
    } else if (t.type === 'moving_wall') {
      return {
        id: t.id,
        type: 'moving_wall',
        startX: t.startX,
        startY: t.startY,
        width: t.width,
        height: t.height,
        targetX: t.targetX,
        triggerX: t.triggerX,
        speed: t.speed,
      };
    } else if (t.type === 'buzzsaw') {
      return {
        id: t.id,
        type: 'buzzsaw',
        x: t.startX,
        y: t.startY,
        startX: t.startX,
        startY: t.startY,
        targetX: t.targetX,
        targetY: t.targetY,
        speed: t.speed,
        radius: t.radius,
      };
    }
    return t;
  });

  return {
    id: raw.id,
    name: raw.name,
    world: raw.world,
    grid,
    startX,
    startY,
    doorX,
    doorY,
    hasWraparound: raw.hasWraparound || false,
    hasInvertedControls: raw.hasInvertedControls || false,
    startGravityFlipped: raw.startGravityFlipped || false,
    keyLocation: raw.keyLocation,
    keyIndex: raw.keyIndex,
    customTraps: traps,
    doorMoveLocations: raw.doorMoveLocations,
    invisiblePits: raw.invisiblePits,
    rhythmInterval: raw.rhythmInterval,
  };
}

export const totalAvailableLevels = rawLevels.length;
export const allLevelsList = rawLevels.map((l) => ({
  id: l.id,
  name: l.name,
  world: l.world,
}));
