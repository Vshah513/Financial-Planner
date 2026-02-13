import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AccountsClient from "./accounts-client";

export default async function AccountsPage() {
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

    // Safely fetch data — tables may not exist yet
    let accounts: any[] = [];
    let institutions: any[] = [];
    let balances: any[] = [];
    let netWorthHistory: any[] = [];

    try {
        const { data } = await supabase
            .from("institutions")
            .select("*")
            .eq("workspace_id", membership.workspace_id)
            .order("name");
        institutions = data || [];
    } catch { /* table may not exist */ }

    try {
        const { data } = await supabase
            .from("accounts")
            .select("*, institution:institutions(*)")
            .eq("workspace_id", membership.workspace_id)
            .order("created_at", { ascending: true });
        accounts = data || [];
    } catch { /* table may not exist */ }

    try {
        // Get latest balances inline
        if (accounts.length > 0) {
            const activeAccounts = accounts.filter((a: any) => a.is_active);
            for (const account of activeAccounts) {
                const { data: bal } = await supabase
                    .from("account_balances")
                    .select("balance, as_of_date")
                    .eq("account_id", account.id)
                    .order("as_of_date", { ascending: false })
                    .limit(1)
                    .single();

                balances.push({
                    ...account,
                    institution: account.institution,
                    latest_balance: bal?.balance ?? null,
                    balance_date: bal?.as_of_date ?? null,
                });
            }
        }
    } catch { /* table may not exist */ }

    try {
        const { data } = await supabase
            .from("net_worth_snapshots")
            .select("*")
            .eq("workspace_id", membership.workspace_id)
            .order("as_of_date", { ascending: false })
            .limit(12);
        netWorthHistory = data || [];
    } catch { /* table may not exist */ }

    return (
        <AccountsClient
            accounts={accounts}
            institutions={institutions}
            balances={balances}
            netWorthHistory={netWorthHistory}
            workspaceId={membership.workspace_id}
            currency={workspace.default_currency}
        />
    );
}
