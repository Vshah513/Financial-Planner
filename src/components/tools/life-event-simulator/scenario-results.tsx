"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ScenarioResult } from "@/lib/scenario-engine";

interface ScenarioResultsProps {
    results: {
        conservative: ScenarioResult;
        base: ScenarioResult;
        aggressive: ScenarioResult;
    };
    eventType: string;
}

export function ScenarioResults({ results, eventType }: ScenarioResultsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getRunwayStatus = (runwayMonths: number | null) => {
        if (runwayMonths === null) {
            return { icon: CheckCircle2, color: "text-green-600", text: "Sustainable" };
        }
        if (runwayMonths > 12) {
            return { icon: CheckCircle2, color: "text-green-600", text: `${runwayMonths} months` };
        }
        if (runwayMonths > 6) {
            return { icon: AlertTriangle, color: "text-orange-600", text: `${runwayMonths} months` };
        }
        return { icon: AlertTriangle, color: "text-red-600", text: `${runwayMonths} months` };
    };

    const renderVariantCard = (variant: "conservative" | "base" | "aggressive", result: ScenarioResult) => {
        const runwayStatus = getRunwayStatus(result.runwayMonths);
        const RunwayIcon = runwayStatus.icon;

        const variantColors = {
            conservative: "border-blue-500/50 bg-blue-500/5",
            base: "border-purple-500/50 bg-purple-500/5",
            aggressive: "border-orange-500/50 bg-orange-500/5",
        };

        const variantLabels = {
            conservative: "Conservative",
            base: "Base Case",
            aggressive: "Aggressive",
        };

        return (
            <Card className={variantColors[variant]}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{variantLabels[variant]}</CardTitle>
                        <Badge variant="outline" className={runwayStatus.color}>
                            <RunwayIcon className="h-3 w-3 mr-1" />
                            {runwayStatus.text}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-muted-foreground">Final Cash</p>
                            <p className={`text-lg font-semibold ${result.finalCash >= 0 ? "text-green-600" : "text-red-600"
                                }`}>
                                {formatCurrency(result.finalCash)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Worst Month</p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(result.worstMonthCash)}
                            </p>
                        </div>
                    </div>

                    {/* Break Even */}
                    {result.breakEvenMonth !== null && (
                        <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Break Even</p>
                            <p className="text-sm font-medium">Month {result.breakEvenMonth}</p>
                        </div>
                    )}

                    {/* Mini Chart */}
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Cash Flow Projection</p>
                        <div className="h-16 flex items-end gap-0.5">
                            {result.monthlyProjections.slice(0, 12).map((month, idx) => {
                                const maxCash = Math.max(...result.monthlyProjections.map(m => m.cash));
                                const height = (month.cash / maxCash) * 100;
                                const isNegative = month.cash < 0;

                                return (
                                    <div
                                        key={idx}
                                        className={`flex-1 rounded-sm ${isNegative ? "bg-red-500/50" : "bg-primary/50"
                                            }`}
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                        title={`Month ${idx + 1}: ${formatCurrency(month.cash)}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
            {/* Summary Alert */}
            <Alert>
                <AlertDescription>
                    <strong>Scenario: {eventType}</strong>
                    <br />
                    Compare three variants to understand the range of possible outcomes.
                </AlertDescription>
            </Alert>

            {/* Variant Cards */}
            <Tabs defaultValue="base" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="conservative">Conservative</TabsTrigger>
                    <TabsTrigger value="base">Base Case</TabsTrigger>
                    <TabsTrigger value="aggressive">Aggressive</TabsTrigger>
                </TabsList>

                <TabsContent value="conservative" className="mt-4">
                    {renderVariantCard("conservative", results.conservative)}
                </TabsContent>

                <TabsContent value="base" className="mt-4">
                    {renderVariantCard("base", results.base)}
                </TabsContent>

                <TabsContent value="aggressive" className="mt-4">
                    {renderVariantCard("aggressive", results.aggressive)}
                </TabsContent>
            </Tabs>

            {/* Comparison Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Quick Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 font-medium">Metric</th>
                                    <th className="text-right py-2 font-medium">Conservative</th>
                                    <th className="text-right py-2 font-medium">Base</th>
                                    <th className="text-right py-2 font-medium">Aggressive</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b">
                                    <td className="py-2 text-muted-foreground">Final Cash</td>
                                    <td className="text-right">{formatCurrency(results.conservative.finalCash)}</td>
                                    <td className="text-right">{formatCurrency(results.base.finalCash)}</td>
                                    <td className="text-right">{formatCurrency(results.aggressive.finalCash)}</td>
                                </tr>
                                <tr className="border-b">
                                    <td className="py-2 text-muted-foreground">Runway</td>
                                    <td className="text-right">
                                        {results.conservative.runwayMonths ? `${results.conservative.runwayMonths}mo` : "∞"}
                                    </td>
                                    <td className="text-right">
                                        {results.base.runwayMonths ? `${results.base.runwayMonths}mo` : "∞"}
                                    </td>
                                    <td className="text-right">
                                        {results.aggressive.runwayMonths ? `${results.aggressive.runwayMonths}mo` : "∞"}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-2 text-muted-foreground">Worst Month</td>
                                    <td className="text-right">{formatCurrency(results.conservative.worstMonthCash)}</td>
                                    <td className="text-right">{formatCurrency(results.base.worstMonthCash)}</td>
                                    <td className="text-right">{formatCurrency(results.aggressive.worstMonthCash)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
