export type ViewMode = 'single' | 'dual' | 'multi';
export type ColorMode = 'blue' | 'red';
export type ActiveToolMode = 'none' | 'measure' | 'annotate';

export type GestureType = 
  | 'NONE'
  | 'OPEN_HAND'      // 3-5 fingers -> Rotate (horiz) + Elevate (vert) + Zoom (depth)
  | 'TWO_FINGERS'    // 2 fingers (Index + Middle) -> 2-View Mode
  | 'FOUR_FINGERS'   // 4 fingers (Index + Middle + Ring + Pinky) -> 4-View (Multi) Mode
  | 'CLOSED_FIST'    // All 5 fingers curled -> Reset to Initial Position & Single View
  | 'THUMBS_UP'      // Thumb pointing up, 4 fingers curled -> Enter Fullscreen Mode
  | 'THUMBS_DOWN'    // Thumb pointing down, 4 fingers curled -> Exit Fullscreen Mode
  | 'PINCH'          // Thumb and index fingertip together -> Place measurement or annotation
  | 'AMBIGUOUS';

export type GestureAction = 
  | 'VIEW_DUAL' 
  | 'VIEW_MULTI' 
  | 'RESET' 
  | 'FULLSCREEN_ENTER' 
  | 'FULLSCREEN_EXIT'
  | 'PINCH_TRIGGER';

export interface ModelStats {
  fileName: string;
  fileFormat: 'STL' | 'STEP' | 'OBJ' | 'CAD';
  dimensions: {
    length: number; // X axis in mm
    breadth: number; // Y axis in mm
    height: number; // Z axis in mm
  };
  vertexCount: number;
  faceCount: number;
  fileSize: number; // in bytes
}

export interface HandDetectionState {
  hasHand: boolean;
  gesture: GestureType;
  fingerCount: number;
  extendedFingers: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  wristDeltaX: number;
  wristDeltaY: number;
  apparentHandSize: number;
  rawLandmarks?: Array<{ x: number; y: number; z: number }>;
  fps: number;
  confidence: number;
  holdProgress: number; // 0 to 1 for the hold confirmation
  isPinching?: boolean;
  pinchProgress?: number;
  pinchScreenPos?: { x: number; y: number } | null;
  handedness?: 'Left' | 'Right' | 'Unknown';
}

export interface TwoHandState {
  isTwoHandsMode: boolean;
  handCount: number; // 0, 1, or 2
  hand1: HandDetectionState;
  hand2: HandDetectionState;
  handDistance: number;
  handDistanceDelta: number;
  areHandsLevel: boolean; // |y1 - y2| < 0.18
  hand1Role: string;
  hand2Role: string;
  hint?: string;
  isLowFps: boolean;
}

export interface CrossSectionState {
  enabled: boolean;
  axis: 'x' | 'y' | 'z';
  depth: number; // 0 to 1
}

export interface CADMeasurement {
  id: string;
  label: string;
  pointA: { x: number; y: number; z: number };
  pointB: { x: number; y: number; z: number };
  distanceReal: number; // in mm (world distance / visualScale)
  createdAt: number;
}

export interface CADAnnotation {
  id: string;
  point: { x: number; y: number; z: number };
  text: string;
  createdAt: number;
}

export interface GestureSettings {
  holdDurationMs: number; // 200 - 800ms
  rotationMultiplier: number; // 0.5 - 2.0x
  zoomMultiplier: number; // 0.5 - 2.0x
  elevationMultiplier: number; // 0.5 - 2.0x
}

export interface CADMaterialOption {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  wireframeColor: string;
}

