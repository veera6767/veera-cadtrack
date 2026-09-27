import {
  GestureType,
  HandDetectionState,
  GestureAction,
  TwoHandState,
  GestureSettings,
} from '../types/cad';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe 21 landmark connections for drawing skeleton
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17]
];

export interface ProcessedGestureResult {
  twoHandState: TwoHandState;
  triggeredAction: GestureAction | null;
  pinchTriggerPos: { x: number; y: number } | null;
}

export class GestureDetector {
  // Settings
  private settings: GestureSettings = {
    holdDurationMs: 300,
    rotationMultiplier: 1.0,
    zoomMultiplier: 1.0,
    elevationMultiplier: 1.0,
  };

  // Hand 1 tracking state
  private prevWrist1X: number | null = null;
  private prevWrist1Y: number | null = null;
  private prevHand1Size: number | null = null;
  private candidate1Gesture: GestureType = 'NONE';
  private candidate1StartTime: number = 0;
  private lastFiredDiscrete1: GestureType = 'NONE';

  // Hand 2 tracking state
  private prevWrist2X: number | null = null;
  private prevWrist2Y: number | null = null;
  private candidate2Gesture: GestureType = 'NONE';
  private candidate2StartTime: number = 0;
  private lastFiredDiscrete2: GestureType = 'NONE';

  // Two-hand distance tracking
  private prevHandDistance: number | null = null;

  // Pinch gesture tracking
  private isPinchActive: boolean = false;
  private pinchStartTime: number = 0;
  private lastFiredPinch: boolean = false;

  // FPS calculation and performance guard
  private lastFpsTime: number = performance.now();
  private frameCount: number = 0;
  private currentFps: number = 30;
  private lowFpsStartTime: number | null = null;
  private isLowFpsWarning: boolean = false;

  public updateSettings(newSettings: Partial<GestureSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): GestureSettings {
    return { ...this.settings };
  }

  public processMultiHandLandmarks(
    landmarksList: Landmark[][] | null | undefined,
    handednesses?: Array<{ label: 'Left' | 'Right' }>,
    isTwoHandsMode: boolean = false,
    isCrossSectionActive: boolean = false
  ): ProcessedGestureResult {
    const now = performance.now();

    // 1. Calculate FPS
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;

      // Latency Guard: monitor FPS drops below 15 for > 2 seconds
      if (this.currentFps < 15) {
        if (!this.lowFpsStartTime) {
          this.lowFpsStartTime = now;
        } else if (now - this.lowFpsStartTime > 2000) {
          this.isLowFpsWarning = true;
        }
      } else {
        this.lowFpsStartTime = null;
        if (this.currentFps >= 18) {
          this.isLowFpsWarning = false;
        }
      }
    }

    const hasAnyHands = !!landmarksList && landmarksList.length > 0;

    if (!hasAnyHands) {
      this.reset();
      const emptyHandState = this.createEmptyHandState();
      return {
        twoHandState: {
          isTwoHandsMode,
          handCount: 0,
          hand1: emptyHandState,
          hand2: emptyHandState,
          handDistance: 0,
          handDistanceDelta: 0,
          areHandsLevel: false,
          hand1Role: 'Primary (Awaiting hand)',
          hand2Role: 'Secondary (Awaiting hand)',
          hint: isTwoHandsMode ? 'Show hands for dual-hand controls' : undefined,
          isLowFps: this.isLowFpsWarning,
        },
        triggeredAction: null,
        pinchTriggerPos: null,
      };
    }

    // Hand 1 (primary)
    const landmarks1 = landmarksList[0];
    const handedness1 = handednesses?.[0]?.label || 'Right';
    const hand1Processed = this.analyzeSingleHand(
      landmarks1,
      handedness1,
      1,
      now
    );

    let triggeredAction: GestureAction | null = null;
    let pinchTriggerPos: { x: number; y: number } | null = null;

