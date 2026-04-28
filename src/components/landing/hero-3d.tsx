"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, MeshDistortMaterial, RoundedBox } from "@react-three/drei";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";
import { useIsMobile, usePrefersReducedMotion } from "./use-mobile";

function Coin({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y = state.clock.elapsedTime * 0.6;
        ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.2;
    });
    return (
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.2}>
            <mesh ref={ref} position={position} scale={scale} castShadow>
                <cylinderGeometry args={[1, 1, 0.18, 48]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.9}
                    roughness={0.15}
                    emissive={color}
                    emissiveIntensity={0.18}
                />
            </mesh>
        </Float>
    );
}

function GlowOrb({ position, color }: { position: [number, number, number]; color: string }) {
    return (
        <Float speed={2} floatIntensity={2}>
            <mesh position={position}>
                <sphereGeometry args={[0.6, 64, 64]} />
                <MeshDistortMaterial
                    color={color}
                    distort={0.4}
                    speed={2}
                    metalness={0.7}
                    roughness={0.2}
                    emissive={color}
                    emissiveIntensity={0.3}
                />
            </mesh>
        </Float>
    );
}

function Card3D({ position, rotation, color }: { position: [number, number, number]; rotation: [number, number, number]; color: string }) {
    return (
        <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.9}>
            <RoundedBox args={[1.6, 1.0, 0.06]} radius={0.08} smoothness={6} position={position} rotation={rotation} castShadow>
                <meshPhysicalMaterial
                    color={color}
                    metalness={0.5}
                    roughness={0.2}
                    transmission={0.3}
                    thickness={0.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </RoundedBox>
        </Float>
    );
}

function Scene({ heavy }: { heavy: boolean }) {
    const coins = useMemo(
        () => [
            { pos: [-2.4, 1.0, 0] as [number, number, number], color: "#a78bfa", scale: 0.7 },
            { pos: [2.6, -0.6, -0.5] as [number, number, number], color: "#22d3ee", scale: 0.9 },
            { pos: [0.5, 1.8, -1] as [number, number, number], color: "#f472b6", scale: 0.6 },
            { pos: [-1.5, -1.4, 0.5] as [number, number, number], color: "#34d399", scale: 0.55 },
        ],
        []
    );

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
            <pointLight position={[-3, 2, 4]} intensity={1.5} color="#a78bfa" />
            <pointLight position={[3, -2, 4]} intensity={1.2} color="#22d3ee" />

            {coins.map((c, i) => (
                <Coin key={i} position={c.pos} color={c.color} scale={c.scale} />
            ))}

            {heavy && (
                <>
                    <GlowOrb position={[2.2, 1.5, -1.5]} color="#a78bfa" />
                    <GlowOrb position={[-2.6, -0.4, -2]} color="#22d3ee" />
                    <Card3D position={[0, 0, 0.5]} rotation={[0.1, 0.4, 0]} color="#7c3aed" />
                    <Card3D position={[1.4, 0.6, -0.4]} rotation={[-0.05, -0.3, 0.05]} color="#0891b2" />
                </>
            )}

            <Suspense fallback={null}>
                <Environment preset="city" />
            </Suspense>
        </>
    );
}

export function Hero3D() {
    const isMobile = useIsMobile();
    const reduced = usePrefersReducedMotion();

    if (reduced) {
        return (
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="aurora-blob bg-primary/30 top-1/4 left-1/4 w-[400px] h-[400px]" />
                <div className="aurora-blob bg-chart-4/25 top-1/3 right-1/4 w-[500px] h-[500px]" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 -z-10">
            <Canvas
                camera={{ position: [0, 0, 6], fov: 50 }}
                dpr={isMobile ? [1, 1.25] : [1, 2]}
                gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
                style={{ background: "transparent" }}
            >
                <Scene heavy={!isMobile} />
            </Canvas>
        </div>
    );
}
