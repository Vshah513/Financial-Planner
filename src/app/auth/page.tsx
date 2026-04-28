"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthWelcomeTour } from "@/components/auth-welcome-tour";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParticleNetworkBg } from "@/components/landing/particle-network-bg";
import { Syne, DM_Sans } from "next/font/google";

const syne = Syne({ subsets: ["latin"], variable: "--font-landing-syne", weight: ["400", "700", "800"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-landing-dmsans", weight: ["300", "400", "500", "700"] });

const Hero3D = dynamic(() => import("@/components/landing/hero-3d").then((m) => m.Hero3D), {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#050d1a]/80" />,
});

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    useEffect(() => {
        if (searchParams.get("mode") === "signup") setActiveTab("signup");
    }, [searchParams]);

    useEffect(() => {
        const prefersReduced =
            typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (prefersReduced) return;

        const el = document.getElementById("cc-auth-cursor-glow");
        if (!el) return;

        let cx = window.innerWidth / 2;
        let cy = window.innerHeight / 2;
        let gcx = cx;
        let gcy = cy;
        let raf = 0;

        const onMove = (e: MouseEvent) => {
            cx = e.clientX;
            cy = e.clientY;
        };

        const anim = () => {
            gcx += (cx - gcx) * 0.07;
            gcy += (cy - gcy) * 0.07;
            el.style.left = `${gcx}px`;
            el.style.top = `${gcy}px`;
            raf = window.requestAnimationFrame(anim);
        };

        document.addEventListener("mousemove", onMove);
        anim();

        return () => {
            document.removeEventListener("mousemove", onMove);
            window.cancelAnimationFrame(raf);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (activeTab === "signin") {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name },
                    },
                });
                if (error) throw error;
            }
            router.push("/dashboard");
            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An error occurred";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={["cc-auth", syne.variable, dmSans.variable, "min-h-screen overflow-x-hidden"].join(" ")}
        >
            <AuthWelcomeTour />

            <ParticleNetworkBg className="cc-auth__bg-canvas" />
            <div className="cc-auth__orb cc-auth__orb--1" />
            <div className="cc-auth__orb cc-auth__orb--2" />
            <div className="cc-auth__orb cc-auth__orb--3" />
            <div id="cc-auth-cursor-glow" className="cc-auth__cursorGlow" />

            <header className="fixed top-0 left-0 right-0 z-30 p-4">
                <div className="cc-auth__nav max-w-6xl mx-auto flex items-center justify-between rounded-2xl px-4 py-2.5">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
                        <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-violet-400/40 transition">
                            <Image
                                src="/New Logo.png"
                                alt="Cash Clarity"
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                                priority
                            />
                        </div>
                        <span className="font-bold text-sm tracking-tight text-white">Cash Clarity</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link
                            href="/get-started"
                            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-violet-200/80 hover:text-white transition-colors"
                        >
                            Product tour first
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </header>

            <div className="cc-auth__app lg:grid lg:grid-cols-[1fr_min(480px,44vw)] lg:min-h-screen">
                {/* Left: 3D + story */}
                <div className="relative min-h-[42vh] lg:min-h-screen">
                    <div className="absolute inset-0">
                        <Hero3D />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#04040a]/15 via-[#04040a]/55 to-[#04040a] lg:bg-gradient-to-r lg:from-transparent lg:via-[#04040a]/35 lg:to-[#04040a]" />
                    </div>

                    <div
                        id="auth-hero"
                        className="relative z-10 flex flex-col justify-end lg:justify-center h-full px-6 sm:px-10 lg:px-14 pt-28 pb-10 lg:py-0 lg:max-w-xl lg:mx-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-4"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-violet-200">
                                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                                Sign in to your financial command center
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.08]">
                                Your runway,
                                <br />
                                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                    one login away.
                                </span>
                            </h1>
                            <p className="text-sm sm:text-base text-zinc-400 max-w-md leading-relaxed">
                                Connect your workspace, import transactions, and let Gemini explain your cash flow — without
                                another spreadsheet.
                            </p>
                        </motion.div>

                        <div className="mt-8" aria-hidden="true" />
                    </div>
                </div>

                {/* Right: form */}
                <div className="flex items-center justify-center px-4 sm:px-8 pb-16 lg:pb-0 pt-6 lg:pt-24">
                    <motion.div
                        id="auth-panel"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.45, delay: 0.1 }}
                        className="w-full max-w-[480px] border border-white/10 bg-[#0a1428]/85 backdrop-blur-xl shadow-2xl rounded-3xl p-8 sm:p-10"
                    >
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-full flex justify-center mb-5 lg:hidden">
                                <Image
                                    src="/New Logo.png"
                                    alt="Cash Clarity"
                                    width={120}
                                    height={120}
                                    className="object-contain rounded-2xl drop-shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                                    priority
                                />
                            </div>
                            <p className="text-[15px] font-medium text-zinc-400">
                                Solo business financial planning — with onboarding after you sign up.
                            </p>
                        </div>

                        <div className="w-full grid grid-cols-2 mb-8 bg-[#050d1a] border border-white/5 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("signin");
                                    setError("");
                                }}
                                className={cn(
                                    "rounded-lg py-3 font-semibold transition-all duration-200",
                                    activeTab === "signin"
                                        ? "bg-[#2563eb] text-white shadow-md"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab("signup");
                                    setError("");
                                }}
                                className={cn(
                                    "rounded-lg py-3 font-semibold transition-all duration-200",
                                    activeTab === "signup"
                                        ? "bg-[#2563eb] text-white shadow-md"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                {activeTab === "signup" && (
                                    <div className="space-y-2.5">
                                        <Label htmlFor="name" className="text-zinc-300 font-medium text-[15px]">
                                            Full Name
                                        </Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Jane Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required={activeTab === "signup"}
                                            className="bg-[#050d1a] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#2563eb] h-[52px] px-4 rounded-xl text-[16px]"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    <Label htmlFor="email" className="text-zinc-300 font-medium text-[15px]">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-[#050d1a] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#2563eb] h-[52px] px-4 rounded-xl text-[16px]"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <Label htmlFor="password" className="text-zinc-300 font-medium text-[15px]">
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="bg-[#050d1a] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#2563eb] h-[52px] px-4 rounded-xl text-[16px]"
                                    />
                                </div>

                                {activeTab === "signup" && (
                                    <div className="space-y-2.5">
                                        <Label htmlFor="confirmPassword" className="text-zinc-300 font-medium text-[15px]">
                                            Confirm Password
                                        </Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required={activeTab === "signup"}
                                            minLength={6}
                                            className="bg-[#050d1a] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-[#2563eb] h-[52px] px-4 rounded-xl text-[16px]"
                                        />
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <p className="text-[15px] text-red-400 text-center font-medium">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-[52px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-lg rounded-xl transition-colors"
                                disabled={loading}
                            >
                                {loading ? "Please wait..." : activeTab === "signin" ? "Sign In" : "Create Account"}
                            </Button>

                            <p className="text-center text-[11px] text-zinc-500 leading-relaxed">
                                AI features use your{" "}
                                <code className="text-zinc-400">GOOGLE_GENERATIVE_AI_API_KEY</code> — free tier from Google AI
                                Studio. No Vercel AI Gateway billing.
                            </p>
                        </form>
                    </motion.div>
                </div>
            </div>

            <style jsx global>{`
                .cc-auth {
                    min-height: 100vh;
                    background: #04040a;
                    color: #eeeef8;
                    font-family: var(--font-landing-dmsans), var(--font-geist-sans), ui-sans-serif, system-ui,
                        -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }

                .cc-auth__bg-canvas {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                }

                .cc-auth__orb {
                    position: fixed;
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 1;
                    filter: blur(90px);
                    will-change: transform;
                }
                .cc-auth__orb--1 {
                    width: 700px;
                    height: 700px;
                    background: radial-gradient(circle at center, rgba(59, 130, 246, 0.22), transparent 70%);
                    top: -260px;
                    left: -180px;
                    animation: cc-auth-orb1 22s ease-in-out infinite alternate;
                }
                .cc-auth__orb--2 {
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle at center, rgba(139, 92, 246, 0.18), transparent 70%);
                    bottom: -200px;
                    right: -80px;
                    animation: cc-auth-orb2 28s ease-in-out infinite alternate;
                }
                .cc-auth__orb--3 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle at center, rgba(6, 182, 212, 0.12), transparent 70%);
                    top: 40%;
                    left: 38%;
                    transform: translate(-50%, -50%);
                    animation: cc-auth-orb3 18s ease-in-out infinite alternate;
                }
                @keyframes cc-auth-orb1 {
                    to {
                        transform: translate(70px, 90px);
                    }
                }
                @keyframes cc-auth-orb2 {
                    to {
                        transform: translate(-60px, -70px);
                    }
                }
                @keyframes cc-auth-orb3 {
                    to {
                        transform: translate(-50%, -50%) translate(80px, -60px);
                    }
                }

                .cc-auth::after {
                    content: "";
                    position: fixed;
                    inset: 0;
                    z-index: 2;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
                    background-size: 180px;
                    opacity: 0.025;
                    pointer-events: none;
                }

                .cc-auth__cursorGlow {
                    position: fixed;
                    pointer-events: none;
                    width: 380px;
                    height: 380px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.07), transparent 65%);
                    transform: translate(-50%, -50%);
                    transition: opacity 0.3s;
                    z-index: 5;
                    will-change: transform, left, top;
                }

                .cc-auth__nav {
                    position: relative;
                    z-index: 10;
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    background: rgba(8, 8, 20, 0.5);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                }

                .cc-auth__app {
                    position: relative;
                    z-index: 10;
                }

                @media (prefers-reduced-motion: reduce) {
                    .cc-auth__orb {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
