"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CategoryBreakdownProps {
    topRevenue: Array<{ name: string; amount: number }>;
    topExpenses: Array<{ name: string; amount: number }>;
}

export function CategoryBreakdown({ topRevenue, topExpenses }: CategoryBreakdownProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const totalRevenue = topRevenue.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = topExpenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Revenue Sources */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Revenue Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {topRevenue.length > 0 ? (
                        topRevenue.map((item, idx) => {
                            const percentage = totalRevenue > 0 ? (item.amount / totalRevenue) * 100 : 0;
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{item.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No revenue data available
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Top Expense Categories */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Expense Categories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {topExpenses.length > 0 ? (
                        topExpenses.map((item, idx) => {
                            const percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{item.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                                            <span className="font-semibold text-orange-600">
                                                {formatCurrency(item.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    <Progress value={percentage} className="h-2" />
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No expense data available
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
