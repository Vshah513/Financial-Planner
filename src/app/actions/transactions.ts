"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CashFlowSummary, CashFlowByGroup, SankeyData } from "@/types/database";

// ---- TRANSACTIONS CRUD ----

export async function getTransactions(
    workspaceId: string,
    filters?: {
        dateFrom?: string;
        dateTo?: string;
        accountId?: string;
        categoryId?: string;
        groupId?: string;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }
) {
    const supabase = await createClient();
    try {
        let query = supabase
            .from("transactions")
            .select("*, account:accounts(id, name), category:categories(id, name, type), group:category_groups(id, name)")
            .eq("workspace_id", workspaceId)
            .order("posted_at", { ascending: false })
            .order("created_at", { ascending: false });

        if (filters?.dateFrom) query = query.gte("posted_at", filters.dateFrom);
        if (filters?.dateTo) query = query.lte("posted_at", filters.dateTo);
        if (filters?.accountId) query = query.eq("account_id", filters.accountId);
        if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
        if (filters?.groupId) query = query.eq("group_id", filters.groupId);
        if (filters?.status) query = query.eq("status", filters.status);
        if (filters?.search) query = query.ilike("description", `%${filters.search}%`);

        const limit = filters?.limit ?? 100;
        const offset = filters?.offset ?? 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function createTransaction(data: {
    workspace_id: string;
    account_id: string;
    posted_at: string;
    description: string;
    amount: number;
    direction: "inflow" | "outflow";
    category_id?: string;
    status?: string;
    notes?: string;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("transactions").insert({
        ...data,
        status: data.status || "posted",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    revalidatePath("/cash-flow");
}

export async function updateTransaction(
    id: string,
    data: Partial<{
        description: string;
        amount: number;
        direction: "inflow" | "outflow";
        category_id: string;
        status: string;
        notes: string;
        account_id: string;
        posted_at: string;
    }>
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("transactions")
        .update(data)
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    revalidatePath("/cash-flow");
}

export async function deleteTransaction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    revalidatePath("/cash-flow");
}

export async function bulkUpdateTransactions(
    ids: string[],
    data: Partial<{ category_id: string; status: string; account_id: string }>
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("transactions")
        .update(data)
        .in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    revalidatePath("/cash-flow");
}

// ---- CSV IMPORT ----

export async function importTransactionsFromCSV(
    workspaceId: string,
    accountId: string,
    rows: {
        posted_at: string;
        description: string;
        amount: number;
        direction: "inflow" | "outflow";
    }[]
) {
    const supabase = await createClient();

    // Get categorization rules
    let rules: any[] = [];
    try {
        const { data } = await supabase
            .from("categorization_rules")
            .select("*, category:categories(id, group_id)")
            .eq("workspace_id", workspaceId)
            .eq("enabled", true)
            .order("priority", { ascending: true });
        rules = data || [];
    } catch { /* table may not exist */ }

    const transactions = rows.map((row) => {
        let categoryId: string | null = null;
        for (const rule of rules) {
            let matched = false;
            if (rule.match_type === "exact") {
                matched = row.description.toLowerCase() === rule.match_value.toLowerCase();
            } else if (rule.match_type === "contains") {
                matched = row.description.toLowerCase().includes(rule.match_value.toLowerCase());
            } else if (rule.match_type === "regex") {
                try {
                    matched = new RegExp(rule.match_value, "i").test(row.description);
                } catch {
                    // skip invalid regex
                }
            }
            if (matched) {
                categoryId = rule.category_id;
                break;
            }
        }

        return {
            workspace_id: workspaceId,
            account_id: accountId,
            posted_at: row.posted_at,
            description: row.description,
            amount: Math.abs(row.amount),
            direction: row.direction,
            category_id: categoryId,
            status: "posted" as const,
        };
    });

    const { error } = await supabase.from("transactions").insert(transactions);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
    revalidatePath("/cash-flow");
    return { imported: transactions.length, categorized: transactions.filter((t) => t.category_id).length };
}

// ---- TRANSACTION RULES ----

export async function getTransactionRules(workspaceId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("transaction_rules")
            .select("*, category:categories(id, name)")
            .eq("workspace_id", workspaceId)
            .order("priority");
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function createTransactionRule(data: {
    workspace_id: string;
    match_type: string;
    match_value: string;
    category_id: string;
    priority?: number;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("transaction_rules").insert({
        ...data,
        priority: data.priority ?? 0,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
}

export async function deleteTransactionRule(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("transaction_rules").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/transactions");
}

// ---- REPORTING ----

export async function getCashFlowSummary(
    workspaceId: string,
    dateFrom: string,
    dateTo: string
): Promise<CashFlowSummary> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.rpc("fn_cash_flow_summary", {
            p_workspace_id: workspaceId,
            p_date_from: dateFrom,
            p_date_to: dateTo,
        });
        if (error) throw new Error(error.message);
        if (Array.isArray(data) && data.length > 0) return data[0] as CashFlowSummary;
    } catch { /* RPC may not exist */ }
    return { total_income: 0, total_expenses: 0, net_income: 0, savings_rate: 0 };
}

export async function getCashFlowByGroup(
    workspaceId: string,
    dateFrom: string,
    dateTo: string
): Promise<CashFlowByGroup[]> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.rpc("fn_cash_flow_by_group", {
            p_workspace_id: workspaceId,
            p_date_from: dateFrom,
            p_date_to: dateTo,
        });
        if (error) throw new Error(error.message);
        return (data || []) as CashFlowByGroup[];
    } catch {
        return [];
    }
}

export async function getSankeyData(
    workspaceId: string,
    dateFrom: string,
    dateTo: string,
    groupingMode: "group" | "category" = "group"
): Promise<SankeyData> {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase.rpc("fn_sankey_data", {
            p_workspace_id: workspaceId,
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_grouping_mode: groupingMode,
        });
        if (error) throw new Error(error.message);
        return (data || { nodes: [], links: [] }) as SankeyData;
    } catch {
        return { nodes: [], links: [] };
    }
}
