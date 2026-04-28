"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
    "What did I spend the most on this month?",
    "Am I on track with my budget?",
    "Show my top 5 expense categories this year",
    "How's my cash flow looking?",
];

export function AIChatWidget({ workspaceId }: { workspaceId: string }) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage, status, error } = useChat({
        transport: new DefaultChatTransport({
            api: "/api/ai/chat",
            body: { workspaceId },
        }),
    });

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const busy = status === "submitted" || status === "streaming";

    const submit = (text: string) => {
        const t = text.trim();
        if (!t || busy) return;
        sendMessage({ text: t });
        setInput("");
    };

    return (
        <>
            <motion.button
                id="tour-ai-chat"
                aria-label="Open AI assistant"
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl shadow-primary/40 group"
                style={{
                    background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))",
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                animate={{ y: [0, -4, 0] }}
                transition={{ y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
            >
                <span className="absolute inset-0 rounded-full bg-white/20 blur-xl group-hover:bg-white/30" />
                <Sparkles className="relative h-6 w-6 text-white" />
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center sm:justify-end p-0 sm:p-6"
                        onClick={() => setOpen(false)}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0, scale: 0.96 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 40, opacity: 0, scale: 0.96 }}
                            transition={{ type: "spring", damping: 26, stiffness: 280 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-panel w-full sm:w-[420px] h-[80vh] sm:h-[640px] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border border-border/40 shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="h-9 w-9 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))",
                                        }}
                                    >
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">Cash Clarity AI</p>
                                        <p className="text-[10px] text-muted-foreground">Powered by Claude • Reads your real data</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="h-8 w-8 rounded-full border border-border/40 flex items-center justify-center cursor-pointer hover:bg-foreground/5"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3">
                                {messages.length === 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground px-1">
                                            Ask me anything about your finances. I can read your real transactions, budgets, and goals.
                                        </p>
                                        <div className="grid gap-2">
                                            {SUGGESTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => submit(s)}
                                                    className="text-left text-xs px-3 py-2.5 rounded-xl glass-card hover:bg-foreground/5 transition-colors cursor-pointer"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((m: UIMessage) => (
                                    <MessageBubble key={m.id} role={m.role} parts={m.parts as MessagePart[]} />
                                ))}

                                {busy && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Thinking…
                                    </div>
                                )}

                                {error && (
                                    <div className="text-xs px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                                        {error.message ?? "Something went wrong."}
                                    </div>
                                )}
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    submit(input);
                                }}
                                className="p-3 border-t border-border/40 flex gap-2"
                            >
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about your finances…"
                                    className="flex-1 bg-background/60 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    disabled={busy}
                                />
                                <button
                                    type="submit"
                                    disabled={busy || !input.trim()}
                                    className="h-10 w-10 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        background: "linear-gradient(135deg, oklch(0.7 0.22 270), oklch(0.65 0.25 320))",
                                    }}
                                    aria-label="Send"
                                >
                                    <Send className="h-4 w-4 text-white" />
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

type MessagePart =
    | { type: "text"; text: string }
    | { type: `tool-${string}`; toolName?: string; state?: string }
    | { type: string;[k: string]: unknown };

function MessageBubble({ role, parts }: { role: string; parts: MessagePart[] }) {
    const isUser = role === "user";
    const text = parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
    const toolCalls = parts.filter((p) => p.type.startsWith("tool-"));

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    isUser
                        ? "bg-primary/20 ring-1 ring-primary/30 text-foreground"
                        : "glass-card text-foreground"
                )}
            >
                {toolCalls.length > 0 && (
                    <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground flex flex-wrap gap-1">
                        {toolCalls.map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 ring-1 ring-primary/20">
                                {t.type.replace("tool-", "")}
                            </span>
                        ))}
                    </div>
                )}
                {text && <p className="whitespace-pre-wrap leading-relaxed">{text}</p>}
            </div>
        </div>
    );
}
