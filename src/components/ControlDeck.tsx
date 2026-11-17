import React from 'react';
import { Direction, HudSnapshot } from '../game/types';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface DirectionPadProps {
  hud: HudSnapshot;
  onDirection: (dir: Direction) => void;
  disabled?: boolean;
}

interface JumpPadProps {
  hud: HudSnapshot;
  onJump: () => void;
  disabled?: boolean;
}

// Left Side Panel: Directional Pad (ปุ่มบังคับทิศทางอยู่ด้านซ้าย)
export const LeftDirectionPad: React.FC<DirectionPadProps> = ({
  hud,
  onDirection,
  disabled = false,
}) => {
  return (
    <aside
      aria-label="แผงปุ่มบังคับทิศทางด้านซ้าย"
      className="flex flex-col justify-between gap-3 bg-[#FAF8F3] border border-[#E4DFD3] rounded-2xl p-3.5 sm:p-4 lg:p-5 w-full lg:w-[240px] shrink-0"
    >
      <div className="flex items-center justify-between text-xs text-[#6E6A64]">
        <span className="font-semibold text-[#2C2A29]">ปุ่มทิศทาง (ซ้าย)</span>
        <span>WASD / ลูกศร</span>
      </div>

      {/* Ergonomic Cross D-Pad */}
      <div className="grid grid-cols-3 gap-2 max-w-[184px] mx-auto w-full my-auto py-1">
        <div />
        <button
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection(Direction.UP);
          }}
          aria-label="เดินขึ้น"
          className="h-12 sm:h-14 rounded-xl bg-[#FFFFFF] hover:bg-[#F3EFE6] active:scale-95 border border-[#DCD6C8] shadow-[0_3px_0_#DCD6C8] active:shadow-[0_1px_0_#DCD6C8] active:translate-y-[2px] flex items-center justify-center text-[#2C2A29] transition-transform duration-100 cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div />

        <button
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection(Direction.LEFT);
          }}
          aria-label="เดินซ้าย"
          className="h-12 sm:h-14 rounded-xl bg-[#FFFFFF] hover:bg-[#F3EFE6] active:scale-95 border border-[#DCD6C8] shadow-[0_3px_0_#DCD6C8] active:shadow-[0_1px_0_#DCD6C8] active:translate-y-[2px] flex items-center justify-center text-[#2C2A29] transition-transform duration-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection(Direction.DOWN);
          }}
          aria-label="เดินลง"
          className="h-12 sm:h-14 rounded-xl bg-[#FFFFFF] hover:bg-[#F3EFE6] active:scale-95 border border-[#DCD6C8] shadow-[0_3px_0_#DCD6C8] active:shadow-[0_1px_0_#DCD6C8] active:translate-y-[2px] flex items-center justify-center text-[#2C2A29] transition-transform duration-100 cursor-pointer"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            onDirection(Direction.RIGHT);
          }}
          aria-label="เดินขวา"
          className="h-12 sm:h-14 rounded-xl bg-[#FFFFFF] hover:bg-[#F3EFE6] active:scale-95 border border-[#DCD6C8] shadow-[0_3px_0_#DCD6C8] active:shadow-[0_1px_0_#DCD6C8] active:translate-y-[2px] flex items-center justify-center text-[#2C2A29] transition-transform duration-100 cursor-pointer"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Live Stage & Dots Status */}
      <div className="hidden lg:flex flex-col gap-1.5 pt-3 border-t border-[#E8E3D8] text-xs text-[#5C5852]">
        <div className="flex items-center justify-between">
          <span>จุดที่เหลือในด่าน</span>
          <span className="font-mono-num font-semibold text-[#2C2A29]">
            {hud.dotsRemaining} / {hud.totalDots}
          </span>
        </div>
        <div className="text-[11px] text-[#6E6A64] truncate">{hud.lastActionLabel}</div>
      </div>
    </aside>
  );
};

