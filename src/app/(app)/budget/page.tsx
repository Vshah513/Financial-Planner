import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBudgetVsActual } from "@/app/actions/budgets";
import { getCategories, getCategoryGroups } from "@/app/actions/categories";
import BudgetClient from "./budget-client";

export default async function BudgetPage() {
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
    const workspace = membership.workspaces as unknown as { name: string; default_currency: string; mode: string };

    // Get current period
    const now = new Date();
    const { data: period } = await supabase
        .from("periods")
        .select("*")
        .eq("workspace_id", membership.workspace_id)
        .eq("year", now.getFullYear())
        .eq("month", now.getMonth() + 1)
        .single();

    const [categories, groups] = await Promise.all([
        getCategories(membership.workspace_id),
        getCategoryGroups(membership.workspace_id),
    ]);

    let budgetData: Awaited<ReturnType<typeof getBudgetVsActual>> = [];
    if (period) {
        budgetData = await getBudgetVsActual(
            membership.workspace_id,
            period.id,
            period.period_start_date,
            period.period_end_date
        );
    }

    return (
        <BudgetClient
            budgetData={budgetData}
            categories={categories}
            categoryGroups={groups}
            workspaceId={membership.workspace_id}
            periodId={period?.id || ""}
            currency={workspace.default_currency}
            periodLabel={period?.label || `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`}
        />
    );
}
