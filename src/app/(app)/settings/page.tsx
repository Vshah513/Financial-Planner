import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCategories, getCategoryGroups, getCategorizationRules } from "@/app/actions/categories";
import { getRecurringRules } from "@/app/actions/recurring";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
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

    const [categories, categoryGroups, categorizationRules, recurringRules] = await Promise.all([
        getCategories(membership.workspace_id),
        getCategoryGroups(membership.workspace_id),
        getCategorizationRules(membership.workspace_id),
        getRecurringRules(membership.workspace_id),
    ]);

    const workspace = membership.workspaces as unknown as {
        name: string;
        default_currency: string;
        mode: string;
    };

    return (
        <SettingsClient
            workspaceId={membership.workspace_id}
            workspaceName={workspace.name}
            currency={workspace.default_currency}
            workspaceMode={(workspace.mode as "business" | "personal") || "business"}
            categories={categories}
            categoryGroups={categoryGroups}
            categorizationRules={categorizationRules}
            recurringRules={recurringRules}
        />
    );
}
