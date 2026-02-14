"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, TrendingUp, Scissors } from "lucide-react";

interface OptimizationResult {
    requiredMonthly: number;
    currentSavings: number;
    gap: number;
    onTrack: boolean;
    canAchieve?: boolean;
    recommendations: Array<{
        categoryId: string;
        categoryName: string;
        currentSpend: number;
        suggestedCut: number;
        rank: number;
    }>;
}

interface ResultsDisplayProps {
    result: OptimizationResult;
    onSave?: () => void;
    onApplyBudgets?: () => void;
    saving?: boolean;
}

export function ResultsDisplay({ result, onSave, onApplyBudgets, saving }: ResultsDisplayProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const totalCuts = result.recommendations.reduce((sum, rec) => sum + rec.suggestedCut, 0);
    const newSavingsRate = result.currentSavings + totalCuts;

    return (
        <div className="space-y-4">
            {/* Status Alert */}
            {result.onTrack ? (
                <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                        <strong>You're on track!</strong> Your current savings rate already meets your goal.
                    </AlertDescription>
                </Alert>
            ) : result.canAchieve ? (
                <Alert className="border-blue-500/50 bg-blue-500/10">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-600">
                        <strong>Goal achievable!</strong> Follow the recommendations below to reach your target.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert className="border-orange-500/50 bg-orange-500/10">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-600">
                        <strong>Goal challenging.</strong> Even cutting all nonessential spending may not be
                        enough. Consider extending your deadline or increasing income.
                    </AlertDescription>
                </Alert>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Required Monthly
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(result.requiredMonthly)}</div>
                        <p className="text-xs text-muted-foreground mt-1">To reach your goal</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Current Savings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(result.currentSavings)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Per month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gap</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${result.gap > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                }`}
                        >
                            {formatCurrency(result.gap)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {result.gap > 0 ? "Need to save more" : "Surplus"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recommendations */}
            {!result.onTrack && result.recommendations.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Scissors className="h-5 w-5" />
                                    Recommended Cuts
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Cut these categories to close the gap
                                </p>
                            </div>
                            <Badge variant="secondary">
                                Total: {formatCurrency(totalCuts)}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {result.recommendations.map((rec) => (
                                <div
                                    key={rec.categoryId}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                #{rec.rank}
                                            </Badge>
                                            <span className="font-medium">{rec.categoryName}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Current spend: {formatCurrency(rec.currentSpend)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                                            -{formatCurrency(rec.suggestedCut)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {((rec.suggestedCut / rec.currentSpend) * 100).toFixed(0)}% reduction
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* New Savings Rate */}
                        <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">New Projected Savings Rate:</span>
                                <span className="text-xl font-bold text-primary">
                                    {formatCurrency(newSavingsRate)}/month
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {newSavingsRate >= result.requiredMonthly ? (
                                    <span className="text-green-600 dark:text-green-400">
                                        ✓ Meets your goal requirement
                                    </span>
                                ) : (
                                    <span className="text-orange-600 dark:text-orange-400">
                                        ⚠ Still {formatCurrency(result.requiredMonthly - newSavingsRate)} short
                                    </span>
                                )}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {!result.onTrack && result.recommendations.length > 0 && (
                <div className="flex gap-3">
                    <Button onClick={onSave} disabled={saving} variant="outline" className="flex-1">
                        {saving ? "Saving..." : "Save Scenario"}
                    </Button>
                    <Button onClick={onApplyBudgets} className="flex-1">
                        Apply as Budget Caps
                    </Button>
                </div>
            )}
        </div>
    );
}
