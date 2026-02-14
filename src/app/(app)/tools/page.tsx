import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
    Wrench,
    TrendingUp,
    PiggyBank,
    FileText,
    Gauge,
    Receipt,
    Calculator,
    FileBarChart,
} from "lucide-react";
import { ToolCard } from "@/components/tools/tool-card";

const PERSONAL_TOOLS = [
    {
        title: "Life Event Simulator",
        description: "Model a life change and see how it impacts your monthly cash, runway, and goals—under conservative/base/aggressive scenarios.",
        icon: TrendingUp,
        href: "/tools/life-event-simulator",
        isAvailable: true,
    },
    {
        title: "Savings Rate Optimizer",
        description: "To reach $X by date Y, you need $Z/month. Here's the cleanest cut plan—and what happens if you don't cut.",
        icon: PiggyBank,
        href: "/tools/savings-optimizer",
        isAvailable: true,
    },
    {
        title: "Negotiation Prep Tool",
        description: "Walk into rent renewal/salary negotiation/car purchase with a real plan: BATNA, target, walk-away, and scripts.",
        icon: FileText,
        href: "/tools/negotiation-prep",
        badge: "Coming Soon",
        isAvailable: false,
    },
];

const BUSINESS_TOOLS = [
    {
        title: "Runway + Burn Dashboard",
        description: "Know exactly how long your business survives and what's driving burn.",
        icon: Gauge,
        href: "/tools/runway-burn",
        isAvailable: true,
    },
    {
        title: "Tax Reserve Engine",
        description: "Automatically set aside tax money and never get surprised quarterly.",
        icon: Receipt,
        href: "/tools/tax-reserve",
        isAvailable: true,
    },
    {
        title: "Pricing & Margin Tool",
        description: "Stop guessing prices. Know your break-even and margin instantly.",
        icon: Calculator,
        href: "/tools/pricing-margin",
        isAvailable: true,
    },
    {
        title: "Board-Ready Monthly Pack",
        description: "Generate a clean board/update deck in one click.",
        icon: FileBarChart,
        href: "/tools/board-pack",
        badge: "Coming Soon",
        isAvailable: false,
    },
];

export default async function ToolsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/auth");

    // Get user's workspace and mode
    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(mode)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) redirect("/onboarding");

    const workspaceMode = (membership.workspaces as any)?.mode || 'personal';

    // Filter tools based on workspace mode (Option A from implementation plan)
    const showPersonalTools = workspaceMode === 'personal';
    const showBusinessTools = workspaceMode === 'business';

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Wrench className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
                </div>
                <p className="text-muted-foreground">
                    Specialized financial tools to help you plan, optimize, and make better decisions.
                </p>
            </div>

            {/* Personal Tools */}
            {showPersonalTools && (
                <section>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-1">Personal Tools</h2>
                        <p className="text-sm text-muted-foreground">
                            Tools for personal financial planning and decision-making
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PERSONAL_TOOLS.map((tool) => (
                            <ToolCard
                                key={tool.href}
                                title={tool.title}
                                description={tool.description}
                                icon={tool.icon}
                                href={tool.href}
                                category="personal"
                                badge={tool.badge}
                                isAvailable={tool.isAvailable}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Business Tools */}
            {showBusinessTools && (
                <section>
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-1">Business Tools</h2>
                        <p className="text-sm text-muted-foreground">
                            Tools for business financial management and reporting
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {BUSINESS_TOOLS.map((tool) => (
                            <ToolCard
                                key={tool.href}
                                title={tool.title}
                                description={tool.description}
                                icon={tool.icon}
                                href={tool.href}
                                category="business"
                                badge={tool.badge}
                                isAvailable={tool.isAvailable}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State (if somehow no mode is set) */}
            {!showPersonalTools && !showBusinessTools && (
                <div className="text-center py-12">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Tools Available</h3>
                    <p className="text-muted-foreground">
                        Please configure your workspace mode in settings to access tools.
                    </p>
                </div>
            )}
        </div>
    );
}
