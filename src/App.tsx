import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { LeftDirectionPad, RightJumpPad } from './components/ControlDeck';
import { Direction, GameState, HudSnapshot } from './game/types';
import { LEVELS } from './game/levels';
import { soundEngine } from './audio/soundEngine';
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  highScore: 2400,
  lives: 3,
  level: 1,
  levelName: LEVELS[0].name,
  levelThaiName: LEVELS[0].thaiName,
  dotsRemaining: 140,
  totalDots: 140,
  jumpCharges: 3,
  maxJumpCharges: 3,
  jumpCooldownProgress: 1,
  isAirborne: false,
  frightenedTimeLeft: 0,
  comboCount: 0,
  lastActionLabel: 'พร้อมออกตัว!',
  vaultCount: 0,
  ghostsLeapedCount: 0,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [artFailed, setArtFailed] = useState<boolean>(false);

  const canvasHandleRef = useRef<GameCanvasHandle | null>(null);

  const handleStartGame = useCallback(
    (stageIndex: number = selectedStageIdx) => {
      soundEngine.playUIClick();
      canvasHandleRef.current?.startNewGame(stageIndex);
    },
    [selectedStageIdx]
  );

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleJumpAction = () => {
    canvasHandleRef.current?.triggerJump();
  };

  const handleDirectionAction = (dir: Direction) => {
    canvasHandleRef.current?.setDirectionInput(dir);
  };

  // Allow Enter / Space to start game on Title Screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'TITLE_MENU' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartGame(selectedStageIdx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, selectedStageIdx, handleStartGame]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#F6F3EC] text-[#2C2A29] flex flex-col justify-between select-none">
      {/* Top Perimeter Status Cluster (World-Matched Daylight Palette) */}
      <header className="w-full max-w-[1400px] mx-auto px-4 lg:px-8 pt-3 pb-2 flex items-center justify-between gap-4 shrink-0">
        {/* Left: Brand Lockup & Stage Name */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUIClick();
              setGameState('TITLE_MENU');
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" fill="#FACC15" stroke="#D97706" strokeWidth="2.5" />
              <path d="M16 16L29 9.5V22.5L16 16Z" fill="#F6F3EC" />
              <circle cx="17" cy="9.5" r="2.2" fill="#2C2A29" />
            </svg>
            <span className="font-display text-lg lg:text-xl font-extrabold tracking-tight text-[#2C2A29] whitespace-nowrap shrink-0">
              PAC-HOP
            </span>
          </button>

          <span className="text-[#CFC8B8]" aria-hidden="true">
            ·
          </span>
          <span className="text-xs lg:text-sm font-medium text-[#6E6A64] whitespace-nowrap truncate max-w-[200px]">
            ด่าน {hud.level}: {hud.levelThaiName}
          </span>
        </div>

        {/* Center: Tabular-Nums Score, High Score & Lives Cluster */}
        <div className="flex items-center gap-5 lg:gap-8 text-xs lg:text-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-[#6E6A64]">คะแนน</span>
            <span className="font-mono-num text-base lg:text-lg font-bold text-[#2C2A29]">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <span className="hidden sm:inline text-[#D5CFC0]" aria-hidden="true">
            ·
          </span>

          <div className="hidden sm:flex items-baseline gap-2">
            <span className="text-[#6E6A64]">สูงสุด</span>
            <span className="font-mono-num text-base lg:text-lg font-semibold text-[#D97706]">
              {hud.highScore.toLocaleString()}
            </span>
          </div>

          <span className="text-[#D5CFC0]" aria-hidden="true">
            ·
          </span>

          <div className="flex items-center gap-1.5" aria-label={`ชีวิตเหลือ ${hud.lives}`}>
            <span className="text-[#6E6A64] mr-1 hidden md:inline">ชีวิต</span>
            {Array.from({ length: 3 }).map((_, idx) => (
              <svg
                key={idx}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition-opacity duration-150 ${
                  idx < hud.lives ? 'opacity-100' : 'opacity-20'
                }`}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="#FACC15"
                  stroke="#D97706"
                  strokeWidth="2"
                />
                <path d="M12 12L22 7.5V16.5L12 12Z" fill="#F6F3EC" />
              </svg>
            ))}
          </div>
        </div>

        {/* Right: Audio Mute Toggle & Pause Control */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            className="px-3 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#EFECE4] border border-[#E4DFD3] text-xs font-medium text-[#2C2A29] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#E11D48]" /> : <Volume2 className="w-4 h-4 text-[#059669]" />}
            <span className="hidden sm:inline">{isMuted ? 'ปิดเสียง' : 'เสียง Pac-Man'}</span>
          </button>

          {gameState === 'PLAYING' || gameState === 'PAUSED' ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUIClick();
                canvasHandleRef.current?.togglePause();
              }}
              className="px-3.5 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#EFECE4] border border-[#E4DFD3] text-xs font-medium text-[#2C2A29] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {gameState === 'PAUSED' ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>เล่นต่อ</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>พักเกม</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      </header>

      {/* Main Playfield: [Left: Directional Pad] — [Center: Maze Canvas] — [Right: Jump Button] */}
      <section className="flex-1 w-full max-w-[1400px] mx-auto px-4 lg:px-8 pb-3 flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6 min-h-0">
        {/* Desktop Left Column: Directional Pad (ปุ่มทิศทางอยู่ด้านซ้าย) */}
        <div className="hidden lg:flex items-center h-full">
          <LeftDirectionPad
            hud={hud}
            onDirection={handleDirectionAction}
            disabled={gameState !== 'PLAYING'}
          />
        </div>

        {/* Center: Isolated 60fps Maze Canvas Container */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center min-h-0">
          <GameCanvas
            ref={canvasHandleRef}
            gameState={gameState}
            onGameStateChange={setGameState}
            onHudUpdate={setHud}
          />

          {/* Non-occluding Top-Center Frightened Power Timer Readout (pointer-events-none, no backdrop-filter) */}
          {hud.frightenedTimeLeft > 0 && gameState === 'PLAYING' && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-[#FFF1F2] border border-[#FECDD3] px-3.5 py-1 rounded-xl text-xs font-semibold text-[#E11D48] shadow-sm flex items-center gap-2">
              <span>โหมดปราบผี</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{hud.frightenedTimeLeft.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Desktop Right Column: External JUMP Button (ปุ่มกระโดดอยู่ด้านขวา) */}
        <div className="hidden lg:flex items-center h-full">
          <RightJumpPad
            hud={hud}
            onJump={handleJumpAction}
            disabled={gameState !== 'PLAYING'}
          />
        </div>

        {/* Mobile / Tablet Bottom Control Bar: Left = Directional Pad, Right = Jump Button */}
        <div className="grid grid-cols-2 gap-3 w-full lg:hidden shrink-0">
          <LeftDirectionPad
            hud={hud}
            onDirection={handleDirectionAction}
            disabled={gameState !== 'PLAYING'}
          />
          <RightJumpPad
            hud={hud}
            onJump={handleJumpAction}
            disabled={gameState !== 'PLAYING'}
          />
        </div>
      </section>

      {/* TITLE SCREEN OVERLAY (Side-by-Side Hero with Illustrated Daylight Backdrop & Bespoke SVG Lockup) */}
      {gameState === 'TITLE_MENU' && (
        <div className="fixed inset-0 z-30 bg-[#F6F3EC]/95 flex items-center justify-center p-4 lg:p-10">
          <div className="w-full max-w-[1120px] bg-[#FAF8F3] border border-[#E2DDD3] rounded-3xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left 7 Columns: Calm Negative Space + Bespoke Inline SVG Title Lockup + Stage Select + Start CTA */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-4">
                {/* Unboxed metadata kicker */}
                <div className="flex items-center gap-2 text-xs font-medium text-[#6E6A64]">
                  <span>Daylight Minimalist Edition</span>
                  <span aria-hidden="true">·</span>
                  <span>Web Audio Synth</span>
                  <span aria-hidden="true">·</span>
                  <span>Tactical Jump Mechanics</span>
                </div>

                {/* Bespoke Inline SVG Title Lockup */}
                <div className="flex items-center gap-4">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <ellipse cx="32" cy="56" rx="18" ry="4.5" fill="#2C2A29" fillOpacity="0.14" />
                    <path
                      d="M10 46C16 20 32 12 52 18"
                      stroke="#F59E0B"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx="34"
                      cy="26"
                      r="18"
                      fill="#FACC15"
                      stroke="#D97706"
                      strokeWidth="3"
                    />
                    <path d="M34 26L51 17.5V34.5L34 26Z" fill="#FAF8F3" />
                    <circle cx="36" cy="17.5" r="2.8" fill="#2C2A29" />
                  </svg>

                  <div>
                    <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#2C2A29] text-balance">
                      PAC-HOP
                    </h1>
                    <p className="text-sm sm:text-base font-medium text-[#5C5852] mt-0.5">
                      แพ็กแมนโทนสว่างสบายตา พร้อมปุ่มกระโดดข้ามผีและรั้วทางลัด
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#5C5852] leading-relaxed max-w-[56ch]">
                  ออกแบบด้วยโทนสีสว่างพาสเทลที่ถนอมสายตาสำหรับผู้เล่นทุกวัย มาพร้อมเสียงเอฟเฟกต์{' '}
                  <strong className="font-semibold text-[#2C2A29]">Waka-Waka</strong> คลาสสิก
                  และปุ่ม <strong className="font-semibold text-[#D97706]">JUMP (กระโดด)</strong>{' '}
                  ด้านนอกสนามเพื่อกระโดดข้ามผี ข้ามรั้วสีฟ้า และลงพื้นสร้างคลื่นกระแทก
                </p>

                {/* Interactive Stage Selector (Functional segmented control buttons) */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-medium text-[#6E6A64]">
                    เลือกด่านเริ่มต้น (Select Stage)
                  </span>
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#EFECE4] rounded-xl border border-[#E2DDD3]">
                    {LEVELS.map((lvl, idx) => {
                      const active = selectedStageIdx === idx;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUIClick();
                            setSelectedStageIdx(idx);
                          }}
                          className={`px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#FFFFFF] text-[#2C2A29] shadow-sm border border-[#E2DDD3]'
                              : 'text-[#6E6A64] hover:text-[#2C2A29]'
                          }`}
                        >
                          <div className="text-xs font-bold whitespace-nowrap truncate">
                            0{lvl.id}. {lvl.thaiName}
                          </div>
                          <div className="text-[11px] opacity-75 whitespace-nowrap truncate">
                            {lvl.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Primary Start CTA + Single Flat Control-Hint Line */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStartGame(selectedStageIdx)}
                    className="px-7 py-3.5 rounded-2xl bg-[#FACC15] hover:bg-[#FDE047] active:scale-[0.98] border-2 border-[#D97706] shadow-[0_4px_0_#D97706] text-base font-bold text-[#2C2A29] flex items-center gap-2.5 transition-transform duration-150 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>เริ่มเล่นเกม · Start Game</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="px-4 py-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F3EFE6] border border-[#DCD6C8] text-sm font-medium text-[#2C2A29] flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-[#E11D48]" />
                        <span>เปิดเสียงซินธ์</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-[#059669]" />
                        <span>ทดสอบเสียงปกติ</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Single flat control-hint line matched to the genre */}
                <div className="text-xs text-[#6E6A64] pt-1">
                  WASD / ลูกศร เคลื่อนที่ · ปุ่ม JUMP ด้านนอก หรือ Space กระโดดข้ามผีและรั้ว · Esc พักเกม
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Illustrated Key-Art Backdrop + Ghost Cast Preview */}
            <div className="lg:col-span-5 bg-[#EFECE4] border-t lg:border-t-0 lg:border-l border-[#E2DDD3] flex flex-col justify-between p-6">
              <div className="relative w-full aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-[#DCD6C8] bg-gradient-to-br from-[#FEF3C7] via-[#E0F2FE] to-[#FCE7F3]">
                {!artFailed ? (
                  <img
                    src="/src/assets/images/sunny_pacman_minimal_art_1794898026578.jpg"
                    alt="Minimalist daylight Pac-Man jumping over pastel ghosts in a sunny courtyard maze"
                    referrerPolicy="no-referrer"
                    onError={() => setArtFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-[#5C5852]">
                    PAC-HOP Minimalist Daylight Maze
                  </div>
                )}
              </div>

              {/* Clean unboxed guide to map elements */}
              <div className="mt-5 flex flex-col gap-3">
                <div className="text-xs font-semibold text-[#2C2A29]">
                  ลูกเล่นพิเศษในการเคลื่อนที่ (Movement & Jump Tricks)
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs text-[#5C5852]">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E2DDD3]">
                    <span>ปุ่ม JUMP ด้านนอก / Spacebar</span>
                    <span className="font-medium text-[#2C2A29]">
                      ลอยตัวข้ามผีรับ +150 คะแนน
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#E2DDD3]">
                    <span>รั้วเส้นประสีฟ้า (Low Hurdle)</span>
                    <span className="font-medium text-[#0284C7]">
                      กระโดดข้ามเป็นทางลัด +75 คะแนน
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span>แท่นสปริงสีเขียว (Spring Pad)</span>
                    <span className="font-medium text-[#059669]">
                      ดีดตัวกระโดดไกลอัตโนมัติ (ไม่เสียชาร์จ)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE / STAGE CLEAR / GAME OVER MODAL */}
      {(gameState === 'PAUSED' ||
        gameState === 'ROUND_SUMMARY' ||
        gameState === 'GAME_OVER') && (
        <div className="fixed inset-0 z-30 bg-[#2C2A29]/45 flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] bg-[#FAF8F3] border border-[#E2DDD3] rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col gap-5 text-center">
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-[#6E6A64]">
                {gameState === 'PAUSED'
                  ? 'หยุดพักชั่วคราว'
                  : gameState === 'ROUND_SUMMARY'
                  ? `ผ่านด่านที่ ${hud.level} สำเร็จ!`
                  : 'จบการแข่งขัน'}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2C2A29] text-balance">
                {gameState === 'PAUSED'
                  ? 'เกมหยุดชั่วคราว'
                  : gameState === 'ROUND_SUMMARY'
                  ? 'เคลียร์ด่านสมบูรณ์!'
                  : 'ลองใหม่อีกครั้งนะ!'}
              </h2>
            </div>

            {/* Clean unboxed summary rows with tabular-nums */}
            <div className="border-y border-[#E4DFD3] py-4 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#6E6A64]">คะแนนปัจจุบัน</span>
                <span className="font-mono-num font-bold text-lg text-[#2C2A29]">
                  {hud.score.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6E6A64]">สถิติสูงสุด</span>
                <span className="font-mono-num font-semibold text-[#D97706]">
                  {hud.highScore.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6E6A64]">กระโดดข้ามผีสำเร็จ</span>
                <span className="font-mono-num font-medium text-[#2C2A29]">
                  {hud.ghostsLeapedCount} ครั้ง
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6E6A64]">กระโดดข้ามรั้วทางลัด</span>
                <span className="font-mono-num font-medium text-[#0284C7]">
                  {hud.vaultCount} ครั้ง
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {gameState === 'PAUSED' && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    canvasHandleRef.current?.togglePause();
                  }}
                  className="w-full px-5 py-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] border-2 border-[#D97706] font-bold text-sm text-[#2C2A29] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>เล่นต่อ · Resume</span>
                </button>
              )}

              {gameState === 'ROUND_SUMMARY' && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    canvasHandleRef.current?.nextStage();
                  }}
                  className="w-full px-5 py-3 rounded-xl bg-[#FACC15] hover:bg-[#FDE047] border-2 border-[#D97706] font-bold text-sm text-[#2C2A29] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>ลุยด่านต่อไป · Next Stage</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleStartGame(selectedStageIdx)}
                className={`w-full px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  gameState === 'GAME_OVER'
                    ? 'bg-[#FACC15] hover:bg-[#FDE047] border-2 border-[#D97706] text-[#2C2A29]'
                    : 'bg-[#FFFFFF] hover:bg-[#EFECE4] border border-[#DCD6C8] text-[#2C2A29]'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>เริ่มใหม่ · Play Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
