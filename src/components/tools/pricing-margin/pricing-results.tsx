"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Target, BarChart3 } from "lucide-react";

interface PricingResultsProps {
    results: {
        recommendedPrice: number;
        totalCostPerUnit: number;
        fixedCostPerUnit: number;
        variableCostPerUnit: number;
        contributionMargin: number;
        breakEvenUnits: number | null;
        expectedVolume: number;
        revenue: number;
        totalCosts: number;
        profit: number;
        actualMarginPct: number;
    };
}

export function PricingResults({ results }: PricingResultsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    const cards = [
        {
            title: "Recommended Price",
            value: formatCurrency(results.recommendedPrice),
            subtitle: `${formatCurrency(results.totalCostPerUnit)} cost per unit`,
            icon: DollarSign,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Contribution Margin",
            value: formatCurrency(results.contributionMargin),
            subtitle: "Per unit after variable costs",
            icon: TrendingUp,
            color: "text-green-600",
            bgColor: "bg-green-500/10",
        },
        {
            title: "Break-Even Volume",
            value: results.breakEvenUnits ? formatNumber(results.breakEvenUnits) : "N/A",
            subtitle: "Units to cover fixed costs",
            icon: Target,
            color: "text-orange-600",
            bgColor: "bg-orange-500/10",
        },
        {
            title: "Projected Profit",
            value: formatCurrency(results.profit),
            subtitle: `At ${formatNumber(results.expectedVolume)} units/month`,
            icon: BarChart3,
            color: results.profit >= 0 ? "text-green-600" : "text-red-600",
            bgColor: results.profit >= 0 ? "bg-green-500/10" : "bg-red-500/10",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {card.title}
                                    </CardTitle>
                                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                        <Icon className={`h-4 w-4 ${card.color}`} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Detailed Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Fixed Cost Per Unit</span>
                        <span className="font-semibold">{formatCurrency(results.fixedCostPerUnit)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm font-medium">Variable Cost Per Unit</span>
                        <span className="font-semibold">{formatCurrency(results.variableCostPerUnit)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="text-sm font-medium">Total Cost Per Unit</span>
                        <span className="font-semibold">{formatCurrency(results.totalCostPerUnit)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Financial Summary</CardTitle>
                        <Badge variant={results.actualMarginPct >= 30 ? "default" : "secondary"}>
                            {results.actualMarginPct.toFixed(1)}% Margin
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Revenue</span>
                        <span className="font-semibold text-green-600">
                            {formatCurrency(results.revenue)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Costs</span>
                        <span className="font-semibold text-orange-600">
                            {formatCurrency(results.totalCosts)}
                        </span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Net Profit</span>
                        <span
                            className={`text-xl font-bold ${results.profit >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                        >
                            {formatCurrency(results.profit)}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
