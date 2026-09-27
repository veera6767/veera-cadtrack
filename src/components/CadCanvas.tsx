import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ViewMode, ColorMode, CrossSectionState, ActiveToolMode, CADMeasurement, CADAnnotation } from '../types/cad';

interface CadCanvasProps {
  modelObject: THREE.Object3D | null;
  visualScale: number;
  viewMode: ViewMode;
  colorMode: ColorMode;
  targetRotationY: number;
  setTargetRotationY: React.Dispatch<React.SetStateAction<number>>;
  targetZoom: number;
  setTargetZoom: React.Dispatch<React.SetStateAction<number>>;
  pitchX: number;
  setPitchX: React.Dispatch<React.SetStateAction<number>>;
  wireframe: boolean;
  materialTheme: string;
  isResetFlashing?: boolean;
  // Tool & Cross-Section states
  crossSection: CrossSectionState;
  activeToolMode: ActiveToolMode;
  measurements: CADMeasurement[];
  onAddMeasurement: (measurement: CADMeasurement) => void;
  annotations: CADAnnotation[];
  onAddAnnotation: (annotation: CADAnnotation) => void;
  pendingMeasurePoint: { x: number; y: number; z: number } | null;
  setPendingMeasurePoint: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number } | null>>;
  pinchRaycastTrigger?: { x: number; y: number; id: number } | null;
  cursorFingertipPos?: { x: number; y: number } | null;
}

// Deep disposal helper to eliminate GPU memory leaks when swapping models
const disposeHierarchy = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      // Do not dispose base geometry if this is an attached stencil or cap mesh
      if (!child.userData.isStencilMesh && !child.userData.isCapMesh && mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
};

