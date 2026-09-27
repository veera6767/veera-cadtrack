# VEERA-CADTRACK

> **Next-Generation Touchless Computer-Aided Design (CAD) Inspection & Telemetry Workstation** powered by MediaPipe AI Vision, Three.js WebGL, and Open CASCADE Technology.

---

### 🌐 Project Links & Live Demo

- **Live Application (Google AI Studio)**: [https://ai.studio/apps/37854e78-5391-4e2a-82e3-c4d5a491140d](https://ai.studio/apps/37854e78-5391-4e2a-82e3-c4d5a491140d)
- **GitHub Repository**: [https://github.com/veera6767/veera-cadtrack](https://github.com/veera6767/veera-cadtrack)

---

## ⚡ Overview

**Veera CADTrack** is a web-based, gesture-driven 3D CAD inspection platform. Using computer-vision hand tracking in real time, engineers and designers can manipulate, inspect, cross-section, measure, and annotate complex mechanical assemblies completely touchless—directly through a standard webcam.

---

## 🚀 Key Features

### 1. ✋ Dual-Hand & Single-Hand Gesture Control
- **Open Hand**: Continuous Azimuth orbit, Elevation pitch, and Apparent-Size zoom.
- **Two Hands Mode (Opt-In)**:
  - Hand 1 acts as primary anchor / azimuth rotator.
  - Hand 2 triggers discrete actions (2-View, Multi-View, System Reset, Fullscreen).
  - Two-hand pinch & spread controls camera dolly zoom.
  - Level-hand transverse motion drives real-time Cross-Section cut depth.
- **Fist Gesture**: Instant system reset (restores framing, disables cross-section, and normalizes angles).
- **Thumbs Up / Thumbs Down**: Enter & exit True Fullscreen mode.
- **Pinch-to-Place**: Precise 3D raycast snapping for point-to-point measurement and annotation pinning.

### 2. ✂️ Solid Stencil-Buffer Cross-Section Clipping
- Dynamic cutting plane along **X, Y, or Z** axes with depth slider & hand gesture control.
- **Two-Pass Stencil Buffer Capping**: Slices geometry cleanly with an accent-colored solid cap conforming strictly to the model's true interior silhouette (eliminating hollow shells or oversized planes).

### 3. 📐 Point-to-Point Measurement & 3D Annotations
- Live 3D surface raycasting with millimetric Euclidean distance calculation.
- Leader-stem pin markers with editable 3D world labels that track camera orientation in real time.
- Snap-to-annotation camera focus and active item management drawers.

### 4. 📂 Industrial CAD Import Engine
- Native client-side support for **STEP (`.step`, `.stp`)**, **STL (`.stl`)**, and **OBJ (`.obj`)** files.
- Automated scale normalization and camera framing on import.
- Real-time CAD geometry telemetry (bounding box dimensions in mm, vertex count, face count, and file size).

### 5. 🎛️ Tactical Glass HUD & Dual Color Modes
- **Stark Cyan** (Blue Mode) and **Stark Crimson** (Red Mode) themes.
- Left-edge vertical status readout (`AZ`, `EL`, `CLIP`, `2H`).
- Multi-viewport split support (Single View, 2-View Ortho Offset, 4-View Multi-View).
- Studio lighting with dynamic rim lighting, metallic presets, and wireframe overlays.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **3D Engine**: Three.js (WebGL 2.0 with Stencil Buffer & Local Clipping)
- **Computer Vision**: Google MediaPipe Hands
- **CAD Parsing**: `occt-import-js` (Open CASCADE WebAssembly)
- **Icons & UI**: Lucide React
- **Build Tool**: Vite

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- A standard webcam

### Installation

```bash
# Clone the repository
git clone https://github.com/veera6767/veera-cadtrack.git

# Navigate to project folder
cd veera-cadtrack

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be live at `http://localhost:3000/` (or `http://localhost:3001/` if port 3000 is occupied).

### Building for Production

```bash
npm run build
```

---

## 📜 License

Apache License 2.0. See [LICENSE](LICENSE) for details.
