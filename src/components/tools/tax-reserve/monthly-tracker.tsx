"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, DollarSign } from "lucide-react";

interface MonthlyTrackerProps {
    year: number;
    reserves: Array<{
        month: number;
        revenue: number;
        deductible_expenses: number;
        profit: number;
        taxable_amount: number;
        recommended_reserve: number;
        actual_reserved: number;
    }>;
    onMonthClick: (month: number) => void;
}

export function MonthlyTracker({ year, reserves, onMonthClick }: MonthlyTrackerProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    const getReserveForMonth = (monthNum: number) => {
        return reserves.find((r) => r.month === monthNum);
    };

    const isReserveComplete = (reserve: any) => {
        if (!reserve) return false;
        return reserve.actual_reserved >= reserve.recommended_reserve * 0.95; // Within 5%
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Monthly Tax Reserves - {year}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>Reserved</span>
                        <Circle className="h-4 w-4 ml-2" />
                        <span>Pending</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {months.map((monthName, idx) => {
                        const monthNum = idx + 1;
                        const reserve = getReserveForMonth(monthNum);
                        const isComplete = isReserveComplete(reserve);

                        return (
                            <button
                                key={monthName}
                                onClick={() => onMonthClick(monthNum)}
                                className={`
                  p-4 rounded-lg border-2 text-left transition-all hover:shadow-md
                  ${reserve
                                        ? isComplete
                                            ? "border-green-500/50 bg-green-500/5"
                                            : "border-orange-500/50 bg-orange-500/5"
                                        : "border-muted bg-muted/20"
                                    }
                `}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">{monthName}</span>
                                    {reserve ? (
                                        isComplete ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-orange-600" />
                                        )
                                    ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                                {reserve ? (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Reserved</p>
                                        <p className="text-sm font-semibold">
                                            {formatCurrency(reserve.actual_reserved)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            of {formatCurrency(reserve.recommended_reserve)}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No data</p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
