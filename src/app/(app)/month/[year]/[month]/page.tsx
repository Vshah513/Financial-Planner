import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEntriesForPeriod } from "@/app/actions/entries";
import { getPeriodOverrides } from "@/app/actions/periods";
import { getCategories, getCategoryGroups } from "@/app/actions/categories";
import MonthClient from "./month-client";

export default async function MonthPage({
    params,
}: {
    params: Promise<{ year: string; month: string }>;
}) {
    const { year: yearStr, month: monthStr } = await params;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name, default_currency, mode)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    // Get the period
    const { data: period } = await supabase
        .from("periods")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .eq("year", year)
        .eq("month", month)
        .single();

    if (!period) redirect("/dashboard");

    const [entries, overrides, categories, groups] = await Promise.all([
        getEntriesForPeriod(period.id),
        getPeriodOverrides(period.id),
        getCategories(membership.workspace_id),
        getCategoryGroups(membership.workspace_id),
    ]);

    const workspace = membership.workspaces as unknown as {
        name: string;
        default_currency: string;
        mode: string;
    };

    return (
        <MonthClient
            period={period}
            entries={entries || []}
            overrides={overrides}
            categories={categories}
            categoryGroups={groups}
            workspaceId={membership.workspace_id}
            currency={workspace.default_currency}
            workspaceMode={workspace.mode || "business"}
            year={year}
            month={month}
        />
    );
}
