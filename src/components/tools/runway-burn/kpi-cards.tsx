"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Flame, Clock, AlertTriangle } from "lucide-react";

interface KPICardsProps {
    kpis: {
        currentCash: number;
        avgRevenue: number;
        avgExpenses: number;
        avgBurn: number;
        runway: number | null;
        revenueGrowth: number;
    };
}

export function KPICards({ kpis }: KPICardsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatRunway = (months: number | null) => {
        if (months === null) return "Infinite ∞";
        if (months < 0) return "Profitable";
        return `${months.toFixed(1)} months`;
    };

    const getRunwayColor = (months: number | null) => {
        if (months === null || months < 0) return "text-green-600";
        if (months > 12) return "text-green-600";
        if (months > 6) return "text-orange-600";
        return "text-red-600";
    };

    const cards = [
        {
            title: "Current Cash",
            value: formatCurrency(kpis.currentCash),
            icon: DollarSign,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
        },
        {
            title: "Monthly Revenue",
            value: formatCurrency(kpis.avgRevenue),
            icon: TrendingUp,
            color: "text-green-600",
            bgColor: "bg-green-500/10",
            trend: kpis.revenueGrowth,
        },
        {
            title: "Monthly Expenses",
            value: formatCurrency(kpis.avgExpenses),
            icon: TrendingDown,
            color: "text-orange-600",
            bgColor: "bg-orange-500/10",
        },
        {
            title: "Burn Rate",
            value: formatCurrency(kpis.avgBurn),
            icon: Flame,
            color: kpis.avgBurn > 0 ? "text-red-600" : "text-green-600",
            bgColor: kpis.avgBurn > 0 ? "bg-red-500/10" : "bg-green-500/10",
            subtitle: kpis.avgBurn > 0 ? "Burning cash" : "Cash positive",
        },
        {
            title: "Runway",
            value: formatRunway(kpis.runway),
            icon: kpis.runway !== null && kpis.runway < 6 ? AlertTriangle : Clock,
            color: getRunwayColor(kpis.runway),
            bgColor:
                kpis.runway !== null && kpis.runway < 6
                    ? "bg-red-500/10"
                    : kpis.runway !== null && kpis.runway < 12
                        ? "bg-orange-500/10"
                        : "bg-green-500/10",
            subtitle: kpis.runway !== null && kpis.runway > 0 ? "Until cash runs out" : undefined,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                            {card.trend !== undefined && (
                                <div className="flex items-center gap-1 mt-1">
                                    {card.trend > 0 ? (
                                        <TrendingUp className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 text-red-600" />
                                    )}
                                    <span
                                        className={`text-xs ${card.trend > 0 ? "text-green-600" : "text-red-600"}`}
                                    >
                                        {card.trend > 0 ? "+" : ""}
                                        {card.trend.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {card.subtitle && (
                                <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
