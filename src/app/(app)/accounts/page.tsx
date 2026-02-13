import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccounts, getInstitutions, getLatestBalances, getNetWorthSnapshots } from "@/app/actions/accounts";
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

    const [accounts, institutions, balances, netWorthHistory] = await Promise.all([
        getAccounts(membership.workspace_id),
        getInstitutions(membership.workspace_id),
        getLatestBalances(membership.workspace_id),
        getNetWorthSnapshots(membership.workspace_id),
    ]);

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
