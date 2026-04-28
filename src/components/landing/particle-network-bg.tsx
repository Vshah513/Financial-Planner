"use client";

import { useEffect, useRef } from "react";

type ParticleNetworkBgProps = {
    className?: string;
};

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
};

function prefersReducedMotion() {
    if (typeof window === "undefined") return true;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function ParticleNetworkBg({ className }: ParticleNetworkBgProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (prefersReducedMotion()) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const particles: Particle[] = [];

        const state = {
            w: 0,
            h: 0,
            raf: 0,
        };

        const rand = (min: number, max: number) => min + Math.random() * (max - min);

        const resize = () => {
            const { innerWidth: w, innerHeight: h } = window;
            state.w = w;
            state.h = h;
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const targetCount = Math.max(36, Math.min(130, Math.round((w * h) / 22000)));
            while (particles.length < targetCount) {
                particles.push({
                    x: rand(0, w),
                    y: rand(0, h),
                    vx: rand(-0.25, 0.25),
                    vy: rand(-0.25, 0.25),
                    r: rand(1.1, 2.2),
                });
            }
            particles.splice(targetCount);
        };

        const tick = () => {
            ctx.clearRect(0, 0, state.w, state.h);

            const maxDist = Math.max(120, Math.min(200, Math.sqrt(state.w * state.h) / 6));

            // particles
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < -10) p.x = state.w + 10;
                if (p.x > state.w + 10) p.x = -10;
                if (p.y < -10) p.y = state.h + 10;
                if (p.y > state.h + 10) p.y = -10;
            }

            // links
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d > maxDist) continue;
                    const t = 1 - d / maxDist;
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.11 * t})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // dots
            for (const p of particles) {
                ctx.fillStyle = "rgba(238, 238, 248, 0.25)";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            state.raf = window.requestAnimationFrame(tick);
        };

        const onVis = () => {
            if (document.visibilityState === "hidden") {
                window.cancelAnimationFrame(state.raf);
                state.raf = 0;
                return;
            }
            if (!state.raf) state.raf = window.requestAnimationFrame(tick);
        };

        resize();
        state.raf = window.requestAnimationFrame(tick);
        window.addEventListener("resize", resize, { passive: true });
        document.addEventListener("visibilitychange", onVis);

        return () => {
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", onVis);
            window.cancelAnimationFrame(state.raf);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            aria-hidden="true"
        />
    );
}

