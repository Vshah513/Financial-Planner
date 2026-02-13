"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import type { YearSummary } from "@/types/database";
import { getYearSummary } from "@/app/actions/periods";
import { ensurePeriodsForYear } from "@/app/actions/workspace";

const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function ValueCell({ value, currency }: { value: number; currency: string }) {
    return (
        <span className={value > 0 ? "positive-value" : value < 0 ? "negative-value" : "text-muted-foreground"}>
            {formatCurrency(value, currency)}
        </span>
    );
}

export default function DashboardClient({
    summary: initialSummary,
    workspaceId,
    workspaceName,
    currency,
    initialYear,
}: {
    summary: YearSummary | null;
    workspaceId: string;
    workspaceName: string;
    currency: string;
    initialYear: number;
}) {
    const [year, setYear] = useState(initialYear);
    const [summary, setSummary] = useState<YearSummary | null>(initialSummary);
    const [loading, setLoading] = useState(false);

    const changeYear = async (newYear: number) => {
        setLoading(true);
        setYear(newYear);
        try {
            await ensurePeriodsForYear(workspaceId, newYear);
            const data = await getYearSummary(workspaceId, newYear);
            setSummary(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const chartData = summary?.months.map((m, i) => ({
        month: MONTH_NAMES_SHORT[i],
        revenue: m.revenue,
        expenses: m.expenses,
        closingBalance: m.closingBalance,
    })) || [];

    const kpis = [
        {
            label: "Total Revenue",
            value: summary?.totalRevenue || 0,
            icon: <TrendingUp className="h-4 w-4" />,
            color: "text-chart-2",
            bg: "bg-chart-2/10",
        },
        {
            label: "Total Expenses",
            value: summary?.totalExpenses || 0,
            icon: <TrendingDown className="h-4 w-4" />,
            color: "text-chart-5",
            bg: "bg-chart-5/10",
        },
        {
            label: "Net Cash Flow",
            value: summary?.totalNetCashFlow || 0,
            icon: <DollarSign className="h-4 w-4" />,
            color: "text-chart-1",
            bg: "bg-chart-1/10",
        },
        {
            label: "Retained Earnings",
            value: summary?.totalRetainedEarnings || 0,
            icon: <DollarSign className="h-4 w-4" />,
            color: "text-chart-3",
            bg: "bg-chart-3/10",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{workspaceName}</h1>
                    <p className="text-sm text-muted-foreground">Year Summary</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeYear(year - 1)} disabled={loading}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select value={String(year)} onValueChange={(v) => changeYear(parseInt(v))}>
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => initialYear - 2 + i).map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => changeYear(year + 1)} disabled={loading}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}>
                                    <span className={kpi.color}>{kpi.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                                    <p className="text-xl font-bold">
                                        {formatCurrency(kpi.value, currency)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Revenue vs Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        fontSize: 12,
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="revenue" fill="oklch(0.696 0.17 162.48)" radius={[4, 4, 0, 0]} name="Revenue" />
                                <Bar dataKey="expenses" fill="oklch(0.645 0.246 16.439)" radius={[4, 4, 0, 0]} name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Closing Balance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        fontSize: 12,
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="closingBalance"
                                    stroke="oklch(0.55 0.18 260)"
                                    strokeWidth={2}
                                    dot={{ fill: "oklch(0.55 0.18 260)", r: 4 }}
                                    name="Closing Balance"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Summary Table */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-card z-10">Month</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">Expenses</TableHead>
                                    <TableHead className="text-right">Net Cash Flow</TableHead>
                                    <TableHead className="text-right">Dividends</TableHead>
                                    <TableHead className="text-right">Retained Earnings</TableHead>
                                    <TableHead className="text-right">Opening Bal.</TableHead>
                                    <TableHead className="text-right">Closing Bal.</TableHead>
                                    <TableHead className="text-right">Trend</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summary?.months.map((m, i) => {
                                    const prev = i > 0 ? summary.months[i - 1] : null;
                                    const trend = prev
                                        ? m.netCashFlow > prev.netCashFlow
                                            ? "up"
                                            : m.netCashFlow < prev.netCashFlow
                                                ? "down"
                                                : "stable"
                                        : "stable";

                                    return (
                                        <TableRow key={m.period.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="sticky left-0 bg-card z-10 font-medium">
                                                <Link
                                                    href={`/month/${year}/${m.period.month}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    {m.period.label}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ValueCell value={m.revenue} currency={currency} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ValueCell value={-m.expenses} currency={currency} />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <ValueCell value={m.netCashFlow} currency={currency} />
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatCurrency(m.dividendsReleased, currency)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ValueCell value={m.retainedEarnings} currency={currency} />
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {m.openingBalance !== null
                                                    ? formatCurrency(m.openingBalance, currency)
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                <ValueCell value={m.closingBalance} currency={currency} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {trend === "up" && (
                                                    <ArrowUpRight className="h-4 w-4 text-chart-2 inline" />
                                                )}
                                                {trend === "down" && (
                                                    <ArrowDownRight className="h-4 w-4 text-chart-5 inline" />
                                                )}
                                                {trend === "stable" && (
                                                    <Minus className="h-4 w-4 text-muted-foreground inline" />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* Totals row */}
                                {summary && (
                                    <TableRow className="font-bold border-t-2 border-border bg-muted/20">
                                        <TableCell className="sticky left-0 bg-muted/20 z-10">TOTAL</TableCell>
                                        <TableCell className="text-right">
                                            <ValueCell value={summary.totalRevenue} currency={currency} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ValueCell value={-summary.totalExpenses} currency={currency} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ValueCell value={summary.totalNetCashFlow} currency={currency} />
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatCurrency(summary.totalDividends, currency)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <ValueCell value={summary.totalRetainedEarnings} currency={currency} />
                                        </TableCell>
                                        <TableCell className="text-right">—</TableCell>
                                        <TableCell className="text-right">—</TableCell>
                                        <TableCell />
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