    // Check pinch gesture on primary hand (for Measure / Annotate modes)
    const pinchResult = this.checkPinch(landmarks1, now);
    hand1Processed.state.isPinching = pinchResult.isPinching;
    hand1Processed.state.pinchProgress = pinchResult.pinchProgress;
    hand1Processed.state.pinchScreenPos = pinchResult.screenPos;

    if (pinchResult.triggered) {
      triggeredAction = 'PINCH_TRIGGER';
      pinchTriggerPos = pinchResult.screenPos;
    }

    // Check discrete gestures on Hand 1 (when single-hand mode OR when only 1 hand visible in two-hands mode)
    const handCount = isTwoHandsMode ? Math.min(2, landmarksList.length) : 1;

    if (!isTwoHandsMode || handCount === 1) {
      if (hand1Processed.triggeredAction && !triggeredAction) {
        triggeredAction = hand1Processed.triggeredAction;
      }
    }

    // If Two Hands Mode is OFF or only 1 hand detected:
    if (!isTwoHandsMode || handCount === 1) {
      this.prevWrist2X = null;
      this.prevWrist2Y = null;
      this.prevHandDistance = null;
      this.candidate2Gesture = 'NONE';
      this.lastFiredDiscrete2 = 'NONE';

      return {
        twoHandState: {
          isTwoHandsMode,
          handCount: 1,
          hand1: hand1Processed.state,
          hand2: this.createEmptyHandState(),
          handDistance: 0,
          handDistanceDelta: 0,
          areHandsLevel: false,
          hand1Role: 'Primary Orbit / Elevate / Zoom',
          hand2Role: 'Secondary (Offline)',
          hint: isTwoHandsMode ? 'Show second hand for dual-hand controls' : undefined,
          isLowFps: this.isLowFpsWarning,
        },
        triggeredAction,
        pinchTriggerPos,
      };
    }

    // Two Hands Mode with 2 hands visible:
    const landmarks2 = landmarksList[1];
    const handedness2 = handednesses?.[1]?.label || 'Left';
    const hand2Processed = this.analyzeSingleHand(
      landmarks2,
      handedness2,
      2,
      now
    );

    // Centroids
    const c1 = this.calculateCentroid(landmarks1);
    const c2 = this.calculateCentroid(landmarks2);

    // Distance between hands in 3D landmark coordinates
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const dz = c1.z - c2.z;
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let handDistanceDelta = 0;
    if (this.prevHandDistance !== null) {
      handDistanceDelta = currentDistance - this.prevHandDistance;
    }
    this.prevHandDistance = currentDistance;

    // Check if hands are roughly level: |y1 - y2| < 0.18
    const areHandsLevel = Math.abs(c1.y - c2.y) < 0.18;

    // DUAL-HAND ROTATE + ACTION SPLIT:
    // Hand 1 (primary) drives orbit and elevation.
    // Hand 2 (secondary) finger count drives discrete action gestures:
    // 2 fingers = 2-View, 4 fingers = Multi-View, fist = Reset, thumbs up/down = Fullscreen
    if (!triggeredAction && hand2Processed.triggeredAction) {
      triggeredAction = hand2Processed.triggeredAction;
    }

    // Determine roles for telemetry feedback
    let hand1Role = 'Primary Orbit / Elevation';
    let hand2Role = 'Discrete Action Trigger';

    if (isCrossSectionActive && areHandsLevel && hand1Processed.state.gesture === 'OPEN_HAND' && hand2Processed.state.gesture === 'OPEN_HAND') {
      hand1Role = 'Cross-Section Width Anchor';
      hand2Role = 'Cross-Section Depth Slider';
    } else if (hand1Processed.state.gesture === 'OPEN_HAND' && hand2Processed.state.gesture === 'OPEN_HAND') {
      hand1Role = 'Pinch-Spread Zoom Anchor';
      hand2Role = 'Pinch-Spread Zoom Driver';
    }

