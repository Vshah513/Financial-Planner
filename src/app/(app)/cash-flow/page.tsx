import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCategories, getCategoryGroups } from "@/app/actions/categories";
import CashFlowClient from "./cashflow-client";
import type { CashFlowSummary, SankeyData } from "@/types/database";

export default async function CashFlowPage() {
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

    // Default date range: current month
    const now = new Date();
    const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;

    const emptySummary: CashFlowSummary = { total_income: 0, total_expenses: 0, net_income: 0, savings_rate: 0 };
    const emptySankey: SankeyData = { nodes: [], links: [] };

    let summary = emptySummary;
    let byGroup: any[] = [];
    let sankeyData = emptySankey;
    let transactions: any[] = [];
    let accounts: any[] = [];
    let categories: any[] = [];
    let groups: any[] = [];

    try {
        const { data } = await supabase.rpc("fn_cash_flow_summary", {
            p_workspace_id: membership.workspace_id,
            p_date_from: dateFrom,
            p_date_to: dateTo,
        });
        if (Array.isArray(data) && data.length > 0) summary = data[0] as CashFlowSummary;
    } catch { /* RPC may not exist */ }

    try {
        const { data } = await supabase.rpc("fn_cash_flow_by_group", {
            p_workspace_id: membership.workspace_id,
            p_date_from: dateFrom,
            p_date_to: dateTo,
        });
        byGroup = data || [];
    } catch { /* RPC may not exist */ }

    try {
        const { data } = await supabase.rpc("fn_sankey_data", {
            p_workspace_id: membership.workspace_id,
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_grouping_mode: "group",
        });
        sankeyData = (data || emptySankey) as SankeyData;
    } catch { /* RPC may not exist */ }

    try {
        const { data } = await supabase
            .from("transactions")
            .select("*, account:accounts(id, name), category:categories(id, name, type)")
            .eq("workspace_id", membership.workspace_id)
            .gte("posted_at", dateFrom)
            .lte("posted_at", dateTo)
            .eq("status", "posted")
            .order("posted_at", { ascending: false })
            .range(0, 199);
        transactions = data || [];
    } catch { /* table may not exist */ }

    try {
        const { data } = await supabase
            .from("accounts")
            .select("id, name")
            .eq("workspace_id", membership.workspace_id);
        accounts = data || [];
    } catch { /* table may not exist */ }

    try {
        categories = await getCategories(membership.workspace_id);
    } catch { /* may fail */ }

    try {
        groups = await getCategoryGroups(membership.workspace_id);
    } catch { /* may fail */ }

    return (
        <CashFlowClient
            initialSummary={summary}
            initialByGroup={byGroup}
            initialSankey={sankeyData}
            initialTransactions={transactions}
            accounts={accounts}
            categories={categories}
            categoryGroups={groups}
            workspaceId={membership.workspace_id}
            currency={workspace.default_currency}
            initialDateFrom={dateFrom}
            initialDateTo={dateTo}
        />
    );
}
