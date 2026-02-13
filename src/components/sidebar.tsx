"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Settings,
    Download,
    ChevronLeft,
    ChevronRight,
    LogOut,
    DollarSign,
    Landmark,
    ArrowLeftRight,
    TrendingUp,
    PiggyBank,
    Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function Sidebar({ year }: { year: number }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth");
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300",
                collapsed ? "w-16" : "w-60"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <DollarSign className="h-4 w-4" />
                </div>
                {!collapsed && (
                    <span className="text-sm font-bold tracking-tight">Cash Clarity</span>
                )}
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                <NavItem
                    href="/dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Dashboard"
                    active={pathname === "/dashboard"}
                    collapsed={collapsed}
                />

                {!collapsed && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Actuals
                    </p>
                )}

                <NavItem
                    href="/accounts"
                    icon={<Landmark className="h-4 w-4" />}
                    label="Accounts"
                    active={pathname === "/accounts"}
                    collapsed={collapsed}
                />
                <NavItem
                    href="/transactions"
                    icon={<ArrowLeftRight className="h-4 w-4" />}
                    label="Transactions"
                    active={pathname === "/transactions"}
                    collapsed={collapsed}
                />
                <NavItem
                    href="/cash-flow"
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Cash Flow"
                    active={pathname === "/cash-flow"}
                    collapsed={collapsed}
                />
                <NavItem
                    href="/budget"
                    icon={<PiggyBank className="h-4 w-4" />}
                    label="Budget"
                    active={pathname === "/budget"}
                    collapsed={collapsed}
                />
                <NavItem
                    href="/goals"
                    icon={<Target className="h-4 w-4" />}
                    label="Goals"
                    active={pathname === "/goals"}
                    collapsed={collapsed}
                />

                {!collapsed && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Planner
                    </p>
                )}

                {MONTHS.map((month, i) => (
                    <NavItem
                        key={month}
                        href={`/month/${year}/${i + 1}`}
                        icon={<Calendar className="h-4 w-4" />}
                        label={month}
                        active={pathname === `/month/${year}/${i + 1}`}
                        collapsed={collapsed}
                    />
                ))}

                <Separator className="my-2" />

                <NavItem
                    href="/settings"
                    icon={<Settings className="h-4 w-4" />}
                    label="Settings"
                    active={pathname === "/settings"}
                    collapsed={collapsed}
                />

                <NavItem
                    href="/export"
                    icon={<Download className="h-4 w-4" />}
                    label="Export / Import"
                    active={pathname === "/export"}
                    collapsed={collapsed}
                />
            </nav>

            {/* Footer */}
            <div className="border-t border-border p-2 space-y-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
                >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span className="ml-2 text-xs">Sign Out</span>}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </aside>
    );
}

function NavItem({
    href,
    icon,
    label,
    active,
    collapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
    collapsed: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-smooth",
                active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0"
            )}
        >
            {icon}
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}
