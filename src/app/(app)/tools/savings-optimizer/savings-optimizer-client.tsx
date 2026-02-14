"use client";

import { useState, useEffect } from "react";
import { BaselineSelector, BaselineData } from "@/components/tools/baseline-selector";
import { AssumptionDisplay } from "@/components/tools/assumption-display";
import { GoalInput } from "@/components/tools/savings-optimizer/goal-input";
import { CategoryManager } from "@/components/tools/savings-optimizer/category-manager";
import { ResultsDisplay } from "@/components/tools/savings-optimizer/results-display";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, PiggyBank } from "lucide-react";
import Link from "next/link";
import {
    getOptimizerBaselines,
    getCategoryFlags,
    updateCategoryFlag,
    calculateSavingsOptimization,
    saveOptimizerRun,
} from "@/app/actions/optimizer";

interface SavingsOptimizerClientProps {
    workspaceId: string;
}

export function SavingsOptimizerClient({ workspaceId }: SavingsOptimizerClientProps) {
    const [step, setStep] = useState<"goal" | "baseline" | "categories" | "results">("goal");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Goal data
    const [targetAmount, setTargetAmount] = useState<number>(0);
    const [deadline, setDeadline] = useState<Date | null>(null);

    // Baseline data
    const [actualsBaseline, setActualsBaseline] = useState<BaselineData | null>(null);
    const [plannerBaseline, setPlannerBaseline] = useState<BaselineData | null>(null);
    const [selectedBaseline, setSelectedBaseline] = useState<BaselineData | null>(null);

    // Categories
    const [categories, setCategories] = useState<
        Array<{ id: string; name: string; isEssential: boolean }>
    >([]);

    // Results
    const [result, setResult] = useState<any>(null);

    // Load baselines and categories on mount
    useEffect(() => {
        loadData();
    }, [workspaceId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [baselines, categoryFlags] = await Promise.all([
                getOptimizerBaselines(workspaceId),
                getCategoryFlags(workspaceId),
            ]);

            setActualsBaseline(baselines.actualsBaseline);
            setPlannerBaseline(baselines.plannerBaseline);
            setCategories(categoryFlags);

            // Auto-select actuals if available
            if (baselines.actualsBaseline) {
                setSelectedBaseline(baselines.actualsBaseline);
            } else if (baselines.plannerBaseline) {
                setSelectedBaseline(baselines.plannerBaseline);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            alert("Failed to load data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoalSubmit = (amount: number, date: Date) => {
        setTargetAmount(amount);
        setDeadline(date);
        setStep("baseline");
    };

    const handleBaselineSelect = (baseline: BaselineData) => {
        setSelectedBaseline(baseline);
    };

    const handleCategoryToggle = async (categoryId: string, isEssential: boolean) => {
        try {
            await updateCategoryFlag(categoryId, isEssential);
            setCategories((prev) =>
                prev.map((cat) => (cat.id === categoryId ? { ...cat, isEssential } : cat))
            );
        } catch (error) {
            console.error("Failed to update category:", error);
            alert("Failed to update category. Please try again.");
        }
    };

    const handleCalculate = async () => {
        if (!selectedBaseline || !deadline) return;

        setLoading(true);
        try {
            const optimization = await calculateSavingsOptimization(
                workspaceId,
                targetAmount,
                deadline,
                selectedBaseline.source,
                selectedBaseline.monthlyIncome,
                selectedBaseline.monthlyExpenses,
                selectedBaseline.expenseBreakdown || {}
            );

            setResult(optimization);
            setStep("results");
        } catch (error) {
            console.error("Failed to calculate optimization:", error);
            alert("Failed to calculate optimization. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!result || !selectedBaseline || !deadline) return;

        setSaving(true);
        try {
            await saveOptimizerRun(
                workspaceId,
                targetAmount,
                deadline,
                selectedBaseline.source,
                result.requiredMonthly,
                result.currentSavings,
                result.gap,
                result.recommendations
            );

            alert("Savings plan saved successfully!");
        } catch (error) {
            console.error("Failed to save run:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyBudgets = () => {
        // TODO: Implement budget application
        alert("Budget application coming soon! This will create budget caps based on recommendations.");
    };

    const handleReset = () => {
        setStep("goal");
        setTargetAmount(0);
        setDeadline(null);
        setSelectedBaseline(null);
        setResult(null);
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
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <PiggyBank className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Savings Rate Optimizer</h1>
                        <p className="text-muted-foreground">
                            Calculate what you need to save monthly and get a clean cut plan
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            {step !== "goal" && (
                <div className="flex items-center gap-2 text-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("goal")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        1. Goal
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("baseline")}
                        disabled={!deadline}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        2. Baseline
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("categories")}
                        disabled={!selectedBaseline}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        3. Categories
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <span className={step === "results" ? "font-medium" : "text-muted-foreground"}>
                        4. Results
                    </span>
                </div>
            )}

            {/* Step 1: Goal Input */}
            {step === "goal" && <GoalInput onSubmit={handleGoalSubmit} loading={loading} />}

            {/* Step 2: Baseline Selection */}
            {step === "baseline" && (
                <div className="space-y-4">
                    <BaselineSelector
                        actualsBaseline={actualsBaseline || undefined}
                        plannerBaseline={plannerBaseline || undefined}
                        onSelect={handleBaselineSelect}
                        loading={loading}
                    />
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("goal")} className="flex-1">
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep("categories")}
                            disabled={!selectedBaseline}
                            className="flex-1"
                        >
                            Continue to Categories
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Category Management */}
            {step === "categories" && (
                <div className="space-y-4">
                    <Tabs defaultValue="manage" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="manage">Manage Categories</TabsTrigger>
                            <TabsTrigger value="assumptions">Review Assumptions</TabsTrigger>
                        </TabsList>
                        <TabsContent value="manage" className="mt-4">
                            <CategoryManager categories={categories} onToggle={handleCategoryToggle} />
                        </TabsContent>
                        <TabsContent value="assumptions" className="mt-4">
                            {selectedBaseline && (
                                <AssumptionDisplay
                                    baselineSource={selectedBaseline.source}
                                    periodWindow={selectedBaseline.periodWindow}
                                    customAssumptions={{
                                        target_amount: `$${targetAmount.toLocaleString()}`,
                                        deadline: deadline?.toLocaleDateString(),
                                        monthly_income: `$${selectedBaseline.monthlyIncome.toFixed(0)}`,
                                        monthly_expenses: `$${selectedBaseline.monthlyExpenses.toFixed(0)}`,
                                    }}
                                />
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("baseline")} className="flex-1">
                            Back
                        </Button>
                        <Button onClick={handleCalculate} disabled={loading} className="flex-1">
                            {loading ? "Calculating..." : "Calculate Savings Plan"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Results */}
            {step === "results" && result && (
                <div className="space-y-4">
                    <ResultsDisplay
                        result={result}
                        onSave={handleSave}
                        onApplyBudgets={handleApplyBudgets}
                        saving={saving}
                    />

                    {selectedBaseline && (
                        <AssumptionDisplay
                            baselineSource={selectedBaseline.source}
                            periodWindow={selectedBaseline.periodWindow}
                            customAssumptions={{
                                target_amount: `$${targetAmount.toLocaleString()}`,
                                deadline: deadline?.toLocaleDateString(),
                                nonessential_categories: categories.filter((c) => !c.isEssential).length.toString(),
                            }}
                        />
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("categories")} className="flex-1">
                            Back to Categories
                        </Button>
                        <Button variant="outline" onClick={handleReset} className="flex-1">
                            Start New Plan
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
