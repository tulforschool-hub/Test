import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Direction,
  GameState,
  GhostEntity,
  HudSnapshot,
  Particle,
  FloatingText,
  ShockwaveRing,
  TileType,
  BonusFruit,
} from '../game/types';
import { LEVELS, GHOST_TEMPLATES, LevelConfig } from '../game/levels';
import { soundEngine } from '../audio/soundEngine';

export interface GameCanvasHandle {
  triggerJump: () => boolean;
  setDirectionInput: (dir: Direction) => void;
  startNewGame: (startingLevelIndex?: number) => void;
  nextStage: () => void;
  togglePause: () => void;
}

interface GameCanvasProps {
  gameState: GameState;
  onGameStateChange: (newState: GameState) => void;
  onHudUpdate: (snapshot: HudSnapshot) => void;
}

const GRID_SIZE = 19;
const TILE_PX = 36; // Internal logical canvas resolution: 19 * 36 = 684x684
const CANVAS_SIZE = GRID_SIZE * TILE_PX;

const MAX_JUMP_CHARGES = 3;
const JUMP_DURATION = 0.58; // seconds airborne
const SUPER_JUMP_DURATION = 0.76; // seconds airborne from spring pad
const JUMP_RECHARGE_SECONDS = 2.6; // seconds to recharge 1 jump pip

