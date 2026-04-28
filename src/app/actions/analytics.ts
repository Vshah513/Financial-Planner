"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCategoryRadarData(workspaceId: string, year: number) {
    const supabase = await createClient();

    const { data: periods } = await supabase
        .from("periods")
        .select("id, month")
        .eq("workspace_id", workspaceId)
        .eq("year", year);

    if (!periods?.length) return [];

    const { data: entries } = await supabase
        .from("ledger_entries")
        .select("amount, direction, categories(name, group_id, category_groups:group_id(name))")
        .in("period_id", periods.map((p) => p.id))
        .eq("direction", "expense");

    const totals: Record<string, number> = {};
    type RawCat = { category_groups?: { name: string } | { name: string }[] | null } | { category_groups?: { name: string } | { name: string }[] | null }[] | null;
    for (const e of (entries ?? []) as unknown as Array<{ amount: number; categories: RawCat }>) {
        const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
        const grp = cat ? (Array.isArray(cat.category_groups) ? cat.category_groups[0] : cat.category_groups) : null;
        const groupName = grp?.name ?? "Other";
        totals[groupName] = (totals[groupName] ?? 0) + Number(e.amount);
    }

    return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([category, value]) => ({ category, value: Math.round(value) }));
}

export async function getDailySpendHeatmap(workspaceId: string, year: number) {
    const supabase = await createClient();

    const { data: txns } = await supabase
        .from("transactions")
        .select("date, amount, direction")
        .eq("workspace_id", workspaceId)
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`)
        .eq("direction", "outflow");

    const byDay: Record<string, number> = {};
    for (const t of txns ?? []) {
        const d = t.date as string;
        if (!d) continue;
        byDay[d] = (byDay[d] ?? 0) + Math.abs(Number(t.amount));
    }

    return Object.entries(byDay).map(([date, value]) => ({ date, value: Math.round(value) }));
}
