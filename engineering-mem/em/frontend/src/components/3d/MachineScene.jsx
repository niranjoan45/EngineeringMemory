import React, { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, Crosshair, ZoomIn } from 'lucide-react';

/**
 * MachineScene — the interactive 3D engineering reference assembly.
 *
 * This is a generic box-geometry twin, labelled "reference assembly" on screen
 * because it is NOT a CAD model of any specific fleet machine. The machine
 * identity shown to the user always comes from the machine record under
 * diagnosis, never from this component.
 *
 * Component ids match exactly what the diagnosis engine returns as
 * `component_id`, so a diagnosis can focus and highlight the right assembly.
 *
 * Only assemblies that can be identified as distinct external geometry are
 * mapped. Internal components (pump internals, valve spools) are represented
 * at their nearest external housing location with an engineering callout.
 */
export const COMPONENT_DEFINITIONS = {
  // Hydraulic system — external housings on the right side of the machine
  comp_pump:        { name: 'Hydraulic Pump',        subsystem: 'Hydraulics',    pos: [0.72, 0.82, -0.38], size: [0.52, 0.46, 0.44], paint: 'steel',   note: 'External pump housing. Internal rotating group not directly visible.' },
  comp_cooler:      { name: 'Hydraulic Cooler',       subsystem: 'Cooling',       pos: [-0.78, 1.02, -0.52], size: [0.42, 0.58, 0.62], paint: 'steel',   note: 'Cooler core behind front grille.' },
  comp_filter:      { name: 'Hydraulic Filter',       subsystem: 'Hydraulics',    pos: [0.62, 0.72, 0.18],  size: [0.22, 0.38, 0.22], paint: 'dark',    note: 'Return-line filter canister.' },
  comp_valve:       { name: 'Main Control Valve',     subsystem: 'Hydraulics',    pos: [0.08, 0.88, 0.22],  size: [0.48, 0.38, 0.44], paint: 'dark',    note: 'Valve block under cab floor. Internal spools not visible.' },
  comp_accumulator: { name: 'Hydraulic Accumulator',  subsystem: 'Hydraulics',    pos: [0.88, 1.10, 0.12],  size: [0.36, 0.64, 0.36], paint: 'steel',   note: 'Hydraulic accumulator canister. Nitrogen pre-charge damping & reserve pressure.' },
  comp_oil:         { name: 'Hydraulic Tank',         subsystem: 'Hydraulics',    pos: [-0.62, 0.82, 0.18], size: [0.48, 0.58, 0.52], paint: 'machine', note: 'Hydraulic reservoir on left side.' },
  comp_lines:       { name: 'Hydraulic Lines',        subsystem: 'Hydraulics',    pos: [0.18, 1.12, 0.08],  size: [0.12, 0.82, 0.12], paint: 'steel',   note: 'High-pressure hose bundle.' },
  // Powertrain
  comp_engine:      { name: 'Engine',                 subsystem: 'Powertrain',    pos: [0, 0.82, -0.62],    size: [0.88, 0.62, 0.72], paint: 'dark',    note: 'Engine compartment rear.' },
  // Implement system
  comp_lift_arm:    { name: 'Lift Arms',              subsystem: 'Implement',     pos: [0, 1.62, 0.88],     size: [1.52, 0.12, 0.16], rot: [-0.18, 0, 0], paint: 'machine', note: 'Radial lift arm assembly cross-member.' },
  comp_arm:         { name: 'Arm Cylinder',           subsystem: 'Implement',     pos: [0.52, 1.38, 0.62],  size: [0.14, 0.62, 0.14], rot: [-0.28, 0, 0], paint: 'steel',   note: 'Arm cylinder assembly.' },
  comp_bucket:      { name: 'Bucket / Attachment',   subsystem: 'Implement',     pos: [0, 0.88, 1.52],     size: [1.52, 0.52, 0.38], paint: 'dark',    note: 'Quick-attach bucket.' },
  comp_tilt_cyl:    { name: 'Tilt Cylinder',         subsystem: 'Implement',     pos: [0.52, 1.22, 1.12],  size: [0.18, 0.62, 0.18], paint: 'steel',   note: 'Bucket tilt hydraulic cylinder.' },
  comp_lift_cyl:    { name: 'Lift Cylinder',         subsystem: 'Implement',     pos: [0.62, 1.18, 0.42],  size: [0.18, 0.72, 0.18], rot: [-0.28, 0, 0], paint: 'steel', note: 'Lift arm hydraulic cylinder.' },
  comp_boom:        { name: 'Boom Cylinder',          subsystem: 'Implement',     pos: [0.62, 1.18, 0.42],  size: [0.18, 0.72, 0.18], rot: [-0.28, 0, 0], paint: 'steel', note: 'Boom hydraulic cylinder.' },
  // Drive system
  comp_travel:      { name: 'Undercarriage / Drive', subsystem: 'Drive',         pos: [0, 0.28, 0],        size: [1.82, 0.44, 2.62], paint: 'dark',    note: 'Rubber track undercarriage.' },
  comp_drive_motor: { name: 'Drive Motor',           subsystem: 'Drive',         pos: [0.82, 0.42, -0.88], size: [0.28, 0.32, 0.28], paint: 'steel',   note: 'Hydraulic drive motor, rear sprocket.' },
  comp_swing:       { name: 'Swing Motor',            subsystem: 'Drive',         pos: [0, 0.72, 0],        size: [0.38, 0.38, 0.38], paint: 'dark',    note: 'Swing motor & reduction gearbox.' },
  // Control system
  comp_pilot:       { name: 'Pilot / Control System', subsystem: 'Control',      pos: [-0.22, 1.34, 0.16], size: [0.36, 0.32, 0.36], paint: 'dark',    note: 'Pilot pressure manifold under cab.' },
};

