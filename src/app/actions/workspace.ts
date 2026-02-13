"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export async function createWorkspace(
    name: string,
    currency: string,
    fiscalYearStart: number,
    year: number
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // 1. Create workspace
    const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({ name, default_currency: currency, fiscal_year_start_month: fiscalYearStart })
        .select()
        .single();
    if (wsError) throw new Error(wsError.message);

    // 2. Add self as owner
    const { error: memError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });
    if (memError) throw new Error(memError.message);

    // 3. Seed categories
    const { error: catError } = await supabase.rpc("fn_seed_categories", {
        p_workspace_id: workspace.id,
    });
    if (catError) throw new Error(catError.message);

    // 4. Create 12 periods for the given year
    const periods = [];
    for (let m = 1; m <= 12; m++) {
        const startDate = new Date(year, m - 1, 1);
        const endDate = new Date(year, m, 0); // last day of month
        periods.push({
            workspace_id: workspace.id,
            year,
            month: m,
            period_start_date: startDate.toISOString().split("T")[0],
            period_end_date: endDate.toISOString().split("T")[0],
            label: MONTH_NAMES[m - 1],
        });
    }

    const { error: perError } = await supabase.from("periods").insert(periods);
    if (perError) throw new Error(perError.message);

    revalidatePath("/dashboard");
    return workspace;
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

    // Check if periods already exist
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

    await supabase.from("periods").insert(periods);
}