export const CadCanvas: React.FC<CadCanvasProps> = ({
  modelObject,
  visualScale,
  viewMode,
  colorMode,
  targetRotationY,
  setTargetRotationY,
  targetZoom,
  setTargetZoom,
  pitchX,
  setPitchX,
  wireframe,
  materialTheme,
  isResetFlashing = false,
  crossSection,
  activeToolMode,
  measurements,
  onAddMeasurement,
  annotations,
  onAddAnnotation,
  pendingMeasurePoint,
  setPendingMeasurePoint,
  pinchRaycastTrigger,
  cursorFingertipPos,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to keep animation loop running smoothly without recreation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const topAccentLightRef = useRef<THREE.DirectionalLight | null>(null);
  const camerasRef = useRef<THREE.PerspectiveCamera[]>([]);

  // Overlay groups for tools
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const annotationGroupRef = useRef<THREE.Group | null>(null);

  // Stencil Capping References
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
  const stencilMeshesRef = useRef<THREE.Mesh[]>([]);
  const crossSectionCapRef = useRef<THREE.Mesh | null>(null);
  const prevAxisRef = useRef<'x' | 'y' | 'z' | null>(null);
  const prevModelRef = useRef<THREE.Object3D | null>(null);
  const prevColorModeRef = useRef<ColorMode | null>(null);

  // Smoothed state references (current += (target - current) * 0.25)
  const currentRotationYRef = useRef<number>(0);
  const currentZoomRef = useRef<number>(140);
  const currentPitchXRef = useRef<number>(0.28);

  const targetRotationYRef = useRef<number>(targetRotationY);
  const targetZoomRef = useRef<number>(targetZoom);
  const targetPitchXRef = useRef<number>(pitchX);
  const viewModeRef = useRef<ViewMode>(viewMode);
  const colorModeRef = useRef<ColorMode>(colorMode);
  const visualScaleRef = useRef<number>(visualScale);
  const activeToolModeRef = useRef<ActiveToolMode>(activeToolMode);
  const pendingMeasurePointRef = useRef(pendingMeasurePoint);

  // Sync ref values
  useEffect(() => {
    targetRotationYRef.current = targetRotationY;
  }, [targetRotationY]);
  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);
  useEffect(() => {
    targetPitchXRef.current = pitchX;
  }, [pitchX]);
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);
  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);
  useEffect(() => {
    visualScaleRef.current = visualScale;
  }, [visualScale]);
  useEffect(() => {
    activeToolModeRef.current = activeToolMode;
  }, [activeToolMode]);
  useEffect(() => {
    pendingMeasurePointRef.current = pendingMeasurePoint;
  }, [pendingMeasurePoint]);

  // Projected 2D screen positions for floating labels
  const [screenLabels, setScreenLabels] = useState<
    Array<{
      id: string;
      text: string;
      x: number;
      y: number;
      type: 'measure' | 'annotation';
    }>
  >([]);

  // Cleanup helper for stencil pass meshes
  const cleanupStencilMeshes = useCallback(() => {
    stencilMeshesRef.current.forEach((m) => {
      if (m.parent) {
        m.parent.remove(m);
      }
      if (m.material) {
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material.dispose();
        }
      }
    });
    stencilMeshesRef.current = [];
  }, []);

  // Cleanup helper for cap plane mesh
  const cleanupCapMesh = useCallback(() => {
    if (crossSectionCapRef.current) {
      if (sceneRef.current) {
        sceneRef.current.remove(crossSectionCapRef.current);
      }
      if (crossSectionCapRef.current.geometry) {
        crossSectionCapRef.current.geometry.dispose();
      }
      if (crossSectionCapRef.current.material) {
        if (Array.isArray(crossSectionCapRef.current.material)) {
          crossSectionCapRef.current.material.forEach((mat) => mat.dispose());
        } else {
          crossSectionCapRef.current.material.dispose();
        }
      }
      crossSectionCapRef.current = null;
    }
  }, []);

  // Setup Three.js scene & renderer
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: true, // Enable WebGL stencil buffer
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Enable local clipping planes for cross-section mode
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    // Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf0f9ff, 2.5);
    keyLight.position.set(90, 150, 110);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
    fillLight.position.set(-110, 70, -90);
    scene.add(fillLight);

    const rimLightColor = colorModeRef.current === 'red' ? 0xff2e43 : 0x00e5ff;
    const rimLight = new THREE.DirectionalLight(rimLightColor, 3.2);
    rimLight.position.set(0, -80, -120);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const topAccentColor = colorModeRef.current === 'red' ? 0xff5768 : 0x38bdf8;
    const topAccentLight = new THREE.DirectionalLight(topAccentColor, 1.8);
    topAccentLight.position.set(0, 160, 0);
    scene.add(topAccentLight);
    topAccentLightRef.current = topAccentLight;

    // Model Container Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Measurement & Annotation groups
    const measurementGroup = new THREE.Group();
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    const annotationGroup = new THREE.Group();
    scene.add(annotationGroup);
    annotationGroupRef.current = annotationGroup;

    // Create 4 cameras for synchronized viewports
    const cameras = [
      new THREE.PerspectiveCamera(45, 1, 0.1, 2000), // Cam 0: Main / Front (0°)
      new THREE.PerspectiveCamera(45, 1, 0.1, 2000), // Cam 1: Right (+90°)
      new THREE.PerspectiveCamera(45, 1, 0.1, 2000), // Cam 2: Back (+180°)
      new THREE.PerspectiveCamera(45, 1, 0.1, 2000), // Cam 3: Left (+270°)
    ];
    camerasRef.current = cameras;

    let animationFrameId: number;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);

      // Smooth interpolation: current += (target - current) * 0.25
      const smoothingFactor = 0.25;
      currentRotationYRef.current += (targetRotationYRef.current - currentRotationYRef.current) * smoothingFactor;
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * smoothingFactor;
      currentPitchXRef.current += (targetPitchXRef.current - currentPitchXRef.current) * smoothingFactor;

      const rotY = currentRotationYRef.current;
      const zoom = Math.max(30, Math.min(500, currentZoomRef.current));
      const pitch = currentPitchXRef.current;

      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!renderer || width === 0 || height === 0) return;

      const mode = viewModeRef.current;

      const updateCamera = (cam: THREE.PerspectiveCamera, angleOffset: number, aspect: number) => {
        cam.aspect = aspect;
        cam.updateProjectionMatrix();

        const angle = rotY + angleOffset;
        const cy = zoom * Math.sin(pitch);
        const radiusAtPitch = zoom * Math.cos(pitch);
        const cx = radiusAtPitch * Math.sin(angle);
        const cz = radiusAtPitch * Math.cos(angle);

        cam.position.set(cx, cy, cz);
        cam.lookAt(0, 0, 0);
      };

      renderer.setScissorTest(true);

      if (mode === 'single') {
        const aspect = width / height;
        updateCamera(cameras[0], 0, aspect);
        renderer.setViewport(0, 0, width, height);
        renderer.setScissor(0, 0, width, height);
        // Clear stencil buffer for single viewport
        renderer.clearStencil();
        renderer.render(scene, cameras[0]);
      } else if (mode === 'dual') {
        const halfWidth = Math.floor(width / 2);
        const aspect = halfWidth / height;

        // Viewport 1
        updateCamera(cameras[0], 0, aspect);
        renderer.setViewport(0, 0, halfWidth, height);
        renderer.setScissor(0, 0, halfWidth, height);
        renderer.clearStencil();
        renderer.render(scene, cameras[0]);

        // Viewport 2
        updateCamera(cameras[1], Math.PI / 2, aspect);
        renderer.setViewport(halfWidth, 0, width - halfWidth, height);
        renderer.setScissor(halfWidth, 0, width - halfWidth, height);
        renderer.clearStencil();
        renderer.render(scene, cameras[1]);
      } else {
        const halfW = Math.floor(width / 2);
        const halfH = Math.floor(height / 2);
        const aspect = halfW / halfH;

        // Quad 1: Front
        updateCamera(cameras[0], 0, aspect);
        renderer.setViewport(0, halfH, halfW, height - halfH);
        renderer.setScissor(0, halfH, halfW, height - halfH);
        renderer.clearStencil();
        renderer.render(scene, cameras[0]);

        // Quad 2: Right
        updateCamera(cameras[1], Math.PI / 2, aspect);
        renderer.setViewport(halfW, halfH, width - halfW, height - halfH);
        renderer.setScissor(halfW, halfH, width - halfW, height - halfH);
        renderer.clearStencil();
        renderer.render(scene, cameras[1]);

        // Quad 3: Left
        updateCamera(cameras[3], (3 * Math.PI) / 2, aspect);
        renderer.setViewport(0, 0, halfW, halfH);
        renderer.setScissor(0, 0, halfW, halfH);
        renderer.clearStencil();
        renderer.render(scene, cameras[3]);

        // Quad 4: Back
        updateCamera(cameras[2], Math.PI, aspect);
        renderer.setViewport(halfW, 0, width - halfW, halfH);
        renderer.setScissor(halfW, 0, width - halfW, halfH);
        renderer.clearStencil();
        renderer.render(scene, cameras[2]);
      }

      renderer.setScissorTest(false);
    };

    renderLoop();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);

      cleanupStencilMeshes();
      cleanupCapMesh();

      if (modelGroupRef.current) {
        disposeHierarchy(modelGroupRef.current);
      }
      if (measurementGroupRef.current) {
        disposeHierarchy(measurementGroupRef.current);
      }
      if (annotationGroupRef.current) {
        disposeHierarchy(annotationGroupRef.current);
      }
      renderer.dispose();
    };
  }, [cleanupStencilMeshes, cleanupCapMesh]);

  // Update lighting when Color Mode switches
  useEffect(() => {
    if (rimLightRef.current) {
      rimLightRef.current.color.setHex(colorMode === 'red' ? 0xff2e43 : 0x00e5ff);
    }
    if (topAccentLightRef.current) {
      topAccentLightRef.current.color.setHex(colorMode === 'red' ? 0xff5768 : 0x38bdf8);
    }
  }, [colorMode]);

  // Update Model in Scene
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    cleanupStencilMeshes();
    cleanupCapMesh();
    prevModelRef.current = null;
    prevAxisRef.current = null;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeHierarchy(child);
    }

    if (modelObject) {
      group.add(modelObject);
      group.scale.setScalar(visualScale);
    }
  }, [modelObject, visualScale, cleanupStencilMeshes, cleanupCapMesh]);

  /**
   * STENCIL-BUFFER CLIPPING-PLANE CAPPING (FIX FOR SECTION 2)
   *
   * Implements standard Two-Pass Stencil Capping:
   * 1. Base meshes render with active clipping plane (renderOrder: 0).
   * 2. Stencil Pass 1: Model BackSide with IncrementWrap (renderOrder: 1).
   * 3. Stencil Pass 2: Model FrontSide with DecrementWrap (renderOrder: 1).
   * 4. Cap Mesh: Large plane positioned and oriented at the clipping plane,
   *    rendered with NotEqualStencilFunc (renderOrder: 2) so pixels ONLY draw
   *    where the stencil buffer confirms the plane is inside the model volume.
   */
  useEffect(() => {
    if (!sceneRef.current || !modelObject || !modelGroupRef.current) return;

    if (!crossSection.enabled) {
      cleanupStencilMeshes();
      cleanupCapMesh();
      prevAxisRef.current = null;
      prevModelRef.current = null;

      // Restore all model materials to non-clipped state
      modelObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !child.userData.isStencilMesh && !child.userData.isCapMesh) {
          const mesh = child as THREE.Mesh;
          mesh.renderOrder = 0;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              m.clippingPlanes = null;
              m.clipShadows = false;
              m.needsUpdate = true;
            });
          }
        }
      });
      return;
    }

    const plane = clippingPlaneRef.current;
    const accentHex = colorMode === 'red' ? 0xff2e43 : 0x00e5ff;

    // Compute bounding box in WORLD coordinates (taking visualScale into account)
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Axis configuration
    let normal = new THREE.Vector3(0, -1, 0); // default Y
    let minCoord = box.min.y;
    let maxCoord = box.max.y;

    if (crossSection.axis === 'x') {
      normal = new THREE.Vector3(-1, 0, 0);
      minCoord = box.min.x;
      maxCoord = box.max.x;
    } else if (crossSection.axis === 'z') {
      normal = new THREE.Vector3(0, 0, -1);
      minCoord = box.min.z;
      maxCoord = box.max.z;
    }

    const slicePos = minCoord + (maxCoord - minCoord) * crossSection.depth;
    plane.normal.copy(normal);
    plane.constant = slicePos;

    const needsFullRebuild =
      !crossSectionCapRef.current ||
      prevAxisRef.current !== crossSection.axis ||
      prevModelRef.current !== modelObject ||
      stencilMeshesRef.current.length === 0;

    if (needsFullRebuild) {
      cleanupStencilMeshes();
      cleanupCapMesh();

      prevAxisRef.current = crossSection.axis;
      prevModelRef.current = modelObject;
      prevColorModeRef.current = colorMode;

      // 1. Configure model base materials with clipping plane & attach stencil pass meshes
      modelObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !child.userData.isStencilMesh && !child.userData.isCapMesh) {
          const mesh = child as THREE.Mesh;
          mesh.renderOrder = 0;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              m.clippingPlanes = [plane];
              m.clipShadows = true;
              m.needsUpdate = true;
            });
          }

          // Pass 1: Back faces (Increment on pass)
          const matBack = new THREE.MeshBasicMaterial({
            depthWrite: false,
            depthTest: false,
            colorWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.AlwaysStencilFunc,
            side: THREE.BackSide,
            clippingPlanes: [plane],
            stencilFail: THREE.IncrementWrapStencilOp,
            stencilZFail: THREE.IncrementWrapStencilOp,
            stencilZPass: THREE.IncrementWrapStencilOp,
          });
          const meshBack = new THREE.Mesh(mesh.geometry, matBack);
          meshBack.renderOrder = 1;
          meshBack.userData.isStencilMesh = true;
          mesh.add(meshBack);
          stencilMeshesRef.current.push(meshBack);

          // Pass 2: Front faces (Decrement on pass)
          const matFront = new THREE.MeshBasicMaterial({
            depthWrite: false,
            depthTest: false,
            colorWrite: false,
            stencilWrite: true,
            stencilFunc: THREE.AlwaysStencilFunc,
            side: THREE.FrontSide,
            clippingPlanes: [plane],
            stencilFail: THREE.DecrementWrapStencilOp,
            stencilZFail: THREE.DecrementWrapStencilOp,
            stencilZPass: THREE.DecrementWrapStencilOp,
          });
          const meshFront = new THREE.Mesh(mesh.geometry, matFront);
          meshFront.renderOrder = 1;
          meshFront.userData.isStencilMesh = true;
          mesh.add(meshFront);
          stencilMeshesRef.current.push(meshFront);
        }
      });

      // 2. Create Stencil Cap Plane Mesh
      // Sized large enough to span any model, but the stencil test ensures it ONLY renders inside the cut silhouette!
      const maxDim = Math.max(size.x, size.y, size.z, 200) * 4;
      const capGeom = new THREE.PlaneGeometry(maxDim, maxDim);
      const capMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.35,
        roughness: 0.28,
        metalness: 0.85,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 0,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp,
        stencilZFail: THREE.ReplaceStencilOp,
        stencilZPass: THREE.ReplaceStencilOp,
      });
      const capMesh = new THREE.Mesh(capGeom, capMat);
      capMesh.renderOrder = 2;
      capMesh.userData.isCapMesh = true;

      // Position and orient cap mesh on the cutting plane
      capMesh.position.copy(plane.normal).multiplyScalar(-plane.constant);
      capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal.clone().negate());

      capMesh.onAfterRender = () => {
        rendererRef.current?.clearStencil();
      };

      sceneRef.current.add(capMesh);
      crossSectionCapRef.current = capMesh;
    } else {
      // High-performance real-time update of cap position & orientation (60fps smooth gesture/slider)
      const capMesh = crossSectionCapRef.current;
      capMesh.position.copy(plane.normal).multiplyScalar(-plane.constant);
      capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), plane.normal.clone().negate());

      if (prevColorModeRef.current !== colorMode) {
        prevColorModeRef.current = colorMode;
        (capMesh.material as THREE.MeshStandardMaterial).color.setHex(accentHex);
        (capMesh.material as THREE.MeshStandardMaterial).emissive.setHex(accentHex);
      }
    }
  }, [crossSection, modelObject, colorMode, cleanupStencilMeshes, cleanupCapMesh]);

  // Update Wireframe & Material theme
  useEffect(() => {
    if (!modelGroupRef.current) return;

    modelGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        if (child.userData.isStencilMesh || child.userData.isCapMesh) return;

        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.wireframe = wireframe;

          if (materialTheme === 'titanium') {
            mat.color.setHex(0xb0c4de);
            mat.metalness = 0.9;
            mat.roughness = 0.22;
          } else if (materialTheme === 'cyan') {
            mat.color.setHex(colorMode === 'red' ? 0xff2e43 : 0x00e5ff);
            mat.metalness = 0.88;
            mat.roughness = 0.16;
          } else if (materialTheme === 'obsidian') {
            mat.color.setHex(0x181e28);
            mat.metalness = 0.95;
            mat.roughness = 0.14;
          } else if (materialTheme === 'emerald') {
            mat.color.setHex(0x10b981);
            mat.metalness = 0.82;
            mat.roughness = 0.24;
          } else if (materialTheme === 'amber') {
            mat.color.setHex(0xf59e0b);
            mat.metalness = 0.9;
            mat.roughness = 0.25;
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [wireframe, materialTheme, colorMode]);

  // Render Measurements & Annotations in 3D (Sections 3.1 & 3.2)
  useEffect(() => {
    if (!measurementGroupRef.current || !annotationGroupRef.current) return;

    const mGroup = measurementGroupRef.current;
    const aGroup = annotationGroupRef.current;

    while (mGroup.children.length > 0) {
      const child = mGroup.children[0];
      mGroup.remove(child);
      disposeHierarchy(child);
    }
    while (aGroup.children.length > 0) {
      const child = aGroup.children[0];
      aGroup.remove(child);
      disposeHierarchy(child);
    }

    const accentColor = colorMode === 'red' ? 0xff2e43 : 0x00e5ff;
    const pointMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const pointGeom = new THREE.SphereGeometry(1.4, 16, 16);

    const labels: Array<{
      id: string;
      text: string;
      x: number;
      y: number;
      type: 'measure' | 'annotation';
    }> = [];

    // Render completed measurements
    measurements.forEach((m) => {
      const pA = new THREE.Vector3(m.pointA.x, m.pointA.y, m.pointA.z);
      const pB = new THREE.Vector3(m.pointB.x, m.pointB.y, m.pointB.z);

      // Marker A
      const meshA = new THREE.Mesh(pointGeom, pointMat);
      meshA.position.copy(pA);
      mGroup.add(meshA);

      // Marker B
      const meshB = new THREE.Mesh(pointGeom, pointMat);
      meshB.position.copy(pB);
      mGroup.add(meshB);

      // Line connecting them
      const lineGeom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
      const lineMat = new THREE.LineBasicMaterial({
        color: accentColor,
        linewidth: 2,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      mGroup.add(line);

      // Midpoint
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      // Project midpoint to main camera
      const mainCam = camerasRef.current[0];
      if (mainCam && containerRef.current) {
        const pMid = mid.clone().project(mainCam);
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const sx = ((pMid.x + 1) * w) / 2;
        const sy = ((-pMid.y + 1) * h) / 2;
        if (pMid.z < 1) {
          labels.push({
            id: m.id,
            text: `${m.label}: ${m.distanceReal.toFixed(1)} mm`,
            x: sx,
            y: sy,
            type: 'measure',
          });
        }
      }
    });

    // Render pending measurement point A if active
    if (pendingMeasurePoint) {
      const pA = new THREE.Vector3(pendingMeasurePoint.x, pendingMeasurePoint.y, pendingMeasurePoint.z);
      const pendingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const meshA = new THREE.Mesh(pointGeom, pendingMat);
      meshA.position.copy(pA);
      mGroup.add(meshA);
    }

    // Render annotations
    annotations.forEach((ann) => {
      const p = new THREE.Vector3(ann.point.x, ann.point.y, ann.point.z);

      // Pin marker
      const pinMesh = new THREE.Mesh(pointGeom, pointMat);
      pinMesh.position.copy(p);
      aGroup.add(pinMesh);

      // Leader stem line (upward 6 units)
      const pTop = p.clone().add(new THREE.Vector3(0, 6, 0));
      const stemGeom = new THREE.BufferGeometry().setFromPoints([p, pTop]);
      const stemLine = new THREE.Line(stemGeom, new THREE.LineBasicMaterial({ color: accentColor }));
      aGroup.add(stemLine);

      // Project top point to screen
      const mainCam = camerasRef.current[0];
      if (mainCam && containerRef.current) {
        const pScreen = pTop.clone().project(mainCam);
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const sx = ((pScreen.x + 1) * w) / 2;
        const sy = ((-pScreen.y + 1) * h) / 2;
        if (pScreen.z < 1) {
          labels.push({
            id: ann.id,
            text: ann.text,
            x: sx,
            y: sy,
            type: 'annotation',
          });
        }
      }
    });

    setScreenLabels(labels);
  }, [measurements, annotations, pendingMeasurePoint, colorMode, targetRotationY, targetZoom, pitchX]);

  // Raycasting helper against model geometry
  const performRaycastAtScreenCoords = useCallback(
    (screenXRatio: number, screenYRatio: number) => {
      if (!modelGroupRef.current || !camerasRef.current[0]) return null;

      const mainCam = camerasRef.current[0];
      const ndc = new THREE.Vector2(screenXRatio * 2 - 1, -(screenYRatio * 2 - 1));

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, mainCam);

      // Collect only visible base meshes (ignoring stencil pass meshes and oversized cap plane)
      const targetMeshes: THREE.Mesh[] = [];
      modelGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !child.userData.isStencilMesh && !child.userData.isCapMesh) {
          targetMeshes.push(child as THREE.Mesh);
        }
      });

      const intersects = raycaster.intersectObjects(targetMeshes, true);
      if (intersects.length > 0) {
        // If cross-section clipping is active, filter out hits in the clipped-away half-space
        const plane = clippingPlaneRef.current;
        const validIntersects = crossSection.enabled
          ? intersects.filter((hit) => plane.distanceToPoint(hit.point) >= -0.05)
          : intersects;

        if (validIntersects.length > 0) {
          return validIntersects[0].point;
        }
      }
      return null;
    },
    [crossSection.enabled]
  );

  // Handle placement logic when a 3D point is struck
  const handlePlacementHit = useCallback(
    (worldPoint: THREE.Vector3) => {
      const mode = activeToolModeRef.current;
      const vScale = visualScaleRef.current || 1;

      if (mode === 'measure') {
        const ptA = pendingMeasurePointRef.current;
        if (!ptA) {
          // Set Point A
          setPendingMeasurePoint({ x: worldPoint.x, y: worldPoint.y, z: worldPoint.z });
        } else {
          // Set Point B and complete measurement
          const dx = worldPoint.x - ptA.x;
          const dy = worldPoint.y - ptA.y;
          const dz = worldPoint.z - ptA.z;
          const worldDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // TRUE CAD UNITS: distReal = worldDistance / visualScale
          const distanceReal = worldDistance / vScale;

          const newMeasurement: CADMeasurement = {
            id: `m_${Date.now()}`,
            label: `M${measurements.length + 1}`,
            pointA: ptA,
            pointB: { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
            distanceReal,
            createdAt: Date.now(),
          };

          onAddMeasurement(newMeasurement);
          setPendingMeasurePoint(null);
        }
      } else if (mode === 'annotate') {
        // Single point placement
        const defaultText = `Note #${annotations.length + 1}`;
        const newAnnotation: CADAnnotation = {
          id: `ann_${Date.now()}`,
          point: { x: worldPoint.x, y: worldPoint.y, z: worldPoint.z },
          text: defaultText,
          createdAt: Date.now(),
        };
        onAddAnnotation(newAnnotation);
      }
    },
    [measurements.length, annotations.length, onAddMeasurement, onAddAnnotation, setPendingMeasurePoint]
  );

  // Pointer/Mouse Click Placement
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activeToolMode === 'none') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const hit = performRaycastAtScreenCoords(xRatio, yRatio);
    if (hit) {
      handlePlacementHit(hit);
    }
  };

  // Pinch Raycast Trigger from GestureDetector
  useEffect(() => {
    if (!pinchRaycastTrigger || activeToolMode === 'none') return;
    const hit = performRaycastAtScreenCoords(pinchRaycastTrigger.x, pinchRaycastTrigger.y);
    if (hit) {
      handlePlacementHit(hit);
    }
  }, [pinchRaycastTrigger, activeToolMode, performRaycastAtScreenCoords, handlePlacementHit]);

  // Mouse & Touch fallback controls: drag to rotate, wheel to zoom
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setTargetRotationY((prev) => prev - dx * 0.008);
    setPitchX((prev) => Math.max(-0.15, Math.min(1.45, prev + dy * 0.006)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.15;
    setTargetZoom((prev) => Math.max(30, Math.min(500, prev + zoomDelta)));
  };

  const cursorClass =
    activeToolMode === 'measure' || activeToolMode === 'annotate'
      ? 'cursor-crosshair'
      : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-[#030405] transition-all duration-300 ${cursorClass} ${
        isResetFlashing ? 'shadow-[inset_0_0_90px_rgba(0,229,255,0.8)] border-2 border-[#00e5ff]' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      <div className="hud-backdrop-grid" />

      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full relative z-10" />

      {/* Floating 3D Labels for Measurements and Annotations */}
      {screenLabels.map((lbl) => (
        <div
          key={lbl.id}
          style={{
            position: 'absolute',
            left: `${lbl.x}px`,
            top: `${lbl.y}px`,
            transform: 'translate(-50%, -120%)',
          }}
          className="z-20 pointer-events-none px-2 py-0.5 rounded bg-[#030712]/90 border border-hud-accent text-hud-accent font-mono-tech text-[10px] font-bold shadow-lg backdrop-blur-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
        >
          {lbl.text}
        </div>
      ))}

      {/* Tracked Fingertip Cursor Dot when in Measure or Annotate Mode */}
      {cursorFingertipPos && (activeToolMode === 'measure' || activeToolMode === 'annotate') && (
        <div
          style={{
            position: 'absolute',
            left: `${cursorFingertipPos.x * 100}%`,
            top: `${cursorFingertipPos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className="z-30 pointer-events-none flex items-center justify-center"
        >
          <div className="w-5 h-5 rounded-full border-2 border-hud-accent animate-ping absolute opacity-75" />
          <div className="w-3 h-3 rounded-full bg-hud-accent shadow-[0_0_12px_var(--hud-accent)]" />
          <div className="absolute top-4 left-4 px-1.5 py-0.5 rounded bg-black/80 border border-hud-accent/60 text-[9px] font-mono-tech text-hud-accent font-bold whitespace-nowrap">
            {activeToolMode === 'measure' ? (pendingMeasurePoint ? 'POINT B (PINCH)' : 'POINT A (PINCH)') : 'PIN (PINCH)'}
          </div>
        </div>
      )}

      {/* Hairline dividers for view splits */}
      {viewMode === 'dual' && (
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] view-divider-v pointer-events-none z-20" />
      )}

      {viewMode === 'multi' && (
        <>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] view-divider-v pointer-events-none z-20" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] view-divider-h pointer-events-none z-20" />
        </>
      )}

      {/* Viewport Labels */}
      {viewMode === 'dual' && (
        <>
          <div className="absolute top-16 left-6 px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            VIEW A // PERSPECTIVE (LIVE)
          </div>
          <div className="absolute top-16 left-[calc(50%+1.5rem)] px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            VIEW B // ORTHO OFFSET (+90°)
          </div>
        </>
      )}

      {viewMode === 'multi' && (
        <>
          <div className="absolute top-16 left-6 px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            QUAD 01 // FRONT (0°)
          </div>
          <div className="absolute top-16 left-[calc(50%+1.5rem)] px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            QUAD 02 // RIGHT (+90°)
          </div>
          <div className="absolute top-[calc(50%+1.5rem)] left-6 px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            QUAD 04 // LEFT (+270°)
          </div>
          <div className="absolute top-[calc(50%+1.5rem)] left-[calc(50%+1.5rem)] px-3 py-1 rounded-md bg-[#030712]/85 border border-hud-accent text-[11px] font-mono-tech text-hud-accent pointer-events-none tracking-widest backdrop-blur-md shadow-lg z-20">
            QUAD 03 // BACK (+180°)
          </div>
        </>
      )}
    </div>
  );
};
