import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTransactions } from "@/app/actions/transactions";
import { getAccounts } from "@/app/actions/accounts";
import { getCategories, getCategoryGroups } from "@/app/actions/categories";
import TransactionsClient from "./transactions-client";

export default async function TransactionsPage() {
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

    const [transactions, accounts, categories, groups] = await Promise.all([
        getTransactions(membership.workspace_id, { limit: 200 }),
        getAccounts(membership.workspace_id),
        getCategories(membership.workspace_id),
        getCategoryGroups(membership.workspace_id),
    ]);

    return (
        <TransactionsClient
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            categoryGroups={groups}
            workspaceId={membership.workspace_id}
            currency={workspace.default_currency}
        />
    );
}