function dirToDelta(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case Direction.UP:
      return { dx: 0, dy: -1 };
    case Direction.DOWN:
      return { dx: 0, dy: 1 };
    case Direction.LEFT:
      return { dx: -1, dy: 0 };
    case Direction.RIGHT:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

function oppositeDir(dir: Direction): Direction {
  switch (dir) {
    case Direction.UP:
      return Direction.DOWN;
    case Direction.DOWN:
      return Direction.UP;
    case Direction.LEFT:
      return Direction.RIGHT;
    case Direction.RIGHT:
      return Direction.LEFT;
    default:
      return Direction.NONE;
  }
}

function dirToAngle(dir: Direction): number {
  switch (dir) {
    case Direction.RIGHT:
      return 0;
    case Direction.DOWN:
      return Math.PI / 2;
    case Direction.LEFT:
      return Math.PI;
    case Direction.UP:
      return -Math.PI / 2;
    default:
      return 0;
  }
}

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ gameState, onGameStateChange, onHudUpdate }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const gameStateRef = useRef<GameState>(gameState);

    useEffect(() => {
      gameStateRef.current = gameState;
    }, [gameState]);

    // Mutable simulation state isolated from React re-renders for locked 60fps
    const simRef = useRef({
      score: 0,
      highScore: 2400,
      lives: 3,
      levelIndex: 0,
      grid: [] as number[][],
      dotsRemaining: 0,
      totalDots: 0,

      // Pac-Man state
      pacX: 9.5,
      pacY: 15.5,
      pacDir: Direction.NONE,
      nextDir: Direction.NONE,
      facingDir: Direction.RIGHT,
      pacSpeed: 5.5, // tiles per second
      mouthTimer: 0,

      // Jump & Squash/Stretch state
      jumpCharges: MAX_JUMP_CHARGES,
      jumpRechargeTimer: 0,
      jumpTimer: 0,
      jumpMaxDuration: JUMP_DURATION,
      jumpBufferTimer: 0, // Buffered jump input before landing
      squashX: 1,
      squashY: 1,
      lastVaultTileKey: '',
      lastSpringTileKey: '',
      vaultCount: 0,
      ghostsLeapedCount: 0,

      // Ghosts & Power Mode
      ghosts: [] as GhostEntity[],
      frightenedTimer: 0,
      ghostCombo: 0,

      // Bonus Fruit
      fruit: {
        active: false,
        x: 9.5,
        y: 11.5,
        timer: 0,
        points: 300,
        type: 'PEACH',
      } as BonusFruit,
      dotsEatenThisStage: 0,

      // Juice: Hitstop, Camera Shake, Flash, Particles, Popups, Shockwaves
      hitstopTimer: 0,
      shakeIntensity: 0,
      flashAlpha: 0,
      flashColor: '#FFFFFF',
      respawnInvulnTimer: 0,
      lastActionLabel: 'พร้อมออกตัว!',
      particles: [] as Particle[],
      floatingTexts: [] as FloatingText[],
      shockwaves: [] as ShockwaveRing[],
      nextPopupId: 1,
      hudSyncAccum: 0,
    });

    // Helper: Emit particle burst
    const spawnParticles = (
      gridX: number,
      gridY: number,
      color: string,
      count: number = 10,
      speedSpread: number = 95
    ) => {
      const s = simRef.current;
      const px = gridX * TILE_PX;
      const py = gridY * TILE_PX;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const spd = (0.35 + Math.random() * 0.75) * speedSpread;
        s.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: 2.5 + Math.random() * 3.5,
          color,
          alpha: 1,
          life: 0,
          maxLife: 0.28 + Math.random() * 0.22,
        });
      }
    };

    // Helper: Floating score/action text
    const spawnFloatingText = (
      gridX: number,
      gridY: number,
      text: string,
      color: string = '#D97706',
      subtext?: string
    ) => {
      const s = simRef.current;
      s.floatingTexts.push({
        id: s.nextPopupId++,
        x: gridX * TILE_PX,
        y: gridY * TILE_PX - 10,
        text,
        subtext,
        color,
        life: 0,
        maxLife: 0.95,
      });
    };

    // Helper: Shockwave ring
    const spawnShockwave = (
      gridX: number,
      gridY: number,
      color: string = '#F59E0B',
      maxRadius: number = TILE_PX * 1.65
    ) => {
      const s = simRef.current;
      s.shockwaves.push({
        x: gridX * TILE_PX,
        y: gridY * TILE_PX,
        radius: 6,
        maxRadius,
        color,
        alpha: 0.85,
      });
    };

    const syncHud = () => {
      const s = simRef.current;
      const cfg: LevelConfig = LEVELS[s.levelIndex % LEVELS.length];
      onHudUpdate({
        score: s.score,
        highScore: s.highScore,
        lives: s.lives,
        level: s.levelIndex + 1,
        levelName: cfg.name,
        levelThaiName: cfg.thaiName,
        dotsRemaining: s.dotsRemaining,
        totalDots: s.totalDots,
        jumpCharges: s.jumpCharges,
        maxJumpCharges: MAX_JUMP_CHARGES,
        jumpCooldownProgress:
          s.jumpCharges >= MAX_JUMP_CHARGES ? 1 : s.jumpRechargeTimer / JUMP_RECHARGE_SECONDS,
        isAirborne: s.jumpTimer > 0,
        frightenedTimeLeft: s.frightenedTimer,
        comboCount: s.ghostCombo,
        lastActionLabel: s.lastActionLabel,
        vaultCount: s.vaultCount,
        ghostsLeapedCount: s.ghostsLeapedCount,
      });
    };

    const resetPositionsAfterLifeLost = () => {
      const s = simRef.current;
      const cfg = LEVELS[s.levelIndex % LEVELS.length];
      s.pacX = 9.5;
      s.pacY = 15.5;
      s.pacDir = Direction.NONE;
      s.nextDir = Direction.NONE;
      s.facingDir = Direction.RIGHT;
      s.jumpTimer = 0;
      s.jumpBufferTimer = 0;
      s.squashX = 1;
      s.squashY = 1;
      s.frightenedTimer = 0;
      s.respawnInvulnTimer = 1.6;

      s.ghosts = GHOST_TEMPLATES.map((tpl) => ({
        ...tpl,
        x: tpl.startX,
        y: tpl.startY,
        dir: Direction.UP,
        speed: 3.9 * cfg.ghostSpeedMultiplier,
        isFrightened: false,
        isEaten: false,
        stunTimer: 0,
        releaseDelay: tpl.releaseDelay * 0.7,
        leapedOverInCurrentJump: false,
      }));
      syncHud();
    };

    const loadStage = (stageIdx: number, resetScoreAndLives: boolean) => {
      const s = simRef.current;
      const cfg = LEVELS[stageIdx % LEVELS.length];
      const difficultyScale = 1 + Math.floor(stageIdx / LEVELS.length) * 0.12;

      if (resetScoreAndLives) {
        s.score = 0;
        s.lives = 3;
        s.vaultCount = 0;
        s.ghostsLeapedCount = 0;
      }

      s.levelIndex = stageIdx;
      s.grid = cfg.grid.map((row) => [...row]);

      let dots = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (s.grid[r][c] === TileType.DOT || s.grid[r][c] === TileType.POWER) {
            dots++;
          }
        }
      }
      s.dotsRemaining = dots;
      s.totalDots = dots;
      s.dotsEatenThisStage = 0;

      s.pacX = 9.5;
      s.pacY = 15.5;
      s.pacDir = Direction.NONE;
      s.nextDir = Direction.NONE;
      s.facingDir = Direction.RIGHT;
      s.jumpCharges = MAX_JUMP_CHARGES;
      s.jumpRechargeTimer = 0;
      s.jumpTimer = 0;
      s.jumpBufferTimer = 0;
      s.frightenedTimer = 0;
      s.ghostCombo = 0;
      s.respawnInvulnTimer = 1.2;
      s.lastActionLabel = `ด่าน ${stageIdx + 1}: ${cfg.thaiName}`;
      s.fruit.active = false;

      s.ghosts = GHOST_TEMPLATES.map((tpl) => ({
        ...tpl,
        x: tpl.startX,
        y: tpl.startY,
        dir: Direction.UP,
        speed: 3.95 * cfg.ghostSpeedMultiplier * difficultyScale,
        isFrightened: false,
        isEaten: false,
        stunTimer: 0,
        releaseDelay: tpl.releaseDelay,
        leapedOverInCurrentJump: false,
      }));

      s.particles = [];
      s.floatingTexts = [];
      s.shockwaves = [];
      syncHud();
    };

    // Execute a Jump (either via external button, keyboard Space, or free Spring Pad)
    const performJump = (isFreeSpring: boolean = false): boolean => {
      const s = simRef.current;
      if (gameStateRef.current !== 'PLAYING') return false;

      // If already mid-air, buffer the jump if near landing
      if (s.jumpTimer > 0 && !isFreeSpring) {
        if (s.jumpTimer < 0.2) {
          s.jumpBufferTimer = 0.22;
        }
        return false;
      }

      if (!isFreeSpring && s.jumpCharges <= 0) {
        return false;
      }

      if (!isFreeSpring) {
        s.jumpCharges = Math.max(0, s.jumpCharges - 1);
      }

      const duration = isFreeSpring ? SUPER_JUMP_DURATION : JUMP_DURATION;
      s.jumpTimer = duration;
      s.jumpMaxDuration = duration;
      s.lastVaultTileKey = '';

      // Reset per-jump ghost leap flags
      s.ghosts.forEach((g) => {
        g.leapedOverInCurrentJump = false;
      });

      // Squash & stretch launch
      s.squashX = 0.78;
      s.squashY = 1.28;

      // Launch ring + particles + audio
      spawnShockwave(s.pacX, s.pacY, isFreeSpring ? '#10B981' : '#FACC15', TILE_PX * 1.15);
      spawnParticles(s.pacX, s.pacY, isFreeSpring ? '#34D399' : '#FDE047', 8, 70);
      soundEngine.playJump(isFreeSpring);

      s.lastActionLabel = isFreeSpring ? 'แท่นสปริงดีดตัว! (ฟรีชาร์จ)' : 'กระโดดลอยตัว! (JUMP)';
      syncHud();
      return true;
    };

    useImperativeHandle(ref, () => ({
      triggerJump: () => performJump(false),
      setDirectionInput: (dir: Direction) => {
        simRef.current.nextDir = dir;
      },
      startNewGame: (startingLevelIndex = 0) => {
        loadStage(startingLevelIndex, true);
        soundEngine.playStartJingle();
        onGameStateChange('PLAYING');
      },
      nextStage: () => {
        const nextIdx = simRef.current.levelIndex + 1;
        loadStage(nextIdx, false);
        soundEngine.playStartJingle();
        onGameStateChange('PLAYING');
      },
      togglePause: () => {
        if (gameStateRef.current === 'PLAYING') {
          onGameStateChange('PAUSED');
        } else if (gameStateRef.current === 'PAUSED') {
          onGameStateChange('PLAYING');
        }
      },
    }));

    // Initialize stage 0 on mount for live background preview on Title Screen
    useEffect(() => {
      loadStage(0, true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyboard controls + window blur safety
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
          if (gameStateRef.current === 'PLAYING') {
            e.preventDefault();
          }
        }

        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (gameStateRef.current === 'PLAYING') {
            onGameStateChange('PAUSED');
          } else if (gameStateRef.current === 'PAUSED') {
            onGameStateChange('PLAYING');
          }
          return;
        }

        if (gameStateRef.current !== 'PLAYING') return;

        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            simRef.current.nextDir = Direction.UP;
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            simRef.current.nextDir = Direction.DOWN;
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            simRef.current.nextDir = Direction.LEFT;
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            simRef.current.nextDir = Direction.RIGHT;
            break;
          case ' ':
          case 'j':
          case 'J':
            performJump(false);
            break;
        }
      };

      const handleBlur = () => {
        // Clear buffered inputs when window loses focus
        simRef.current.nextDir = Direction.NONE;
      };

      window.addEventListener('keydown', handleKeyDown, { passive: false });
      window.addEventListener('blur', handleBlur);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('blur', handleBlur);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Check if tile is walkable for Pac-Man
    const canPacWalkTile = (col: number, row: number, isAirborne: boolean): boolean => {
      const s = simRef.current;
      if (row < 0 || row >= GRID_SIZE) return false;
      // Wrap tunnel horizontally
      const wrappedCol = ((col % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
      const tile = s.grid[row]?.[wrappedCol];
      if (tile === undefined) return false;
      if (tile === TileType.WALL || tile === TileType.GHOST_DOOR) return false;
      // Low Hurdle is walkable ONLY while airborne!
      if (tile === TileType.HURDLE) {
        return isAirborne;
      }
      return true;
    };

    // Check if tile is walkable for Ghost
    const canGhostWalkTile = (
      col: number,
      row: number,
      inGhostHouse: boolean,
      isEaten: boolean
    ): boolean => {
      const s = simRef.current;
      if (row < 0 || row >= GRID_SIZE) return false;
      const wrappedCol = ((col % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
      const tile = s.grid[row]?.[wrappedCol];
      if (tile === undefined || tile === TileType.WALL) return false;
      if (tile === TileType.HURDLE) return false; // Ghosts cannot cross low hurdles!
      if (tile === TileType.GHOST_DOOR) {
        return inGhostHouse || isEaten;
      }
      return true;
    };

    // Main 60fps simulation and rendering loop
    useEffect(() => {
      let animationFrameId: number;
      let lastTimestamp = performance.now();

      const updateSimulation = (dt: number) => {
        const s = simRef.current;

        // Update visual particles, floating popups, and shockwaves even during hitstop
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            s.particles.splice(i, 1);
          } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.alpha = 1 - p.life / p.maxLife;
          }
        }

        for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
          const ft = s.floatingTexts[i];
          ft.life += dt;
          if (ft.life >= ft.maxLife) {
            s.floatingTexts.splice(i, 1);
          } else {
            ft.y -= 28 * dt;
          }
        }

        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
          const sw = s.shockwaves[i];
          sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 11);
          sw.alpha -= dt * 2.2;
          if (sw.alpha <= 0.02) {
            s.shockwaves.splice(i, 1);
          }
        }

        // Decay screen flash & camera shake
        if (s.flashAlpha > 0) {
          s.flashAlpha = Math.max(0, s.flashAlpha - dt * 3.5);
        }
        if (s.shakeIntensity > 0) {
          s.shakeIntensity = Math.max(0, s.shakeIntensity - dt * 28);
        }

        // Relax squash & stretch back to (1, 1)
        s.squashX += (1 - s.squashX) * Math.min(1, dt * 14);
        s.squashY += (1 - s.squashY) * Math.min(1, dt * 14);

        if (gameStateRef.current !== 'PLAYING') {
          // Gentle mouth animation on title screen
          s.mouthTimer += dt * 6;
          return;
        }

        // Hitstop freeze for heavy tactile impact
        if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
          return;
        }

        if (s.respawnInvulnTimer > 0) {
          s.respawnInvulnTimer = Math.max(0, s.respawnInvulnTimer - dt);
        }

        // Recharge Jump Charges over time
        if (s.jumpCharges < MAX_JUMP_CHARGES) {
          s.jumpRechargeTimer += dt;
          if (s.jumpRechargeTimer >= JUMP_RECHARGE_SECONDS) {
            s.jumpCharges++;
            s.jumpRechargeTimer = 0;
            syncHud();
          }
        } else {
          s.jumpRechargeTimer = 0;
        }

        // Update Jump Airborne state
        const wasAirborne = s.jumpTimer > 0;
        if (s.jumpTimer > 0) {
          s.jumpTimer = Math.max(0, s.jumpTimer - dt);

          // Check if Pac-Man just landed
          if (s.jumpTimer === 0 && wasAirborne) {
            // Landing squash
            s.squashX = 1.26;
            s.squashY = 0.76;

            // If Pac-Man finished jumping while still over a HURDLE tile, push smoothly into next tile
            const curCol = Math.floor(s.pacX);
            const curRow = Math.floor(s.pacY);
            if (s.grid[curRow]?.[curCol] === TileType.HURDLE) {
              const { dx, dy } = dirToDelta(s.pacDir !== Direction.NONE ? s.pacDir : s.facingDir);
              const targetCol = curCol + (dx || 1);
              const targetRow = curRow + dy;
              if (canPacWalkTile(targetCol, targetRow, false)) {
                s.pacX = targetCol + 0.5;
                s.pacY = targetRow + 0.5;
              }
            }

            // Create landing shockwave that briefly stuns nearby chasing ghosts!
            let stunnedCount = 0;
            s.ghosts.forEach((g) => {
              if (!g.isEaten && g.releaseDelay <= 0) {
                const dist = Math.hypot(g.x - s.pacX, g.y - s.pacY);
                if (dist <= 1.55) {
                  g.stunTimer = 1.45;
                  stunnedCount++;
                  s.score += 50;
                  s.highScore = Math.max(s.highScore, s.score);
                  spawnFloatingText(g.x, g.y, '+50 STUN!', '#0284C7', 'คลื่นกระโดดมึนงง');
                  spawnParticles(g.x, g.y, '#38BDF8', 10, 90);
                }
              }
            });

            spawnShockwave(
              s.pacX,
              s.pacY,
              stunnedCount > 0 ? '#38BDF8' : '#D6D0C4',
              stunnedCount > 0 ? TILE_PX * 1.75 : TILE_PX * 1.1
            );
            soundEngine.playLand(stunnedCount);

            if (stunnedCount > 0) {
              s.lastActionLabel = `คลื่นกระแทกทำให้ผีมึน +${stunnedCount * 50}!`;
            }

            // Check buffered jump
            if (s.jumpBufferTimer > 0 && s.jumpCharges > 0) {
              s.jumpBufferTimer = 0;
              performJump(false);
            }
          }
        }

        if (s.jumpBufferTimer > 0) {
          s.jumpBufferTimer = Math.max(0, s.jumpBufferTimer - dt);
        }

        const isAirborne = s.jumpTimer > 0;

        // Move Pac-Man with smooth tile-center snapping & turn buffering
        const currentCol = Math.floor(s.pacX);
        const currentRow = Math.floor(s.pacY);
        const centerX = currentCol + 0.5;
        const centerY = currentRow + 0.5;

        // Try applying buffered direction `nextDir`
        if (s.nextDir !== Direction.NONE && s.nextDir !== s.pacDir) {
          const { dx: ndx, dy: ndy } = dirToDelta(s.nextDir);
          // Immediate reversal is always allowed
          if (s.nextDir === oppositeDir(s.pacDir) || s.pacDir === Direction.NONE) {
            if (canPacWalkTile(currentCol + ndx, currentRow + ndy, isAirborne)) {
              s.pacDir = s.nextDir;
              s.facingDir = s.nextDir;
            }
          } else {
            // Perpendicular turn near tile center
            const distToCenter = Math.hypot(s.pacX - centerX, s.pacY - centerY);
            if (distToCenter < 0.28 && canPacWalkTile(currentCol + ndx, currentRow + ndy, isAirborne)) {
              s.pacX = centerX;
              s.pacY = centerY;
              s.pacDir = s.nextDir;
              s.facingDir = s.nextDir;
            }
          }
        }

        // Advance Pac-Man along `pacDir`
        if (s.pacDir !== Direction.NONE) {
          const { dx, dy } = dirToDelta(s.pacDir);
          const speedBoost = isAirborne ? 1.24 : 1.0; // Jumping gives a crisp 24% air-dash speed boost!
          const step = s.pacSpeed * speedBoost * dt;

          let nextX = s.pacX + dx * step;
          let nextY = s.pacY + dy * step;

          // Keep perpendicular axis aligned to corridor center
          if (dx !== 0) {
            nextY += (centerY - nextY) * Math.min(1, dt * 18);
          } else if (dy !== 0) {
            nextX += (centerX - nextX) * Math.min(1, dt * 18);
          }

          // Check wall collision ahead of tile center
          const lookCol = Math.floor(nextX + dx * 0.46);
          const lookRow = Math.floor(nextY + dy * 0.46);

          if (!canPacWalkTile(lookCol, lookRow, isAirborne)) {
            // Clamp smoothly to center of current tile
            if (dx > 0 && nextX > centerX) nextX = centerX;
            if (dx < 0 && nextX < centerX) nextX = centerX;
            if (dy > 0 && nextY > centerY) nextY = centerY;
            if (dy < 0 && nextY < centerY) nextY = centerY;
          } else {
            s.mouthTimer += dt * 15;
          }

          // Horizontal wrap-around tunnel
          if (nextX < 0) nextX += GRID_SIZE;
          if (nextX >= GRID_SIZE) nextX -= GRID_SIZE;

          s.pacX = nextX;
          s.pacY = nextY;
        }

        // Check tile interactions at Pac-Man's current position
        const pCol = ((Math.floor(s.pacX) % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
        const pRow = Math.floor(s.pacY);
        const tileHere = s.grid[pRow]?.[pCol];
        const tileKey = `${pCol},${pRow}`;

        // 1. Vaulting over a Low Hurdle while airborne!
        if (tileHere === TileType.HURDLE && isAirborne && s.lastVaultTileKey !== tileKey) {
          s.lastVaultTileKey = tileKey;
          s.score += 75;
          s.vaultCount++;
          s.highScore = Math.max(s.highScore, s.score);
          s.lastActionLabel = 'กระโดดข้ามรั้วทางลัด! +75';
          soundEngine.playVaultBonus();
          spawnFloatingText(s.pacX, s.pacY, '+75 VAULT!', '#0284C7', 'ทางลัดกระโดด');
          spawnParticles(s.pacX, s.pacY, '#38BDF8', 8, 80);
          syncHud();
        }

        // 2. Stepping on a green Spring Pad!
        if (tileHere === TileType.SPRING && !isAirborne && s.lastSpringTileKey !== tileKey) {
          s.lastSpringTileKey = tileKey;
          performJump(true);
          spawnFloatingText(s.pacX, s.pacY, 'SPRING BOOST!', '#059669', 'กระโดดไกลฟรี');
        } else if (tileHere !== TileType.SPRING) {
          s.lastSpringTileKey = '';
        }

        // 3. Eating Dots & Power Orbs (Pac-Man collects dots on ground OR low-skim, so jumping never misses dots!)
        if (tileHere === TileType.DOT) {
          s.grid[pRow][pCol] = TileType.EMPTY;
          s.dotsRemaining--;
          s.dotsEatenThisStage++;
          s.score += 10;
          s.highScore = Math.max(s.highScore, s.score);

          // Eating dots slightly accelerates Jump recharge!
          if (s.jumpCharges < MAX_JUMP_CHARGES) {
            s.jumpRechargeTimer += 0.22;
          }

          soundEngine.playWaka();
          spawnParticles(pCol + 0.5, pRow + 0.5, '#F59E0B', 4, 48);

          // Spawn Bonus Fruit at 35% and 75% dots eaten
          if (
            !s.fruit.active &&
            (s.dotsEatenThisStage === Math.floor(s.totalDots * 0.35) ||
              s.dotsEatenThisStage === Math.floor(s.totalDots * 0.72))
          ) {
            const types: Array<'PEACH' | 'MELON' | 'STAR'> = ['PEACH', 'MELON', 'STAR'];
            s.fruit = {
              active: true,
              x: 9.5,
              y: 11.5,
              timer: 9.5,
              points: 300 + s.levelIndex * 150,
              type: types[s.levelIndex % types.length],
            };
            s.lastActionLabel = 'ไอเทมโบนัสปรากฏกลางด่าน!';
          }

          if (s.dotsRemaining <= 0) {
            // Stage Complete!
            s.score += 500;
            s.highScore = Math.max(s.highScore, s.score);
            soundEngine.playStageClear();
            syncHud();
            onGameStateChange('ROUND_SUMMARY');
            return;
          }
        } else if (tileHere === TileType.POWER) {
          s.grid[pRow][pCol] = TileType.EMPTY;
          s.dotsRemaining--;
          s.dotsEatenThisStage++;
          s.score += 50;
          s.highScore = Math.max(s.highScore, s.score);

          // Refill 1 Jump Charge on Power Orb!
          if (s.jumpCharges < MAX_JUMP_CHARGES) {
            s.jumpCharges = Math.min(MAX_JUMP_CHARGES, s.jumpCharges + 1);
          }

          const cfg = LEVELS[s.levelIndex % LEVELS.length];
          s.frightenedTimer = cfg.frightenedDuration;
          s.ghostCombo = 0;

          s.ghosts.forEach((g) => {
            if (!g.isEaten) {
              g.isFrightened = true;
              g.dir = oppositeDir(g.dir);
            }
          });

          s.hitstopTimer = 0.045;
          s.flashAlpha = 0.22;
          s.flashColor = '#FEF08A';
          s.lastActionLabel = 'พลังแสงอาทิตย์ทำงาน! ผีกลัวแล้ว!';
          soundEngine.playPowerPellet();
          spawnShockwave(pCol + 0.5, pRow + 0.5, '#FB7185', TILE_PX * 2.2);
          spawnParticles(pCol + 0.5, pRow + 0.5, '#FB7185', 14, 110);
          spawnFloatingText(pCol + 0.5, pRow + 0.5, 'POWER UP! +1 JUMP', '#E11D48');

          if (s.dotsRemaining <= 0) {
            soundEngine.playStageClear();
            syncHud();
            onGameStateChange('ROUND_SUMMARY');
            return;
          }
        }

        // 4. Bonus Fruit timer & pickup
        if (s.fruit.active) {
          s.fruit.timer -= dt;
          if (s.fruit.timer <= 0) {
            s.fruit.active = false;
          } else if (Math.hypot(s.pacX - s.fruit.x, s.pacY - s.fruit.y) < 0.65) {
            s.fruit.active = false;
            s.score += s.fruit.points;
            s.highScore = Math.max(s.highScore, s.score);
            s.jumpCharges = MAX_JUMP_CHARGES; // Full jump refill!
            soundEngine.playBonusFruit();
            spawnParticles(s.fruit.x, s.fruit.y, '#10B981', 16, 120);
            spawnFloatingText(
              s.fruit.x,
              s.fruit.y,
              `+${s.fruit.points} BONUS!`,
              '#059669',
              'เติมปุ่มกระโดดเต็ม!'
            );
            s.lastActionLabel = `เก็บโบนัสสำเร็จ! +${s.fruit.points}`;
          }
        }

        // Update Frightened timer
        if (s.frightenedTimer > 0) {
          s.frightenedTimer = Math.max(0, s.frightenedTimer - dt);
          if (s.frightenedTimer === 0) {
            s.ghosts.forEach((g) => {
              g.isFrightened = false;
            });
            s.ghostCombo = 0;
          }
        }

        // Update Ghosts
        s.ghosts.forEach((g) => {
          if (g.releaseDelay > 0) {
            g.releaseDelay = Math.max(0, g.releaseDelay - dt);
            return;
          }
          if (g.stunTimer > 0) {
            g.stunTimer = Math.max(0, g.stunTimer - dt);
            return;
          }

          const gCol = Math.floor(g.x);
          const gRow = Math.floor(g.y);
          const inHouse = gRow >= 8 && gRow <= 10 && gCol >= 7 && gCol <= 11;

          // If eaten and reached ghost house center, revive
          if (g.isEaten && Math.hypot(g.x - 9.5, g.y - 9.5) < 0.45) {
            g.isEaten = false;
            g.isFrightened = false;
            g.dir = Direction.UP;
          }

          let spd = g.speed;
          if (g.isEaten) spd *= 1.85;
          else if (g.isFrightened) spd *= 0.62;

          const gCenterX = gCol + 0.5;
          const gCenterY = gRow + 0.5;
          const distToCenter = Math.hypot(g.x - gCenterX, g.y - gCenterY);

          const { dx: curDx, dy: curDy } = dirToDelta(g.dir);
          const nextTileBlocked = !canGhostWalkTile(gCol + curDx, gRow + curDy, inHouse, g.isEaten);

          // Choose new direction at intersections or when blocked
          if (distToCenter < 0.14 || nextTileBlocked || g.dir === Direction.NONE) {
            const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
            const validDirs = dirs.filter((d) => {
              if (d === oppositeDir(g.dir) && !nextTileBlocked) return false;
              const { dx, dy } = dirToDelta(d);
              return canGhostWalkTile(gCol + dx, gRow + dy, inHouse, g.isEaten);
            });

            if (validDirs.length === 0) {
              // Allow reverse if dead end
              const rev = oppositeDir(g.dir);
              const { dx, dy } = dirToDelta(rev);
              if (canGhostWalkTile(gCol + dx, gRow + dy, inHouse, g.isEaten)) {
                validDirs.push(rev);
              }
            }

            if (validDirs.length > 0) {
              // Determine target coordinates based on state & personality
              let targetX = s.pacX;
              let targetY = s.pacY;

              if (g.isEaten) {
                targetX = 9.5;
                targetY = 9.5;
              } else if (inHouse) {
                targetX = 9.5;
                targetY = 7.5;
              } else if (g.isFrightened) {
                // Scatter randomly when frightened
                const chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
                if (chosen !== g.dir) {
                  g.x = gCenterX;
                  g.y = gCenterY;
                  g.dir = chosen;
                }
                targetX = -1;
              } else {
                // Distinct Ghost AI personalities
                if (g.personality === 'AMBUSHER') {
                  const { dx: pdx, dy: pdy } = dirToDelta(s.facingDir);
                  targetX = s.pacX + pdx * 4;
                  targetY = s.pacY + pdy * 4;
                } else if (g.personality === 'PATROLLER') {
                  targetX = s.pacX + (9.5 - s.pacX) * 0.35;
                  targetY = s.pacY + (9.5 - s.pacY) * 0.35;
                } else if (g.personality === 'WANDERER') {
                  const distToPac = Math.hypot(g.x - s.pacX, g.y - s.pacY);
                  if (distToPac < 4.5) {
                    targetX = 1.5;
                    targetY = 17.5;
                  }
                }
              }

              if (targetX !== -1) {
                let bestDir = validDirs[0];
                let bestDist = Infinity;
                for (const d of validDirs) {
                  const { dx, dy } = dirToDelta(d);
                  const dScore = Math.hypot(gCol + 0.5 + dx - targetX, gRow + 0.5 + dy - targetY);
                  if (dScore < bestDist) {
                    bestDist = dScore;
                    bestDir = d;
                  }
                }
                if (bestDir !== g.dir) {
                  g.x = gCenterX;
                  g.y = gCenterY;
                  g.dir = bestDir;
                }
              }
            }
          }

          const { dx, dy } = dirToDelta(g.dir);
          g.x += dx * spd * dt;
          g.y += dy * spd * dt;

          if (dx !== 0) g.y += (gCenterY - g.y) * Math.min(1, dt * 15);
          if (dy !== 0) g.x += (gCenterX - g.x) * Math.min(1, dt * 15);

          if (g.x < 0) g.x += GRID_SIZE;
          if (g.x >= GRID_SIZE) g.x -= GRID_SIZE;
        });

        // Check Pac-Man vs Ghost Collisions & Airborne Leap-Overs!
        for (const g of s.ghosts) {
          if (g.releaseDelay > 0 || g.isEaten) continue;

          const dist = Math.hypot(s.pacX - g.x, s.pacY - g.y);

          if (isAirborne) {
            // Pac-Man is jumping high in the air!
            // If passing right over a ghost, award a +150 GHOST LEAP bonus!
            if (dist < 0.72 && !g.leapedOverInCurrentJump) {
              g.leapedOverInCurrentJump = true;
              s.score += 150;
              s.ghostsLeapedCount++;
              s.highScore = Math.max(s.highScore, s.score);
              s.lastActionLabel = `กระโดดข้าม ${g.name} สุดพริ้ว! +150`;
              soundEngine.playVaultBonus();
              spawnParticles(g.x, g.y, '#FACC15', 12, 95);
              spawnFloatingText(g.x, g.y, '+150 LEAP OVER!', '#D97706', `กระโดดข้าม ${g.name}`);
              syncHud();
            }
          } else if (dist < 0.58) {
            // Ground contact with Ghost
            if (g.isFrightened) {
              // Eat frightened ghost!
              g.isEaten = true;
              g.isFrightened = false;
              s.ghostCombo++;
              const pts = 200 * Math.pow(2, Math.min(3, s.ghostCombo - 1));
              s.score += pts;
              s.highScore = Math.max(s.highScore, s.score);
              s.hitstopTimer = 0.065; // Crisp 65ms hitstop
              s.shakeIntensity = 6;
              s.lastActionLabel = `งับผี ${g.name} สำเร็จ! +${pts}`;
              soundEngine.playEatGhost();
              spawnParticles(g.x, g.y, g.color, 18, 125);
              spawnShockwave(g.x, g.y, g.color, TILE_PX * 1.6);
              spawnFloatingText(g.x, g.y, `+${pts}`, g.accentColor, `COMBO x${s.ghostCombo}`);
              syncHud();
            } else if (g.stunTimer <= 0 && s.respawnInvulnTimer <= 0) {
              // Pac-Man loses a life!
              s.lives--;
              s.hitstopTimer = 0.08;
              s.shakeIntensity = 11;
              s.flashAlpha = 0.38;
              s.flashColor = '#FDA4AF';
              soundEngine.playDeath();
              spawnParticles(s.pacX, s.pacY, '#FACC15', 24, 140);

              if (s.lives <= 0) {
                s.lastActionLabel = 'จบเกม! ลองใหม่อีกครั้งนะ';
                syncHud();
                onGameStateChange('GAME_OVER');
                return;
              } else {
                s.lastActionLabel = 'ระวัง! ใช้ปุ่ม JUMP กระโดดหนีผีได้นะ!';
                resetPositionsAfterLifeLost();
                return;
              }
            }
          }
        }

        // Periodic HUD sync (every ~80ms)
        s.hudSyncAccum += dt;
        if (s.hudSyncAccum >= 0.08) {
          s.hudSyncAccum = 0;
          syncHud();
        }
      };

      const renderScene = (ctx: CanvasRenderingContext2D, nowMs: number) => {
        const s = simRef.current;
        const cfg = LEVELS[s.levelIndex % LEVELS.length];

        ctx.save();

        // Decaying camera shake
        if (s.shakeIntensity > 0.2) {
          const sx = (Math.random() - 0.5) * s.shakeIntensity;
          const sy = (Math.random() - 0.5) * s.shakeIntensity;
          ctx.translate(sx, sy);
        }

        // 1. Bright Daylight Floor Canvas
        ctx.fillStyle = cfg.floorTint;
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Subtle architectural tile grid hairlines
        ctx.strokeStyle = 'rgba(44, 42, 41, 0.035)';
        ctx.lineWidth = 1;
        for (let i = 1; i < GRID_SIZE; i++) {
          const pos = i * TILE_PX;
          ctx.beginPath();
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, CANVAS_SIZE);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, pos);
          ctx.lineTo(CANVAS_SIZE, pos);
          ctx.stroke();
        }

        // 2. Render Maze Walls, Low Hurdles, Spring Pads, Dots & Power Orbs
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const tile = s.grid[r]?.[c];
            const x = c * TILE_PX;
            const y = r * TILE_PX;
            const cx = x + TILE_PX / 2;
            const cy = y + TILE_PX / 2;

            if (tile === TileType.WALL) {
              // Minimalist tactile architectural block with soft bottom bevel
              const pad = 2;
              const w = TILE_PX - pad * 2;
              const h = TILE_PX - pad * 2;

              // Bottom shadow depth
              ctx.fillStyle = cfg.wallDepthColor;
              ctx.beginPath();
              ctx.roundRect(x + pad, y + pad + 3, w, h, 8);
              ctx.fill();

              // Main top stone surface
              ctx.fillStyle = cfg.wallColor;
              ctx.beginPath();
              ctx.roundRect(x + pad, y + pad, w, h - 2, 8);
              ctx.fill();

              // Subtle top inner highlight
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(x + pad + 1, y + pad + 1, w - 2, h - 4, 7);
              ctx.stroke();
            } else if (tile === TileType.GHOST_DOOR) {
              ctx.fillStyle = '#F472B6';
              ctx.beginPath();
              ctx.roundRect(x + 4, cy - 3, TILE_PX - 8, 6, 3);
              ctx.fill();
            } else if (tile === TileType.HURDLE) {
              // Jumpable Low Hurdle Barrier! Pastel sky-blue striped hurdle with upward chevron
              ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
              ctx.beginPath();
              ctx.roundRect(x + 3, y + 3, TILE_PX - 6, TILE_PX - 6, 7);
              ctx.fill();

              ctx.strokeStyle = '#38BDF8';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.roundRect(x + 4, y + 4, TILE_PX - 8, TILE_PX - 8, 6);
              ctx.stroke();
              ctx.setLineDash([]);

              // Up/Down jump chevron icon in center of hurdle
              ctx.strokeStyle = '#0284C7';
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              ctx.moveTo(cx - 5, cy + 2);
              ctx.lineTo(cx, cy - 3);
              ctx.lineTo(cx + 5, cy + 2);
              ctx.stroke();
            } else if (tile === TileType.SPRING) {
              // Mint-Green Spring Pad
              const pulse = Math.sin(nowMs * 0.006) * 1.5;
              ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
              ctx.beginPath();
              ctx.arc(cx, cy, 13 + pulse * 0.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#10B981';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = '#059669';
              ctx.beginPath();
              ctx.arc(cx, cy, 4, 0, Math.PI * 2);
              ctx.fill();
            } else if (tile === TileType.DOT) {
              // Warm sunny amber Pac-Dot
              ctx.fillStyle = '#F59E0B';
              ctx.beginPath();
              ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#FEF3C7';
              ctx.beginPath();
              ctx.arc(cx - 1.2, cy - 1.2, 1.4, 0, Math.PI * 2);
              ctx.fill();
            } else if (tile === TileType.POWER) {
              // Pulsing Coral-Gold Power Orb
              const pulse = 1 + Math.sin(nowMs * 0.008) * 0.16;
              ctx.fillStyle = 'rgba(251, 113, 133, 0.24)';
              ctx.beginPath();
              ctx.arc(cx, cy, 12.5 * pulse, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#FB7185';
              ctx.beginPath();
              ctx.arc(cx, cy, 8 * pulse, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#FFF1F2';
              ctx.beginPath();
              ctx.arc(cx - 2.2, cy - 2.2, 2.4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // 3. Render Bonus Fruit if active
        if (s.fruit.active) {
          const fx = s.fruit.x * TILE_PX;
          const fy = s.fruit.y * TILE_PX + Math.sin(nowMs * 0.008) * 2.5;

          ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.beginPath();
          ctx.arc(fx, fy, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(fx, fy + 1, 9.5, 0, Math.PI * 2);
          ctx.fill();

          // Little leaf
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.ellipse(fx + 3, fy - 8, 4.5, 2.5, -0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. Render Shockwave Rings
        for (const sw of s.shockwaves) {
          ctx.save();
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // 5. Render Ghosts
        for (const g of s.ghosts) {
          const gx = g.x * TILE_PX;
          const gy = g.y * TILE_PX;
          const r = TILE_PX * 0.39;

          // Ghost ground shadow
          ctx.fillStyle = 'rgba(44, 42, 41, 0.12)';
          ctx.beginPath();
          ctx.ellipse(gx, gy + r + 2, r * 0.82, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          if (!g.isEaten) {
            // Determine body color
            let bodyColor = g.color;
            if (g.isFrightened) {
              const flashing =
                s.frightenedTimer < 2.0 && Math.floor(s.frightenedTimer * 7) % 2 === 0;
              bodyColor = flashing ? '#F1F5F9' : '#818CF8';
            } else if (g.stunTimer > 0) {
              bodyColor = '#93C5FD';
            }

            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(gx, gy - 2, r, Math.PI, 0, false);
            ctx.lineTo(gx + r, gy + r);

            // Minimalist scalloped bottom hem (3 soft waves)
            const waveW = (r * 2) / 3;
            for (let i = 0; i < 3; i++) {
              const wx = gx + r - i * waveW;
              ctx.quadraticCurveTo(wx - waveW * 0.5, gy + r - 4.5, wx - waveW, gy + r);
            }
            ctx.closePath();
            ctx.fill();

            // Subtle white outline for crisp contrast on bright floor
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Stunned stars above ghost if stunned by Pac-Man's jump landing
            if (g.stunTimer > 0) {
              const starAngle = nowMs * 0.008;
              for (let sIdx = 0; sIdx < 3; sIdx++) {
                const a = starAngle + (sIdx * Math.PI * 2) / 3;
                const sx = gx + Math.cos(a) * 10;
                const sy = gy - r - 6 + Math.sin(a) * 3;
                ctx.fillStyle = '#F59E0B';
                ctx.beginPath();
                ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }

          // Ghost Eyes
          const { dx: edx, dy: edy } = dirToDelta(g.dir);
          const eyeOffsetX = edx * 2.5;
          const eyeOffsetY = edy * 2.5;

          [-4.8, 4.8].forEach((ex) => {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.ellipse(gx + ex + eyeOffsetX * 0.5, gy - 3 + eyeOffsetY * 0.5, 3.8, 4.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = g.isFrightened ? '#312E81' : '#1E293B';
            ctx.beginPath();
            ctx.arc(gx + ex + eyeOffsetX * 1.1, gy - 3 + eyeOffsetY * 1.1, 2.0, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 6. Render Pac-Man (with Airborne Parabolic Elevation, Shadow, and Squash/Stretch!)
        const px = s.pacX * TILE_PX;
        const py = s.pacY * TILE_PX;
        const baseRadius = TILE_PX * 0.41;

        const isAirborne = s.jumpTimer > 0;
        const jumpProgress = isAirborne
          ? 1 - s.jumpTimer / s.jumpMaxDuration
          : 0;
        // Smooth parabolic arc: sin(0..PI) -> 0..1..0
        const jumpArc = isAirborne ? Math.sin(jumpProgress * Math.PI) : 0;
        const elevationPx = jumpArc * 26; // Rises 26px above ground!
        const airScale = 1 + jumpArc * 0.36; // Scales up 36% closer to camera!

        // Ground shadow under Pac-Man (stays on the floor while Pac-Man rises!)
        ctx.fillStyle = isAirborne
          ? `rgba(44, 42, 41, ${0.22 - jumpArc * 0.09})`
          : 'rgba(44, 42, 41, 0.14)';
        ctx.beginPath();
        ctx.ellipse(
          px,
          py + baseRadius * 0.78,
          baseRadius * (isAirborne ? 0.65 + (1 - jumpArc) * 0.3 : 0.85),
          isAirborne ? 4.2 : 4.8,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // If airborne, draw a subtle dashed landing reticle on the ground
        if (isAirborne) {
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(px, py, baseRadius * 0.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw Pac-Man body
        const blinkSkip =
          s.respawnInvulnTimer > 0 && Math.floor(s.respawnInvulnTimer * 12) % 2 === 0;

        if (!blinkSkip) {
          ctx.save();
          ctx.translate(px, py - elevationPx);
          ctx.scale(s.squashX * airScale, s.squashY * airScale);

          const angle = dirToAngle(s.facingDir);
          ctx.rotate(angle);

          const mouthOpen = isAirborne
            ? 0.28 // Cheerful open mouth while jumping!
            : 0.04 + Math.abs(Math.sin(s.mouthTimer)) * 0.26;

          // Warm golden body
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(0, 0, baseRadius, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();

          // Crisp warm amber rim for high contrast on bright alabaster floor
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Minimalist eye
          ctx.fillStyle = '#2C2A29';
          ctx.beginPath();
          ctx.arc(2, -baseRadius * 0.46, 2.3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // 7. Render Particles
        for (const p of s.particles) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 8. Render Floating Score & Bonus Texts
        for (const ft of s.floatingTexts) {
          const alpha = Math.min(1, (1 - ft.life / ft.maxLife) * 1.4);
          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.font = '700 13px "Outfit", "Anuphan", sans-serif';
          ctx.textAlign = 'center';

          // Soft white halo for instant readability
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.strokeText(ft.text, ft.x, ft.y);

          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);

          if (ft.subtext) {
            ctx.font = '600 10px "Anuphan", sans-serif';
            ctx.strokeText(ft.subtext, ft.x, ft.y + 12);
            ctx.fillStyle = '#4B5563';
            ctx.fillText(ft.subtext, ft.x, ft.y + 12);
          }
          ctx.restore();
        }

        // 9. Screen Flash Overlay
        if (s.flashAlpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = s.flashAlpha;
          ctx.fillStyle = s.flashColor;
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.restore();
        }

        ctx.restore();
      };

      const loop = (now: number) => {
        const rawDt = (now - lastTimestamp) / 1000;
        lastTimestamp = now;
        const dt = Math.min(rawDt, 0.05); // Clamp frame delta time per Game Craft rules

        updateSimulation(dt);

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderScene(ctx, now);
          }
        }

        animationFrameId = requestAnimationFrame(loop);
      };

      animationFrameId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animationFrameId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="relative flex items-center justify-center w-full h-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full h-full max-w-[min(74vh,74vw)] max-h-[min(74vh,74vw)] aspect-square rounded-2xl shadow-sm border border-[#E2DDD3] bg-[#FBF9F5]"
        />
      </div>
    );
  }
);
