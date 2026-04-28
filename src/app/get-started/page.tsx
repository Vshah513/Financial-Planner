"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Building2,
    User,
    Sparkles,
    Coins,
    Calendar,
    Target,
    DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMPLATES } from "@/lib/templates";
import type { WorkspaceMode } from "@/types/database";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CHF"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const GOAL_OPTIONS = [
    { id: "save", label: "Save more", icon: Coins, color: "from-emerald-400 to-teal-500" },
    { id: "track", label: "Track spending", icon: Target, color: "from-cyan-400 to-blue-500" },
    { id: "runway", label: "Plan runway", icon: Calendar, color: "from-violet-400 to-fuchsia-500" },
    { id: "tax", label: "Tax reserve", icon: DollarSign, color: "from-amber-400 to-orange-500" },
];

const STORAGE_KEY = "cc_onboarding";

export default function GetStartedPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);

    const [name, setName] = useState("");
    const [mode, setMode] = useState<WorkspaceMode>("business");
    const [goals, setGoals] = useState<string[]>([]);
    const [currency, setCurrency] = useState("USD");
    const [fiscalStart, setFiscalStart] = useState("1");

    const totalSteps = 5;
    const progress = ((step + 1) / totalSteps) * 100;

    const next = () => {
        setDirection(1);
        setStep((s) => Math.min(s + 1, totalSteps - 1));
    };
    const back = () => {
        setDirection(-1);
        setStep((s) => Math.max(s - 1, 0));
    };

    const canContinue = useMemo(() => {
        if (step === 0) return name.trim().length > 0;
        if (step === 2) return goals.length > 0;
        return true;
    }, [step, name, goals]);

    const handleFinish = () => {
        if (typeof window !== "undefined") {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ name, mode, goals, currency, fiscalStart, savedAt: Date.now() })
            );
        }
        router.push("/auth?mode=signup");
    };

    const toggleGoal = (id: string) => {
        setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
    };

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="aurora-blob bg-violet-500/25 top-0 -left-40 w-[600px] h-[600px]" />
                <div className="aurora-blob bg-cyan-500/25 bottom-0 -right-40 w-[600px] h-[600px]" style={{ animationDelay: "-6s" }} />
            </div>

            <header className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between max-w-6xl mx-auto">
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                    <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-border/40">
                        <Image src="/New Logo.png" alt="Cash Clarity" width={48} height={48} className="h-full w-full object-cover" priority />
                    </div>
                    <span className="font-bold text-sm tracking-tight">Cash Clarity</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Link href="/auth" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 cursor-pointer">
                        Already have an account?
                    </Link>
                </div>
            </header>

            <div className="relative min-h-screen flex items-center justify-center px-4 py-24">
                <div className="w-full max-w-xl">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ background: "linear-gradient(90deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", damping: 22, stiffness: 200 }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                            {step + 1}/{totalSteps}
                        </span>
                    </div>

                    <motion.div
                        layout
                        className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl border border-border/40"
                    >
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                {step === 0 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg">
                                                <Sparkles className="h-6 w-6 text-white" />
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Let&apos;s get clarity.</h2>
                                            <p className="text-sm text-muted-foreground mt-1.5">First — what should we call your workspace?</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-xs">Workspace name</Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. My Business, Family Budget"
                                                autoFocus
                                                onKeyDown={(e) => e.key === "Enter" && canContinue && next()}
                                                className="h-12 text-base"
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
                                                <Building2 className="h-6 w-6 text-white" />
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Business or personal?</h2>
                                            <p className="text-sm text-muted-foreground mt-1.5">We&apos;ll set up the right categories.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {(["business", "personal"] as const).map((m) => {
                                                const isSelected = mode === m;
                                                const Icon = m === "business" ? Building2 : User;
                                                return (
                                                    <motion.button
                                                        key={m}
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setMode(m)}
                                                        className={cn(
                                                            "relative p-5 rounded-2xl text-left transition-all cursor-pointer border-2",
                                                            isSelected
                                                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                                                                : "border-border/50 hover:border-border bg-background/30"
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <motion.div
                                                                layoutId="onb-tick"
                                                                className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                                                            >
                                                                <Check className="h-3 w-3 text-primary-foreground" />
                                                            </motion.div>
                                                        )}
                                                        <Icon className="h-6 w-6 mb-3 text-foreground" />
                                                        <p className="font-bold text-sm capitalize">{TEMPLATES[m].label}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{TEMPLATES[m].description}</p>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
                                                <Target className="h-6 w-6 text-white" />
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">What matters most?</h2>
                                            <p className="text-sm text-muted-foreground mt-1.5">Pick all that apply.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {GOAL_OPTIONS.map((g) => {
                                                const Icon = g.icon;
                                                const sel = goals.includes(g.id);
                                                return (
                                                    <motion.button
                                                        key={g.id}
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => toggleGoal(g.id)}
                                                        className={cn(
                                                            "relative p-4 rounded-2xl text-left cursor-pointer border-2 transition-all overflow-hidden",
                                                            sel
                                                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                                                                : "border-border/50 hover:border-border bg-background/30"
                                                        )}
                                                    >
                                                        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${g.color} opacity-${sel ? "30" : "10"} blur-xl transition-opacity`} />
                                                        {sel && (
                                                            <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                                                            </div>
                                                        )}
                                                        <div className={`relative h-9 w-9 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center mb-3 shadow`}>
                                                            <Icon className="h-4 w-4 text-white" />
                                                        </div>
                                                        <p className="relative font-semibold text-sm">{g.label}</p>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                                                <Coins className="h-6 w-6 text-white" />
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Currency &amp; fiscal year</h2>
                                            <p className="text-sm text-muted-foreground mt-1.5">You can change these any time.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Currency</Label>
                                                <select
                                                    value={currency}
                                                    onChange={(e) => setCurrency(e.target.value)}
                                                    className="w-full h-12 rounded-xl bg-background/60 border border-border/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                                                >
                                                    {CURRENCIES.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Fiscal year start</Label>
                                                <select
                                                    value={fiscalStart}
                                                    onChange={(e) => setFiscalStart(e.target.value)}
                                                    className="w-full h-12 rounded-xl bg-background/60 border border-border/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                                                >
                                                    {MONTHS.map((m, i) => (
                                                        <option key={m} value={String(i + 1)}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="space-y-6">
                                        <div className="text-center">
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                transition={{ type: "spring", damping: 14, stiffness: 200 }}
                                                className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-2xl shadow-primary/40"
                                            >
                                                <Check className="h-8 w-8 text-white" />
                                            </motion.div>
                                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">You&apos;re all set.</h2>
                                            <p className="text-sm text-muted-foreground mt-1.5">Create your account to save your workspace.</p>
                                        </div>
                                        <div className="rounded-2xl border border-border/40 bg-background/40 p-5 space-y-2 text-sm">
                                            <Row label="Workspace" value={name} />
                                            <Row label="Mode" value={TEMPLATES[mode].label} />
                                            <Row label="Currency" value={currency} />
                                            <Row label="Fiscal start" value={MONTHS[parseInt(fiscalStart) - 1]} />
                                            <Row
                                                label="Focus"
                                                value={goals.map((g) => GOAL_OPTIONS.find((o) => o.id === g)?.label).filter(Boolean).join(", ") || "—"}
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex items-center justify-between mt-8 gap-3">
                            <button
                                onClick={back}
                                disabled={step === 0}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                            {step < totalSteps - 1 ? (
                                <button
                                    onClick={next}
                                    disabled={!canContinue}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white shadow-lg shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:shadow-xl hover:shadow-primary/40 transition-all"
                                    style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                                >
                                    Continue
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleFinish}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white shadow-lg shadow-primary/30 cursor-pointer hover:shadow-xl hover:shadow-primary/40 transition-all"
                                    style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                                >
                                    Create my account
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs font-semibold text-foreground text-right">{value || "—"}</span>
        </div>
    );
}
