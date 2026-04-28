"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Settings,
    Download,
    LogOut,
    Landmark,
    ArrowLeftRight,
    TrendingUp,
    PiggyBank,
    Target,
    Wrench,
    Calendar,
    Menu,
    X,
    ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MarketTicker } from "@/components/market-ticker";

const PRIMARY_LINKS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/accounts", label: "Accounts", icon: Landmark },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/cash-flow", label: "Cash Flow", icon: TrendingUp },
    { href: "/budget", label: "Budget", icon: PiggyBank },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/tools", label: "Tools", icon: Wrench },
];

const SECONDARY_LINKS = [
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/export", label: "Export / Import", icon: Download },
];

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function TopNav({ year }: { year: number }) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [monthsOpen, setMonthsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => setMobileOpen(false), [pathname]);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth");
    };

    return (
        <>
            <header
                className={cn(
                    "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
                    scrolled ? "p-2" : "p-4"
                )}
            >
                <div
                    className={cn(
                        "glass-nav mx-auto flex items-center justify-between gap-2 transition-all duration-300",
                        scrolled
                            ? "max-w-7xl rounded-2xl px-3 py-2 shadow-lg shadow-black/10"
                            : "max-w-7xl rounded-3xl px-4 py-2.5"
                    )}
                >
                    <Link href="/dashboard" className="flex items-center gap-2 shrink-0 cursor-pointer group">
                        <div className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-border/40 group-hover:ring-primary/50 transition">
                            <Image
                                src="/New Logo.png"
                                alt="Cash Clarity"
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                                priority
                            />
                        </div>
                        <span className="hidden sm:block font-bold text-sm tracking-tight">
                            Cash Clarity
                        </span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
                        {PRIMARY_LINKS.map((link) => {
                            const active =
                                pathname === link.href ||
                                (link.href !== "/dashboard" && pathname.startsWith(link.href));
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    id={
                                        link.href === "/tools"
                                            ? "tour-tools-link"
                                            : undefined
                                    }
                                    className={cn(
                                        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                                        active
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="nav-active"
                                            className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-primary/30"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <Icon className="relative h-3.5 w-3.5" />
                                    <span className="relative">{link.label}</span>
                                </Link>
                            );
                        })}

                        <div className="relative">
                            <button
                                id="tour-month-link"
                                onClick={() => setMonthsOpen((o) => !o)}
                                onBlur={() => setTimeout(() => setMonthsOpen(false), 150)}
                                className={cn(
                                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                                    pathname.startsWith("/month")
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {pathname.startsWith("/month") && (
                                    <motion.span
                                        layoutId="nav-active"
                                        className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-primary/30"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <Calendar className="relative h-3.5 w-3.5" />
                                <span className="relative">Months</span>
                                <ChevronDown className="relative h-3 w-3" />
                            </button>
                            <AnimatePresence>
                                {monthsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full mt-2 right-0 w-64 grid grid-cols-3 gap-1 p-2 rounded-2xl glass-panel shadow-xl"
                                    >
                                        {MONTHS.map((m, i) => (
                                            <Link
                                                key={m}
                                                href={`/month/${year}/${i + 1}`}
                                                className={cn(
                                                    "px-2 py-2 rounded-lg text-xs text-center transition-colors cursor-pointer",
                                                    pathname === `/month/${year}/${i + 1}`
                                                        ? "bg-primary/20 text-foreground font-semibold"
                                                        : "hover:bg-foreground/5 text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {m}
                                            </Link>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </nav>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <ThemeToggle />
                        {SECONDARY_LINKS.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    aria-label={link.label}
                                    id={
                                        link.href === "/export"
                                            ? "tour-export-link"
                                            : link.href === "/settings"
                                                ? "tour-settings-link"
                                                : undefined
                                    }
                                    className={cn(
                                        "hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur cursor-pointer hover:bg-background/60 transition-colors",
                                        pathname === link.href && "ring-1 ring-primary/50"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleSignOut}
                            aria-label="Sign out"
                            className="hidden md:flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur cursor-pointer hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-label="Menu"
                            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-full border border-border/40 bg-background/40 backdrop-blur cursor-pointer"
                        >
                            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </header>

            <div className="fixed top-[68px] left-0 right-0 z-30 hidden md:block">
                <MarketTicker />
            </div>

            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    >
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 280 }}
                            className="absolute top-0 right-0 h-full w-[85%] max-w-sm glass-panel border-l border-border/40 p-6 overflow-y-auto thin-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <span className="font-bold text-lg">Menu</span>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="h-9 w-9 rounded-full border border-border/40 flex items-center justify-center cursor-pointer"
                                    aria-label="Close menu"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <nav className="space-y-1">
                                {PRIMARY_LINKS.map((link) => {
                                    const active =
                                        pathname === link.href ||
                                        (link.href !== "/dashboard" && pathname.startsWith(link.href));
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                                                active
                                                    ? "bg-primary/15 ring-1 ring-primary/30 text-foreground"
                                                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {link.label}
                                        </Link>
                                    );
                                })}
                                <div className="pt-3 mt-3 border-t border-border/40">
                                    <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                        Months
                                    </p>
                                    <div className="grid grid-cols-3 gap-1 px-2">
                                        {MONTHS.map((m, i) => (
                                            <Link
                                                key={m}
                                                href={`/month/${year}/${i + 1}`}
                                                className={cn(
                                                    "px-2 py-2 rounded-lg text-xs text-center transition-colors cursor-pointer",
                                                    pathname === `/month/${year}/${i + 1}`
                                                        ? "bg-primary/20 text-foreground font-semibold"
                                                        : "hover:bg-foreground/5 text-muted-foreground"
                                                )}
                                            >
                                                {m}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-3 mt-3 border-t border-border/40 space-y-1">
                                    {SECONDARY_LINKS.map((link) => {
                                        const Icon = link.icon;
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                <Icon className="h-4 w-4" />
                                                {link.label}
                                            </Link>
                                        );
                                    })}
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </nav>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
