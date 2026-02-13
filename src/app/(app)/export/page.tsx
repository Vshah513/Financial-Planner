import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExportClient from "./export-client";

export default async function ExportPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth");

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    const currentYear = new Date().getFullYear();

    return (
        <ExportClient
            workspaceId={membership.workspace_id}
            initialYear={currentYear}
        />
    );
}
