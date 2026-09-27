import React, { useState } from 'react';
import { Ruler, Trash2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { CADMeasurement, ColorMode } from '../types/cad';

interface MeasurementListCardProps {
  measurements: CADMeasurement[];
  onDeleteMeasurement: (id: string) => void;
  onClearAll: () => void;
  colorMode?: ColorMode;
}

export const MeasurementListCard: React.FC<MeasurementListCardProps> = ({
  measurements,
  onDeleteMeasurement,
  onClearAll,
  colorMode = 'blue',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (measurements.length === 0) return null;

  return (
    <div className="fixed top-[20.5rem] right-5 z-30 select-none animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto">
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel-glow text-xs font-mono-tech text-hud-accent hover:text-white transition-all cursor-pointer shadow-xl border border-hud-accent"
          title="Expand Measurements"
        >
          <Ruler className="w-3.5 h-3.5 text-hud-accent" />
          <span className="font-semibold text-slate-200">MEASURES ({measurements.length})</span>
          <ChevronDown className="w-3 h-3 text-hud-accent" />
        </button>
      ) : (
        <div className="w-[320px] glass-panel-glow rounded-xl overflow-hidden border border-hud-accent shadow-2xl backdrop-blur-xl relative">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#050a14]/90 border-b border-hud-accent/25 text-xs">
            <div className="flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5 text-hud-accent" />
              <span className="font-heading-tech font-bold tracking-wider text-slate-100">
                ACTIVE MEASUREMENTS
              </span>
              <span className="text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-hud-accent text-slate-950 font-bold">
                {measurements.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onClearAll}
                className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-mono-tech transition-colors cursor-pointer"
                title="Clear All Measurements"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto font-mono-tech text-xs bg-[#02050b]/85">
            {measurements.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20 hover:border-hud-accent/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.2 rounded bg-hud-accent/15 text-hud-accent text-[10px] font-bold border border-hud-accent/30">
                    {m.label}
                  </span>
                  <span className="text-slate-200 font-bold text-[11px]">
                    {m.distanceReal.toFixed(2)} mm
                  </span>
                </div>
                <button
                  onClick={() => onDeleteMeasurement(m.id)}
                  className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Measurement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