// Right Side Panel: Prominent External JUMP Button (ปุ่มกระโดดอยู่ด้านขวา)
export const RightJumpPad: React.FC<JumpPadProps> = ({
  hud,
  onJump,
  disabled = false,
}) => {
  const canJump = hud.jumpCharges > 0 && !hud.isAirborne && !disabled;

  return (
    <aside
      aria-label="แผงปุ่มกระโดดด้านขวา"
      className="flex flex-col justify-between gap-3 bg-[#FAF8F3] border border-[#E4DFD3] rounded-2xl p-3.5 sm:p-4 lg:p-5 w-full lg:w-[260px] shrink-0"
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-[#6E6A64]">
          <span className="font-semibold text-[#2C2A29]">ปุ่มกระโดด (ขวา)</span>
          <span className="font-mono-num font-semibold text-[#D97706]">
            {hud.jumpCharges}/{hud.maxJumpCharges} ชาร์จ
          </span>
        </div>

        {/* Jump Charge Pips & Recharge Bar */}
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: hud.maxJumpCharges }).map((_, idx) => {
            const isFilled = idx < hud.jumpCharges;
            const isRechargingThis = idx === hud.jumpCharges;
            const pct = isFilled
              ? 100
              : isRechargingThis
              ? Math.round(hud.jumpCooldownProgress * 100)
              : 0;

            return (
              <div
                key={idx}
                className="h-2.5 rounded-md bg-[#EAE5D9] overflow-hidden border border-[#DED8C8]"
              >
                <div
                  className={`h-full transition-transform duration-100 origin-left ${
                    isFilled ? 'bg-[#F59E0B]' : 'bg-[#FBBF24]/70'
                  }`}
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Big Tactile External Arcade JUMP Button */}
      <button
        type="button"
        disabled={disabled || hud.jumpCharges <= 0}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) onJump();
        }}
        className={`group relative w-full min-h-[96px] sm:min-h-[112px] lg:min-h-[132px] rounded-2xl border-2 px-4 py-4 flex flex-col items-center justify-center gap-1.5 transition-transform duration-150 select-none cursor-pointer my-auto ${
          hud.isAirborne
            ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309] scale-[0.98]'
            : canJump
            ? 'bg-[#FACC15] hover:bg-[#FDE047] active:scale-[0.97] border-[#D97706] text-[#2C2A29] shadow-[0_5px_0_#D97706] active:shadow-[0_1px_0_#D97706] active:translate-y-[3px]'
            : 'bg-[#EAE5D9] border-[#D5CFC0] text-[#8E8980] cursor-not-allowed'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <path
              d="M4 17C6.5 9.5 11.5 6 19 8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeDasharray="2 3"
            />
            <circle cx="18.5" cy="7.5" r="4" fill="currentColor" />
            <ellipse cx="12" cy="19.5" rx="6" ry="1.8" fill="currentColor" fillOpacity="0.28" />
          </svg>
          <span className="font-display text-lg sm:text-xl lg:text-2xl font-bold tracking-tight whitespace-nowrap shrink-0">
            {hud.isAirborne ? 'กำลังลอยตัว!' : 'JUMP · กระโดด'}
          </span>
        </div>
        <span className="text-xs font-medium opacity-85 whitespace-nowrap shrink-0">
          {hud.isAirborne
            ? 'ข้ามผีและรั้วสีฟ้าได้ทันที!'
            : hud.jumpCharges > 0
            ? 'คลิกปุ่มนี้ หรือกด Spacebar'
            : 'กำลังชาร์จพลังกระโดด...'}
        </span>
      </button>

      {/* Tactical Jump Perks Legend */}
      <div className="hidden lg:flex flex-col gap-1.5 pt-3 border-t border-[#E8E3D8] text-xs text-[#5C5852]">
        <div className="flex items-center justify-between">
          <span>กระโดดข้ามผี (Ghost Leap)</span>
          <span className="font-mono-num font-semibold text-[#D97706]">+150</span>
        </div>
        <div className="flex items-center justify-between">
          <span>ข้ามรั้วทางลัดสีฟ้า (Vault)</span>
          <span className="font-mono-num font-semibold text-[#0284C7]">+75</span>
        </div>
        <div className="flex items-center justify-between">
          <span>ลงพื้นใกล้ผี (Stun Wave)</span>
          <span className="font-mono-num font-semibold text-[#059669]">+50 · ผีมึน</span>
        </div>
      </div>
    </aside>
  );
};
