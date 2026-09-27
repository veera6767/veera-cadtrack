import React, { useRef } from 'react';
import { Upload, ChevronDown, Check, Box, Activity } from 'lucide-react';
import { ViewMode, ColorMode } from '../types/cad';

interface HeaderProps {
  viewMode: ViewMode;
  colorMode?: ColorMode;
  onFileUpload: (file: File) => void;
  onSelectPreset: (presetKey: 'planetary_gear' | 'turbine_impeller' | 'bracket_arm') => void;
  currentModelName: string;
  isWebcamActive: boolean;
  isHandDetected: boolean;
  isTwoHandsMode?: boolean;
  onToggleTwoHandsMode?: () => void;
  onOpenSensitivity?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  colorMode = 'blue',
  onFileUpload,
  onSelectPreset,
  currentModelName,
  isWebcamActive,
  isHandDetected,
  isTwoHandsMode = false,
  onToggleTwoHandsMode,
  onOpenSensitivity,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const getModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'single':
        return '1-VIEW (SINGLE)';
      case 'dual':
        return '2-VIEW (90° SPLIT)';
      case 'multi':
        return '4-VIEW (QUAD)';
    }
  };

  return (
    <header className="fixed top-4 left-5 z-40 flex items-center gap-3 select-none pointer-events-auto">
      {/* Branding & Mission Control HUD Bar */}
      <div className="flex items-center gap-3 px-3.5 py-2 glass-panel rounded-xl border border-hud-accent shadow-2xl backdrop-blur-xl relative overflow-hidden hud-shimmer-panel">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--hud-accent)] to-transparent pointer-events-none animate-pulse" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-hud-accent-subtle border border-hud-accent/50 flex items-center justify-center shadow-[0_0_15px_var(--hud-accent-glow)]">
            <Box className="w-4 h-4 text-hud-accent" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-heading-tech font-extrabold text-base tracking-wider text-white">
                VEERA-CADTRACK
              </h1>
              <span className="text-[9px] font-mono-tech px-1.5 py-0.2 rounded bg-hud-accent text-slate-950 font-bold">
                {colorMode === 'red' ? 'RED' : 'BLUE'}
              </span>
            </div>
            <span className="block text-[9px] font-mono-tech text-hud-accent tracking-widest uppercase font-semibold">
              TELEMETRY MISSION CONTROL // V2.5
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-hud-accent/25" />

        {/* View Mode Indicator Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#03060c]/90 border border-hud-accent/30 text-xs font-mono-tech shadow-inner">
          <span className="text-[10px] text-slate-400">LAYOUT:</span>
          <span className="font-bold text-hud-accent tracking-wider">
            {getModeLabel(viewMode)}
          </span>
        </div>

        {/* Hand Telemetry Indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#03060c]/90 border border-hud-accent/25 text-xs font-mono-tech">
          <span
            className={`w-2 h-2 rounded-full ${
              isHandDetected
                ? 'bg-hud-accent shadow-[0_0_8px_var(--hud-accent)] animate-ping'
                : isWebcamActive
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] text-slate-300 font-bold">
            {isHandDetected
              ? isTwoHandsMode
                ? 'DUAL-TRACK ACTIVE'
                : 'HAND ACTIVE'
              : isWebcamActive
              ? 'SEARCHING'
              : 'MANUAL'}
          </span>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.step,.stp,.obj"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Import CAD Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hud-accent-subtle hover:bg-hud-accent/25 border border-hud-accent text-hud-accent text-xs font-mono-tech font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Import STL, STEP, or OBJ file"
        >
          <Upload className="w-3.5 h-3.5 text-hud-accent" />
          <span>IMPORT CAD</span>
        </button>

        {/* Preset CAD Models Selector */}
        <div className="relative group">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#070e1a]/80 hover:bg-white/10 border border-hud-accent/30 hover:border-hud-accent text-slate-300 hover:text-hud-accent text-xs font-mono-tech transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Load Preset CAD Engineering Assemblies & Settings"
          >
            <span>PRESETS</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-hud-accent" />
          </button>

          {/* Dropdown Menu */}
          <div className="absolute left-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 p-2 w-60 glass-panel-glow rounded-xl border border-hud-accent shadow-2xl z-50">
            <span className="text-[10px] font-mono-tech text-hud-accent px-2 py-0.5 tracking-wider font-bold">
              ENGINEERING PRESETS
            </span>
            <button
              onClick={() => onSelectPreset('planetary_gear')}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-slate-300 hover:text-hud-accent hover:bg-hud-accent-subtle transition-all cursor-pointer"
            >
              <span>Sun Gear Stage (STEP)</span>
              {currentModelName.includes('SUN_GEAR') && <Check className="w-3.5 h-3.5 text-hud-accent" />}
            </button>
            <button
              onClick={() => onSelectPreset('turbine_impeller')}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-slate-300 hover:text-hud-accent hover:bg-hud-accent-subtle transition-all cursor-pointer"
            >
              <span>Turbine Rotor (STL)</span>
              {currentModelName.includes('TURBINE') && <Check className="w-3.5 h-3.5 text-hud-accent" />}
            </button>
            <button
              onClick={() => onSelectPreset('bracket_arm')}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-slate-300 hover:text-hud-accent hover:bg-hud-accent-subtle transition-all cursor-pointer"
            >
              <span>Aero Bracket (OBJ)</span>
              {currentModelName.includes('BRACKET') && <Check className="w-3.5 h-3.5 text-hud-accent" />}
            </button>

            {/* Presets Menu - Mode & Sensitivity Toggles (Requirement 1.1) */}
            <div className="pt-1.5 mt-1 border-t border-hud-accent/20 space-y-1">
              <span className="text-[10px] font-mono-tech text-hud-accent px-2 py-0.5 tracking-wider font-bold">
                TRACKING CONTROLS
              </span>
              {onToggleTwoHandsMode && (
                <button
                  onClick={onToggleTwoHandsMode}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-slate-300 hover:text-hud-accent hover:bg-hud-accent-subtle transition-all cursor-pointer"
                >
                  <span>Two Hands Mode</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isTwoHandsMode
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isTwoHandsMode ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}
              {onOpenSensitivity && (
                <button
                  onClick={onOpenSensitivity}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-slate-300 hover:text-hud-accent hover:bg-hud-accent-subtle transition-all cursor-pointer"
                >
                  <span>Sensitivity Tuning</span>
                  <span className="text-hud-accent">⚙</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
