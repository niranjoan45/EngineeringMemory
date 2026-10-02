# Engineering Memory Tata - 3D Diagnostic Visualizer

An interactive 3D engineering CAD & mechanical assembly visualizer designed to **dynamically highlight affected components in 3D after each diagnostic report**.

---

## 🌟 Key Features

1. **Dynamic 3D Part Highlighting:**
   - **Severity-based Color Coding:**
     - **CRITICAL (Red Pulse):** Emissive sinusoidal pulsing shader with warning alarm indicator.
     - **WARNING (Amber Glow):** Warm warning glow for elevated threshold wear and minor anomalies.
     - **MONITORED (Cyan Trace):** Standard diagnostic inspection highlight.
   - **X-Ray Ghost Mode:** Unaffected components automatically transition to semi-transparent (`opacity: 0.18`) so hidden internal components (e.g. Turbocharger, Transmission internals, Cylinder Head) become instantly visible.
   - **Auto-Framing Camera Pan:** The camera smoothly tracks, rotates, and zooms into the affected part upon diagnostic completion.
   - **3D World-Projected Pin/Callout:** A dynamic HUD card hovers above the affected part in 3D coordinate space displaying the DTC fault code, part name, and real-time telemetry metrics.

2. **Assembly Explosion & CAD Inspection Controls:**
   - **Exploded View Slider (0% to 100%):** Displaces each component along its physical assembly vector to inspect hidden sub-assemblies.
   - **Turntable Auto-Rotation:** Continuous 360° inspection.
   - **Wireframe Topology Overlay:** Inspect underlying polygon wireframes.
   - **Camera Presets:** Isometric, Front, Top, and "Focus Affected Part".

3. **Diagnostic Report Engine:**
   - **Standard OBD-II Fault Scenarios:**
     - `P0299`: Twin-Scroll Turbocharger & Wastegate (Boost pressure loss, thermal fatigue)
     - `P0302`: Cylinder Head & Valve Assembly (Combustion misfire, valve recession)
     - `P0841`: 6-Speed Dual-Clutch Transmission (Hydraulic line pressure spike)
     - `C0035`: Front Left Brake Caliper & Ventilated Rotor (Thermal runaway & drag)
     - `P0217`: Cooling Radiator & Heat Exchanger (Thermal gradient anomaly)
     - `P0620`: Alternator Decoupler Pulley (Ripple voltage modulation)
   - **Custom Diagnosis Creator:** Allows engineers to pick any component, input custom DTC codes, observations, and severity levels to trigger instant 3D highlighting.
   - **Engineering Memory Integration:** Displays historical failure rates, technical service bulletins (TSBs), standard operating procedures (SOPs), and root-cause analysis rationale.

---

## 🚀 How to Run

### Option 1: Direct Browser Launch (No installation required)
Simply double-click [`index.html`](file:///c:/Users/Ajith%20Krishna%20Swamy/OneDrive/Desktop/Engineering%20Memory%20Tata/index.html) or open it directly in Chrome, Edge, or Firefox.

### Option 2: Run via Python Server
Run the provided [`app.py`](file:///c:/Users/Ajith%20Krishna%20Swamy/OneDrive/Desktop/Engineering%20Memory%20Tata/app.py):
```bash
python app.py
```
Then visit:
```
http://localhost:8080
```

---

## 📂 Project Architecture

```
Engineering Memory Tata/
├── index.html            # Main 3D WebGL Dashboard with Three.js CAD viewer
├── sample_reports.json   # Diagnostic telemetry & historical engineering memory data
├── app.py                # Optional local Python HTTP & REST API server
└── README.md             # Project documentation and guide
```

---

## 🛠️ How to Connect Your Own 3D Models (GLTF / OBJ / STL)

If you have your own 3D CAD models (e.g. `.glb`, `.gltf`, `.obj`, or `.stl`), you can load them in [`index.html`](file:///c:/Users/Ajith%20Krishna%20Swamy/OneDrive/Desktop/Engineering%20Memory%20Tata/index.html) using Three.js loaders:

```javascript
// Example: Loading a GLTF model
const loader = new THREE.GLTFLoader();
loader.load('path/to/vehicle_model.glb', (gltf) => {
  const model = gltf.scene;
  
  // Tag mesh sub-components with your diagnostic IDs
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes("Turbo")) registerPart('turbocharger', child);
      if (child.name.includes("Brake")) registerPart('brake_assembly', child);
    }
  });

  scene.add(model);
});
```
