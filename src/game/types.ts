export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'GAME_OVER';

export enum Direction {
  NONE = 'NONE',
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum TileType {
  EMPTY = 0,
  WALL = 1,
  DOT = 2,
  POWER = 3,
  GHOST_DOOR = 4,
  HURDLE = 5, // Low barrier: Pac-Man can jump over it using the Jump button!
  SPRING = 6, // Free auto-bounce spring tile!
}

export interface Vector2D {
  x: number;
  y: number;
}

export type GhostPersonality = 'CHASER' | 'AMBUSHER' | 'PATROLLER' | 'WANDERER';

export interface GhostEntity {
  id: string;
  name: string;
  thaiRole: string;
  personality: GhostPersonality;
  color: string;
  accentColor: string;
  x: number; // Grid float coordinates (e.g., 9.5 is center of tile 9)
  y: number;
  startX: number;
  startY: number;
  dir: Direction;
  speed: number;
  isFrightened: boolean;
  isEaten: boolean;
  stunTimer: number; // Stunned by Pac-Man's landing shockwave
  releaseDelay: number;
  leapedOverInCurrentJump: boolean; // Tracks if Pac-Man already scored a leap-over bonus this jump
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export interface BonusFruit {
  active: boolean;
  x: number;
  y: number;
  timer: number;
  points: number;
  type: 'PEACH' | 'MELON' | 'STAR';
}

export interface HudSnapshot {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  levelName: string;
  levelThaiName: string;
  dotsRemaining: number;
  totalDots: number;
  jumpCharges: number;
  maxJumpCharges: number;
  jumpCooldownProgress: number; // 0 to 1
  isAirborne: boolean;
  frightenedTimeLeft: number;
  comboCount: number;
  lastActionLabel: string;
  vaultCount: number;
  ghostsLeapedCount: number;
}
