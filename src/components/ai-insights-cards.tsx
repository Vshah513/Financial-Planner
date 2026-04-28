"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { getAIInsights, type AIInsight } from "@/app/actions/ai-insights";
import { cn } from "@/lib/utils";

const TONE_STYLE: Record<AIInsight["tone"], { icon: typeof TrendingUp; ring: string; bg: string }> = {
    positive: { icon: TrendingUp, ring: "ring-emerald-500/30", bg: "from-emerald-400 to-teal-500" },
    warning: { icon: AlertTriangle, ring: "ring-amber-500/30", bg: "from-amber-400 to-orange-500" },
    neutral: { icon: Info, ring: "ring-violet-500/30", bg: "from-violet-400 to-fuchsia-500" },
};

export function AIInsightsCards({ workspaceId }: { workspaceId: string }) {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [available, setAvailable] = useState(true);
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const friendlyError = (raw: string) => {
        const msg = raw.toLowerCase();
        if (msg.includes("listmodels") || msg.includes("not found for api version") || msg.includes("supported methods")) {
            return "AI is temporarily unavailable for this key/project. Please try again in a moment.";
        }
        if (msg.includes("api key") || msg.includes("permission") || msg.includes("unauthorized")) {
            return "AI couldn't authenticate with the configured key. Please verify your Gemini API key and try again.";
        }
        return "AI is temporarily unavailable. Please try again.";
    };

    const load = () => {
        start(async () => {
            setError(null);
            const res = await getAIInsights(workspaceId);
            setInsights(res.insights);
            setAvailable(res.available);
            if (res.error) setError(res.error);
        });
    };

    useEffect(() => {
        load();
    }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="rounded-3xl glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))" }}
                    >
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">AI Insights</h3>
                        <p className="text-[10px] text-muted-foreground">
                            {available ? "Powered by Gemini from your ledger" : "Demo — add GOOGLE_GENERATIVE_AI_API_KEY"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={load}
                    disabled={pending}
                    aria-label="Refresh"
                    className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center cursor-pointer hover:bg-foreground/5 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} />
                </button>
            </div>

            {error && (
                <div className="mb-3 text-xs px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                    {friendlyError(error)}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                    {(pending && insights.length === 0
                        ? [0, 1, 2].map((i) => ({ skel: true, key: `s${i}` } as const))
                        : insights.map((ins, i) => ({ skel: false as const, key: `i${i}`, ins }))
                    ).map((item, i) => {
                        if (item.skel) {
                            return (
                                <motion.div
                                    key={item.key}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-32 rounded-2xl bg-foreground/5 animate-pulse"
                                />
                            );
                        }
                        const ins = item.ins!;
                        const tone = TONE_STYLE[ins.tone];
                        const Icon = tone.icon;
                        return (
                            <motion.div
                                key={item.key}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.06 }}
                                className={cn(
                                    "relative p-4 rounded-2xl bg-background/40 border border-border/40 ring-1 overflow-hidden",
                                    tone.ring
                                )}
                            >
                                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${tone.bg} opacity-15 blur-2xl`} />
                                <div className="relative flex items-start gap-2.5">
                                    <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${tone.bg} flex items-center justify-center shrink-0 shadow`}>
                                        <Icon className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-xs leading-tight">{ins.title}</p>
                                        {ins.metric && (
                                            <p className="text-lg font-black tabular-nums mt-1 mb-0.5">{ins.metric}</p>
                                        )}
                                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{ins.body}</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
