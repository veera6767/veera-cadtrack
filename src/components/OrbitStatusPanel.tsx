import React from 'react';
import { RotateCcw, ArrowUpDown, Scissors } from 'lucide-react';
import { CrossSectionState, ColorMode } from '../types/cad';

interface OrbitStatusPanelProps {
  azimuthRad: number;
  elevationRad: number;
  crossSection: CrossSectionState;
  isTwoHandsMode: boolean;
  colorMode: ColorMode;
  isFullscreen: boolean;
}

export const OrbitStatusPanel: React.FC<OrbitStatusPanelProps> = ({
  azimuthRad,
  elevationRad,
  crossSection,
  isTwoHandsMode,
  colorMode,
  isFullscreen,
}) => {
  // Normalize azimuth to positive 0-359 degrees
  const azimuthDeg = Math.round((((azimuthRad * 180 / Math.PI) % 360) + 360) % 360);
  const elevationDeg = Math.round(elevationRad * 180 / Math.PI);

  return (
    <div
      className={`fixed left-4 top-1/2 -translate-y-1/2 z-30 select-none pointer-events-auto transition-all duration-300 ${
        isFullscreen ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="glass-panel rounded-xl border border-hud-accent/35 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-md px-3 py-2 text-xs font-mono-tech divide-y divide-hud-accent/15 flex flex-col min-w-[128px]">
        {/* Row 1: Azimuth (Always shown) */}
        <div className="flex items-center justify-between gap-3 py-1.5 first:pt-0.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <RotateCcw className="w-3.5 h-3.5 text-hud-accent/80 shrink-0" />
            <span className="font-semibold tracking-wider">AZ</span>
          </div>
          <span className="font-bold text-slate-100 text-xs font-mono-tech tabular-nums">
            {azimuthDeg}°
          </span>
        </div>

        {/* Row 2: Elevation (Always shown) */}
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-hud-accent/80 shrink-0" />
            <span className="font-semibold tracking-wider">EL</span>
          </div>
          <span className="font-bold text-slate-100 text-xs font-mono-tech tabular-nums">
            {elevationDeg}°
          </span>
        </div>

        {/* Row 3: Cross-Section Clip (ONLY shown while Cross-Section mode is active) */}
        {crossSection.enabled && (
          <div className="flex items-center justify-between gap-3 py-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Scissors className="w-3.5 h-3.5 text-hud-accent shrink-0" />
              <span className="font-semibold tracking-wider">CLIP</span>
            </div>
            <span className="font-bold text-hud-accent text-xs font-mono-tech tabular-nums">
              {Math.round(crossSection.depth * 100)}% {crossSection.axis.toUpperCase()}
            </span>
          </div>
        )}

        {/* Row 4: Two-Hands Mode (Always shown, glowing when ON, dimmed when OFF) */}
        <div className="flex items-center justify-between gap-3 py-1.5 last:pb-0.5">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span className="text-xs leading-none select-none">✋✋</span>
            <span className="font-semibold tracking-wider">2H</span>
          </div>
          <span
            className={`text-xs font-mono-tech font-bold tracking-wider tabular-nums ${
              isTwoHandsMode
                ? 'text-hud-accent drop-shadow-[0_0_8px_var(--hud-accent-glow)]'
                : 'text-slate-500 opacity-60'
            }`}
          >
            {isTwoHandsMode ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};
