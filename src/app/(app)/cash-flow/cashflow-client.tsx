"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
    TrendingUp, TrendingDown, DollarSign, PiggyBank,
    ArrowDownLeft, ArrowUpRight, Calendar,
} from "lucide-react";
import { getCashFlowSummary, getCashFlowByGroup, getSankeyData } from "@/app/actions/transactions";
import type { CashFlowSummary, CashFlowByGroup, SankeyData, Category, CategoryGroup } from "@/types/database";

// Dynamic import for Sankey to avoid SSR issues
const ResponsiveSankey = dynamic(
    () => import("@nivo/sankey").then((m) => m.ResponsiveSankey),
    { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div> }
);

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

const DATE_PRESETS = [
    {
        label: "This Month", getValue: () => {
            const now = new Date();
            return {
                from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
                to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
            };
        }
    },
    {
        label: "Last Month", getValue: () => {
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return {
                from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
                to: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`,
            };
        }
    },
    {
        label: "Last 3 Months", getValue: () => {
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            return {
                from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
                to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
            };
        }
    },
    {
        label: "Year to Date", getValue: () => {
            const now = new Date();
            return {
                from: `${now.getFullYear()}-01-01`,
                to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
            };
        }
    },
];

interface CashFlowClientProps {
    initialSummary: CashFlowSummary;
    initialByGroup: CashFlowByGroup[];
    initialSankey: SankeyData;
    initialTransactions: Array<{
        id: string;
        posted_at: string;
        description: string;
        amount: number;
        direction: string;
        category_id: string | null;
        status: string;
        account?: { id: string; name: string } | null;
        category?: { id: string; name: string } | null;
    }>;
    accounts: Array<{ id: string; name: string }>;
    categories: Category[];
    categoryGroups: CategoryGroup[];
    workspaceId: string;
    currency: string;
    initialDateFrom: string;
    initialDateTo: string;
}

export default function CashFlowClient({
    initialSummary,
    initialByGroup,
    initialSankey,
    initialTransactions,
    workspaceId,
    currency,
    initialDateFrom,
    initialDateTo,
}: CashFlowClientProps) {
    const [summary, setSummary] = useState(initialSummary);
    const [byGroup, setByGroup] = useState(initialByGroup);
    const [sankeyData, setSankeyData] = useState(initialSankey);
    const [dateFrom, setDateFrom] = useState(initialDateFrom);
    const [dateTo, setDateTo] = useState(initialDateTo);
    const [groupingMode, setGroupingMode] = useState<"group" | "category">("group");
    const [loading, setLoading] = useState(false);

    const refreshData = useCallback(async (from: string, to: string, mode: "group" | "category") => {
        setLoading(true);
        try {
            const [s, g, sk] = await Promise.all([
                getCashFlowSummary(workspaceId, from, to),
                getCashFlowByGroup(workspaceId, from, to),
                getSankeyData(workspaceId, from, to, mode),
            ]);
            setSummary(s);
            setByGroup(g);
            setSankeyData(sk);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    const handleDateChange = (from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);
        refreshData(from, to, groupingMode);
    };

    const handleGroupingChange = (mode: "group" | "category") => {
        setGroupingMode(mode);
        refreshData(dateFrom, dateTo, mode);
    };

    const hasSankeyData = sankeyData.nodes.length > 0 && sankeyData.links.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Analyze your income flow vs expenses
                    </p>
                </div>
            </div>

            {/* Date Range + Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateChange(e.target.value, dateTo)}
                        className="h-7 w-36 text-xs border-0 bg-transparent"
                    />
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateChange(dateFrom, e.target.value)}
                        className="h-7 w-36 text-xs border-0 bg-transparent"
                    />
                </div>
                <div className="flex gap-1">
                    {DATE_PRESETS.map((preset) => (
                        <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={() => {
                                const { from, to } = preset.getValue();
                                handleDateChange(from, to);
                            }}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Income"
                    value={formatCurrency(summary.total_income, currency)}
                    icon={<TrendingUp className="h-5 w-5 text-chart-2" />}
                    iconBg="bg-chart-2/10"
                    valueClass="positive-value"
                />
                <KPICard
                    title="Total Expenses"
                    value={formatCurrency(summary.total_expenses, currency)}
                    icon={<TrendingDown className="h-5 w-5 text-chart-5" />}
                    iconBg="bg-chart-5/10"
                    valueClass="negative-value"
                />
                <KPICard
                    title="Net Income"
                    value={formatCurrency(summary.net_income, currency)}
                    icon={<DollarSign className="h-5 w-5 text-primary" />}
                    iconBg="bg-primary/10"
                    valueClass={summary.net_income >= 0 ? "positive-value" : "negative-value"}
                />
                <KPICard
                    title="Savings Rate"
                    value={`${summary.savings_rate.toFixed(1)}%`}
                    icon={<PiggyBank className="h-5 w-5 text-chart-3" />}
                    iconBg="bg-chart-3/10"
                    valueClass={summary.savings_rate >= 0 ? "positive-value" : "negative-value"}
                />
            </div>

            {/* Sankey Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-sm font-medium">Income Flow</CardTitle>
                    <Select value={groupingMode} onValueChange={(v) => handleGroupingChange(v as "group" | "category")}>
                        <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="group">By Category Group</SelectItem>
                            <SelectItem value="category">By Category</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="pt-0">
                    {hasSankeyData ? (
                        <div className="h-[400px]">
                            <ResponsiveSankey
                                data={sankeyData}
                                margin={{ top: 20, right: 160, bottom: 20, left: 160 }}
                                align="justify"
                                colors={{ scheme: "category10" }}
                                nodeOpacity={1}
                                nodeHoverOthersOpacity={0.35}
                                nodeThickness={18}
                                nodeSpacing={20}
                                nodeBorderWidth={0}
                                nodeBorderRadius={3}
                                linkOpacity={0.4}
                                linkHoverOpacity={0.7}
                                linkContract={3}
                                enableLinkGradient={true}
                                labelPosition="outside"
                                labelOrientation="horizontal"
                                labelPadding={12}
                                labelTextColor={{ from: "color", modifiers: [["darker", 1]] }}
                                animate={true}
                            />
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground text-sm space-y-2">
                            <TrendingUp className="h-12 w-12 text-primary/20" />
                            <p>No transaction data for this date range</p>
                            <p className="text-xs">Add transactions to see your cash flow visualized</p>
                        </div>
                    )}
                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Badge variant="secondary" className="animate-pulse text-xs">Updating...</Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Group Breakdown */}
            {byGroup.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30 text-[10px]">Income</Badge>
                                By Group
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {byGroup.filter((g) => g.direction === "inflow").map((g, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-muted-foreground">{g.group_name || "Uncategorized"}</span>
                                    <span className="text-sm font-medium positive-value">{formatCurrency(g.total, currency)}</span>
                                </div>
                            ))}
                            {byGroup.filter((g) => g.direction === "inflow").length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">No income data</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/30 text-[10px]">Expenses</Badge>
                                By Group
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                            {byGroup.filter((g) => g.direction === "outflow").map((g, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5">
                                    <span className="text-sm text-muted-foreground">{g.group_name || "Uncategorized"}</span>
                                    <span className="text-sm font-medium negative-value">{formatCurrency(g.total, currency)}</span>
                                </div>
                            ))}
                            {byGroup.filter((g) => g.direction === "outflow").length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">No expense data</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Transactions for date range */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium">
                        Transactions · {initialTransactions.length}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs">Account</TableHead>
                                <TableHead className="text-xs">Category</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialTransactions.slice(0, 50).map((txn) => (
                                <TableRow key={txn.id}>
                                    <TableCell className="text-xs text-muted-foreground">{txn.posted_at}</TableCell>
                                    <TableCell className="text-sm">
                                        <div className="flex items-center gap-1.5">
                                            {txn.direction === "inflow" ? (
                                                <ArrowDownLeft className="h-3 w-3 text-chart-2 shrink-0" />
                                            ) : (
                                                <ArrowUpRight className="h-3 w-3 text-chart-5 shrink-0" />
                                            )}
                                            {txn.description}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{txn.account?.name || "—"}</TableCell>
                                    <TableCell>
                                        {txn.category ? (
                                            <Badge variant="secondary" className="text-[10px]">{txn.category.name}</Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-sm">
                                        <span className={txn.direction === "inflow" ? "positive-value" : "negative-value"}>
                                            {txn.direction === "outflow" ? "-" : ""}
                                            {formatCurrency(Number(txn.amount), currency)}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {initialTransactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                                        No transactions in this date range
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function KPICard({
    title,
    value,
    icon,
    iconBg,
    valueClass,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    valueClass: string;
}) {
    return (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
                        <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
