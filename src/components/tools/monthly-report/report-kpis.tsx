"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Minus } from "lucide-react";

interface ReportKPIsProps {
    kpis: {
        currentCash: number;
        revenue: number;
        expenses: number;
        profit: number;
        burnRate: number;
        runway: number | null;
        revenueChange: number;
        expenseChange: number;
        profitChange: number;
    };
}

export function ReportKPIs({ kpis }: ReportKPIsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatChange = (change: number) => {
        const sign = change > 0 ? "+" : "";
        return `${sign}${change.toFixed(1)}%`;
    };

    const getChangeIcon = (change: number) => {
        if (Math.abs(change) < 1) return Minus;
        return change > 0 ? TrendingUp : TrendingDown;
    };

    const getChangeColor = (change: number, isGood: "positive" | "negative") => {
        if (Math.abs(change) < 1) return "text-muted-foreground";
        if (isGood === "positive") {
            return change > 0 ? "text-green-600" : "text-red-600";
        }
        return change > 0 ? "text-red-600" : "text-green-600";
    };

    const metrics = [
        {
            title: "Cash Position",
            value: kpis.currentCash,
            icon: DollarSign,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Revenue",
            value: kpis.revenue,
            change: kpis.revenueChange,
            isGood: "positive" as const,
            icon: TrendingUp,
            color: "text-green-600",
            bgColor: "bg-green-500/10",
        },
        {
            title: "Expenses",
            value: kpis.expenses,
            change: kpis.expenseChange,
            isGood: "negative" as const,
            icon: TrendingDown,
            color: "text-orange-600",
            bgColor: "bg-orange-500/10",
        },
        {
            title: "Net Profit",
            value: kpis.profit,
            change: kpis.profitChange,
            isGood: "positive" as const,
            icon: kpis.profit >= 0 ? TrendingUp : TrendingDown,
            color: kpis.profit >= 0 ? "text-green-600" : "text-red-600",
            bgColor: kpis.profit >= 0 ? "bg-green-500/10" : "bg-red-500/10",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => {
                const Icon = metric.icon;
                const ChangeIcon = metric.change !== undefined ? getChangeIcon(metric.change) : null;
                const changeColor =
                    metric.change !== undefined ? getChangeColor(metric.change, metric.isGood) : "";

                return (
                    <Card key={metric.title}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {metric.title}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                                    <Icon className={`h-4 w-4 ${metric.color}`} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${metric.color}`}>
                                {formatCurrency(metric.value)}
                            </div>
                            {metric.change !== undefined && ChangeIcon && (
                                <div className="flex items-center gap-1 mt-1">
                                    <ChangeIcon className={`h-3 w-3 ${changeColor}`} />
                                    <span className={`text-xs ${changeColor}`}>
                                        {formatChange(metric.change)} MoM
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
