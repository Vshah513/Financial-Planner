"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ExpenseDriversProps {
    drivers: Array<{
        name: string;
        amount: number;
        percentage: number;
    }>;
}

export function ExpenseDrivers({ drivers }: ExpenseDriversProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Expense Drivers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {drivers.map((driver, idx) => (
                    <div key={driver.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{idx + 1}.</span>
                                <span>{driver.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{driver.percentage.toFixed(1)}%</span>
                                <span className="font-semibold">{formatCurrency(driver.amount)}</span>
                            </div>
                        </div>
                        <Progress value={driver.percentage} className="h-2" />
                    </div>
                ))}
                {drivers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No expense data available
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
