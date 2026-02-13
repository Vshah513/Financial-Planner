import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getGoals } from "@/app/actions/goals";
import { getCategories } from "@/app/actions/categories";
import GoalsClient from "./goals-client";

export default async function GoalsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name, default_currency)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");
    const workspace = membership.workspaces as unknown as { name: string; default_currency: string };

    const [goals, categories] = await Promise.all([
        getGoals(membership.workspace_id),
        getCategories(membership.workspace_id),
    ]);

    return (
        <GoalsClient
            goals={goals}
            categories={categories}
            workspaceId={membership.workspace_id}
            currency={workspace.default_currency}
        />
    );
}
