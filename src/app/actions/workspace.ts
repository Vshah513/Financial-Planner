"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WorkspaceMode } from "@/types/database";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export async function createWorkspace(
    name: string,
    currency: string,
    fiscalYearStart: number,
    year: number,
    mode: WorkspaceMode = "business"
) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Use a security-definer RPC to create workspace + member + groups + categories atomically
    const { data: workspaceId, error: rpcError } = await supabase.rpc("fn_create_workspace", {
        p_user_id: user.id,
        p_name: name,
        p_currency: currency,
        p_fiscal_year_start: fiscalYearStart,
        p_mode: mode,
    });

    if (rpcError) throw new Error("Failed to create workspace: " + rpcError.message);

    // Create 12 periods for the given year
    const periods = [];
    for (let m = 1; m <= 12; m++) {
        const startDate = new Date(year, m - 1, 1);
        const endDate = new Date(year, m, 0);
        periods.push({
            workspace_id: workspaceId,
            year,
            month: m,
            period_start_date: startDate.toISOString().split("T")[0],
            period_end_date: endDate.toISOString().split("T")[0],
            label: MONTH_NAMES[m - 1],
        });
    }

    const { error: perError } = await supabase.rpc("fn_create_periods", {
        p_periods: periods,
    });

    if (perError) throw new Error("Failed to create periods: " + perError.message);

    revalidatePath("/dashboard");
    return { id: workspaceId, name };
}

export async function getUserWorkspace() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(*)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    return data;
}

export async function ensurePeriodsForYear(workspaceId: string, year: number) {
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from("periods")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .limit(1);

    if (existing && existing.length > 0) return;

    const periods = [];
    for (let m = 1; m <= 12; m++) {
        const startDate = new Date(year, m - 1, 1);
        const endDate = new Date(year, m, 0);
        periods.push({
            workspace_id: workspaceId,
            year,
            month: m,
            period_start_date: startDate.toISOString().split("T")[0],
            period_end_date: endDate.toISOString().split("T")[0],
            label: MONTH_NAMES[m - 1],
        });
    }

    await supabase.rpc("fn_create_periods", {
        p_periods: periods,
    });
}

export async function updateWorkspaceMode(workspaceId: string, mode: WorkspaceMode) {
    const supabase = await createClient();

    // Use the template apply RPC which updates mode + merges template
    const { error } = await supabase.rpc("fn_apply_template", {
        p_workspace_id: workspaceId,
        p_mode: mode,
    });

    if (error) throw new Error("Failed to update mode: " + error.message);

    revalidatePath("/settings");
    revalidatePath("/month");
    revalidatePath("/dashboard");
}

export async function applyTemplate(workspaceId: string, mode: WorkspaceMode) {
    const supabase = await createClient();

    const { error } = await supabase.rpc("fn_apply_template", {
        p_workspace_id: workspaceId,
        p_mode: mode,
    });

    if (error) throw new Error("Failed to apply template: " + error.message);

    revalidatePath("/settings");
    revalidatePath("/month");
}
