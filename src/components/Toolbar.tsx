import React, { useRef, useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize2,
  Minimize2,
  Square,
  Columns2,
  Grid2X2,
  Sparkles,
  HelpCircle,
  Share2,
  Scissors,
  Ruler,
  MapPin,
  Sliders,
  Users,
  ChevronDown,
} from 'lucide-react';
import { ViewMode, ColorMode, CrossSectionState, ActiveToolMode } from '../types/cad';

interface ToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  colorMode: ColorMode;
  onToggleColorMode: () => void;
  onRotateLeft: (delta?: number) => void;
  onRotateRight: (delta?: number) => void;
  onZoomIn: (delta?: number) => void;
  onZoomOut: (delta?: number) => void;
  onResetView: () => void;
  isResetFlashing?: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  wireframe: boolean;
  setWireframe: (val: boolean | ((prev: boolean) => boolean)) => void;
  materialTheme: string;
  setMaterialTheme: (val: string) => void;
  onOpenLegend: () => void;
  // Two Hands Mode, Tools & Cross-Section
  isTwoHandsMode: boolean;
  onToggleTwoHandsMode: () => void;
  crossSection: CrossSectionState;
  onUpdateCrossSection: (update: Partial<CrossSectionState>) => void;
  activeToolMode: ActiveToolMode;
  setActiveToolMode: (mode: ActiveToolMode) => void;
  onOpenSensitivity: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  setViewMode,
  colorMode,
  onToggleColorMode,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onResetView,
  isResetFlashing = false,
  isFullscreen,
  onToggleFullscreen,
  wireframe,
  setWireframe,
  materialTheme,
  setMaterialTheme,
  onOpenLegend,
  isTwoHandsMode,
  onToggleTwoHandsMode,
  crossSection,
  onUpdateCrossSection,
  activeToolMode,
  setActiveToolMode,
  onOpenSensitivity,
}) => {
  const holdIntervalRef = useRef<number | null>(null);
  const [showClipPopover, setShowClipPopover] = useState(false);

  // Press-and-hold logic for continuous smooth rotation / zoom
  const startHoldAction = (action: () => void) => {
    action();
    stopHoldAction();
    const timeout = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => {
        action();
      }, 35);
    }, 220);
    (holdIntervalRef as any).timeout = timeout;
  };

  const stopHoldAction = () => {
    if ((holdIntervalRef as any).timeout) {
      clearTimeout((holdIntervalRef as any).timeout);
      (holdIntervalRef as any).timeout = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const materialOptions = [
    { id: 'titanium', name: 'Precision Titanium', bg: 'bg-slate-300' },
    { id: 'cyan', name: colorMode === 'red' ? 'Stark Crimson' : 'Stark Cyan', bg: colorMode === 'red' ? 'bg-[#ff2e43]' : 'bg-[#00e5ff]' },
    { id: 'obsidian', name: 'Deep Carbon', bg: 'bg-zinc-800' },
    { id: 'emerald', name: 'Emerald Matrix', bg: 'bg-emerald-400' },
    { id: 'amber', name: 'Industrial Gold', bg: 'bg-amber-400' },
  ];

  const toggleMeasureMode = () => {
    setActiveToolMode(activeToolMode === 'measure' ? 'none' : 'measure');
  };

  const toggleAnnotateMode = () => {
    setActiveToolMode(activeToolMode === 'annotate' ? 'none' : 'annotate');
  };

  return (
    <div className="fixed top-4 right-5 z-40 flex items-center gap-2 select-none pointer-events-auto">
      {/* Main Futuristic Stark HUD Toolbar Panel */}
      <div className="flex items-center gap-1.5 p-1.5 glass-panel rounded-xl border border-hud-accent shadow-2xl backdrop-blur-xl relative overflow-visible hud-shimmer-panel">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--hud-accent)] to-transparent opacity-70 pointer-events-none animate-pulse" />

        {/* Orbit / Rotation Controls */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-hud-accent/25">
          <button
            onPointerDown={() => startHoldAction(() => onRotateLeft(0.04))}
            onPointerUp={stopHoldAction}
            onPointerLeave={stopHoldAction}
            className="group relative p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 active:bg-white/20 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Rotate Left (Hold for continuous)"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="sr-only">Rotate Left</span>
          </button>

          <button
            onPointerDown={() => startHoldAction(() => onRotateRight(0.04))}
            onPointerUp={stopHoldAction}
            onPointerLeave={stopHoldAction}
            className="group relative p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 active:bg-white/20 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Rotate Right (Hold for continuous)"
          >
            <RotateCw className="w-4 h-4" />
            <span className="sr-only">Rotate Right</span>
          </button>
        </div>

        {/* Dolly / Zoom Controls */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-hud-accent/25">
          <button
            onPointerDown={() => startHoldAction(() => onZoomIn(3))}
            onPointerUp={stopHoldAction}
            onPointerLeave={stopHoldAction}
            className="group relative p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 active:bg-white/20 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Zoom In (Hold for continuous)"
          >
            <ZoomIn className="w-4 h-4" />
            <span className="sr-only">Zoom In</span>
          </button>

          <button
            onPointerDown={() => startHoldAction(() => onZoomOut(3))}
            onPointerUp={stopHoldAction}
            onPointerLeave={stopHoldAction}
            className="group relative p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 active:bg-white/20 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Zoom Out (Hold for continuous)"
          >
            <ZoomOut className="w-4 h-4" />
            <span className="sr-only">Zoom Out</span>
          </button>
        </div>

        {/* RESET BUTTON */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-hud-accent/25">
          <button
            onClick={onResetView}
            className={`group relative p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              isResetFlashing
                ? 'bg-hud-accent text-slate-950 border-hud-accent shadow-[0_0_24px_var(--hud-accent)] scale-105'
                : 'bg-[#070d18]/80 hover:bg-white/10 border-hud-accent/30 hover:border-hud-accent text-slate-300 hover:text-hud-accent shadow-sm'
            }`}
            title="Reset Model, Framing & Cross-Section (Closed Fist / Button)"
          >
            <RefreshCw className={`w-4 h-4 ${isResetFlashing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Reset View</span>
          </button>
        </div>

        {/* View Mode Toggle Group */}
        <div className="flex items-center gap-1 p-0.5 bg-[#03060d]/90 rounded-lg border border-hud-accent/30 shadow-inner">
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono-tech transition-all cursor-pointer active:scale-95 ${
              viewMode === 'single'
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border border-hud-accent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="Single View (1-VIEW)"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1-VIEW</span>
          </button>

          <button
            onClick={() => setViewMode('dual')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono-tech transition-all cursor-pointer active:scale-95 ${
              viewMode === 'dual'
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border border-hud-accent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="2-View (2 FINGERS)"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2-VIEW</span>
          </button>

          <button
            onClick={() => setViewMode('multi')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono-tech transition-all cursor-pointer active:scale-95 ${
              viewMode === 'multi'
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border border-hud-accent'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="Multi View (4 FINGERS)"
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">4-VIEW</span>
          </button>
        </div>

        {/* TWO HANDS MODE TOGGLE BUTTON (Section 1) */}
        <div className="flex items-center gap-1 px-1.5 border-l border-hud-accent/25">
          <button
            onClick={onToggleTwoHandsMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono-tech font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
              isTwoHandsMode
                ? 'bg-purple-500/25 border-purple-400 text-purple-200 shadow-[0_0_14px_rgba(192,132,252,0.4)]'
                : 'bg-[#070d18]/85 hover:bg-white/10 border-hud-accent/35 text-slate-400 hover:text-slate-200'
            }`}
            title={isTwoHandsMode ? 'Two Hands Mode Active (Click to disable)' : 'Enable Two Hands Mode (Track up to 2 hands)'}
          >
            <Users className={`w-3.5 h-3.5 ${isTwoHandsMode ? 'text-purple-300' : 'text-slate-400'}`} />
            <span className="text-[10px]">
              2-HANDS {isTwoHandsMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* CROSS-SECTION / CLIPPING PLANE VIEW (Section 2) */}
        <div className="relative">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateCrossSection({ enabled: !crossSection.enabled })}
              className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                crossSection.enabled
                  ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border-hud-accent'
                  : 'bg-[#070d18]/80 hover:bg-white/10 border-hud-accent/25 text-slate-300 hover:text-hud-accent'
              }`}
              title={crossSection.enabled ? 'Disable Cross-Section Cut' : 'Enable Real-time Cross-Section / Clipping Plane'}
            >
              <Scissors className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowClipPopover(!showClipPopover)}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
              title="Cross-Section Plane Controls"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Cross-Section Settings Popover */}
          {showClipPopover && (
            <div className="absolute right-0 top-full mt-2 w-64 glass-panel-glow rounded-xl p-3 border border-hud-accent shadow-2xl z-50 font-mono-tech text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-hud-accent/20 pb-1.5">
                <span className="font-bold text-hud-accent text-[11px]">CROSS-SECTION AXIS</span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {crossSection.enabled ? 'ACTIVE' : 'OFF'}
                </span>
              </div>

              {/* Axis Selector */}
              <div className="grid grid-cols-3 gap-1">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <button
                    key={axis}
                    onClick={() => onUpdateCrossSection({ axis, enabled: true })}
                    className={`py-1 rounded text-center font-bold uppercase transition-all cursor-pointer ${
                      crossSection.axis === axis && crossSection.enabled
                        ? 'bg-hud-accent text-slate-950 shadow-sm'
                        : 'bg-[#070e1c] text-slate-300 hover:bg-white/10 border border-hud-accent/20'
                    }`}
                  >
                    {axis.toUpperCase()} Axis
                  </button>
                ))}
              </div>

              {/* Depth Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>SLICE DEPTH:</span>
                  <span className="text-hud-accent font-bold">
                    {Math.round(crossSection.depth * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={crossSection.depth}
                  onChange={(e) =>
                    onUpdateCrossSection({
                      depth: parseFloat(e.target.value),
                      enabled: true,
                    })
                  }
                  className="w-full accent-hud-accent cursor-pointer"
                />
              </div>

              <div className="text-[10px] text-slate-400 pt-1 border-t border-hud-accent/15 leading-tight">
                CLIP: {Math.round(crossSection.depth * 100)}% along {crossSection.axis.toUpperCase()}-axis
              </div>
            </div>
          )}
        </div>

        {/* MEASUREMENT & ANNOTATION TOOLS (Section 3) */}
        <div className="flex items-center gap-1 px-1.5 border-l border-hud-accent/25">
          {/* Measure Mode */}
          <button
            onClick={toggleMeasureMode}
            className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              activeToolMode === 'measure'
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border-hud-accent'
                : 'bg-[#070d18]/80 hover:bg-white/10 border-hud-accent/25 text-slate-300 hover:text-hud-accent'
            }`}
            title="Measurement Mode (Pinch or click 2 points to measure CAD distance)"
          >
            <Ruler className="w-4 h-4" />
          </button>

          {/* Annotate Mode */}
          <button
            onClick={toggleAnnotateMode}
            className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              activeToolMode === 'annotate'
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_16px_var(--hud-accent-glow)] border-hud-accent'
                : 'bg-[#070d18]/80 hover:bg-white/10 border-hud-accent/25 text-slate-300 hover:text-hud-accent'
            }`}
            title="Annotation Mode (Pinch or click to place note pins on CAD surface)"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>

        {/* DUAL COLOR MODE TOGGLE (BLUE / RED) */}
        <div className="flex items-center gap-1 px-1.5 border-l border-hud-accent/25">
          <button
            onClick={onToggleColorMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#070d18]/85 hover:bg-white/10 border border-hud-accent/35 hover:border-hud-accent text-xs font-mono-tech font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
            title={`Switch Color Mode: currently ${colorMode.toUpperCase()} MODE`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                colorMode === 'blue' ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-[#ff2e43] shadow-[0_0_8px_#ff2e43]'
              } animate-pulse`}
            />
            <span className="text-hud-accent font-bold tracking-wider text-[10px]">
              {colorMode === 'blue' ? 'BLUE' : 'RED'}
            </span>
          </button>
        </div>

        {/* Quick CAD Utility Toggles & Fullscreen */}
        <div className="flex items-center gap-1 pl-1.5 border-l border-hud-accent/25">
          {/* Sensitivity Settings */}
          <button
            onClick={onOpenSensitivity}
            className="p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent transition-all cursor-pointer active:scale-95"
            title="Adjust Gesture Sensitivity & Recalibrate Baseline"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              isFullscreen
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_15px_var(--hud-accent-glow)] border-hud-accent'
                : 'bg-[#070d18]/80 hover:bg-white/10 border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Thumbs Down)' : 'Enter Fullscreen (Thumbs Up)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Wireframe Toggle */}
          <button
            onClick={() => setWireframe((prev) => !prev)}
            className={`p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              wireframe
                ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_15px_var(--hud-accent-glow)] border-hud-accent'
                : 'bg-[#070d18]/80 border-hud-accent/25 text-slate-300 hover:text-hud-accent hover:bg-white/10 hover:border-hud-accent'
            }`}
            title="Toggle Wireframe Mesh Overlay"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Material Theme Dropdown */}
          <div className="relative group">
            <button
              className="p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              title="Change Material Shading"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <div className="absolute right-0 top-full mt-2 hidden group-hover:flex flex-col gap-1 p-2 w-48 glass-panel-glow rounded-xl border border-hud-accent shadow-2xl z-50">
              <span className="text-[10px] font-mono-tech text-hud-accent px-2 py-0.5 tracking-wider font-bold">
                SHADING THEME
              </span>
              {materialOptions.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => setMaterialTheme(mat.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono-tech text-left transition-all cursor-pointer ${
                    materialTheme === mat.id
                      ? 'bg-hud-accent-subtle text-hud-accent border border-hud-accent/50 font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${mat.bg} border border-white/30`} />
                  <span>{mat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Help / Gestures Legend Button */}
          <button
            onClick={onOpenLegend}
            className="p-2 rounded-lg bg-[#070d18]/80 hover:bg-white/10 border border-hud-accent/25 hover:border-hud-accent text-slate-300 hover:text-hud-accent transition-all cursor-pointer active:scale-95"
            title="Complete Gesture Guide & Telemetry"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
