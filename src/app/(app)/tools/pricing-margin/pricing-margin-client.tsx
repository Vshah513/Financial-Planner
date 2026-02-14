"use client";

import { useState, useEffect } from "react";
import { PricingInputs } from "@/components/tools/pricing-margin/pricing-inputs";
import { PricingResults } from "@/components/tools/pricing-margin/pricing-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calculator, Save, TrendingUp } from "lucide-react";
import Link from "next/link";
import {
    calculatePricing,
    runSensitivityAnalysis,
    savePricingModel,
    getPricingModels,
} from "@/app/actions/pricing";

interface PricingMarginClientProps {
    workspaceId: string;
}

export function PricingMarginClient({ workspaceId }: PricingMarginClientProps) {
    const [results, setResults] = useState<any>(null);
    const [sensitivityData, setSensitivityData] = useState<any[]>([]);
    const [modelName, setModelName] = useState("");
    const [productName, setProductName] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedModels, setSavedModels] = useState<any[]>([]);

    useEffect(() => {
        loadSavedModels();
    }, [workspaceId]);

    const loadSavedModels = async () => {
        try {
            const models = await getPricingModels(workspaceId, 5);
            setSavedModels(models);
        } catch (error) {
            console.error("Failed to load saved models:", error);
        }
    };

    const handleCalculate = async (inputs: {
        fixedCosts: number;
        variableCostPerUnit: number;
        desiredMarginPct: number;
        expectedVolume: number;
    }) => {
        try {
            const calculation = await calculatePricing(
                inputs.fixedCosts,
                inputs.variableCostPerUnit,
                inputs.desiredMarginPct,
                inputs.expectedVolume
            );

            setResults(calculation);

            // Run sensitivity analysis
            const sensitivity = await runSensitivityAnalysis(
                {
                    fixedCosts: inputs.fixedCosts,
                    variableCostPerUnit: inputs.variableCostPerUnit,
                    recommendedPrice: calculation.recommendedPrice,
                },
                {
                    min: Math.max(1, Math.floor(inputs.expectedVolume * 0.5)),
                    max: Math.ceil(inputs.expectedVolume * 1.5),
                    step: Math.ceil(inputs.expectedVolume * 0.1),
                }
            );

            setSensitivityData(sensitivity);
        } catch (error) {
            console.error("Failed to calculate pricing:", error);
            alert("Failed to calculate pricing. Please try again.");
        }
    };

    const handleSave = async () => {
        if (!results || !modelName.trim() || !productName.trim()) {
            alert("Please enter a model name and product name");
            return;
        }

        setSaving(true);
        try {
            await savePricingModel(workspaceId, modelName, productName, results);
            await loadSavedModels();
            setModelName("");
            setProductName("");
            alert("Pricing model saved successfully!");
        } catch (error) {
            console.error("Failed to save model:", error);
            alert("Failed to save model. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/tools"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pricing & Margin Tool</h1>
                        <p className="text-muted-foreground">
                            Calculate optimal pricing and understand your unit economics
                        </p>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Inputs */}
                <div className="lg:col-span-1">
                    <PricingInputs onCalculate={handleCalculate} />
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    {results ? (
                        <div className="space-y-6">
                            <PricingResults results={results} />

                            {/* Save Model */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Save This Model</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="productName">Product Name</Label>
                                            <Input
                                                id="productName"
                                                placeholder="e.g., Premium Widget"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="modelName">Model Name</Label>
                                            <Input
                                                id="modelName"
                                                placeholder="e.g., Q1 2026 Pricing"
                                                value={modelName}
                                                onChange={(e) => setModelName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || !modelName.trim() || !productName.trim()}
                                        className="w-full gap-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        {saving ? "Saving..." : "Save Model"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                                <p className="text-muted-foreground">
                                    Enter your costs and desired margin, then click "Calculate Pricing" to see results
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Sensitivity Analysis */}
            {sensitivityData.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            <CardTitle>Sensitivity Analysis</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                                <span>Volume</span>
                                <span>Revenue</span>
                                <span>Costs</span>
                                <span>Profit</span>
                                <span>Margin %</span>
                            </div>
                            {sensitivityData.map((scenario, idx) => (
                                <div
                                    key={idx}
                                    className={`grid grid-cols-5 gap-2 text-sm p-2 rounded ${scenario.profit >= 0 ? "bg-green-500/5" : "bg-red-500/5"
                                        }`}
                                >
                                    <span className="font-medium">{scenario.volume.toLocaleString()}</span>
                                    <span>{formatCurrency(scenario.revenue)}</span>
                                    <span>{formatCurrency(scenario.totalCosts)}</span>
                                    <span
                                        className={scenario.profit >= 0 ? "text-green-600" : "text-red-600"}
                                    >
                                        {formatCurrency(scenario.profit)}
                                    </span>
                                    <span>{scenario.marginPct.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Saved Models */}
            {savedModels.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Recently Saved Models</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {savedModels.map((model) => (
                                <div
                                    key={model.id}
                                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                >
                                    <div>
                                        <div className="font-medium">{model.product_name}</div>
                                        <div className="text-sm text-muted-foreground">{model.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {formatCurrency(model.recommended_price)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {model.actual_margin_pct.toFixed(1)}% margin
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
