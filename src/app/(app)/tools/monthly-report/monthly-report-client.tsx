"use client";

import { useState, useEffect } from "react";
import { ReportKPIs } from "@/components/tools/monthly-report/report-kpis";
import { CategoryBreakdown } from "@/components/tools/monthly-report/category-breakdown";
import { ExecutiveSummary } from "@/components/tools/monthly-report/executive-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, FileText, Download, Calendar } from "lucide-react";
import Link from "next/link";
import {
    generateMonthlyReport,
    saveMonthlyReport,
    getMonthlyReport,
} from "@/app/actions/monthly-report";

interface MonthlyReportClientProps {
    workspaceId: string;
}

export function MonthlyReportClient({ workspaceId }: MonthlyReportClientProps) {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [commentary, setCommentary] = useState("");

    useEffect(() => {
        loadReport();
    }, [workspaceId, year, month]);

    const loadReport = async () => {
        setLoading(true);
        try {
            // Try to load saved report first
            const savedReport = await getMonthlyReport(workspaceId, year, month);

            if (savedReport) {
                setReportData(savedReport.report_data);
                setCommentary(savedReport.commentary || "");
            } else {
                // Generate new report
                const data = await generateMonthlyReport(workspaceId, year, month);
                setReportData(data);
                setCommentary("");
            }
        } catch (error) {
            console.error("Failed to load report:", error);
            alert("Failed to load report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCommentary = async (newCommentary: string) => {
        if (!reportData) return;

        try {
            await saveMonthlyReport(workspaceId, year, month, reportData, newCommentary);
            setCommentary(newCommentary);
            alert("Commentary saved successfully!");
        } catch (error) {
            console.error("Failed to save commentary:", error);
            alert("Failed to save commentary. Please try again.");
        }
    };

    const handleExport = () => {
        alert("PDF export coming soon! For now, you can print this page or take a screenshot.");
    };

    const handlePreviousMonth = () => {
        if (month === 1) {
            setYear(year - 1);
            setMonth(12);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        if (year === currentYear && month === currentMonth) {
            return; // Can't go beyond current month
        }

        if (month === 12) {
            setYear(year + 1);
            setMonth(1);
        } else {
            setMonth(month + 1);
        }
    };

    const getMonthName = () => {
        return new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const isCurrentMonth = () => {
        const currentDate = new Date();
        return year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;
    };

    if (loading && !reportData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 animate-pulse">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Monthly Report</h1>
                        <p className="text-muted-foreground">Generating your report...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="space-y-6">
                <Link
                    href="/tools"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Link>
                <Alert>
                    <AlertDescription>
                        No data available for this month. Please add transactions to generate a report.
                    </AlertDescription>
                </Alert>
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
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Monthly Report</h1>
                            <p className="text-muted-foreground">
                                Board-ready financial summary for {getMonthName()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                            ← Previous
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                            <Calendar className="h-4 w-4" />
                            <span className="font-semibold">{getMonthName()}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextMonth}
                            disabled={isCurrentMonth()}
                        >
                            Next →
                        </Button>
                        <Button size="sm" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Executive Summary */}
            <ExecutiveSummary initialCommentary={commentary} onSave={handleSaveCommentary} />

            {/* KPIs */}
            <ReportKPIs kpis={reportData.kpis} />

            {/* Category Breakdown */}
            <CategoryBreakdown
                topRevenue={reportData.breakdown.topRevenue}
                topExpenses={reportData.breakdown.topExpenses}
            />

            {/* Activity Summary */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Transactions</p>
                            <p className="text-3xl font-bold">{reportData.activity.totalTransactions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Active Days</p>
                            <p className="text-3xl font-bold">{reportData.activity.activeDays}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Avg Daily Transactions</p>
                            <p className="text-3xl font-bold">
                                {reportData.activity.avgDailyTransactions.toFixed(1)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
