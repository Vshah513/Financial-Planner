"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Budget } from "@/types/database";

export async function getBudgets(workspaceId: string, periodId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("budgets")
        .select("*, category:categories(id, name, type, group_id)")
        .eq("workspace_id", workspaceId)
        .eq("period_id", periodId);
    if (error) throw new Error(error.message);
    return data || [];
}

export async function upsertBudget(data: {
    workspace_id: string;
    period_id: string;
    category_id: string;
    amount: number;
    rollover?: boolean;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("budgets").upsert(
        {
            ...data,
            rollover: data.rollover ?? false,
        },
        { onConflict: "workspace_id,period_id,category_id" }
    );
    if (error) throw new Error(error.message);
    revalidatePath("/budget");
}

export async function deleteBudget(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/budget");
}

export async function getBudgetVsActual(
    workspaceId: string,
    periodId: string,
    periodStart: string,
    periodEnd: string
) {
    const supabase = await createClient();

    // Get budgets
    const { data: budgets } = await supabase
        .from("budgets")
        .select("*, category:categories(id, name, type, group_id)")
        .eq("workspace_id", workspaceId)
        .eq("period_id", periodId);

    // Get actual spending from transactions
    const { data: transactions } = await supabase
        .from("transactions")
        .select("category_id, direction, amount")
        .eq("workspace_id", workspaceId)
        .gte("posted_at", periodStart)
        .lte("posted_at", periodEnd)
        .eq("status", "posted");

    // Build actual totals by category
    const actualByCategory: Record<string, number> = {};
    for (const txn of transactions || []) {
        if (txn.category_id) {
            actualByCategory[txn.category_id] = (actualByCategory[txn.category_id] || 0) + Number(txn.amount);
        }
    }

    return (budgets || []).map((b: Budget & { category: { id: string; name: string; type: string; group_id: string | null } }) => ({
        ...b,
        actual: actualByCategory[b.category_id] || 0,
        remaining: b.amount - (actualByCategory[b.category_id] || 0),
        percentUsed: b.amount > 0 ? Math.round(((actualByCategory[b.category_id] || 0) / b.amount) * 100) : 0,
    }));
}
