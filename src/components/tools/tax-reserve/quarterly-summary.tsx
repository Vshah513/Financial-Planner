"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface QuarterlySummaryProps {
    summary: {
        quarter: number;
        totalRevenue: number;
        totalDeductibleExpenses: number;
        totalProfit: number;
        totalTaxableAmount: number;
        totalRecommendedReserve: number;
        totalActualReserved: number;
    };
}

export function QuarterlySummary({ summary }: QuarterlySummaryProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits": 0,
      maximumFractionDigits: 0,
        }).format(amount);
    };

    const reservePercentage =
        summary.totalRecommendedReserve > 0
            ? (summary.totalActualReserved / summary.totalRecommendedReserve) * 100
            : 0;

    const getQuarterLabel = (q: number) => {
        const labels = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
        return labels[q - 1] || `Q${q}`;
    };

    const metrics = [
        { label: "Total Revenue", value: summary.totalRevenue, color: "text-green-600" },
        {
            label: "Deductible Expenses",
            value: summary.totalDeductibleExpenses,
            color: "text-blue-600",
        },
        { label: "Profit", value: summary.totalProfit, color: "text-purple-600" },
        { label: "Taxable Amount", value: summary.totalTaxableAmount, color: "text-orange-600" },
    ];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{getQuarterLabel(summary.quarter)} Summary</CardTitle>
                    <Badge
                        variant={reservePercentage >= 95 ? "default" : "secondary"}
                        className={reservePercentage >= 95 ? "bg-green-600" : ""}
                    >
                        {reservePercentage.toFixed(0)}% Reserved
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {metrics.map((metric) => (
                        <div key={metric.label} className="space-y-1">
                            <p className="text-xs text-muted-foreground">{metric.label}</p>
                            <p className={`text-lg font-semibold ${metric.color}`}>
                                {formatCurrency(metric.value)}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Reserve Progress */}
                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Tax Reserve Progress</p>
                            <p className="text-xs text-muted-foreground">
                                {formatCurrency(summary.totalActualReserved)} of{" "}
                                {formatCurrency(summary.totalRecommendedReserve)}
                            </p>
                        </div>
                        <p className="text-2xl font-bold">
                            {formatCurrency(summary.totalRecommendedReserve)}
                        </p>
                    </div>
                    <Progress value={Math.min(reservePercentage, 100)} className="h-3" />
                    {reservePercentage < 95 && (
                        <p className="text-xs text-orange-600">
                            ⚠️ You're ${(summary.totalRecommendedReserve - summary.totalActualReserved).toLocaleString()} short of your recommended reserve
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
