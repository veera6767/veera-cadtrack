import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Minimize2, AlertTriangle, RefreshCw, Zap, Users, Gauge } from 'lucide-react';
import { GestureDetector, HAND_CONNECTIONS, Landmark } from '../utils/gestureDetector';
import { HandDetectionState, GestureType, GestureAction, ColorMode, TwoHandState, ActiveToolMode, GestureSettings } from '../types/cad';

interface HandTrackerHUDProps {
  onHandUpdate: (detection: HandDetectionState) => void;
  onTwoHandUpdate?: (twoHandState: TwoHandState) => void;
  onGestureAction: (action: GestureAction) => void;
  onPinchTrigger?: (pos: { x: number; y: number }) => void;
  onCursorMove?: (pos: { x: number; y: number } | null) => void;
  isWebcamActive: boolean;
  setIsWebcamActive: (active: boolean) => void;
  colorMode?: ColorMode;
  isTwoHandsMode?: boolean;
  isCrossSectionActive?: boolean;
  activeToolMode?: ActiveToolMode;
  gestureSettings?: GestureSettings;
}

export const HandTrackerHUD: React.FC<HandTrackerHUDProps> = ({
  onHandUpdate,
  onTwoHandUpdate,
  onGestureAction,
  onPinchTrigger,
  onCursorMove,
  isWebcamActive,
  setIsWebcamActive,
  colorMode = 'blue',
  isTwoHandsMode = false,
  isCrossSectionActive = false,
  activeToolMode = 'none',
  gestureSettings,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<GestureDetector>(new GestureDetector());

  // Shared single stream reference (held across entire session)
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stable references for parent callbacks
  const onHandUpdateRef = useRef(onHandUpdate);
  const onTwoHandUpdateRef = useRef(onTwoHandUpdate);
  const onGestureActionRef = useRef(onGestureAction);
  const onPinchTriggerRef = useRef(onPinchTrigger);
  const onCursorMoveRef = useRef(onCursorMove);
  const setIsWebcamActiveRef = useRef(setIsWebcamActive);
  const colorModeRef = useRef(colorMode);
  const isTwoHandsModeRef = useRef(isTwoHandsMode);
  const isCrossSectionActiveRef = useRef(isCrossSectionActive);

  useEffect(() => {
    onHandUpdateRef.current = onHandUpdate;
  }, [onHandUpdate]);
  useEffect(() => {
    onTwoHandUpdateRef.current = onTwoHandUpdate;
  }, [onTwoHandUpdate]);
  useEffect(() => {
    onGestureActionRef.current = onGestureAction;
  }, [onGestureAction]);
  useEffect(() => {
    onPinchTriggerRef.current = onPinchTrigger;
  }, [onPinchTrigger]);
  useEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);
  useEffect(() => {
    setIsWebcamActiveRef.current = setIsWebcamActive;
  }, [setIsWebcamActive]);
  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);
  useEffect(() => {
    isTwoHandsModeRef.current = isTwoHandsMode;
    if (handsInstanceRef.current) {
      try {
        handsInstanceRef.current.setOptions({
          maxNumHands: isTwoHandsMode ? 2 : 1,
        });
      } catch (e) {
        console.warn('Failed to update maxNumHands:', e);
      }
    }
  }, [isTwoHandsMode]);
  useEffect(() => {
    isCrossSectionActiveRef.current = isCrossSectionActive;
  }, [isCrossSectionActive]);
  useEffect(() => {
    if (gestureSettings) {
      detectorRef.current.updateSettings(gestureSettings);
    }
  }, [gestureSettings]);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
  const [fingerCount, setFingerCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [twoHandState, setTwoHandState] = useState<TwoHandState | null>(null);

  // References to keep inference loop decoupled and robust
  const handsInstanceRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isWebcamActiveRef = useRef<boolean>(isWebcamActive);
  const frameSkipCounterRef = useRef<number>(0);

  useEffect(() => {
    isWebcamActiveRef.current = isWebcamActive;
  }, [isWebcamActive]);

  // Initialize MediaPipe Hands ONCE per component mount
  const initMediaPipe = useCallback(async () => {
    if (handsInstanceRef.current) return;

    try {
      let HandsConstructor = (window as any).Hands;
      if (!HandsConstructor) {
        try {
          const mp = await import('@mediapipe/hands');
          HandsConstructor = mp.Hands || (mp as any).default?.Hands;
        } catch {
          console.warn('Could not import @mediapipe/hands dynamically, checking window...');
        }
      }

      if (!HandsConstructor) {
        console.warn('MediaPipe Hands script still loading from CDN...');
        return;
      }

      const hands = new HandsConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: isTwoHandsModeRef.current ? 2 : 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        isProcessingRef.current = false;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const multiHandLandmarks: Landmark[][] = results.multiHandLandmarks || [];
        const handednesses: any[] = results.multiHandedness || [];

        // Draw skeletons for detected hands
        const isRed = colorModeRef.current === 'red';
        const primaryColor = isRed ? '#ff2e43' : '#00e5ff';
        const primaryHighlight = isRed ? '#ff5768' : '#38bdf8';
        // Distinct secondary hand color (violet)
        const secondaryColor = '#c084fc';
        const secondaryHighlight = '#e9d5ff';

        multiHandLandmarks.forEach((landmarks, handIdx) => {
          const isPrimary = handIdx === 0;
          const strokeCol = isPrimary ? primaryColor : secondaryColor;
          const jointCol = isPrimary ? primaryHighlight : secondaryHighlight;

          ctx.save();
          ctx.lineWidth = 2;
          ctx.strokeStyle = strokeCol;
          ctx.shadowColor = strokeCol;
          ctx.shadowBlur = 8;

          for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
            const p1 = landmarks[startIdx];
            const p2 = landmarks[endIdx];
            if (p1 && p2) {
              ctx.beginPath();
              // Mirrored drawing: 1 - x
              ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
              ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }
          }

          // Draw joints / landmarks
          for (let i = 0; i < landmarks.length; i++) {
            const p = landmarks[i];
            const px = (1 - p.x) * canvas.width;
            const py = p.y * canvas.height;

            ctx.beginPath();
            ctx.arc(px, py, i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? 4.5 : 3, 0, Math.PI * 2);

            if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
              ctx.fillStyle = '#ffffff';
              ctx.shadowColor = strokeCol;
              ctx.shadowBlur = 10;
            } else if (i === 0) {
              ctx.fillStyle = strokeCol;
              ctx.shadowColor = strokeCol;
              ctx.shadowBlur = 8;
            } else {
              ctx.fillStyle = jointCol;
              ctx.shadowColor = strokeCol;
              ctx.shadowBlur = 4;
            }
            ctx.fill();
          }

          // Hand label tag on wrist
          const wrist = landmarks[0];
          if (wrist) {
            const wx = (1 - wrist.x) * canvas.width;
            const wy = wrist.y * canvas.height;
            ctx.font = '9px monospace';
            ctx.fillStyle = strokeCol;
            ctx.fillText(isPrimary ? 'H1 (PRI)' : 'H2 (SEC)', wx - 18, wy + 14);
          }

          ctx.restore();
        });

        // Process landmarks with multi-hand gesture classifier
        const result = detectorRef.current.processMultiHandLandmarks(
          multiHandLandmarks.length > 0 ? multiHandLandmarks : null,
          handednesses.map((h: any) => ({ label: h.label })),
          isTwoHandsModeRef.current,
          isCrossSectionActiveRef.current
        );

        const primaryHandState = result.twoHandState.hand1;

        // Update local HUD telemetry state
        setCurrentGesture(primaryHandState.gesture);
        setFingerCount(primaryHandState.fingerCount);
        setFps(primaryHandState.fps);
        setHoldProgress(
          primaryHandState.holdProgress > 0
            ? primaryHandState.holdProgress
            : primaryHandState.pinchProgress || 0
        );
        setTwoHandState(result.twoHandState);

        // Notify parent CAD controller
        onHandUpdateRef.current(primaryHandState);

        if (onTwoHandUpdateRef.current) {
          onTwoHandUpdateRef.current(result.twoHandState);
        }

        if (result.triggeredAction) {
          if (result.triggeredAction === 'PINCH_TRIGGER' && onPinchTriggerRef.current) {
            if (result.pinchTriggerPos) {
              onPinchTriggerRef.current(result.pinchTriggerPos);
            }
          } else {
            onGestureActionRef.current(result.triggeredAction);
          }
        }

        // Notify tracked cursor position (primary index fingertip)
        if (onCursorMoveRef.current) {
          if (primaryHandState.hasHand && primaryHandState.rawLandmarks && primaryHandState.rawLandmarks[8]) {
            const indexTip = primaryHandState.rawLandmarks[8];
            onCursorMoveRef.current({ x: 1 - indexTip.x, y: indexTip.y });
          } else {
            onCursorMoveRef.current(null);
          }
        }
      });

      handsInstanceRef.current = hands;
      setIsReady(true);
    } catch (err: any) {
      console.warn('MediaPipe Hands engine initialization notice:', err);
    }
  }, []);

  // Start single shared webcam stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setIsPermissionDenied(false);

      if (mediaStreamRef.current) {
        const existingTrack = mediaStreamRef.current.getVideoTracks()[0];
        if (existingTrack && existingTrack.readyState === 'live') {
          if (videoRef.current && videoRef.current.srcObject !== mediaStreamRef.current) {
            videoRef.current.srcObject = mediaStreamRef.current;
            await videoRef.current.play().catch(() => {});
          }
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn('Webcam video track ended.');
          setCameraError('Webcam disconnected or video track closed by operating system.');
          setIsPermissionDenied(false);
          mediaStreamRef.current = null;
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((playErr) => {
          console.warn('video.play() notice:', playErr);
        });
      }
    } catch (err: any) {
      console.warn('getUserMedia error caught:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        setCameraError('Webcam access denied. Camera permission was rejected in browser settings.');
        isWebcamActiveRef.current = false;
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setIsPermissionDenied(false);
        setCameraError('No video camera device detected. Connect a webcam or use manual toolbar.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setIsPermissionDenied(false);
        setCameraError('Webcam hardware is currently in use by another application.');
      } else {
        setIsPermissionDenied(false);
        setCameraError(`Camera connection issue: ${err.message || 'Unable to start video source'}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    detectorRef.current.reset();
    setCurrentGesture('NONE');
    setFingerCount(0);
    setFps(0);
    setHoldProgress(0);
    setTwoHandState(null);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (isWebcamActive) {
      initMediaPipe().then(() => {
        if (!isCancelled) {
          startCamera();
        }
      });
    } else {
      stopCamera();
    }

    return () => {
      isCancelled = true;
      if (!isWebcamActiveRef.current) {
        stopCamera();
      }
    };
  }, [isWebcamActive, initMediaPipe, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Keep a ref to twoHandState so inference loop doesn't re-trigger every frame
  const twoHandStateRef = useRef<TwoHandState | null>(twoHandState);
  useEffect(() => {
    twoHandStateRef.current = twoHandState;
  }, [twoHandState]);

  // Inference loop with FPS budget guard auto-frame-skipping
  useEffect(() => {
    let active = true;

    const runInferenceLoop = async () => {
      if (!active) return;

      if (
        isWebcamActiveRef.current &&
        handsInstanceRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !isProcessingRef.current
      ) {
        // Latency budget guard: If FPS is low, skip every other frame to maintain responsiveness
        if (twoHandStateRef.current?.isLowFps) {
          frameSkipCounterRef.current++;
          if (frameSkipCounterRef.current % 2 !== 0) {
            animationFrameRef.current = requestAnimationFrame(runInferenceLoop);
            return;
          }
        }

        try {
          isProcessingRef.current = true;
          await handsInstanceRef.current.send({ image: videoRef.current });
        } catch (inferenceErr) {
          console.warn('Frame detection skipped:', inferenceErr);
        } finally {
          isProcessingRef.current = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(runInferenceLoop);
    };

    if (isWebcamActive && isReady) {
      animationFrameRef.current = requestAnimationFrame(runInferenceLoop);
    }

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isWebcamActive, isReady]);

  const isRed = colorMode === 'red';
  const warnTextColor = isRed ? 'text-amber-400' : 'text-red-400';
  const warnBorderColor = isRed ? 'border-amber-400/50' : 'border-red-500/50';
  const warnBgColor = isRed ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none pointer-events-auto">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg glass-panel-glow text-xs font-mono-tech text-hud-accent hover:text-white transition-all cursor-pointer shadow-xl border border-hud-accent"
          title="Expand Hand Tracking HUD"
        >
          <Camera className="w-4 h-4 text-hud-accent animate-pulse" />
          <span>GESTURE HUD</span>
          {isTwoHandsMode && (
            <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[9px] font-bold">
              2-HANDS
            </span>
          )}
          <span className="w-2 h-2 rounded-full bg-hud-accent shadow-[0_0_8px_var(--hud-accent)]" />
        </button>
      ) : (
        <div className="w-[320px] glass-panel-glow rounded-xl overflow-hidden border border-hud-accent shadow-2xl backdrop-blur-xl relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--hud-accent)] to-transparent animate-pulse pointer-events-none" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#050a14]/90 border-b border-hud-accent/25 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                  isWebcamActive && !cameraError
                    ? 'bg-hud-accent text-hud-accent animate-ping'
                    : isRed
                    ? 'bg-amber-400 text-amber-400'
                    : 'bg-red-500 text-red-500'
                }`}
              />
              <span className="font-heading-tech font-bold tracking-wider text-slate-100">
                GESTURE TELEMETRY
              </span>

              {/* Hand count badge */}
              {isTwoHandsMode && isWebcamActive && (
                <span className="flex items-center gap-1 text-[10px] font-mono-tech px-1.5 py-0.5 rounded border border-purple-400/40 bg-purple-500/15 text-purple-300 font-bold">
                  <Users className="w-3 h-3 text-purple-400" />
                  {twoHandState ? `${twoHandState.handCount}/2` : '0/2'}
                </span>
              )}

              {isWebcamActive && fps > 0 && (
                <span
                  className={`text-[10px] font-mono-tech px-1.5 py-0.5 rounded border font-bold ${
                    fps < 15
                      ? `${warnTextColor} ${warnBorderColor} ${warnBgColor}`
                      : 'text-hud-accent bg-hud-accent-subtle border-hud-accent/30'
                  }`}
                >
                  {fps} FPS
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsWebcamActive(!isWebcamActive)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
                title={isWebcamActive ? 'Disable Camera' : 'Enable Camera'}
              >
                {isWebcamActive ? <Camera className="w-3.5 h-3.5 text-hud-accent" /> : <CameraOff className="w-3.5 h-3.5 text-slate-500" />}
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-hud-accent transition-colors cursor-pointer"
                title="Minimize HUD"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Camera Error Message Display */}
          {cameraError ? (
            <div className={`p-4 bg-[#03060c]/95 text-xs space-y-3 ${warnBgColor} border-b ${warnBorderColor}`}>
              <div className={`flex items-start gap-2 ${warnTextColor}`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-mono-tech leading-relaxed font-semibold">{cameraError}</p>
              </div>

              <button
                onClick={() => {
                  setCameraError(null);
                  setIsPermissionDenied(false);
                  setIsWebcamActive(true);
                  startCamera();
                }}
                className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded ${warnBgColor} border ${warnBorderColor} ${warnTextColor} font-mono-tech text-xs transition-colors cursor-pointer`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isPermissionDenied ? 'Retry Webcam Access' : 'Reconnect Camera'}</span>
              </button>
            </div>
          ) : (
            <div className="relative w-full h-[180px] bg-[#020306] overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover -scale-x-100 filter contrast-125 brightness-75 transition-opacity duration-300 ${
                  isWebcamActive ? 'opacity-60' : 'opacity-0'
                }`}
              />

              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-hud-accent" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-hud-accent" />
              </div>

              {!isWebcamActive && (
                <div className="flex flex-col items-center gap-2 text-slate-500 z-10">
                  <CameraOff className={`w-8 h-8 opacity-60 ${warnTextColor}`} />
                  <span className={`text-xs font-mono-tech font-bold ${warnTextColor}`}>Webcam Offline</span>
                  <button
                    onClick={() => setIsWebcamActive(true)}
                    className="px-3 py-1 rounded bg-hud-accent-subtle border border-hud-accent/50 text-hud-accent text-xs font-mono-tech hover:bg-hud-accent/25 transition-colors shadow-sm cursor-pointer"
                  >
                    Start Tracking
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Performance budget guard warning badge */}
          {twoHandState?.isLowFps && isWebcamActive && !cameraError && (
            <div className="px-3 py-1 bg-amber-500/15 border-t border-amber-400/40 text-[10px] font-mono-tech text-amber-300 flex items-center gap-1.5">
              <Gauge className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Reduced tracking quality — low performance detected</span>
            </div>
          )}

          {/* Real-time Gesture State Footer */}
          {isWebcamActive && !cameraError && (
            <div className="p-2.5 bg-[#050a14]/95 border-t border-hud-accent/25 font-mono-tech space-y-2">
              {/* Single hand or Hand 1 status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px] tracking-wider">
                  {isTwoHandsMode ? 'HAND 1 (PRI):' : 'DETECTED:'}
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] transition-all truncate max-w-[210px] ${
                    currentGesture === 'OPEN_HAND' ||
                    currentGesture === 'TWO_FINGERS' ||
                    currentGesture === 'FOUR_FINGERS' ||
                    currentGesture === 'CLOSED_FIST' ||
                    currentGesture === 'THUMBS_UP' ||
                    currentGesture === 'THUMBS_DOWN' ||
                    currentGesture === 'PINCH'
                      ? 'bg-hud-accent text-slate-950 font-bold shadow-[0_0_12px_var(--hud-accent-glow)]'
                      : 'bg-[#0a1220] text-slate-400 border border-slate-800'
                  }`}
                >
                  {currentGesture === 'OPEN_HAND' && 'OPEN HAND (ORBIT/ELEVATE)'}
                  {currentGesture === 'TWO_FINGERS' && '2 FINGERS (2-VIEW)'}
                  {currentGesture === 'FOUR_FINGERS' && '4 FINGERS (4-VIEW)'}
                  {currentGesture === 'CLOSED_FIST' && 'CLOSED FIST (RESET)'}
                  {currentGesture === 'THUMBS_UP' && 'THUMBS UP (FULLSCREEN)'}
                  {currentGesture === 'THUMBS_DOWN' && 'THUMBS DOWN (EXIT FS)'}
                  {currentGesture === 'PINCH' && 'PINCH (PLACE POINT)'}
                  {currentGesture === 'AMBIGUOUS' && 'SEARCHING POSE'}
                  {currentGesture === 'NONE' && 'NO HAND DETECTED'}
                </span>
              </div>

              {/* Two Hands Mode Hand 2 Status & Hint */}
              {isTwoHandsMode && (
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 text-[10px] tracking-wider">HAND 2 (SEC):</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] transition-all truncate max-w-[210px] ${
                        twoHandState?.hand2.hasHand
                          ? 'bg-purple-500/20 text-purple-200 border border-purple-400/50'
                          : 'bg-[#0a1220] text-slate-500 border border-slate-800'
                      }`}
                    >
                      {twoHandState?.hand2.hasHand
                        ? `${twoHandState.hand2.gesture} (${twoHandState.hand2Role})`
                        : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Hint if second hand not in frame */}
                  {twoHandState?.handCount === 1 && (
                    <div className="text-[9px] text-purple-300/80 italic flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-purple-400" />
                      <span>Show second hand for dual-hand controls</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hold-to-confirm / Pinch progress indicator */}
              {holdProgress > 0 && holdProgress < 1 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-hud-accent">
                    <span className="flex items-center gap-1 font-bold">
                      <Zap className="w-2.5 h-2.5 animate-pulse" />
                      CONFIRMING GESTURE...
                    </span>
                    <span>{Math.round(holdProgress * 100)}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-hud-accent/30">
                    <div
                      className="h-full bg-hud-accent shadow-[0_0_8px_var(--hud-accent)] transition-all duration-75"
                      style={{ width: `${holdProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Extended Fingers indicators */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                <span>FINGERS EXTENDED:</span>
                <span className="text-hud-accent font-bold">{fingerCount} / 5</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
