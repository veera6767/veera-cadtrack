import React from 'react';
import {
  Hand,
  Columns2,
  Grid2X2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  EyeOff,
  Move,
  ZoomIn,
  ArrowUpDown,
  MousePointer,
  X,
  Check,
  Users,
  Scissors,
  Ruler,
  MapPin,
} from 'lucide-react';
import { ColorMode } from '../types/cad';

interface GestureLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorMode?: ColorMode;
}

export const GestureLegendModal: React.FC<GestureLegendModalProps> = ({ isOpen, onClose, colorMode = 'blue' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl glass-panel-glow rounded-2xl border border-hud-accent shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#050a14]/95 border-b border-hud-accent/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-hud-accent-subtle border border-hud-accent/50 flex items-center justify-center shadow-[0_0_15px_var(--hud-accent-glow)]">
              <Hand className="w-5 h-5 text-hud-accent" />
            </div>
            <div>
              <h2 className="font-heading-tech font-extrabold text-lg text-white tracking-wider flex items-center gap-2">
                <span>VEERA-CADTRACK</span>
                <span className="text-xs px-2 py-0.5 rounded bg-hud-accent text-slate-950 font-bold">
                  {colorMode.toUpperCase()} HUD TELEMETRY
                </span>
              </h2>
              <p className="text-xs font-mono-tech text-hud-accent/90">
                COMPLETE SINGLE & DUAL-HAND GESTURE TELEMETRY SPECIFICATION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono-tech text-xs">
          {/* Section: Two Hands Mode (New Additive Feature) */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-bold flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-400" />
                TWO HANDS MODE (OPT-IN DUAL-TRACKING)
              </span>
              <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2.5 py-0.5 rounded border border-purple-400/40 font-bold">
                TOGGLE ON/OFF
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-lg bg-[#070e1c]/80 border border-purple-400/20">
                <strong className="text-purple-300 block mb-1">1. Pinch-and-Spread Zoom:</strong>
                Track distance between two palm centroids. Hands moving apart zooms in (dolly closer); moving together zooms out.
              </div>
              <div className="p-2.5 rounded-lg bg-[#070e1c]/80 border border-purple-400/20">
                <strong className="text-purple-300 block mb-1">2. Cross-Section Depth:</strong>
                When Cross-Section is active and hands are held level, distance between hands shifts the clipping plane along its active axis.
              </div>
              <div className="p-2.5 rounded-lg bg-[#070e1c]/80 border border-purple-400/20">
                <strong className="text-purple-300 block mb-1">3. Rotate + Action Split:</strong>
                Hand 1 continuously orbits azimuth/elevation while Hand 2 finger count simultaneously triggers 2-View, 4-View, Reset, or Fullscreen.
              </div>
            </div>
          </div>

          {/* Section: Measurement & Annotation Tools (New Additive Feature) */}
          <div className="p-4 rounded-xl bg-[#030712]/90 border border-hud-accent/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-hud-accent font-bold flex items-center gap-2 text-sm">
                <Ruler className="w-4 h-4 text-hud-accent" />
                MEASUREMENT & ANNOTATION (PINCH-TO-PLACE)
              </span>
              <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2.5 py-0.5 rounded border border-hud-accent/40 font-bold">
                PINCH GESTURE
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20">
                <strong className="text-white block mb-1 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-hud-accent" /> Measure Tool:
                </strong>
                Pinch thumb and index fingertip together at Point A, then repeat at Point B. Raycasts directly onto CAD geometry, draws a 3D line, and calculates straight-line distance in true CAD millimeters.
              </div>
              <div className="p-2.5 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20">
                <strong className="text-white block mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-hud-accent" /> Annotate Tool:
                </strong>
                Pinch or click to drop a 3D pin marker with leader line, and enter descriptive note tags that stay permanently anchored in 3D world space.
              </div>
            </div>
          </div>

          {/* Standard Single-Hand Gestures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Gesture 1: Open Hand */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <Hand className="w-4 h-4" />
                  1. OPEN HAND
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  3–5 FINGERS
                </span>
              </div>
              <p className="text-[11px] text-hud-accent/90 font-semibold">
                Rotate (horizontal) + Elevate (vertical) + Zoom (depth)
              </p>
              <div className="space-y-1 text-slate-300 text-[11px] leading-relaxed">
                <div>• Horizontal movement orbits camera azimuth angle.</div>
                <div>• Vertical movement adjusts camera pitch (or moves clipping plane in Cross-Section mode).</div>
                <div>• Apparent hand size / depth moves camera closer / farther.</div>
              </div>
            </div>

            {/* Gesture 2: Exactly 2 Fingers */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <Columns2 className="w-4 h-4" />
                  2. EXACTLY 2 FINGERS
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  INDEX + MID
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Switch to 2-View:</strong> Index + Middle extended, others curled. Switches layout to side-by-side view with synchronized 90° ortho camera.
              </p>
              <div className="text-[10px] text-slate-500">Hold ~300ms to confirm layout.</div>
            </div>

            {/* Gesture 3: Exactly 4 Fingers */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <Grid2X2 className="w-4 h-4" />
                  3. EXACTLY 4 FINGERS
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  4 EXTENDED
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Switch to 4-View (Quad):</strong> Index, Middle, Ring, Pinky extended. Transitions to 2×2 synchronized quadrant layout.
              </p>
              <div className="text-[10px] text-slate-500">Hold ~300ms to confirm layout.</div>
            </div>

            {/* Gesture 4: Closed Fist */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  4. CLOSED FIST
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  5 CURLED
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Reset & Single View:</strong> All 5 fingers curled. Eased smooth transition back to initial position/zoom, resets cross-section clip, and returns to Single View.
              </p>
              <div className="text-[10px] text-slate-500">Hold ~300ms; re-arms upon release.</div>
            </div>

            {/* Gesture 5: Thumbs Up */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4" />
                  5. THUMBS UP
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  FULLSCREEN
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">True Fullscreen Mode:</strong> Thumb pointing up, 4 fingers curled. Hides all UI chrome. Tracking continues uninterrupted in background.
              </p>
            </div>

            {/* Gesture 6: Thumbs Down */}
            <div className="p-3.5 rounded-xl bg-[#03060d]/80 border border-hud-accent/30 hover:border-hud-accent transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-hud-accent font-bold flex items-center gap-1.5">
                  <ThumbsDown className="w-4 h-4" />
                  6. THUMBS DOWN
                </span>
                <span className="text-[10px] bg-hud-accent-subtle text-hud-accent px-2 py-0.5 rounded border border-hud-accent/40 font-bold">
                  NORMAL MODE
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong className="text-white">Exit Fullscreen:</strong> Thumb pointing down, 4 fingers curled. Restores full UI telemetry layout.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#050a14]/95 border-t border-hud-accent/30 flex items-center justify-between">
          <span className="text-[11px] font-mono-tech text-slate-400">
            Available anytime via the <strong className="text-hud-accent">?</strong> button in the toolbar
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-hud-accent hover:opacity-90 text-slate-950 font-bold font-mono-tech text-xs transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>DISMISS GUIDE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