const PAINT = {
  machine: { color: '#C58B2A', metalness: 0.32, roughness: 0.58 },
  steel:   { color: '#8A9298', metalness: 0.72, roughness: 0.42 },
  dark:    { color: '#3C4348', metalness: 0.58, roughness: 0.52 },
};

export const SUBSYSTEM_FILTERS = ['All', 'Hydraulics', 'Implement', 'Drive', 'Powertrain', 'Cooling', 'Control'];

const MACHINE_CENTRE = new THREE.Vector3(0, 1.0, 0.2);
const VIEW_DIR       = new THREE.Vector3(0.52, 0.38, 0.76).normalize();
const HOME_POSITION  = new THREE.Vector3(5.2, 3.6, 5.8);
const HOME_TARGET    = new THREE.Vector3(0, 1.0, 0.2);

// Machine state visual modifiers
const STATE_OVERLAY = {
  normal:    null,
  scanning:  { color: '#163A5F', emissiveIntensity: 0.06 },
  faulted:   null,
  verified:  null,
};

function CameraRig({ controlsRef, focus, enabled, onSettled }) {
  const desiredPos    = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const active        = useRef(false);

  useEffect(() => {
    if (!focus || !enabled) { active.current = false; onSettled?.(); return; }
    const def = COMPONENT_DEFINITIONS[focus];
    if (!def) return;
    const component = new THREE.Vector3(...def.pos);
    // Target directly at the component center
    desiredTarget.current.copy(component);

    // Calculate elevated outward-facing view vector from the component so line of sight is clear
    const sideX = component.x >= 0 ? 1.8 : -1.8;
    const sideZ = component.z >= 0 ? 1.6 : -1.2;
    const viewVector = new THREE.Vector3(sideX, 1.1, sideZ).normalize();

    // 4.6 distance gives an ideal elevated view of the affected part in context
    const distance = 4.6;
    desiredPos.current.copy(component).addScaledVector(viewVector, distance);
    active.current = true;
  }, [focus, enabled, onSettled]);

  useFrame(() => {
    if (!active.current || !controlsRef.current) return;
    const c = controlsRef.current;
    c.target.lerp(desiredTarget.current, 0.08);
    c.object.position.lerp(desiredPos.current, 0.08);
    c.update();
    if (c.object.position.distanceTo(desiredPos.current) < 0.05) {
      active.current = false;
      onSettled?.();
    }
  });

  return null;
}

// Auto zoom-in / zoom-out breathing camera
function AutoCamera({ controlsRef, active }) {
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!active || !controlsRef.current) return;
    t.current += delta * 0.28;
    const c = controlsRef.current;
    // Slow orbit around the machine
    const angle = t.current * 0.18;
    // Zoom breathes between 4.5 and 7.5 units
    const zoom = 6.0 + Math.sin(t.current * 0.55) * 1.5;
    const height = 2.8 + Math.sin(t.current * 0.32) * 0.6;
    c.object.position.set(
      Math.sin(angle) * zoom,
      height,
      Math.cos(angle) * zoom
    );
    c.object.lookAt(HOME_TARGET);
    c.update();
  });
  return null;
}

