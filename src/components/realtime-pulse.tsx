"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { useRealtimeTransactions } from "@/lib/use-realtime-transactions";
import { toast } from "sonner";

export function RealtimePulse({ workspaceId }: { workspaceId: string }) {
    const [active, setActive] = useState(false);
    const { pulse, lastEvent } = useRealtimeTransactions(workspaceId, (evt) => {
        if (evt.type === "INSERT" && evt.description) {
            toast(`New transaction: ${evt.description}`, {
                description: evt.amount ? `$${Math.abs(evt.amount).toFixed(2)}` : undefined,
            });
        }
    });

    useEffect(() => {
        if (pulse === 0) return;
        setActive(true);
        const id = setTimeout(() => setActive(false), 1400);
        return () => clearTimeout(id);
    }, [pulse]);

    return (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
                <AnimatePresence>
                    {active && (
                        <motion.span
                            initial={{ scale: 1, opacity: 0.7 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.2 }}
                            className="absolute inset-0 rounded-full bg-emerald-400"
                        />
                    )}
                </AnimatePresence>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <Activity className="h-3 w-3" />
            <span>Live{lastEvent ? ` · ${pulse}` : ""}</span>
        </div>
    );
}
