"use client";

import { useState, useEffect } from "react";
import { TaxSettings } from "@/components/tools/tax-reserve/tax-settings";
import { MonthlyTracker } from "@/components/tools/tax-reserve/monthly-tracker";
import { QuarterlySummary } from "@/components/tools/tax-reserve/quarterly-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Receipt, Calculator } from "lucide-react";
import Link from "next/link";
import {
    getTaxProfile,
    getTaxReserves,
    calculateTaxReserve,
    saveTaxReserve,
    getQuarterlySummary,
} from "@/app/actions/tax-reserve";

interface TaxReserveClientProps {
    workspaceId: string;
}

export function TaxReserveClient({ workspaceId }: TaxReserveClientProps) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [reserves, setReserves] = useState<any[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [monthCalculation, setMonthCalculation] = useState<any>(null);
    const [actualReserved, setActualReserved] = useState(0);
    const [saving, setSaving] = useState(false);
    const [quarterlySummaries, setQuarterlySummaries] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [workspaceId, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileData, reservesData, q1, q2, q3, q4] = await Promise.all([
                getTaxProfile(workspaceId),
                getTaxReserves(workspaceId, year),
                getQuarterlySummary(workspaceId, year, 1),
                getQuarterlySummary(workspaceId, year, 2),
                getQuarterlySummary(workspaceId, year, 3),
                getQuarterlySummary(workspaceId, year, 4),
            ]);

            setProfile(profileData);
            setReserves(reservesData);
            setQuarterlySummaries([q1, q2, q3, q4]);
        } catch (error) {
            console.error("Failed to load tax reserve data:", error);
            alert("Failed to load data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = async (month: number) => {
        setSelectedMonth(month);
        setLoading(true);

        try {
            const calculation = await calculateTaxReserve(workspaceId, year, month, profile);
            setMonthCalculation(calculation);

            // Check if there's an existing reserve
            const existingReserve = reserves.find((r) => r.month === month);
            setActualReserved(existingReserve?.actual_reserved || calculation.recommendedReserve);
        } catch (error) {
            console.error("Failed to calculate tax reserve:", error);
            alert("Failed to calculate reserve. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReserve = async () => {
        if (!selectedMonth || !monthCalculation) return;

        setSaving(true);
        try {
            await saveTaxReserve(workspaceId, year, selectedMonth, monthCalculation, actualReserved);
            await loadData();
            setSelectedMonth(null);
            alert("Tax reserve saved successfully!");
        } catch (error) {
            console.error("Failed to save reserve:", error);
            alert("Failed to save reserve. Please try again.");
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

    const getMonthName = (monthNum: number) => {
        return new Date(year, monthNum - 1).toLocaleDateString("en-US", { month: "long" });
    };

    if (loading && !profile) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-600 animate-pulse">
                        <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tax Reserve Engine</h1>
                        <p className="text-muted-foreground">Loading your tax data...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Tax Reserve Engine</h1>
                            <p className="text-muted-foreground">
                                Automatically calculate and track tax obligations
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setYear(year - 1)}
                        >
                            ← {year - 1}
                        </Button>
                        <span className="font-semibold px-3">{year}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setYear(year + 1)}
                            disabled={year >= new Date().getFullYear()}
                        >
                            {year + 1} →
                        </Button>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings */}
                <div className="lg:col-span-1">
                    {profile && (
                        <TaxSettings profile={profile} workspaceId={workspaceId} onUpdate={loadData} />
                    )}
                </div>

                {/* Monthly Tracker */}
                <div className="lg:col-span-2">
                    <MonthlyTracker year={year} reserves={reserves} onMonthClick={handleMonthClick} />
                </div>
            </div>

            {/* Quarterly Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quarterlySummaries.map((summary) => (
                    <QuarterlySummary key={summary.quarter} summary={summary} />
                ))}
            </div>

            {/* Month Detail Dialog */}
            <Dialog open={selectedMonth !== null} onOpenChange={() => setSelectedMonth(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedMonth && getMonthName(selectedMonth)} {year} - Tax Reserve
                        </DialogTitle>
                    </DialogHeader>
                    {monthCalculation && (
                        <div className="space-y-6">
                            {/* Calculation Breakdown */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <span className="text-sm font-medium">Revenue</span>
                                    <span className="font-semibold">{formatCurrency(monthCalculation.revenue)}</span>
                                </div>
                                {monthCalculation.calculationMode === "profit" && (
                                    <>
                                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <span className="text-sm font-medium">Deductible Expenses</span>
                                            <span className="font-semibold text-blue-600">
                                                -{formatCurrency(monthCalculation.deductibleExpenses)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <span className="text-sm font-medium">Profit</span>
                                            <span className="font-semibold text-purple-600">
                                                {formatCurrency(monthCalculation.profit)}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                                    <span className="text-sm font-medium">
                                        Taxable Amount ({monthCalculation.calculationMode})
                                    </span>
                                    <span className="font-semibold">
                                        {formatCurrency(monthCalculation.taxableAmount)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                                    <div>
                                        <div className="text-sm font-medium">Recommended Reserve</div>
                                        <div className="text-xs text-muted-foreground">
                                            @ {monthCalculation.effectiveRate}% tax rate
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-green-600">
                                        {formatCurrency(monthCalculation.recommendedReserve)}
                                    </span>
                                </div>
                            </div>

                            {/* Actual Reserved Input */}
                            <div className="space-y-2">
                                <Label htmlFor="actualReserved">Amount Actually Reserved</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <Input
                                        id="actualReserved"
                                        type="number"
                                        step="100"
                                        value={actualReserved}
                                        onChange={(e) => setActualReserved(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    How much have you actually set aside for taxes this month?
                                </p>
                            </div>

                            {/* Save Button */}
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setSelectedMonth(null)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveReserve} disabled={saving} className="flex-1">
                                    {saving ? "Saving..." : "Save Reserve"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
