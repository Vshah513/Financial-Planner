import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

    // Safely fetch — tables may not exist yet
    let transactions: any[] = [];
    let accounts: any[] = [];
    let categories: any[] = [];
    let groups: any[] = [];

    try {
        const { data } = await supabase
            .from("transactions")
            .select("*, account:accounts(id, name), category:categories(id, name, type), group:category_groups(id, name)")
            .eq("workspace_id", membership.workspace_id)
            .order("posted_at", { ascending: false })
            .order("created_at", { ascending: false })
            .range(0, 199);
        transactions = data || [];
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
        categories = await getCategories(membership.workspace_id);
    } catch { /* may fail */ }

    try {
        groups = await getCategoryGroups(membership.workspace_id);
    } catch { /* may fail */ }

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
