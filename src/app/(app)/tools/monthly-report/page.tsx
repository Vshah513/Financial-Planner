import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MonthlyReportClient } from "./monthly-report-client";

export default async function MonthlyReportPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    // Get user's workspace
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    return <MonthlyReportClient workspaceId={membership.workspace_id} />;
}
