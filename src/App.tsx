/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  ViewMode,
  ModelStats,
  HandDetectionState,
  GestureAction,
  ColorMode,
  CrossSectionState,
  ActiveToolMode,
  CADMeasurement,
  CADAnnotation,
  TwoHandState,
  GestureSettings,
} from './types/cad';
import { parseCADFile, createEngineeredCADPreset } from './utils/cadParsers';
import { CadCanvas } from './components/CadCanvas';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { ModelInfoCard } from './components/ModelInfoCard';
import { HandTrackerHUD } from './components/HandTrackerHUD';
import { GestureLegendModal } from './components/GestureLegendModal';
import { MeasurementListCard } from './components/MeasurementListCard';
import { AnnotationListCard } from './components/AnnotationListCard';
import { SensitivityModal } from './components/SensitivityModal';
import { OrbitStatusPanel } from './components/OrbitStatusPanel';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Zap,
  ThumbsDown,
  Scissors,
  Users,
} from 'lucide-react';

export default function App() {
  // Dual Color Mode State (Blue Mode default, Red Mode)
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    return (localStorage.getItem('veera_cadtrack_theme') as ColorMode) || 'blue';
  });

  const toggleColorMode = useCallback(() => {
    setColorMode((prev) => {
      const next = prev === 'blue' ? 'red' : 'blue';
      localStorage.setItem('veera_cadtrack_theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
  }, [colorMode]);

  // CAD Model & Geometry State
  const [modelObject, setModelObject] = useState<THREE.Object3D | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [visualScale, setVisualScale] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('COMPUTING CAD TOPOLOGY & TELEMETRY...');
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Synchronized Camera & Viewport State
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [targetRotationY, setTargetRotationY] = useState<number>(0.6);
  const [targetZoom, setTargetZoom] = useState<number>(140);
  const [pitchX, setPitchX] = useState<number>(0.28);

  // Stored Initial State at Import Time for Reset
  const initialCameraStateRef = useRef<{
    rotationY: number;
    pitchX: number;
    zoom: number;
    viewMode: ViewMode;
  }>({
    rotationY: 0.6,
    pitchX: 0.28,
    zoom: 140,
    viewMode: 'single',
  });

  // Reset Visual Flash State
  const [isResetFlashing, setIsResetFlashing] = useState<boolean>(false);
  const resetAnimationRef = useRef<number | null>(null);

  // Fullscreen State & Minimal Discoverable Hint Management
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullscreenHintVisible, setIsFullscreenHintVisible] = useState<boolean>(false);
  const fullscreenHintTimerRef = useRef<number | null>(null);

  // Visual Appearance State
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [materialTheme, setMaterialTheme] = useState<string>('titanium');

  // TWO HANDS MODE (Section 1 - Opt-in toggle, default OFF)
  const [isTwoHandsMode, setIsTwoHandsMode] = useState<boolean>(() => {
    return localStorage.getItem('veera_cadtrack_two_hands') === 'true';
  });

  const toggleTwoHandsMode = useCallback(() => {
    setIsTwoHandsMode((prev) => {
      const next = !prev;
      localStorage.setItem('veera_cadtrack_two_hands', String(next));
      showToast('info', next ? 'Two Hands Mode Enabled (Tracking 2 hands)' : 'Single Hand Mode Restored');
      return next;
    });
  }, []);

  // CROSS-SECTION / CLIPPING PLANE VIEW (Section 2)
  const [crossSection, setCrossSection] = useState<CrossSectionState>({
    enabled: false,
    axis: 'y',
    depth: 0.5,
  });

  const updateCrossSection = useCallback((update: Partial<CrossSectionState>) => {
    setCrossSection((prev) => ({ ...prev, ...update }));
  }, []);

  // MEASUREMENT & ANNOTATION TOOLS (Section 3)
  const [activeToolMode, setActiveToolMode] = useState<ActiveToolMode>('none');
  const [measurements, setMeasurements] = useState<CADMeasurement[]>([]);
  const [pendingMeasurePoint, setPendingMeasurePoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [annotations, setAnnotations] = useState<CADAnnotation[]>([]);
  const [pinchRaycastTrigger, setPinchRaycastTrigger] = useState<{ x: number; y: number; id: number } | null>(null);
  const [cursorFingertipPos, setCursorFingertipPos] = useState<{ x: number; y: number } | null>(null);

  // GESTURE SENSITIVITY SETTINGS (Section 4.4)
  const [gestureSettings, setGestureSettings] = useState<GestureSettings>({
    holdDurationMs: 300,
    rotationMultiplier: 1.0,
    zoomMultiplier: 1.0,
    elevationMultiplier: 1.0,
  });
  const [showSensitivityModal, setShowSensitivityModal] = useState<boolean>(false);

  // Hand Tracker Hardware & Modals
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(true);
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [showLegendModal, setShowLegendModal] = useState<boolean>(false);

  // Drag and Drop State
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Baseline reference for hand distance zoom
  const baselineHandSizeRef = useRef<number | null>(null);

  // Show gesture legend on first visit
  useEffect(() => {
    const hasSeenLegend = localStorage.getItem('veera_cadtrack_legend_v2');
    if (!hasSeenLegend) {
      setShowLegendModal(true);
      localStorage.setItem('veera_cadtrack_legend_v2', 'true');
    }
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => {
      setStatusNotification((prev) => (prev?.message === message ? null : prev));
    }, 3800);
  }, []);

  // Sync native browser fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (isNowFullscreen) {
        setIsFullscreenHintVisible(true);
        if (fullscreenHintTimerRef.current) clearTimeout(fullscreenHintTimerRef.current);
        fullscreenHintTimerRef.current = window.setTimeout(() => {
          setIsFullscreenHintVisible(false);
        }, 3500);
      } else {
        setIsFullscreenHintVisible(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Camera & view state refs
  const targetRotationYRef = useRef(targetRotationY);
  const targetZoomRef = useRef(targetZoom);
  const pitchXRef = useRef(pitchX);
  const isFullscreenRef = useRef(isFullscreen);
  const isTwoHandsModeRef = useRef(isTwoHandsMode);
  const crossSectionRef = useRef(crossSection);

  useEffect(() => {
    targetRotationYRef.current = targetRotationY;
  }, [targetRotationY]);
  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);
  useEffect(() => {
    pitchXRef.current = pitchX;
  }, [pitchX]);
  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);
  useEffect(() => {
    isTwoHandsModeRef.current = isTwoHandsMode;
  }, [isTwoHandsMode]);
  useEffect(() => {
    crossSectionRef.current = crossSection;
  }, [crossSection]);

  const triggerActivity = useCallback(() => {
    if (isFullscreenRef.current) {
      setIsFullscreenHintVisible(true);
      if (fullscreenHintTimerRef.current) {
        clearTimeout(fullscreenHintTimerRef.current);
      }
      fullscreenHintTimerRef.current = window.setTimeout(() => {
        setIsFullscreenHintVisible(false);
      }, 3000);
    }
  }, []);

  /**
   * REQUIREMENT 1: AUTO-SCALE NORMALIZATION ON IMPORT
   */
  const normalizeAndFrameModel = useCallback((object: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(object);
    const diagonal = box.min.distanceTo(box.max);

    const targetVisualSize = 75.4;
    const computedScale = targetVisualSize / Math.max(diagonal, 0.001);
    setVisualScale(computedScale);

    const baselineZoom = 140;
    const baselineRotY = 0.6;
    const baselinePitch = 0.28;

    setTargetZoom(baselineZoom);
    setTargetRotationY(baselineRotY);
    setPitchX(baselinePitch);
    setViewMode('single');

    initialCameraStateRef.current = {
      rotationY: baselineRotY,
      pitchX: baselinePitch,
      zoom: baselineZoom,
      viewMode: 'single',
    };
  }, []);

  // Dispose previous model hierarchy and reset session tool state
  const resetSessionModelData = useCallback(() => {
    setMeasurements([]);
    setPendingMeasurePoint(null);
    setAnnotations([]);
    setCrossSection({ enabled: false, axis: 'y', depth: 0.5 });
    setActiveToolMode('none');
  }, []);

  // Load Initial Preset CAD Model (Sun Gear)
  useEffect(() => {
    const initialPreset = createEngineeredCADPreset('planetary_gear');
    setModelObject(initialPreset.object);
    setModelStats(initialPreset.stats);
    normalizeAndFrameModel(initialPreset.object);
  }, [normalizeAndFrameModel]);

  // Preset Selection Handler
  const handleSelectPreset = (presetKey: 'planetary_gear' | 'turbine_impeller' | 'bracket_arm') => {
    setIsLoading(true);
    setLoadingMessage('INITIALIZING CAD PRESET...');
    try {
      resetSessionModelData();
      const preset = createEngineeredCADPreset(presetKey);
      setModelObject(preset.object);
      setModelStats(preset.stats);
      normalizeAndFrameModel(preset.object);
      showToast('success', `Loaded ${preset.stats.fileName}`);
    } catch (err: any) {
      showToast('error', `Failed to load preset: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // File Upload Handler (STL, STEP, OBJ) with Large File Support (Section 4.3)
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    const isLarge = file.size > 20 * 1024 * 1024;
    if (isLarge) {
      setLoadingMessage(`PARSING LARGE CAD DATASET (${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);
    } else {
      setLoadingMessage(`IMPORTING ${file.name.toUpperCase()}...`);
    }

    try {
      showToast('info', `Importing ${file.name}...`);
      // Parse file
      const { object, stats } = await parseCADFile(file);

      // Clean prior model session state cleanly (Section 4.1)
      resetSessionModelData();

      setModelObject(object);
      setModelStats(stats);
      normalizeAndFrameModel(object);
      showToast('success', `Successfully imported ${stats.fileName} (${stats.fileFormat})`);
    } catch (err: any) {
      console.error('CAD file import error:', err);
      showToast('error', err.message || 'Error parsing CAD file. Please verify file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.clientX === 0 || e.clientY === 0) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  // Toolbar Actions
  const handleRotateLeft = (delta: number = 0.15) => {
    setTargetRotationY((prev) => prev - delta * gestureSettings.rotationMultiplier);
    triggerActivity();
  };

  const handleRotateRight = (delta: number = 0.15) => {
    setTargetRotationY((prev) => prev + delta * gestureSettings.rotationMultiplier);
    triggerActivity();
  };

  const handleZoomIn = (delta: number = 10) => {
    setTargetZoom((prev) => Math.max(30, prev - delta * gestureSettings.zoomMultiplier));
    triggerActivity();
  };

  const handleZoomOut = (delta: number = 10) => {
    setTargetZoom((prev) => Math.min(500, prev + delta * gestureSettings.zoomMultiplier));
    triggerActivity();
  };

  // Reset Action (Restores initial framing and resets cross-section clip)
  const handleResetView = useCallback(() => {
    if (resetAnimationRef.current) {
      cancelAnimationFrame(resetAnimationRef.current);
    }

    setIsResetFlashing(true);
    setTimeout(() => {
      setIsResetFlashing(false);
    }, 500);

    setViewMode('single');
    setPendingMeasurePoint(null);
    setActiveToolMode('none');

    // Reset cross-section clip depth back to default 0.5 and disable active cross-section
    setCrossSection({ enabled: false, axis: 'y', depth: 0.5 });

    const startRot = targetRotationYRef.current;
    const startPitch = pitchXRef.current;
    const startZoom = targetZoomRef.current;
    const dest = initialCameraStateRef.current;

    const startTime = performance.now();
    const duration = 500;

    const animateStep = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      setTargetRotationY(startRot + (dest.rotationY - startRot) * ease);
      setPitchX(startPitch + (dest.pitchX - startPitch) * ease);
      setTargetZoom(startZoom + (dest.zoom - startZoom) * ease);

      if (progress < 1) {
        resetAnimationRef.current = requestAnimationFrame(animateStep);
      } else {
        resetAnimationRef.current = null;
      }
    };

    resetAnimationRef.current = requestAnimationFrame(animateStep);
    showToast('info', 'System Reset: Normalized framing restored & clip plane reset');
    triggerActivity();
  }, [showToast, triggerActivity]);

  // Fullscreen Management
  const handleEnterFullscreen = useCallback(() => {
    if (isFullscreenRef.current) return;
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignored
    }
    setIsFullscreen(true);
    showToast('info', 'True Fullscreen Mode Active (Thumbs Up / Button)');
    triggerActivity();
  }, [showToast, triggerActivity]);

  const handleExitFullscreen = useCallback(() => {
    if (!isFullscreenRef.current) return;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignored
    }
    setIsFullscreen(false);
    showToast('info', 'Windowed Telemetry Restored (Thumbs Down / Esc)');
    triggerActivity();
  }, [showToast, triggerActivity]);

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreenRef.current) {
      handleExitFullscreen();
    } else {
      handleEnterFullscreen();
    }
  }, [handleEnterFullscreen, handleExitFullscreen]);

  /**
   * PRIMARY SINGLE HAND GESTURE PROCESSOR
   * (or Hand 1 in Two Hands Mode)
   */
  const handleHandUpdate = useCallback(
    (detection: HandDetectionState) => {
      setIsHandDetected((prev) => (prev !== detection.hasHand ? detection.hasHand : prev));

      if (!detection.hasHand) {
        baselineHandSizeRef.current = null;
        return;
      }

      triggerActivity();

      // OPEN HAND continuous control:
      if (detection.gesture === 'OPEN_HAND') {
        // 1. Azimuth rotation
        if (Math.abs(detection.wristDeltaX) > 0.001) {
          const rotationSpeed = 3.6 * gestureSettings.rotationMultiplier;
          setTargetRotationY((prev) => prev + detection.wristDeltaX * rotationSpeed);
        }

        // 2. Vertical movement:
        // If Cross-Section is active and Two Hands mode is OFF, vertical hand movement controls clipping plane!
        if (crossSectionRef.current.enabled && !isTwoHandsModeRef.current) {
          if (Math.abs(detection.wristDeltaY) > 0.002) {
            // Raising hand (y moves towards 0, deltaY < 0) retracts plane
            // Lowering hand (deltaY > 0) advances cut deeper
            setCrossSection((prev) => {
              const deltaDepth = detection.wristDeltaY * 2.2;
              return {
                ...prev,
                depth: Math.max(0, Math.min(1, prev.depth + deltaDepth)),
              };
            });
          }
        } else {
          // Camera elevation orbit
          if (Math.abs(detection.wristDeltaY) > 0.001) {
            const elevationSpeed = 2.8 * gestureSettings.elevationMultiplier;
            setPitchX((prev) => {
              const nextPitch = prev - detection.wristDeltaY * elevationSpeed;
              return Math.max(-0.15, Math.min(1.45, nextPitch));
            });
          }
        }

        // 3. Zoom via apparent hand size (when Two Hands Mode is OFF)
        if (!isTwoHandsModeRef.current && detection.apparentHandSize > 0.05) {
          if (baselineHandSizeRef.current === null) {
            baselineHandSizeRef.current = detection.apparentHandSize;
          } else {
            const deltaSize = detection.apparentHandSize - baselineHandSizeRef.current;
            if (Math.abs(deltaSize) > 0.005) {
              const zoomSpeed = 220 * gestureSettings.zoomMultiplier;
              setTargetZoom((prev) => Math.max(30, Math.min(500, prev - deltaSize * zoomSpeed)));
              baselineHandSizeRef.current += deltaSize * 0.15;
            }
          }
        }
      } else {
        baselineHandSizeRef.current = null;
      }
    },
    [triggerActivity, gestureSettings]
  );

  /**
   * TWO HANDS MODE GESTURE PROCESSOR (Section 1.2)
   */
  const handleTwoHandUpdate = useCallback(
    (state: TwoHandState) => {
      if (!state.isTwoHandsMode || state.handCount < 2) return;

      // TWO-HAND CROSS-SECTION DEPTH CONTROL (Section 1.2):
      // When both hands are open and level (|y1 - y2| < 0.18) AND Cross-Section is active:
      if (
        crossSectionRef.current.enabled &&
        state.areHandsLevel &&
        state.hand1.gesture === 'OPEN_HAND' &&
        state.hand2.gesture === 'OPEN_HAND'
      ) {
        if (Math.abs(state.handDistanceDelta) > 0.002) {
          // Hands moving closer together (negative delta) -> plane moves deeper
          // Hands moving farther apart (positive delta) -> plane retracts
          setCrossSection((prev) => {
            const delta = -state.handDistanceDelta * 3.5;
            return {
              ...prev,
              depth: Math.max(0, Math.min(1, prev.depth + delta)),
            };
          });
        }
        return;
      }

      // PINCH-AND-SPREAD ZOOM (Section 1.2):
      // Distance between two palm centroids frame-to-frame controls zoom
      if (
        state.hand1.gesture === 'OPEN_HAND' &&
        state.hand2.gesture === 'OPEN_HAND' &&
        Math.abs(state.handDistanceDelta) > 0.002
      ) {
        // Hands moving apart -> zoom in (dolly camera closer)
        // Hands moving together -> zoom out (dolly camera farther)
        const zoomDelta = state.handDistanceDelta * 300 * gestureSettings.zoomMultiplier;
        setTargetZoom((prev) => Math.max(30, Math.min(500, prev - zoomDelta)));
      }
    },
    [gestureSettings]
  );

  // Gesture Discrete Action Dispatcher
  const handleGestureAction = useCallback(
    (action: GestureAction) => {
      triggerActivity();

      switch (action) {
        case 'VIEW_DUAL':
          setViewMode('dual');
          showToast('info', '2-View Layout Activated (2 Fingers)');
          break;
        case 'VIEW_MULTI':
          setViewMode('multi');
          showToast('info', '4-View Layout Activated (4 Fingers)');
          break;
        case 'RESET':
          handleResetView();
          break;
        case 'FULLSCREEN_ENTER':
          handleEnterFullscreen();
          break;
        case 'FULLSCREEN_EXIT':
          handleExitFullscreen();
          break;
      }
    },
    [handleResetView, handleEnterFullscreen, handleExitFullscreen, showToast, triggerActivity]
  );

  // Pinch Trigger handler (for Measure & Annotate)
  const handlePinchTrigger = useCallback((pos: { x: number; y: number }) => {
    setPinchRaycastTrigger({ x: pos.x, y: pos.y, id: Date.now() });
  }, []);

  // Measurement management
  const handleAddMeasurement = useCallback((m: CADMeasurement) => {
    setMeasurements((prev) => [...prev, m]);
    showToast('success', `Recorded ${m.label}: ${m.distanceReal.toFixed(1)} mm`);
  }, [showToast]);

  const handleDeleteMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleClearAllMeasurements = useCallback(() => {
    setMeasurements([]);
    setPendingMeasurePoint(null);
  }, []);

  // Annotation management
  const handleAddAnnotation = useCallback((ann: CADAnnotation) => {
    setAnnotations((prev) => [...prev, ann]);
    showToast('success', `Created pin: "${ann.text}"`);
  }, [showToast]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleUpdateAnnotationText = useCallback((id: string, text: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, text } : a)));
  }, []);

  const handleClearAllAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const handleSnapToAnnotation = useCallback((point: { x: number; y: number; z: number }) => {
    const angle = Math.atan2(point.x, point.z);
    setTargetRotationY(angle);
    setPitchX(0.28);
    setTargetZoom(110);
    showToast('info', 'Camera snapped to annotation pin');
  }, [showToast]);

  // Recalibrate baseline hand size
  const handleRecalibrateBaseline = useCallback(() => {
    baselineHandSizeRef.current = null;
    showToast('info', 'Hand baseline recalibrated at current distance');
  }, [showToast]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#030405] select-none text-slate-100"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerMove={triggerActivity}
    >
      {/* 3D CAD Three.js Rendering Engine Canvas */}
      <CadCanvas
        modelObject={modelObject}
        visualScale={visualScale}
        viewMode={viewMode}
        colorMode={colorMode}
        targetRotationY={targetRotationY}
        setTargetRotationY={setTargetRotationY}
        targetZoom={targetZoom}
        setTargetZoom={setTargetZoom}
        pitchX={pitchX}
        setPitchX={setPitchX}
        wireframe={wireframe}
        materialTheme={materialTheme}
        isResetFlashing={isResetFlashing}
        crossSection={crossSection}
        activeToolMode={activeToolMode}
        measurements={measurements}
        onAddMeasurement={handleAddMeasurement}
        annotations={annotations}
        onAddAnnotation={handleAddAnnotation}
        pendingMeasurePoint={pendingMeasurePoint}
        setPendingMeasurePoint={setPendingMeasurePoint}
        pinchRaycastTrigger={pinchRaycastTrigger}
        cursorFingertipPos={cursorFingertipPos}
      />

      {/* HUD Corner Targeting Reticles */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="hud-corner-bracket top-2.5 left-2.5 border-t-2 border-l-2 border-hud-accent rounded-tl-sm pointer-events-none" />
        <div className="hud-corner-bracket top-2.5 right-2.5 border-t-2 border-r-2 border-hud-accent rounded-tr-sm pointer-events-none" />
        <div className="hud-corner-bracket bottom-2.5 left-2.5 border-b-2 border-l-2 border-hud-accent rounded-bl-sm pointer-events-none" />
        <div className="hud-corner-bracket bottom-2.5 right-2.5 border-b-2 border-r-2 border-hud-accent rounded-br-sm pointer-events-none" />
      </div>

      {/* Top Header */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Header
          viewMode={viewMode}
          colorMode={colorMode}
          onFileUpload={handleFileUpload}
          onSelectPreset={handleSelectPreset}
          currentModelName={modelStats?.fileName || ''}
          isWebcamActive={isWebcamActive}
          isHandDetected={isHandDetected}
          isTwoHandsMode={isTwoHandsMode}
          onToggleTwoHandsMode={toggleTwoHandsMode}
          onOpenSensitivity={() => setShowSensitivityModal(true)}
        />
      </div>

      {/* Top-Right Command Toolbar */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Toolbar
          viewMode={viewMode}
          setViewMode={setViewMode}
          colorMode={colorMode}
          onToggleColorMode={toggleColorMode}
          onRotateLeft={handleRotateLeft}
          onRotateRight={handleRotateRight}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          isResetFlashing={isResetFlashing}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          wireframe={wireframe}
          setWireframe={setWireframe}
          materialTheme={materialTheme}
          setMaterialTheme={setMaterialTheme}
          onOpenLegend={() => setShowLegendModal(true)}
          isTwoHandsMode={isTwoHandsMode}
          onToggleTwoHandsMode={toggleTwoHandsMode}
          crossSection={crossSection}
          onUpdateCrossSection={updateCrossSection}
          activeToolMode={activeToolMode}
          setActiveToolMode={setActiveToolMode}
          onOpenSensitivity={() => setShowSensitivityModal(true)}
        />
      </div>

      {/* Model Info Card (Top-Right, Stacked directly below Toolbar) */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <ModelInfoCard stats={modelStats} colorMode={colorMode} crossSection={crossSection} />
      </div>

      {/* Measurements List HUD Card */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <MeasurementListCard
          measurements={measurements}
          onDeleteMeasurement={handleDeleteMeasurement}
          onClearAll={handleClearAllMeasurements}
          colorMode={colorMode}
        />
      </div>

      {/* Annotations List HUD Card */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <AnnotationListCard
          annotations={annotations}
          onDeleteAnnotation={handleDeleteAnnotation}
          onUpdateAnnotationText={handleUpdateAnnotationText}
          onSnapToAnnotation={handleSnapToAnnotation}
          onClearAll={handleClearAllAnnotations}
          colorMode={colorMode}
          topOffsetRem={measurements.length > 0 ? 25.5 : 20.5}
        />
      </div>

      {/* Vertical Left-Edge HUD Status & Orbit Panel */}
      <OrbitStatusPanel
        azimuthRad={targetRotationY}
        elevationRad={pitchX}
        crossSection={crossSection}
        isTwoHandsMode={isTwoHandsMode}
        colorMode={colorMode}
        isFullscreen={isFullscreen}
      />

      {/* HandTrackerHUD */}
      <div className={`transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <HandTrackerHUD
          onHandUpdate={handleHandUpdate}
          onTwoHandUpdate={handleTwoHandUpdate}
          onGestureAction={handleGestureAction}
          onPinchTrigger={handlePinchTrigger}
          onCursorMove={setCursorFingertipPos}
          isWebcamActive={isWebcamActive}
          setIsWebcamActive={setIsWebcamActive}
          colorMode={colorMode}
          isTwoHandsMode={isTwoHandsMode}
          isCrossSectionActive={crossSection.enabled}
          activeToolMode={activeToolMode}
          gestureSettings={gestureSettings}
        />
      </div>

      {/* Minimal Auto-Fading Exit Hint in True Fullscreen Mode */}
      {isFullscreen && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-500 ${
            isFullscreenHintVisible ? 'opacity-60' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 border border-white/20 text-[11px] font-mono-tech text-slate-300 tracking-wider backdrop-blur-md shadow-2xl">
            <ThumbsDown className="w-3.5 h-3.5 text-hud-accent" />
            <span>THUMBS DOWN OR ESC TO EXIT FULLSCREEN</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Full-Screen Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#02050b]/85 backdrop-blur-md border-4 border-dashed border-hud-accent animate-in fade-in duration-200">
          <UploadCloud className="w-16 h-16 text-hud-accent animate-bounce mb-4" />
          <h2 className="text-xl font-heading-tech font-bold text-white tracking-widest uppercase">
            DROP CAD FILE TO INSPECT
          </h2>
          <p className="text-xs font-mono-tech text-hud-accent mt-2">
            SUPPORTS STL, STEP (.STEP / .STP), AND OBJ
          </p>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border-4 border-hud-accent/20 border-t-hud-accent animate-spin mb-3 shadow-[0_0_20px_var(--hud-accent-glow)]" />
          <span className="font-mono-tech text-xs text-hud-accent tracking-wider animate-pulse">
            {loadingMessage}
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {statusNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-xl glass-panel-glow text-xs font-mono-tech shadow-2xl border border-hud-accent/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {statusNotification.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {statusNotification.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          {statusNotification.type === 'info' && (
            <Zap className="w-3.5 h-3.5 text-hud-accent animate-pulse shrink-0" />
          )}
          <span className="text-slate-100 font-semibold">{statusNotification.message}</span>
        </div>
      )}

      {/* Gesture Legend Modal */}
      <GestureLegendModal
        isOpen={showLegendModal}
        onClose={() => setShowLegendModal(false)}
        colorMode={colorMode}
      />

      {/* Gesture Sensitivity & Recalibration Settings Modal */}
      <SensitivityModal
        isOpen={showSensitivityModal}
        onClose={() => setShowSensitivityModal(false)}
        settings={gestureSettings}
        onUpdateSettings={(newSettings) => setGestureSettings((prev) => ({ ...prev, ...newSettings }))}
        onRecalibrateBaseline={handleRecalibrateBaseline}
        colorMode={colorMode}
      />
    </div>
  );
}