// Floating target beacon hovering over the diagnosed affected component
function SuspectedPin({ pos, size }) {
  const pinRef = useRef();
  const yOffset = (size?.[1] || 0.4) * 0.5 + 0.55;

  useFrame(({ clock }) => {
    if (!pinRef.current) return;
    const t = clock.getElapsedTime();
    pinRef.current.position.y = pos[1] + yOffset + Math.sin(t * 4.0) * 0.10;
    pinRef.current.rotation.y = t * 2.2;
  });

  return (
    <group ref={pinRef} position={[pos[0], pos[1] + yOffset, pos[2]]} renderOrder={1000}>
      {/* Floating Diamond Indicator — depthTest false so it is always 100% visible */}
      <mesh>
        <octahedronGeometry args={[0.26, 0]} />
        <meshBasicMaterial color="#FF1E27" depthTest={false} />
      </mesh>
      {/* Target Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
        <ringGeometry args={[0.32, 0.44, 32]} />
        <meshBasicMaterial color="#FF1E27" side={THREE.DoubleSide} transparent opacity={0.9} depthTest={false} />
      </mesh>
      {/* Vertical pointer ray down to component */}
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.40, 8]} />
        <meshBasicMaterial color="#FF2222" depthTest={false} />
      </mesh>
    </group>
  );
}

function ComponentMesh({ id, def, mode, dimmed, machineState, onSelect }) {
  const meshRef = useRef();
  const wireRef = useRef();
  const [hovered, setHovered] = useState(false);
  const paint = PAINT[def.paint] || PAINT.steel;

  // Real-time sinusoidal pulsing emissive glow for the diagnosed component
  useFrame(({ clock }) => {
    if (!meshRef.current || !meshRef.current.material) return;
    if (mode === 'suspected') {
      const t = clock.getElapsedTime();
      const pulse = (Math.sin(t * 5.0) + 1.0) * 0.5; // 0 to 1
      meshRef.current.material.emissive.set('#FF0000');
      meshRef.current.material.emissiveIntensity = 1.0 + pulse * 1.5;
      meshRef.current.material.color.set(pulse > 0.5 ? '#FF2222' : '#DC2626');
      if (wireRef.current) {
        wireRef.current.scale.setScalar(1.04 + pulse * 0.06);
      }
    }
  });

  let color = paint.color;
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (mode === 'suspected') {
    color = '#FF1E27';
    emissive = '#FF1E27';
    emissiveIntensity = 1.4;
  } else if (mode === 'selected') {
    color = '#F59E0B';
    emissive = '#F59E0B';
    emissiveIntensity = 0.35;
  } else if (machineState === 'scanning' && !dimmed) {
    emissive = '#163A5F';
    emissiveIntensity = 0.05;
  } else if (hovered) {
    color = '#D8B15C';
    emissiveIntensity = 0.12;
  }

  return (
    <group renderOrder={mode === 'suspected' ? 100 : 0}>
      <mesh
        ref={meshRef}
        position={def.pos}
        rotation={def.rot || [0, 0, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(id, def); }}
      >
        <boxGeometry args={def.size} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={mode === 'suspected' ? 0.1 : paint.metalness}
          roughness={mode === 'suspected' ? 0.2 : paint.roughness}
          transparent={dimmed}
          opacity={dimmed ? 0.08 : 1}
          depthWrite={!dimmed}
        />
      </mesh>

      {/* High-visibility X-ray silhouette wireframe — shines through ALL geometry */}
      {mode === 'suspected' && (
        <mesh
          ref={wireRef}
          position={def.pos}
          rotation={def.rot || [0, 0, 0]}
          renderOrder={999}
        >
          <boxGeometry args={[def.size[0] * 1.04, def.size[1] * 1.04, def.size[2] * 1.04]} />
          <meshBasicMaterial
            color="#FF1E27"
            wireframe
            transparent
            opacity={0.92}
            depthTest={false}
          />
        </mesh>
      )}

      {mode === 'suspected' && (
        <SuspectedPin pos={def.pos} size={def.size} />
      )}
    </group>
  );
}

// Reusable steel material
const STEEL_MAT = { color: '#8A9298', metalness: 0.78, roughness: 0.35 };
const YELLOW_MAT = { color: '#C58B2A', metalness: 0.28, roughness: 0.55 };
const DARK_MAT   = { color: '#2C3237', metalness: 0.65, roughness: 0.50 };

