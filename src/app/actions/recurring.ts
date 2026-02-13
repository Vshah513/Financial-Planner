"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { RecurringRule } from "@/types/database";

export async function getRecurringRules(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("recurring_rules")
        .select("*, category:categories(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function createRecurringRule(data: {
    workspace_id: string;
    direction: "income" | "expense";
    category_id: string;
    description: string;
    amount: number;
    cadence: "monthly" | "quarterly" | "yearly";
    next_run_date: string;
    end_date?: string;
    auto_post: boolean;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("recurring_rules").insert(data);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function updateRecurringRule(
    id: string,
    data: Partial<RecurringRule>
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("recurring_rules")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function deleteRecurringRule(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("recurring_rules")
        .delete()
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function generateRecurringEntries(
    workspaceId: string,
    periodId: string,
    periodYear: number,
    periodMonth: number
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get all active recurring rules for this workspace
    const { data: rules } = await supabase
        .from("recurring_rules")
        .select("*")
        .eq("workspace_id", workspaceId);

    if (!rules || rules.length === 0) return { generated: 0 };

    const periodDate = new Date(periodYear, periodMonth - 1, 1);
    let generated = 0;

    for (const rule of rules) {
        const nextRun = new Date(rule.next_run_date);

        // Check if this rule should run for this period
        if (nextRun > periodDate) continue;
        if (rule.end_date && new Date(rule.end_date) < periodDate) continue;

        // Check for duplicates
        const { data: existing } = await supabase
            .from("ledger_entries")
            .select("id")
            .eq("period_id", periodId)
            .eq("recurring_rule_id", rule.id)
            .limit(1);

        if (existing && existing.length > 0) continue;

        // Create the entry
        const { error } = await supabase.from("ledger_entries").insert({
            workspace_id: workspaceId,
            period_id: periodId,
            direction: rule.direction,
            category_id: rule.category_id,
            description: rule.description,
            amount: rule.amount,
            recurring_rule_id: rule.id,
            created_by: user.id,
        });

        if (error) continue;
        generated++;

        // Advance next_run_date
        const next = new Date(rule.next_run_date);
        if (rule.cadence === "monthly") {
            next.setMonth(next.getMonth() + 1);
        } else if (rule.cadence === "quarterly") {
            next.setMonth(next.getMonth() + 3);
        } else if (rule.cadence === "yearly") {
            next.setFullYear(next.getFullYear() + 1);
        }

        await supabase
            .from("recurring_rules")
            .update({ next_run_date: next.toISOString().split("T")[0] })
            .eq("id", rule.id);
    }

    revalidatePath("/month");
    return { generated };
}
