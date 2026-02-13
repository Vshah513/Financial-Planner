"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertPeriodOverrides(
    periodId: string,
    data: {
        opening_balance_override?: number | null;
        dividends_released?: number;
        closing_balance_override?: number | null;
        notes?: string;
    }
) {
    const supabase = await createClient();

    // Check if override already exists
    const { data: existing } = await supabase
        .from("period_overrides")
        .select("id")
        .eq("period_id", periodId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from("period_overrides")
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("period_id", periodId);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase
            .from("period_overrides")
            .insert({ period_id: periodId, ...data });
        if (error) throw new Error(error.message);
    }

    revalidatePath("/month");
    revalidatePath("/dashboard");
}

export async function getPeriodOverrides(periodId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("period_overrides")
        .select("*")
        .eq("period_id", periodId)
        .single();
    return data;
}

export async function getPeriodsForYear(workspaceId: string, year: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("periods")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .order("month", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getYearSummary(workspaceId: string, year: number) {
    const supabase = await createClient();

    // Get periods
    const { data: periods } = await supabase
        .from("periods")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .order("month", { ascending: true });

    if (!periods || periods.length === 0) return null;

    const summaries = [];

    for (const period of periods) {
        // Get entries for this period
        const { data: entries } = await supabase
            .from("ledger_entries")
            .select("direction, amount")
            .eq("period_id", period.id);

        // Get overrides
        const { data: override } = await supabase
            .from("period_overrides")
            .select("*")
            .eq("period_id", period.id)
            .single();

        const revenue = (entries || [])
            .filter((e) => e.direction === "income")
            .reduce((sum, e) => sum + Number(e.amount), 0);

        const expenses = (entries || [])
            .filter((e) => e.direction === "expense")
            .reduce((sum, e) => sum + Number(e.amount), 0);

        const netCashFlow = revenue - expenses;
        const dividendsReleased = override?.dividends_released || 0;
        const retainedEarnings = netCashFlow - dividendsReleased;
        const openingBalance = override?.opening_balance_override ?? null;
        const closingBalance =
            override?.closing_balance_override ??
            (openingBalance !== null
                ? openingBalance + netCashFlow - dividendsReleased
                : netCashFlow - dividendsReleased);

        summaries.push({
            period,
            revenue,
            expenses,
            netCashFlow,
            dividendsReleased,
            retainedEarnings,
            openingBalance,
            closingBalance,
        });
    }

    return {
        year,
        months: summaries,
        totalRevenue: summaries.reduce((s, m) => s + m.revenue, 0),
        totalExpenses: summaries.reduce((s, m) => s + m.expenses, 0),
        totalNetCashFlow: summaries.reduce((s, m) => s + m.netCashFlow, 0),
        totalDividends: summaries.reduce((s, m) => s + m.dividendsReleased, 0),
        totalRetainedEarnings: summaries.reduce((s, m) => s + m.retainedEarnings, 0),
    };
}
