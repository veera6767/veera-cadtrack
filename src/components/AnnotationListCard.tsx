import React, { useState } from 'react';
import { MapPin, Trash2, Edit2, Check, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { CADAnnotation, ColorMode } from '../types/cad';

interface AnnotationListCardProps {
  annotations: CADAnnotation[];
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotationText: (id: string, text: string) => void;
  onSnapToAnnotation: (point: { x: number; y: number; z: number }) => void;
  onClearAll: () => void;
  colorMode?: ColorMode;
  topOffsetRem?: number;
}

export const AnnotationListCard: React.FC<AnnotationListCardProps> = ({
  annotations,
  onDeleteAnnotation,
  onUpdateAnnotationText,
  onSnapToAnnotation,
  onClearAll,
  colorMode = 'blue',
  topOffsetRem = 20.5,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  if (annotations.length === 0) return null;

  const startEdit = (ann: CADAnnotation) => {
    setEditingId(ann.id);
    setEditText(ann.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      onUpdateAnnotationText(id, editText.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      style={{ top: `${topOffsetRem}rem` }}
      className="fixed right-5 z-30 select-none animate-in fade-in slide-in-from-top-3 duration-300 pointer-events-auto"
    >
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel-glow text-xs font-mono-tech text-hud-accent hover:text-white transition-all cursor-pointer shadow-xl border border-hud-accent"
          title="Expand Annotations"
        >
          <MapPin className="w-3.5 h-3.5 text-hud-accent" />
          <span className="font-semibold text-slate-200">NOTES ({annotations.length})</span>
          <ChevronDown className="w-3 h-3 text-hud-accent" />
        </button>
      ) : (
        <div className="w-[320px] glass-panel-glow rounded-xl overflow-hidden border border-hud-accent shadow-2xl backdrop-blur-xl relative">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#050a14]/90 border-b border-hud-accent/25 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-hud-accent" />
              <span className="font-heading-tech font-bold tracking-wider text-slate-100">
                ANNOTATIONS
              </span>
              <span className="text-[10px] font-mono-tech px-1.5 py-0.2 rounded bg-hud-accent text-slate-950 font-bold">
                {annotations.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={onClearAll}
                className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-mono-tech transition-colors cursor-pointer"
                title="Clear All Annotations"
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
            {annotations.map((ann, idx) => (
              <div
                key={ann.id}
                className="p-2 rounded-lg bg-[#070e1c]/80 border border-hud-accent/20 hover:border-hud-accent/50 transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.2 rounded bg-hud-accent/15 text-hud-accent text-[9px] font-bold border border-hud-accent/30">
                    PIN #{idx + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSnapToAnnotation(ann.point)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
                      title="Snap Camera to Pin"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {editingId !== ann.id && (
                      <button
                        onClick={() => startEdit(ann)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
                        title="Edit Text"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteAnnotation(ann.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Pin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === ann.id ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(ann.id)}
                      className="flex-1 px-2 py-0.5 rounded bg-black/60 border border-hud-accent text-slate-100 text-xs font-mono-tech outline-none focus:ring-1 focus:ring-hud-accent"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEdit(ann.id)}
                      className="p-1 rounded bg-hud-accent text-slate-950 font-bold hover:opacity-90 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-slate-200 font-semibold text-[11px] leading-tight break-words">
                    {ann.text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
