"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Sparkles, LineChart, Bot, Zap, ShieldCheck, Wallet, Target } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { GradientCardShowcase } from "@/components/ui/gradient-card-showcase";

const Hero3D = dynamic(() => import("@/components/landing/hero-3d").then((m) => m.Hero3D), {
    ssr: false,
    loading: () => null,
});

const FEATURES = [
    {
        icon: Bot,
        title: "AI financial advisor",
        body: "Ask anything in plain English. Gemini reads your real ledger and answers with numbers — no guessing.",
        color: "from-violet-500 to-fuchsia-500",
    },
    {
        icon: Zap,
        title: "Auto-categorize",
        body: "Drop a CSV. AI sorts every transaction into your budget categories in seconds.",
        color: "from-cyan-400 to-blue-500",
    },
    {
        icon: LineChart,
        title: "Live dashboards",
        body: "Sankey, radar, heatmaps, and a real-time market ticker so you always know where you stand.",
        color: "from-emerald-400 to-teal-500",
    },
    {
        icon: Target,
        title: "Goals that actually work",
        body: "Set savings goals. We model runway, simulate life events, and tell you what's realistic.",
        color: "from-rose-400 to-pink-500",
    },
    {
        icon: Wallet,
        title: "Cash flow runway",
        body: "Burn rate, tax reserves, and pricing margin tools built for solo operators.",
        color: "from-amber-400 to-orange-500",
    },
    {
        icon: ShieldCheck,
        title: "Your data, your control",
        body: "Encrypted at rest. We don't sell your transactions.",
        color: "from-indigo-400 to-violet-500",
    },
];

export default function LandingPage() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
                <div className="aurora-blob bg-violet-500/20 -top-40 -left-40 w-[600px] h-[600px]" />
                <div
                    className="aurora-blob bg-cyan-500/20 top-1/3 -right-40 w-[700px] h-[700px]"
                    style={{ animationDelay: "-6s" }}
                />
                <div
                    className="aurora-blob bg-fuchsia-500/15 bottom-0 left-1/3 w-[500px] h-[500px]"
                    style={{ animationDelay: "-12s" }}
                />
            </div>

            <header className="fixed top-0 left-0 right-0 z-40 p-4">
                <div className="glass-nav max-w-6xl mx-auto flex items-center justify-between rounded-2xl px-4 py-2.5">
                    <Link href="/" className="flex items-center gap-2 cursor-pointer group">
                        <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/50 transition">
                            <Image
                                src="/New Logo.png"
                                alt="Cash Clarity"
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                                priority
                            />
                        </div>
                        <span className="font-bold text-sm tracking-tight">Cash Clarity</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link
                            href="/auth"
                            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/get-started"
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg shadow-primary/30 cursor-pointer hover:shadow-xl hover:shadow-primary/40 transition-all"
                            style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                        >
                            Get started <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </header>

            <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4">
                <Hero3D />

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-medium mb-6"
                    >
                        <Sparkles className="h-3 w-3 text-violet-400" />
                        AI-powered financial planning for solo operators
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]"
                    >
                        Your money.
                        <br />
                        <span className="neon-text">Crystal clear.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.25 }}
                        className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4"
                    >
                        Cash Clarity is the AI-native financial planner that reads your transactions, models your runway, and answers questions in plain English.
                        Built for solo operators and side-hustlers.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 px-4"
                    >
                        <Link
                            href="/get-started"
                            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white shadow-2xl shadow-primary/30 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-primary/50"
                            style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                        >
                            Start free — no card needed
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                        <Link
                            href="#features"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold glass-card cursor-pointer hover:bg-foreground/5 transition-colors"
                        >
                            See how it works
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="mt-14 flex items-center justify-center gap-6 text-xs text-muted-foreground"
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live market data
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" /> Gemini AI built-in
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> Real-time sync
                        </span>
                    </motion.div>
                </motion.div>
            </section>

            <section id="features" className="relative py-32 px-4">
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">
                            Everything a spreadsheet wishes it could be
                        </h2>
                        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                            Six features that turn financial planning from a chore into a superpower.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.6 }}
                    >
                        <GradientCardShowcase
                            cards={[
                                {
                                    title: FEATURES[0].title,
                                    desc: FEATURES[0].body,
                                    gradientFrom: "#8b5cf6",
                                    gradientTo: "#ff4fd8",
                                    icon: <Bot className="h-5 w-5" />,
                                },
                                {
                                    title: FEATURES[1].title,
                                    desc: FEATURES[1].body,
                                    gradientFrom: "#22d3ee",
                                    gradientTo: "#3b82f6",
                                    icon: <Zap className="h-5 w-5" />,
                                },
                                {
                                    title: FEATURES[2].title,
                                    desc: FEATURES[2].body,
                                    gradientFrom: "#34d399",
                                    gradientTo: "#14b8a6",
                                    icon: <LineChart className="h-5 w-5" />,
                                },
                                {
                                    title: FEATURES[3].title,
                                    desc: FEATURES[3].body,
                                    gradientFrom: "#fb7185",
                                    gradientTo: "#f472b6",
                                    icon: <Target className="h-5 w-5" />,
                                },
                                {
                                    title: FEATURES[4].title,
                                    desc: FEATURES[4].body,
                                    gradientFrom: "#fbbf24",
                                    gradientTo: "#fb923c",
                                    icon: <Wallet className="h-5 w-5" />,
                                },
                                {
                                    title: FEATURES[5].title,
                                    desc: FEATURES[5].body,
                                    gradientFrom: "#60a5fa",
                                    gradientTo: "#a78bfa",
                                    icon: <ShieldCheck className="h-5 w-5" />,
                                },
                            ]}
                            className="mt-4"
                        />
                    </motion.div>
                </div>
            </section>

            <section className="relative py-32 px-4">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="relative rounded-[2.5rem] glass-panel p-8 sm:p-16 text-center overflow-hidden"
                    >
                        <div className="aurora-blob bg-violet-500/30 -top-20 -left-20 w-[400px] h-[400px]" />
                        <div className="aurora-blob bg-cyan-500/30 -bottom-20 -right-20 w-[400px] h-[400px]" />

                        <div className="relative">
                            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4">
                                Get clarity in <span className="neon-text">5 minutes</span>.
                            </h2>
                            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                                No credit card. Just sign up and start asking your money questions.
                            </p>
                            <Link
                                href="/get-started"
                                className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-semibold text-white shadow-2xl cursor-pointer hover:scale-[1.03] transition-transform"
                                style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                            >
                                Start free
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            <footer className="relative border-t border-border/40 py-8 px-4 text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} Cash Clarity • Built for solo operators</p>
            </footer>
        </div>
    );
}
