"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Goal } from "@/types/database";

export async function getGoals(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("goals")
        .select("*, linked_category:categories(id, name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
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
    data: Partial<Pick<Goal, "name" | "target_amount" | "target_date" | "current_amount" | "linked_category_id">>
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

export async function syncGoalProgress(workspaceId: string) {
    const supabase = await createClient();
    const { data: goals } = await supabase
        .from("goals")
        .select("id, linked_category_id")
        .eq("workspace_id", workspaceId)
        .not("linked_category_id", "is", null);

    if (!goals) return;

    for (const goal of goals) {
        const { data: txns } = await supabase
            .from("transactions")
            .select("amount, direction")
            .eq("workspace_id", workspaceId)
            .eq("category_id", goal.linked_category_id)
            .eq("status", "posted");

        const total = (txns || []).reduce((sum, t) => sum + Number(t.amount), 0);
        await supabase.from("goals").update({ current_amount: total }).eq("id", goal.id);
    }

    revalidatePath("/goals");
}
