"use client";

import { useState, useEffect } from "react";
import { KPICards } from "@/components/tools/runway-burn/kpi-cards";
import { ExpenseDrivers } from "@/components/tools/runway-burn/expense-drivers";
import { MoMChanges } from "@/components/tools/runway-burn/mom-changes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Gauge, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import {
    calculateBusinessKPIs,
    calculateMoMChanges,
    saveKPISnapshot,
} from "@/app/actions/runway";

interface RunwayBurnClientProps {
    workspaceId: string;
}

export function RunwayBurnClient({ workspaceId }: RunwayBurnClientProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [kpis, setKpis] = useState<any>(null);
    const [momChanges, setMomChanges] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        loadData();
    }, [workspaceId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [kpiData, momData] = await Promise.all([
                calculateBusinessKPIs(workspaceId, 3),
                calculateMoMChanges(workspaceId),
            ]);

            setKpis(kpiData);
            setMomChanges(momData);
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            alert("Failed to load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSnapshot = async () => {
        if (!kpis) return;

        setSaving(true);
        try {
            await saveKPISnapshot(workspaceId, new Date(), {
                currentCash: kpis.currentCash,
                avgRevenue: kpis.avgRevenue,
                avgExpenses: kpis.avgExpenses,
                avgBurn: kpis.avgBurn,
                runway: kpis.runway,
                revenueGrowth: kpis.revenueGrowth,
            });

            alert("KPI snapshot saved successfully!");
        } catch (error) {
            console.error("Failed to save snapshot:", error);
            alert("Failed to save snapshot. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 animate-pulse">
                        <Gauge className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Runway + Burn Dashboard</h1>
                        <p className="text-muted-foreground">Loading your business metrics...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!kpis) {
        return (
            <div className="space-y-6">
                <Link
                    href="/tools"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Link>
                <Alert>
                    <AlertDescription>
                        No transaction data available. Please add transactions to your workspace to see your
                        runway and burn metrics.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/tools"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Link>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                            <Gauge className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Runway + Burn Dashboard</h1>
                            <p className="text-muted-foreground">
                                Track your burn rate, runway, and key business metrics
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={handleSaveSnapshot} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Snapshot"}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Last updated: {lastUpdated.toLocaleTimeString()} • Based on {kpis.period} of data
                </p>
            </div>

            {/* KPI Cards */}
            <KPICards kpis={kpis} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Drivers */}
                <ExpenseDrivers drivers={kpis.topDrivers} />

                {/* Month-over-Month Changes */}
                {momChanges && <MoMChanges changes={momChanges} />}
            </div>

            {/* Monthly Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {kpis.monthlyData.map((month: any, idx: number) => {
                            const date = new Date(month.date);
                            const monthLabel = date.toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                            });
                            const maxValue = Math.max(
                                ...kpis.monthlyData.map((m: any) =>
                                    Math.max(m.revenue, m.expenses)
                                )
                            );

                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{monthLabel}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-green-600">
                                                Revenue: ${month.revenue.toLocaleString()}
                                            </span>
                                            <span className="text-orange-600">
                                                Expenses: ${month.expenses.toLocaleString()}
                                            </span>
                                            <span
                                                className={month.net >= 0 ? "text-green-600" : "text-red-600"}
                                            >
                                                Net: ${month.net.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 h-8">
                                        <div
                                            className="bg-green-500/50 rounded"
                                            style={{ width: `${(month.revenue / maxValue) * 100}%` }}
                                            title={`Revenue: $${month.revenue.toLocaleString()}`}
                                        />
                                        <div
                                            className="bg-orange-500/50 rounded"
                                            style={{ width: `${(month.expenses / maxValue) * 100}%` }}
                                            title={`Expenses: $${month.expenses.toLocaleString()}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
