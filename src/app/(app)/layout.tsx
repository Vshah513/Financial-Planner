import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { ProductTour } from "@/components/product-tour";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    // Get user's workspace
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(fiscal_year_start_month)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    const currentYear = new Date().getFullYear();

    return (
        <div className="flex min-h-screen">
            <Sidebar year={currentYear} />
            <ProductTour />
            <main className="ml-60 flex-1 p-6 lg:p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
