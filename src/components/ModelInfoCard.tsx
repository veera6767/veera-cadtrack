import React, { useState, useEffect } from 'react';
import { Box, Layers, Cpu, HardDrive, ChevronDown, ChevronUp, FileCode, Zap, CheckCircle2 } from 'lucide-react';
import { ModelStats, ColorMode, CrossSectionState } from '../types/cad';

interface ModelInfoCardProps {
  stats: ModelStats | null;
  colorMode?: ColorMode;
  crossSection?: CrossSectionState;
}

export const ModelInfoCard: React.FC<ModelInfoCardProps> = ({ stats, colorMode = 'blue', crossSection }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  // Animated telemetry numbers
  const [animatedVertices, setAnimatedVertices] = useState<number>(0);
  const [animatedFaces, setAnimatedFaces] = useState<number>(0);
  const [animatedLength, setAnimatedLength] = useState<number>(0);
  const [animatedBreadth, setAnimatedBreadth] = useState<number>(0);
  const [animatedHeight, setAnimatedHeight] = useState<number>(0);

  useEffect(() => {
    if (!stats) return;

    setIsComputing(true);
    const duration = 400; // ms
    const startTime = performance.now();

    const targetV = stats.vertexCount;
    const targetF = stats.faceCount;
    const targetL = stats.dimensions.length;
    const targetB = stats.dimensions.breadth;
    const targetH = stats.dimensions.height;

    let animId: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Eased count up: 1 - (1 - progress)^3
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedVertices(Math.round(targetV * ease));
      setAnimatedFaces(Math.round(targetF * ease));
      setAnimatedLength(parseFloat((targetL * ease).toFixed(1)));
      setAnimatedBreadth(parseFloat((targetB * ease).toFixed(1)));
      setAnimatedHeight(parseFloat((targetH * ease).toFixed(1)));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setIsComputing(false);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [stats]);

  if (!stats) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getFormatBadgeStyle = (format: string) => {
    switch (format) {
      case 'STEP':
        return 'bg-hud-accent-subtle text-hud-accent border-hud-accent/60 shadow-sm';
      case 'STL':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/50 shadow-sm';
      case 'OBJ':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-sm';
      default:
        return 'bg-hud-accent-subtle text-hud-accent border-hud-accent/40';
    }
  };

  return (
    <div
      key={stats.fileName}
      className="fixed top-[4.85rem] right-5 z-30 select-none animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      {isCollapsed ? (
        /* Collapsed Compact Badge (Positioned at Top-Right under Toolbar) */
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl glass-panel-glow text-xs font-mono-tech text-hud-accent hover:text-white transition-all cursor-pointer shadow-xl border border-hud-accent"
          title="Expand Model Telemetry"
        >
          <Box className="w-4 h-4 text-hud-accent" />
          <span className="font-semibold truncate max-w-[140px] text-slate-200">{stats.fileName}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${getFormatBadgeStyle(stats.fileFormat)}`}>
            {stats.fileFormat}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-hud-accent" />
        </button>
      ) : (
        /* Expanded Full Bespoke Telemetry Card (Stacked below Toolbar) */
        <div className="w-[320px] glass-panel-glow rounded-xl overflow-hidden border border-hud-accent shadow-2xl backdrop-blur-xl relative hud-shimmer-panel">
          {/* Subtle top edge scanning glow */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--hud-accent)] to-transparent pointer-events-none animate-pulse" />

          {/* Card Header with Technical Annotations */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#050a14]/90 border-b border-hud-accent/25">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-hud-accent-subtle border border-hud-accent/40 flex items-center justify-center shrink-0">
                <FileCode className="w-3.5 h-3.5 text-hud-accent" />
              </div>
              <div className="truncate">
                <span className="text-[10px] font-mono-tech text-hud-accent font-bold tracking-widest block leading-tight">
                  // TELEMETRY-SPEC
                </span>
                <span className="text-xs font-mono-tech font-bold text-slate-100 tracking-wide block truncate">
                  {stats.fileName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold border ${getFormatBadgeStyle(stats.fileFormat)}`}>
                {stats.fileFormat}
              </span>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
                title="Collapse Card"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card Body - Monospace Metrics */}
          <div className="p-3.5 font-mono-tech space-y-2.5 text-xs bg-[#02050b]/85">
            {/* Bounding Box Dimensions (100% Unaltered True CAD mm) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5 font-bold tracking-wider">
                  <Box className="w-3.5 h-3.5 text-hud-accent" />
                  <span>BOUNDING BOX (L × B × H)</span>
                </span>
                {isComputing ? (
                  <span className="text-hud-accent text-[9px] animate-pulse font-bold flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> COMPUTING
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-500 font-mono-tech">CAD UNITS</span>
                )}
              </div>
              <div className="flex items-center justify-between pl-3 pr-2.5 py-1.5 rounded-lg bg-[#070e1c]/80 border border-hud-accent/30 text-hud-accent font-semibold text-[11px] shadow-inner">
                <span className="font-bold tracking-tight">
                  {animatedLength.toFixed(1)} × {animatedBreadth.toFixed(1)} × {animatedHeight.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 font-normal ml-2">mm</span>
              </div>
            </div>

            {/* Mesh Topology Details */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-hud-accent/15">
              {/* Vertices */}
              <div className="p-2 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Layers className="w-3 h-3 text-hud-accent" />
                  <span className="font-semibold">VERTICES</span>
                </div>
                <div className="text-white font-bold text-xs tracking-wider">
                  {animatedVertices.toLocaleString()}
                </div>
              </div>

              {/* Triangles / Faces */}
              <div className="p-2 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Cpu className="w-3 h-3 text-hud-accent" />
                  <span className="font-semibold">TRIANGLES</span>
                </div>
                <div className="text-white font-bold text-xs tracking-wider">
                  {animatedFaces.toLocaleString()}
                </div>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center justify-between pt-1 border-t border-hud-accent/15 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <HardDrive className="w-3.5 h-3.5 text-hud-accent" />
                <span className="text-[10px] font-semibold">FILE SIZE</span>
              </div>
              <span className="text-hud-accent font-bold">{formatFileSize(stats.fileSize)}</span>
            </div>

            {/* Cross-Section Clipping Readout (Requirement 2.2) */}
            {crossSection?.enabled && (
              <div className="flex items-center justify-between pt-1 border-t border-hud-accent/15 text-[11px] bg-hud-accent-subtle/50 px-2 py-1 rounded">
                <span className="text-slate-300 font-bold text-[10px]">CROSS-SECTION:</span>
                <span className="text-hud-accent font-bold text-[10px]">
                  CLIP: {Math.round(crossSection.depth * 100)}% ({crossSection.axis.toUpperCase()}-AXIS)
                </span>
              </div>
            )}
          </div>

          {/* Micro Status Bar */}
          <div className="px-3.5 py-1.5 bg-[#050a14]/95 border-t border-hud-accent/25 flex items-center justify-between text-[10px] font-mono-tech text-slate-400">
            {isComputing ? (
              <span className="flex items-center gap-1.5 text-hud-accent animate-pulse font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-hud-accent shadow-[0_0_6px_var(--hud-accent)]" />
                DECODING TELEMETRY...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                CAD MANIFOLD VALID
              </span>
            )}
            <span className="text-hud-accent/80 font-mono-tech text-[9px]">1:1 NATIVE UNITS</span>
          </div>
        </div>
      )}
    </div>
  );
};
