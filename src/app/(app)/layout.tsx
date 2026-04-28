import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TopNav from "@/components/top-nav";
import { ProductTour } from "@/components/product-tour";
import { AIChatWidget } from "@/components/ai-chat-widget";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(fiscal_year_start_month)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    const currentYear = new Date().getFullYear();

    return (
        <div className="relative min-h-screen overflow-x-hidden">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="aurora-blob bg-primary/20 -top-40 -left-40 w-[500px] h-[500px]" />
                <div className="aurora-blob bg-chart-4/15 top-1/3 -right-40 w-[600px] h-[600px]" style={{ animationDelay: "-6s" }} />
                <div className="aurora-blob bg-chart-2/10 bottom-0 left-1/3 w-[500px] h-[500px]" style={{ animationDelay: "-12s" }} />
            </div>

            <TopNav year={currentYear} />
            <ProductTour />

            <main className="pt-24 md:pt-[108px] px-4 sm:px-6 lg:px-8 pb-16 max-w-7xl mx-auto">
                {children}
            </main>

            <AIChatWidget workspaceId={membership.workspace_id} />
        </div>
    );
}
