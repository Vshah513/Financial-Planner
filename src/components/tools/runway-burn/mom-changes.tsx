"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MoMChangesProps {
    changes: {
        revenue: { current: number; previous: number; change: number };
        expenses: { current: number; previous: number; change: number };
        burn: { current: number; previous: number; change: number };
        topCategoryChanges: Array<{
            name: string;
            current: number;
            previous: number;
            change: number;
        }>;
    };
}

export function MoMChanges({ changes }: MoMChangesProps) {
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
            label: "Revenue",
            ...changes.revenue,
            isGood: "positive" as const,
        },
        {
            label: "Expenses",
            ...changes.expenses,
            isGood: "negative" as const,
        },
        {
            label: "Burn Rate",
            ...changes.burn,
            isGood: "negative" as const,
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Month-over-Month Changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Overall Metrics */}
                <div className="grid grid-cols-3 gap-4">
                    {metrics.map((metric) => {
                        const Icon = getChangeIcon(metric.change);
                        const color = getChangeColor(metric.change, metric.isGood);

                        return (
                            <div key={metric.label} className="space-y-1">
                                <p className="text-xs text-muted-foreground">{metric.label}</p>
                                <p className="text-lg font-semibold">{formatCurrency(metric.current)}</p>
                                <div className="flex items-center gap-1">
                                    <Icon className={`h-3 w-3 ${color}`} />
                                    <span className={`text-xs ${color}`}>{formatChange(metric.change)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    vs {formatCurrency(metric.previous)}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Category Changes */}
                <div className="space-y-3 pt-4 border-t">
                    <h4 className="text-sm font-medium">Biggest Category Changes</h4>
                    {changes.topCategoryChanges.map((cat) => {
                        const Icon = getChangeIcon(cat.change);
                        const color = getChangeColor(cat.change, "negative");

                        return (
                            <div key={cat.name} className="flex items-center justify-between text-sm">
                                <span className="font-medium">{cat.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        {formatCurrency(cat.previous)} → {formatCurrency(cat.current)}
                                    </span>
                                    <Badge variant="outline" className={`gap-1 ${color}`}>
                                        <Icon className="h-3 w-3" />
                                        {formatChange(cat.change)}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                    {changes.topCategoryChanges.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                            No category changes to display
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
