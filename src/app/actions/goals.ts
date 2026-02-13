"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getGoals(workspaceId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("goals")
            .select("*, linked_category:categories(id, name)")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function createGoal(data: {
    workspace_id: string;
    name: string;
    target_amount: number;
    target_date?: string;
    linked_category_id?: string;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("goals").insert({
        ...data,
        current_amount: 0,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/goals");
}

export async function updateGoal(
    id: string,
    data: Partial<{
        name: string;
        target_amount: number;
        current_amount: number;
        target_date: string | null;
        linked_category_id: string | null;
    }>
) {
    const supabase = await createClient();
    const { error } = await supabase.from("goals").update(data).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/goals");
}

export async function syncGoalProgress(goalId: string) {
    const supabase = await createClient();
    try {
        const { data: goal } = await supabase
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .single();

        if (!goal?.linked_category_id) return;

        // Sum transactions for this category
        const { data: transactions } = await supabase
            .from("transactions")
            .select("amount, direction")
            .eq("workspace_id", goal.workspace_id)
            .eq("category_id", goal.linked_category_id)
            .eq("status", "posted");

        let total = 0;
        for (const txn of transactions || []) {
            total += Number(txn.amount);
        }

        await supabase
            .from("goals")
            .update({ current_amount: total })
            .eq("id", goalId);

        revalidatePath("/goals");
    } catch {
        // Silently fail if tables don't exist
    }
}
