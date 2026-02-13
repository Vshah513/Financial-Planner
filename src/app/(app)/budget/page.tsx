import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

    let categories: any[] = [];
    let groups: any[] = [];

    try {
        categories = await getCategories(membership.workspace_id);
    } catch { /* may fail */ }

    try {
        groups = await getCategoryGroups(membership.workspace_id);
    } catch { /* may fail */ }

    let budgetData: any[] = [];
    if (period) {
        try {
            // Get budgets
            const { data: budgets } = await supabase
                .from("budgets")
                .select("*, category:categories(id, name, type, group_id)")
                .eq("workspace_id", membership.workspace_id)
                .eq("period_id", period.id);

            // Get actual spending from transactions
            let transactions: any[] = [];
            try {
                const { data: txns } = await supabase
                    .from("transactions")
                    .select("category_id, direction, amount")
                    .eq("workspace_id", membership.workspace_id)
                    .gte("posted_at", period.period_start_date)
                    .lte("posted_at", period.period_end_date)
                    .eq("status", "posted");
                transactions = txns || [];
            } catch { /* table may not exist */ }

            // Build actual totals by category
            const actualByCategory: Record<string, number> = {};
            for (const txn of transactions) {
                if (txn.category_id) {
                    actualByCategory[txn.category_id] = (actualByCategory[txn.category_id] || 0) + Number(txn.amount);
                }
            }

            budgetData = (budgets || []).map((b: any) => ({
                ...b,
                actual: actualByCategory[b.category_id] || 0,
                remaining: b.amount - (actualByCategory[b.category_id] || 0),
                percentUsed: b.amount > 0 ? Math.round(((actualByCategory[b.category_id] || 0) / b.amount) * 100) : 0,
            }));
        } catch { /* budgets table may not exist */ }
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
