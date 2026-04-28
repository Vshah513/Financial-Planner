"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type TxnRealtimeEvent = {
    type: "INSERT" | "UPDATE" | "DELETE";
    at: number;
    description?: string;
    amount?: number;
};

export function useRealtimeTransactions(
    workspaceId: string | null | undefined,
    onChange?: (evt: TxnRealtimeEvent) => void
) {
    const [pulse, setPulse] = useState(0);
    const [lastEvent, setLastEvent] = useState<TxnRealtimeEvent | null>(null);

    useEffect(() => {
        if (!workspaceId) return;
        const supabase = createClient();
        const channel = supabase
            .channel(`txn-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "transactions",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    const row = (payload.new ?? payload.old ?? {}) as { description?: string; amount?: number };
                    const evt: TxnRealtimeEvent = {
                        type: payload.eventType as TxnRealtimeEvent["type"],
                        at: Date.now(),
                        description: row.description,
                        amount: row.amount ? Number(row.amount) : undefined,
                    };
                    setLastEvent(evt);
                    setPulse((n) => n + 1);
                    onChange?.(evt);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ledger_entries",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => setPulse((n) => n + 1)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, onChange]);

    return { pulse, lastEvent };
}
