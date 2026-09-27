import React from 'react';
import { Sliders, X, RefreshCw, Crosshair, Check } from 'lucide-react';
import { GestureSettings, ColorMode } from '../types/cad';

interface SensitivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GestureSettings;
  onUpdateSettings: (newSettings: Partial<GestureSettings>) => void;
  onRecalibrateBaseline: () => void;
  colorMode?: ColorMode;
}

export const SensitivityModal: React.FC<SensitivityModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRecalibrateBaseline,
  colorMode = 'blue',
}) => {
  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onUpdateSettings({
      holdDurationMs: 300,
      rotationMultiplier: 1.0,
      zoomMultiplier: 1.0,
      elevationMultiplier: 1.0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md glass-panel-glow rounded-2xl border border-hud-accent shadow-2xl overflow-hidden font-mono-tech">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#050a14]/95 border-b border-hud-accent/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-hud-accent-subtle border border-hud-accent/50 flex items-center justify-center shadow-[0_0_12px_var(--hud-accent-glow)]">
              <Sliders className="w-4 h-4 text-hud-accent" />
            </div>
            <div>
              <h2 className="font-heading-tech font-bold text-base text-white tracking-wider">
                GESTURE SENSITIVITY & TUNING
              </h2>
              <p className="text-[10px] text-hud-accent/80">SESSION RECALIBRATION & RESPONSE CONTROLS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Sliders */}
        <div className="p-5 space-y-4 text-xs bg-[#02050b]/90">
          {/* Hold duration */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#070e1c]/80 border border-hud-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Hold-To-Confirm Window:</span>
              <span className="text-hud-accent font-bold">{settings.holdDurationMs} ms</span>
            </div>
            <input
              type="range"
              min="200"
              max="800"
              step="50"
              value={settings.holdDurationMs}
              onChange={(e) => onUpdateSettings({ holdDurationMs: parseInt(e.target.value, 10) })}
              className="w-full accent-hud-accent cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>200ms (Fast)</span>
              <span>Default (300ms)</span>
              <span>800ms (Deliberate)</span>
            </div>
          </div>

          {/* Rotation sensitivity */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#070e1c]/80 border border-hud-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Rotation Sensitivity:</span>
              <span className="text-hud-accent font-bold">{settings.rotationMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.rotationMultiplier}
              onChange={(e) => onUpdateSettings({ rotationMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-hud-accent cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>0.5x (Precision)</span>
              <span>1.0x (Standard)</span>
              <span>2.0x (Rapid)</span>
            </div>
          </div>

          {/* Elevation sensitivity */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#070e1c]/80 border border-hud-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Elevation Orbit Sensitivity:</span>
              <span className="text-hud-accent font-bold">{settings.elevationMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.elevationMultiplier}
              onChange={(e) => onUpdateSettings({ elevationMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-hud-accent cursor-pointer"
            />
          </div>

          {/* Zoom sensitivity */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#070e1c]/80 border border-hud-accent/20">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold">Zoom / Dolly Sensitivity:</span>
              <span className="text-hud-accent font-bold">{settings.zoomMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.zoomMultiplier}
              onChange={(e) => onUpdateSettings({ zoomMultiplier: parseFloat(e.target.value) })}
              className="w-full accent-hud-accent cursor-pointer"
            />
          </div>

          {/* Recalibrate baseline hand size action */}
          <button
            onClick={() => {
              onRecalibrateBaseline();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-hud-accent-subtle hover:bg-hud-accent/20 border border-hud-accent text-hud-accent font-bold transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Crosshair className="w-4 h-4 text-hud-accent" />
            <span>Recalibrate Hand Baseline Distance</span>
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#050a14]/95 border-t border-hud-accent/30 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-hud-accent hover:opacity-90 text-slate-950 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
