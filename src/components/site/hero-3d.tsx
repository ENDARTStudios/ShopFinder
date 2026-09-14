"use client";

/**
 * ShopFinder — Hero 3D (React Three Fiber, #32)
 *
 * Camada decorativa do hero: chip estilizado + anel wireframe girando
 * lentamente. Carregada por next/dynamic (ssr: false) e montada apenas
 * quando o hero entra no viewport E o usuário não pediu reduced motion
 * — o fallback estático (gradiente) permanece como camada base.
 * Bundle 3D fora do caminho crítico (docs/eng/FRONTEND-DESIGN.md).
 */
import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

function Chip() {
  const group = useRef<Group>(null);
  const inner = useRef<Mesh>(null);

  useFrame((state, delta) => {
    // Rotação lenta e contínua — sem interação de ponteiro (decorativo)
    if (group.current) {
      group.current.rotation.y += delta * 0.15;
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.35;
    }
  });

  return (
    <group ref={group}>
      {/* Substrato do chip */}
      <mesh>
        <boxGeometry args={[1.6, 0.16, 1.6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Die central */}
      <mesh ref={inner} position={[0, 0.13, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.6]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      {/* Pinos */}
      {[-0.7, 0, 0.7].map((x) =>
        [-0.7, 0, 0.7].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0, z]}>
            <boxGeometry args={[0.08, 0.1, 0.08]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.4} />
          </mesh>
        ))
      )}
    </group>
  );
}

function OrbitRing() {
  const ring = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * 0.08;
  });

  return (
    <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
      <torusGeometry args={[2.2, 0.015, 8, 96]} />
      <meshBasicMaterial color="#10b981" transparent opacity={0.35} />
    </mesh>
  );
}

export default function Hero3D() {
  return (
    <Canvas
      aria-hidden
      camera={{ position: [2.6, 2.2, 3.2], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 3]} intensity={1.2} />
      <pointLight position={[-3, 2, -2]} intensity={0.6} color="#10b981" />
      <Chip />
      <OrbitRing />
    </Canvas>
  );
}
