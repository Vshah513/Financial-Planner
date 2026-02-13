"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---- INSTITUTIONS ----

export async function getInstitutions(workspaceId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("institutions")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("name");
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function createInstitution(data: {
    workspace_id: string;
    name: string;
    logo_url?: string;
}) {
    const supabase = await createClient();
    const { data: institution, error } = await supabase
        .from("institutions")
        .insert(data)
        .select()
        .single();
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    return institution;
}

// ---- ACCOUNTS ----

export async function getAccounts(workspaceId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("accounts")
            .select("*, institution:institutions(*)")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function createAccount(data: {
    workspace_id: string;
    name: string;
    account_type: string;
    currency: string;
    institution_id?: string;
}) {
    const supabase = await createClient();
    const { data: account, error } = await supabase
        .from("accounts")
        .insert(data)
        .select()
        .single();
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    return account;
}

export async function updateAccount(
    id: string,
    data: Partial<{ name: string; account_type: string; is_active: boolean; institution_id: string | null }>
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("accounts")
        .update(data)
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
}

export async function deleteAccount(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
}

// ---- ACCOUNT BALANCES ----

export async function getAccountBalances(accountId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("account_balances")
            .select("*")
            .eq("account_id", accountId)
            .order("as_of_date", { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function getLatestBalance(accountId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("account_balances")
            .select("*")
            .eq("account_id", accountId)
            .order("as_of_date", { ascending: false })
            .limit(1)
            .single();
        if (error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function upsertAccountBalance(data: {
    account_id: string;
    as_of_date: string;
    balance: number;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("account_balances").upsert(data, {
        onConflict: "account_id,as_of_date",
    });
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
}

// ---- NET WORTH ----

export async function getNetWorthHistory(workspaceId: string, limit = 12) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from("net_worth_snapshots")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("as_of_date", { ascending: false })
            .limit(limit);
        if (error) throw new Error(error.message);
        return data || [];
    } catch {
        return [];
    }
}

export async function computeAndSaveNetWorth(workspaceId: string) {
    const supabase = await createClient();
    try {
        // Get all active accounts
        const { data: accounts } = await supabase
            .from("accounts")
            .select("id, account_type")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true);

        if (!accounts?.length) return;

        let totalAssets = 0;
        let totalLiabilities = 0;

        for (const account of accounts) {
            const balance = await getLatestBalance(account.id);
            if (!balance) continue;

            if (["credit_card", "loan", "line_of_credit"].includes(account.account_type)) {
                totalLiabilities += Number(balance.balance);
            } else {
                totalAssets += Number(balance.balance);
            }
        }

        const today = new Date().toISOString().split("T")[0];
        await supabase.from("net_worth_snapshots").upsert(
            {
                workspace_id: workspaceId,
                as_of_date: today,
                total_assets: totalAssets,
                total_liabilities: totalLiabilities,
                net_worth: totalAssets - totalLiabilities,
            },
            { onConflict: "workspace_id,as_of_date" }
        );
        revalidatePath("/accounts");
    } catch {
        // Silently fail if tables don't exist
    }
}