    return {
      twoHandState: {
        isTwoHandsMode: true,
        handCount: 2,
        hand1: hand1Processed.state,
        hand2: hand2Processed.state,
        handDistance: currentDistance,
        handDistanceDelta,
        areHandsLevel,
        hand1Role,
        hand2Role,
        isLowFps: this.isLowFpsWarning,
      },
      triggeredAction,
      pinchTriggerPos,
    };
  }

  // Analyze single hand landmarks (extension, gesture classification, movement delta, hold confirmation)
  private analyzeSingleHand(
    landmarks: Landmark[],
    handedness: 'Left' | 'Right',
    handIndex: 1 | 2,
    now: number
  ): {
    state: HandDetectionState;
    triggeredAction: GestureAction | null;
  } {
    const centroid = this.calculateCentroid(landmarks);

    const dist3D = (p1: Landmark, p2: { x: number; y: number; z: number }) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dz = p1.z - p2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    const dist2D = (p1: Landmark, p2: { x: number; y: number }) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Tip distance vs PIP joint distance from palm centroid
    const indexTipCentroidDist = dist3D(landmarks[8], centroid);
    const indexPipCentroidDist = dist3D(landmarks[6], centroid);
    const isIndexExtended = indexTipCentroidDist > indexPipCentroidDist * 1.15;
    const isIndexCurled = indexTipCentroidDist <= indexPipCentroidDist * 1.05;

    const middleTipCentroidDist = dist3D(landmarks[12], centroid);
    const middlePipCentroidDist = dist3D(landmarks[10], centroid);
    const isMiddleExtended = middleTipCentroidDist > middlePipCentroidDist * 1.15;
    const isMiddleCurled = middleTipCentroidDist <= middlePipCentroidDist * 1.05;

    const ringTipCentroidDist = dist3D(landmarks[16], centroid);
    const ringPipCentroidDist = dist3D(landmarks[14], centroid);
    const isRingExtended = ringTipCentroidDist > ringPipCentroidDist * 1.15;
    const isRingCurled = ringTipCentroidDist <= ringPipCentroidDist * 1.05;

    const pinkyTipCentroidDist = dist3D(landmarks[20], centroid);
    const pinkyPipCentroidDist = dist3D(landmarks[18], centroid);
    const isPinkyExtended = pinkyTipCentroidDist > pinkyPipCentroidDist * 1.15;
    const isPinkyCurled = pinkyTipCentroidDist <= pinkyPipCentroidDist * 1.05;

    const thumbTipCentroidDist = dist3D(landmarks[4], centroid);
    const thumbMcpCentroidDist = dist3D(landmarks[2], centroid);
    const thumbIpCentroidDist = dist3D(landmarks[3], centroid);
    const isThumbExtended = thumbTipCentroidDist > thumbMcpCentroidDist * 1.18;
    const isThumbCurled = thumbTipCentroidDist <= Math.max(thumbIpCentroidDist, thumbMcpCentroidDist) * 1.08;

    const extendedList = [isThumbExtended, isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended];
    const fingerCount = extendedList.filter(Boolean).length;

    // Hand size: distance from wrist (0) to middle knuckle (9)
    const currentHandSize = dist2D(landmarks[0], landmarks[9]);

    // Wrist movement delta
    const currentWristX = landmarks[0].x;
    const currentWristY = landmarks[0].y;
    let wristDeltaX = 0;
    let wristDeltaY = 0;

    if (handIndex === 1) {
      if (this.prevWrist1X !== null) {
        wristDeltaX = (currentWristX - this.prevWrist1X) * this.settings.rotationMultiplier;
      }
      if (this.prevWrist1Y !== null) {
        wristDeltaY = (currentWristY - this.prevWrist1Y) * this.settings.elevationMultiplier;
      }
      this.prevWrist1X = currentWristX;
      this.prevWrist1Y = currentWristY;
    } else {
      if (this.prevWrist2X !== null) {
        wristDeltaX = currentWristX - this.prevWrist2X;
      }
      if (this.prevWrist2Y !== null) {
        wristDeltaY = currentWristY - this.prevWrist2Y;
      }
      this.prevWrist2X = currentWristX;
      this.prevWrist2Y = currentWristY;
    }

    // Specific gesture detection
    const areFourFingersCurled = isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled;
    const isClosedFist = areFourFingersCurled && isThumbCurled;

    const isThumbPointingUp = landmarks[4].y < (landmarks[2].y - 0.03) && landmarks[4].y < (landmarks[0].y - 0.04);
    const isThumbPointingDown = landmarks[4].y > (landmarks[2].y + 0.03) && landmarks[4].y > (landmarks[0].y + 0.04);

    const isThumbsUp = areFourFingersCurled && isThumbPointingUp && !isThumbCurled;
    const isThumbsDown = areFourFingersCurled && isThumbPointingDown && !isThumbCurled;

    const isExactlyTwo = isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended;
    const isExactlyFour = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended && !isThumbExtended;

    let rawGesture: GestureType = 'AMBIGUOUS';

    if (isThumbsUp) {
      rawGesture = 'THUMBS_UP';
    } else if (isThumbsDown) {
      rawGesture = 'THUMBS_DOWN';
    } else if (isClosedFist) {
      rawGesture = 'CLOSED_FIST';
    } else if (isExactlyTwo) {
      rawGesture = 'TWO_FINGERS';
    } else if (isExactlyFour) {
      rawGesture = 'FOUR_FINGERS';
    } else if (fingerCount >= 3) {
      rawGesture = 'OPEN_HAND';
    } else if (fingerCount === 0 || areFourFingersCurled) {
      rawGesture = 'CLOSED_FIST';
    }

    // Hold confirmation for discrete gestures
    const isDiscrete =
      rawGesture === 'TWO_FINGERS' ||
      rawGesture === 'FOUR_FINGERS' ||
      rawGesture === 'CLOSED_FIST' ||
      rawGesture === 'THUMBS_UP' ||
      rawGesture === 'THUMBS_DOWN';

    let triggeredAction: GestureAction | null = null;
    let holdProgress = 0;

    const candidateGesture = handIndex === 1 ? this.candidate1Gesture : this.candidate2Gesture;
    const candidateStartTime = handIndex === 1 ? this.candidate1StartTime : this.candidate2StartTime;
    const lastFired = handIndex === 1 ? this.lastFiredDiscrete1 : this.lastFiredDiscrete2;
    const holdDuration = this.settings.holdDurationMs;

    if (isDiscrete) {
      if (candidateGesture !== rawGesture) {
        if (handIndex === 1) {
          this.candidate1Gesture = rawGesture;
          this.candidate1StartTime = now;
        } else {
          this.candidate2Gesture = rawGesture;
          this.candidate2StartTime = now;
        }
        holdProgress = 0;
      } else {
        const elapsed = now - candidateStartTime;
        holdProgress = Math.min(1, elapsed / holdDuration);

        if (elapsed >= holdDuration) {
          if (lastFired !== rawGesture) {
            if (handIndex === 1) {
              this.lastFiredDiscrete1 = rawGesture;
            } else {
              this.lastFiredDiscrete2 = rawGesture;
            }

            if (rawGesture === 'TWO_FINGERS') {
              triggeredAction = 'VIEW_DUAL';
            } else if (rawGesture === 'FOUR_FINGERS') {
              triggeredAction = 'VIEW_MULTI';
            } else if (rawGesture === 'CLOSED_FIST') {
              triggeredAction = 'RESET';
            } else if (rawGesture === 'THUMBS_UP') {
              triggeredAction = 'FULLSCREEN_ENTER';
            } else if (rawGesture === 'THUMBS_DOWN') {
              triggeredAction = 'FULLSCREEN_EXIT';
            }
          }
        }
      }
    } else {
      if (handIndex === 1) {
        this.candidate1Gesture = rawGesture;
        // Re-arm discrete gesture as soon as hand exits the discrete gesture posture
        this.lastFiredDiscrete1 = 'NONE';
      } else {
        this.candidate2Gesture = rawGesture;
        // Re-arm discrete gesture as soon as hand exits the discrete gesture posture
        this.lastFiredDiscrete2 = 'NONE';
      }
      holdProgress = 0;
    }

    return {
      state: {
        hasHand: true,
        gesture: rawGesture,
        fingerCount,
        extendedFingers: {
          thumb: isThumbExtended,
          index: isIndexExtended,
          middle: isMiddleExtended,
          ring: isRingExtended,
          pinky: isPinkyExtended,
        },
        wristDeltaX,
        wristDeltaY,
        apparentHandSize: currentHandSize,
        rawLandmarks: landmarks,
        fps: this.currentFps,
        confidence: 0.95,
        holdProgress,
        handedness,
      },
      triggeredAction,
    };
  }

  // Check pinch gesture between thumb tip (4) and index tip (8)
  private checkPinch(
    landmarks: Landmark[],
    now: number
  ): {
    isPinching: boolean;
    pinchProgress: number;
    screenPos: { x: number; y: number };
    triggered: boolean;
  } {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dz = (thumbTip.z || 0) - (indexTip.z || 0);
    const pinchDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Screen coordinates (mirrored horizontally: 1 - x)
    const screenPos = {
      x: 1 - indexTip.x,
      y: indexTip.y,
    };

    // Thresholds: < 0.055 is pinch, >= 0.065 is release
    const isPinchingNow = pinchDist < 0.055;
    let triggered = false;
    let pinchProgress = 0;

    if (isPinchingNow) {
      if (!this.isPinchActive) {
        this.isPinchActive = true;
        this.pinchStartTime = now;
      } else {
        const elapsed = now - this.pinchStartTime;
        pinchProgress = Math.min(1, elapsed / this.settings.holdDurationMs);

        if (elapsed >= this.settings.holdDurationMs && !this.lastFiredPinch) {
          this.lastFiredPinch = true;
          triggered = true;
        }
      }
    } else {
      if (pinchDist >= 0.065) {
        this.isPinchActive = false;
        this.lastFiredPinch = false;
      }
      pinchProgress = 0;
    }

    return {
      isPinching: isPinchingNow,
      pinchProgress,
      screenPos,
      triggered,
    };
  }

  private calculateCentroid(landmarks: Landmark[]): { x: number; y: number; z: number } {
    return {
      x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[17].x) / 4,
      y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[17].y) / 4,
      z: (landmarks[0].z + landmarks[5].z + landmarks[9].z + landmarks[17].z) / 4,
    };
  }

  private createEmptyHandState(): HandDetectionState {
    return {
      hasHand: false,
      gesture: 'NONE',
      fingerCount: 0,
      extendedFingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
      wristDeltaX: 0,
      wristDeltaY: 0,
      apparentHandSize: 0,
      fps: this.currentFps,
      confidence: 0,
      holdProgress: 0,
      isPinching: false,
      pinchProgress: 0,
      pinchScreenPos: null,
      handedness: 'Unknown',
    };
  }

  // Backward compatible single-hand processLandmarks
  public processLandmarks(landmarks: Landmark[] | null | undefined): {
    state: HandDetectionState;
    triggeredAction: GestureAction | null;
  } {
    const res = this.processMultiHandLandmarks(
      landmarks ? [landmarks] : null,
      undefined,
      false,
      false
    );
    return {
      state: res.twoHandState.hand1,
      triggeredAction: res.triggeredAction,
    };
  }

  public reset(): void {
    this.prevWrist1X = null;
    this.prevWrist1Y = null;
    this.prevHand1Size = null;
    this.candidate1Gesture = 'NONE';
    this.lastFiredDiscrete1 = 'NONE';

    this.prevWrist2X = null;
    this.prevWrist2Y = null;
    this.candidate2Gesture = 'NONE';
    this.lastFiredDiscrete2 = 'NONE';

    this.prevHandDistance = null;
    this.isPinchActive = false;
    this.lastFiredPinch = false;
  }
}