function Box({ pos, size, rot, mat }) {
  return (
    <mesh position={pos} rotation={rot || [0,0,0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial {...mat} />
    </mesh>
  );
}
function Cyl({ pos, rot, rTop, rBot, h, seg=16, mat }) {
  return (
    <mesh position={pos} rotation={rot || [0,0,0]} castShadow receiveShadow>
      <cylinderGeometry args={[rTop, rBot, h, seg]} />
      <meshStandardMaterial {...mat} />
    </mesh>
  );
}

// Machine body — detailed external geometry of the reference assembly
function MachineBody({ machineState, isDimmed = false }) {
  const scanRef = useRef();
  useFrame(() => {
    if (machineState !== 'scanning' || !scanRef.current) return;
    scanRef.current.material.opacity = 0.04 + Math.abs(Math.sin(Date.now() * 0.0008)) * 0.07;
  });

  const ghostProps = isDimmed ? { transparent: true, opacity: 0.08, depthWrite: false } : {};

  const bodyMat  = isDimmed ? { color: '#C58B2A', metalness: 0.28, roughness: 0.55, ...ghostProps } : YELLOW_MAT;
  const darkMat  = isDimmed ? { color: '#4B5563', metalness: 0.65, roughness: 0.50, ...ghostProps } : DARK_MAT;
  const steelMat = isDimmed ? { color: '#8A9298', metalness: 0.78, roughness: 0.35, ...ghostProps } : STEEL_MAT;
  const trackMat = isDimmed ? { color: '#1E2428', metalness: 0.4,  roughness: 0.88, ...ghostProps } : { color: '#1E2428', metalness: 0.4, roughness: 0.88 };
  const cabFrameMat = isDimmed ? { color: '#64748B', metalness: 0.50, roughness: 0.40, ...ghostProps } : { color: '#1E2428', metalness: 0.75, roughness: 0.35 };
  const glassOpacity = isDimmed ? 0.04 : 0.35;

  return (
    <group>
      {/* ── TRACKS ── */}
      {[-0.88, 0.88].map((x) => (
        <group key={x}>
          {/* Main track body */}
          <mesh position={[x, 0.26, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.38, 2.8]} />
            <meshStandardMaterial {...trackMat} />
          </mesh>
          {/* Track pad detail — top surface */}
          {[-1.1,-0.7,-0.3,0.1,0.5,0.9].map((z) => (
            <mesh key={z} position={[x, 0.46, z]}>
              <boxGeometry args={[0.40, 0.06, 0.18]} />
              <meshStandardMaterial color="#161A1D" metalness={0.3} roughness={0.95} {...(isDimmed ? ghostProps : {})} />
            </mesh>
          ))}
          {/* Front idler wheel */}
          <Cyl pos={[x, 0.26, 1.28]} rot={[0,0,Math.PI/2]} rTop={0.26} rBot={0.26} h={0.32} seg={20} mat={steelMat} />
          <Cyl pos={[x, 0.26, 1.28]} rot={[0,0,Math.PI/2]} rTop={0.18} rBot={0.18} h={0.36} seg={16} mat={darkMat} />
          {/* Rear drive sprocket */}
          <Cyl pos={[x, 0.26, -1.28]} rot={[0,0,Math.PI/2]} rTop={0.28} rBot={0.28} h={0.32} seg={20} mat={steelMat} />
          <Cyl pos={[x, 0.26, -1.28]} rot={[0,0,Math.PI/2]} rTop={0.16} rBot={0.16} h={0.36} seg={8} mat={darkMat} />
          {/* Mid rollers */}
          {[-0.6, 0, 0.6].map((z) => (
            <Cyl key={z} pos={[x, 0.10, z]} rot={[0,0,Math.PI/2]} rTop={0.10} rBot={0.10} h={0.30} seg={12} mat={steelMat} />
          ))}
        </group>
      ))}

      {/* ── CHASSIS FRAME ── */}
      <Box pos={[0, 0.52, 0]} size={[1.72, 0.28, 2.6]} mat={darkMat} />
      {/* Side skirts */}
      {[-0.82, 0.82].map((x) => (
        <Box key={x} pos={[x, 0.62, 0]} size={[0.08, 0.48, 2.5]} mat={darkMat} />
      ))}

      {/* ── MAIN BODY ── */}
      <mesh position={[0, 0.96, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.64, 0.76, 2.2]} />
        <meshStandardMaterial {...bodyMat} />
      </mesh>
      {/* Body side panels with slight bevel feel */}
      {[-0.80, 0.80].map((x) => (
        <mesh key={x} position={[x, 1.02, -0.12]} castShadow>
          <boxGeometry args={[0.06, 0.64, 2.1]} />
          <meshStandardMaterial color="#B07A22" metalness={0.35} roughness={0.52} {...(isDimmed ? ghostProps : {})} />
        </mesh>
      ))}

      {/* ── ENGINE HOOD (rear) ── */}
      <mesh position={[0, 1.38, -0.98]} castShadow>
        <boxGeometry args={[1.58, 0.62, 0.96]} />
        <meshStandardMaterial color="#B07A22" metalness={0.30} roughness={0.58} {...(isDimmed ? ghostProps : {})} />
      </mesh>
      {/* Hood louvres */}
      {[-0.3,0,0.3].map((z) => (
        <mesh key={z} position={[0, 1.70, -0.98+z*0.18]}>
          <boxGeometry args={[1.52, 0.04, 0.10]} />
          <meshStandardMaterial color="#8A7020" metalness={0.5} roughness={0.6} {...(isDimmed ? ghostProps : {})} />
        </mesh>
      ))}
      {/* Exhaust stack */}
      <Cyl pos={[0.52, 1.98, -1.18]} rTop={0.055} rBot={0.065} h={0.52} seg={12} mat={darkMat} />
      <Cyl pos={[0.52, 2.26, -1.18]} rTop={0.09} rBot={0.055} h={0.08} seg={12} mat={darkMat} />

      {/* ── COUNTERWEIGHT ── */}
      <mesh position={[0, 0.78, -1.38]} castShadow>
        <boxGeometry args={[1.52, 0.56, 0.32]} />
        <meshStandardMaterial color="#1E2428" metalness={0.65} roughness={0.55} {...(isDimmed ? ghostProps : {})} />
      </mesh>

      {/* ── HOLLOW OPERATOR CABIN (never blocks interior or diagnosed parts) ── */}
      {/* Cab floor plate */}
      <mesh position={[0, 1.32, 0.18]} castShadow>
        <boxGeometry args={[1.30, 0.08, 1.14]} />
        <meshStandardMaterial {...(isDimmed ? { ...darkMat } : darkMat)} />
      </mesh>
      {/* Cab rear bulkhead */}
      <mesh position={[0, 1.74, -0.38]} castShadow>
        <boxGeometry args={[1.28, 0.84, 0.06]} />
        <meshStandardMaterial {...cabFrameMat} />
      </mesh>
      {/* Cab front lower cowl */}
      <mesh position={[0, 1.44, 0.72]} castShadow>
        <boxGeometry args={[1.28, 0.22, 0.06]} />
        <meshStandardMaterial {...cabFrameMat} />
      </mesh>
      {/* ROPS Corner Posts */}
      {[-0.60, 0.60].map((x) => (
        <group key={x}>
          <Box pos={[x, 1.82, 0.72]} size={[0.07, 0.94, 0.07]} mat={cabFrameMat} />
          <Box pos={[x, 1.82, -0.38]} size={[0.07, 0.94, 0.07]} mat={cabFrameMat} />
        </group>
      ))}
      {/* Cab Roof */}
      <Box pos={[0, 2.30, 0.18]} size={[1.32, 0.08, 1.20]} mat={cabFrameMat} />

      {/* Cab Glass Windows (completely see-through in Ghost Mode) */}
      {/* Windshield */}
      <mesh position={[0, 1.86, 0.72]}>
        <boxGeometry args={[1.16, 0.60, 0.04]} />
        <meshStandardMaterial color="#A8C8E0" metalness={0.05} roughness={0.02} transparent opacity={glassOpacity} depthWrite={!isDimmed} />
      </mesh>
      {/* Left Window */}
      <mesh position={[-0.62, 1.82, 0.18]}>
        <boxGeometry args={[0.04, 0.90, 1.02]} />
        <meshStandardMaterial color="#A8C8E0" metalness={0.05} roughness={0.02} transparent opacity={glassOpacity} depthWrite={!isDimmed} />
      </mesh>
      {/* Right Window */}
      <mesh position={[0.62, 1.82, 0.18]}>
        <boxGeometry args={[0.04, 0.90, 1.02]} />
        <meshStandardMaterial color="#A8C8E0" metalness={0.05} roughness={0.02} transparent opacity={glassOpacity} depthWrite={!isDimmed} />
      </mesh>

      {/* ── INTERIOR OPERATOR STATION ── */}
      {/* Seat */}
      <mesh position={[-0.15, 1.55, 0.08]} castShadow>
        <boxGeometry args={[0.38, 0.44, 0.38]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.2} {...(isDimmed ? ghostProps : {})} />
      </mesh>
      {/* Control Console */}
      <mesh position={[-0.15, 1.48, 0.38]}>
        <boxGeometry args={[0.42, 0.26, 0.20]} />
        <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} {...(isDimmed ? ghostProps : {})} />
      </mesh>
      {/* Pilot Control Levers */}
      <mesh position={[-0.28, 1.62, 0.32]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        <meshStandardMaterial color="#D97706" roughness={0.3} metalness={0.7} {...(isDimmed ? ghostProps : {})} />
      </mesh>
      <mesh position={[-0.02, 1.62, 0.32]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        <meshStandardMaterial color="#D97706" roughness={0.3} metalness={0.7} {...(isDimmed ? ghostProps : {})} />
      </mesh>

      {/* ── LIFT ARMS ── */}
      {[-0.72, 0.72].map((x) => (
        <group key={x}>
          {/* Main arm tube */}
          <mesh position={[x, 1.62, 0.88]} rotation={[-0.22, 0, 0]} castShadow>
            <boxGeometry args={[0.14, 0.18, 1.9]} />
            <meshStandardMaterial {...bodyMat} />
          </mesh>
          {/* Arm pivot boss rear */}
          <Cyl pos={[x, 1.18, -0.12]} rot={[0,0,Math.PI/2]} rTop={0.12} rBot={0.12} h={0.18} seg={12} mat={steelMat} />
          {/* Arm pivot boss front */}
          <Cyl pos={[x, 1.72, 1.72]} rot={[0,0,Math.PI/2]} rTop={0.10} rBot={0.10} h={0.18} seg={12} mat={steelMat} />
        </group>
      ))}
      {/* Cross brace */}
      <Box pos={[0, 1.68, 0.88]} size={[1.44, 0.12, 0.12]} mat={darkMat} />

      {/* ── LIFT CYLINDERS ── */}
      {[-0.52, 0.52].map((x) => (
        <group key={x}>
          <Cyl pos={[x, 1.28, 0.32]} rot={[-0.32,0,0]} rTop={0.065} rBot={0.065} h={0.88} seg={10} mat={steelMat} />
          <Cyl pos={[x, 1.52, 0.72]} rot={[-0.32,0,0]} rTop={0.048} rBot={0.048} h={0.52} seg={10} mat={steelMat} />
        </group>
      ))}

      {/* ── BUCKET ── */}
      <mesh position={[0, 0.92, 1.72]} castShadow receiveShadow>
        <boxGeometry args={[1.58, 0.48, 0.52]} />
        <meshStandardMaterial {...darkMat} />
      </mesh>
      {/* Bucket cutting edge */}
      <mesh position={[0, 0.70, 1.96]}>
        <boxGeometry args={[1.58, 0.08, 0.06]} />
        <meshStandardMaterial {...steelMat} />
      </mesh>
      {/* Bucket teeth */}
      {[-0.56,-0.28,0,0.28,0.56].map((x) => (
        <mesh key={x} position={[x, 0.64, 2.02]} castShadow>
          <boxGeometry args={[0.10, 0.12, 0.14]} />
          <meshStandardMaterial {...steelMat} />
        </mesh>
      ))}
      {/* Tilt cylinder */}
      <Cyl pos={[0, 1.18, 1.52]} rot={[0.4,0,0]} rTop={0.055} rBot={0.055} h={0.72} seg={10} mat={steelMat} />

      {/* ── HYDRAULIC HOSES ── */}
      <Cyl pos={[0.62, 1.22, 0.52]} rot={[-0.18,0.08,0]} rTop={0.028} rBot={0.028} h={1.1} seg={8} mat={darkMat} />
      <Cyl pos={[0.68, 1.22, 0.52]} rot={[-0.18,0.06,0]} rTop={0.022} rBot={0.022} h={1.1} seg={8} mat={darkMat} />

      {/* ── FRONT GRILLE ── */}
      <mesh position={[0, 1.08, 1.38]}>
        <boxGeometry args={[1.58, 0.52, 0.06]} />
        <meshStandardMaterial {...darkMat} />
      </mesh>
      {[-0.5,-0.25,0,0.25,0.5].map((x) => (
        <mesh key={x} position={[x, 1.08, 1.42]}>
          <boxGeometry args={[0.06, 0.44, 0.04]} />
          <meshStandardMaterial {...darkMat} />
        </mesh>
      ))}

      {/* ── HEADLIGHTS ── */}
      {[-0.58, 0.58].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.32, 1.40]}>
            <boxGeometry args={[0.18, 0.12, 0.06]} />
            <meshStandardMaterial color="#F0F4F8" metalness={0.1} roughness={0.05} emissive="#E8EEF4" emissiveIntensity={isDimmed ? 0.02 : 0.4} {...(isDimmed ? ghostProps : {})} />
          </mesh>
        </group>
      ))}

      {/* Scanning overlay */}
      {machineState === 'scanning' && (
        <mesh ref={scanRef} position={[0, 1.4, 0.2]}>
          <boxGeometry args={[2.1, 3.2, 3.4]} />
          <meshStandardMaterial color="#0B2545" transparent opacity={0.05} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

// Loading overlay shown while Canvas initialises
function MachineLoadingOverlay({ stage, machineLabel }) {
  const stages = [
    'INITIALIZING MACHINE MODEL',
    'CALIBRATING VIEW',
    'LOADING ENGINEERING GEOMETRY',
  ];
  const label = stages[stage % stages.length];
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-em-panel">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center bg-em-graphite font-mono text-xs font-bold text-em-amber">
          3D
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-em-graphite">
          {machineLabel}
        </span>
      </div>
      <div className="w-48 overflow-hidden border border-em-navy/30 bg-em-surface">
        <div className="h-0.5 animate-sweep bg-em-amber" />
      </div>
      <span className="font-mono text-2xs uppercase tracking-[0.18em] text-em-steel">{label}</span>
    </div>
  );
}

export default function MachineScene({
  machineLabel           = 'Reference assembly',
  highlightedComponentId = null,
  selectedComponentId    = null,
  onSelectComponent      = () => {},
  activeSubsystem        = 'All',
  focusComponentId       = null,
  autoFocus              = true,
  autoRotate             = false,
  idleDrift              = false,
  machineState           = 'normal',
  showSubsystemBar       = true,
  showCallout            = true,
  className              = 'h-[420px] w-full',
  defaultViewMode        = 'original',
  forceOriginalView      = false,
}) {
  const controlsRef = useRef();
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [settled, setSettled]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [loadStage, setLoadStage] = useState(0);

  useEffect(() => {
    if (defaultViewMode) setViewMode(defaultViewMode);
  }, [defaultViewMode]);

  // Simulate progressive loading stages
  useEffect(() => {
    const t1 = setTimeout(() => setLoadStage(1), 320);
    const t2 = setTimeout(() => setLoadStage(2), 680);
    const t3 = setTimeout(() => { setLoadStage(3); setLoaded(true); }, 1050);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const focusTarget = focusComponentId || highlightedComponentId;
  const focusDef    = focusTarget ? COMPONENT_DEFINITIONS[focusTarget] : null;
  const selectedDef = selectedComponentId ? COMPONENT_DEFINITIONS[selectedComponentId] : null;
  const entries     = useMemo(() => Object.entries(COMPONENT_DEFINITIONS), []);

  const isGhostActive = false;

  const handleSettled = useCallback(() => setSettled(true), []);
  useEffect(() => { if (focusTarget && autoFocus) setSettled(false); }, [focusTarget, autoFocus]);

  const resetView = () => {
    if (!controlsRef.current) return;
    controlsRef.current.target.copy(HOME_TARGET);
    controlsRef.current.object.position.copy(HOME_POSITION);
    controlsRef.current.update();
    setViewMode('original');
  };

  const activeDef = focusDef || selectedDef;

  return (
    <div className={`relative bg-em-panel ${className}`}>
      {!loaded && <MachineLoadingOverlay stage={loadStage} machineLabel={machineLabel} />}

      {showSubsystemBar && (
        <div className="flex items-center justify-end gap-2 border-b border-em-line bg-em-surface px-3 py-2">
          <button onClick={resetView} className="btn-ghost px-2.5 py-1 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      )}

      <div className="relative" style={{ height: showSubsystemBar ? 'calc(100% - 41px)' : '100%' }}>
        {/* Engineering callout overlay */}
        {showCallout && focusDef && (
          <div className="absolute left-3 bottom-3 z-10 max-w-[17rem] border-2 border-red-500 bg-white/95 px-3.5 py-3 shadow-panel animate-calloutFade">
            <div className="flex items-center gap-1.5 border-b border-red-200 pb-2 mb-2">
              <Crosshair className="h-3.5 w-3.5 text-red-600 animate-pulse" />
              <span className="font-mono text-2xs font-bold uppercase tracking-[0.16em] text-red-600">AFFECTED COMPONENT</span>
            </div>
            <span className="block text-sm font-bold text-em-graphite">{focusDef.name}</span>
            <span className="tech-value mt-0.5 block font-semibold text-red-600">{focusDef.subsystem} subsystem</span>
            {focusDef.note && (
              <p className="mt-1.5 border-t border-em-line pt-1.5 text-2xs leading-relaxed text-em-steel">
                {focusDef.note}
              </p>
            )}
          </div>
        )}

        {showCallout && !focusDef && selectedDef && (
          <div className="absolute left-3 bottom-3 z-10 max-w-[17rem] border border-em-line bg-em-surface/96 px-3 py-2.5 shadow-panel animate-calloutFade">
            <span className="font-mono text-2xs font-bold uppercase tracking-[0.16em] text-em-graphite">Selected</span>
            <span className="mt-1 block text-sm font-bold text-em-graphite">{selectedDef.name}</span>
            <span className="tech-value mt-0.5 block">{selectedDef.subsystem} subsystem</span>
            {selectedDef.note && (
              <p className="mt-1.5 border-t border-em-line pt-1.5 text-2xs leading-relaxed text-em-steel">
                {selectedDef.note}
              </p>
            )}
          </div>
        )}

        <Canvas
          shadows
          camera={{ position: [5.2, 3.6, 5.8], fov: 40 }}
          dpr={[1, 1.5]}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.6s ease-out' }}
        >
          <color attach="background" args={['#F0EFEB']} />
          <ambientLight intensity={0.45} />
          <hemisphereLight intensity={0.75} groundColor="#C8C4BC" color="#FFFFFF" />
          <directionalLight position={[6, 10, 7]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={0.5} shadow-camera-far={30} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
          <directionalLight position={[-5, 4, -4]} intensity={0.45} color="#FFF5E8" />
          <directionalLight position={[0, 2, -6]} intensity={0.22} color="#E8EEF5" />

          <group position={[0, 0, 0]}>
            <MachineBody machineState={machineState} isDimmed={isGhostActive} />

            {entries.map(([id, def]) => {
              const isSuspected = (focusTarget === id) || (highlightedComponentId === id);
              const isSelected = selectedComponentId === id;
              const dimmed = isGhostActive ? !isSuspected : false;
              const mode =
                isSuspected ? 'suspected'
                : isSelected ? 'selected'
                : null;
              return (
                <ComponentMesh
                  key={id}
                  id={id}
                  def={def}
                  mode={mode}
                  dimmed={dimmed}
                  machineState={machineState}
                  onSelect={onSelectComponent}
                />
              );
            })}
          </group>

          <CameraRig controlsRef={controlsRef} focus={focusTarget} enabled={autoFocus} onSettled={handleSettled} />
          <AutoCamera controlsRef={controlsRef} active={idleDrift && !focusTarget} />

          <Grid
            position={[0, 0, 0]}
            args={[28, 28]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#C8CDD4"
            sectionSize={2.5}
            sectionThickness={0.9}
            sectionColor="#0B2545"
            sectionOpacity={0.12}
            fadeDistance={28}
            fadeStrength={1.4}
          />
          <ContactShadows position={[0, 0.02, 0]} opacity={0.32} scale={14} blur={2.2} far={5} />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.07}
            autoRotate={autoRotate && settled}
            autoRotateSpeed={0.38}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={2.2}
            maxDistance={18}
            makeDefault
          />
        </Canvas>

        {!activeDef && loaded && (
          <p className="absolute bottom-3 left-3 z-10 bg-em-surface/90 px-2.5 py-1.5 text-2xs leading-relaxed text-em-steel">
            Drag to orbit · scroll to zoom · click any assembly to inspect
          </p>
        )}
      </div>
    </div>
  );
}
