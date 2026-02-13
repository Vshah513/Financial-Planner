"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Account, Institution, AccountBalance } from "@/types/database";

// ---- INSTITUTIONS ----

export async function getInstitutions(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
    if (error) throw new Error(error.message);
    return (data || []) as Institution[];
}

export async function createInstitution(data: {
    workspace_id: string;
    name: string;
    logo_url?: string;
    provider?: string;
}) {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("institutions")
        .insert({ ...data, provider: data.provider || "manual" })
        .select()
        .single();
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    return result as Institution;
}

// ---- ACCOUNTS ----

export async function getAccounts(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("accounts")
        .select("*, institution:institutions(*)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
}

export async function createAccount(data: {
    workspace_id: string;
    institution_id?: string;
    name: string;
    account_type: string;
    currency: string;
}) {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("accounts")
        .insert(data)
        .select()
        .single();
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
    return result as Account;
}

export async function updateAccount(
    id: string,
    data: Partial<Pick<Account, "name" | "account_type" | "is_active" | "institution_id">>
) {
    const supabase = await createClient();
    const { error } = await supabase.from("accounts").update(data).eq("id", id);
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
    const { data, error } = await supabase
        .from("account_balances")
        .select("*")
        .eq("account_id", accountId)
        .order("as_of_date", { ascending: false })
        .limit(30);
    if (error) throw new Error(error.message);
    return (data || []) as AccountBalance[];
}

export async function upsertAccountBalance(data: {
    account_id: string;
    as_of_date: string;
    balance: number;
}) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("account_balances")
        .upsert(data, { onConflict: "account_id,as_of_date" });
    if (error) throw new Error(error.message);
    revalidatePath("/accounts");
}

export async function getLatestBalances(workspaceId: string) {
    const supabase = await createClient();
    // Get latest balance for each account via raw query
    const { data: accounts, error: accErr } = await supabase
        .from("accounts")
        .select("id, name, account_type, currency, is_active, institution:institutions(name)")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("created_at");

    if (accErr) throw new Error(accErr.message);
    if (!accounts || accounts.length === 0) return [];

    const results = [];
    for (const account of accounts) {
        const { data: bal } = await supabase
            .from("account_balances")
            .select("balance, as_of_date")
            .eq("account_id", account.id)
            .order("as_of_date", { ascending: false })
            .limit(1)
            .single();

        results.push({
            ...account,
            latest_balance: bal?.balance ?? null,
            balance_date: bal?.as_of_date ?? null,
        });
    }
    return results;
}

// ---- NET WORTH ----

export async function getNetWorthSnapshots(workspaceId: string, limit = 12) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("net_worth_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("as_of_date", { ascending: false })
        .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}

export async function computeAndSaveNetWorth(workspaceId: string, asOfDate: string) {
    const supabase = await createClient();

    // Get all active accounts
    const { data: accounts } = await supabase
        .from("accounts")
        .select("id, account_type")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

    if (!accounts) return;

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const acc of accounts) {
        const { data: bal } = await supabase
            .from("account_balances")
            .select("balance")
            .eq("account_id", acc.id)
            .lte("as_of_date", asOfDate)
            .order("as_of_date", { ascending: false })
            .limit(1)
            .single();

        const balance = bal?.balance ?? 0;
        if (["credit_card", "loan"].includes(acc.account_type)) {
            totalLiabilities += Math.abs(balance);
        } else {
            totalAssets += balance;
        }
    }

    await supabase.from("net_worth_snapshots").upsert(
        {
            workspace_id: workspaceId,
            as_of_date: asOfDate,
            total_assets: totalAssets,
            total_liabilities: totalLiabilities,
            net_worth: totalAssets - totalLiabilities,
        },
        { onConflict: "workspace_id,as_of_date" }
    );

    revalidatePath("/accounts");
}
