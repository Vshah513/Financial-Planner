import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getYearSummary } from "@/app/actions/periods";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
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

    const currentYear = new Date().getFullYear();
    const summary = await getYearSummary(membership.workspace_id, currentYear);
    const workspace = membership.workspaces as unknown as { name: string; default_currency: string };

    return (
        <DashboardClient
            summary={summary}
            workspaceId={membership.workspace_id}
            workspaceName={workspace.name}
            currency={workspace.default_currency}
            initialYear={currentYear}
        />
    );
}
