import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { calculateNetCashFlow } from "@/lib/calculations";

export interface BaselineData {
    source: 'actuals' | 'planner';
    monthlyIncome: number;
    monthlyExpenses: number;
    periodWindow?: string;
    expenseBreakdown?: Record<string, number>;
    incomeBreakdown?: Record<string, number>;
    monthsCovered?: number;
}

interface BaselineSelectorProps {
    onSelect: (baseline: BaselineData) => void;
    actualsBaseline?: BaselineData;
    plannerBaseline?: BaselineData;
    defaultSelection?: 'actuals' | 'planner';
    loading?: boolean;
}

export function BaselineSelector({
    onSelect,
    actualsBaseline,
    plannerBaseline,
    defaultSelection = 'actuals',
    loading = false,
}: BaselineSelectorProps) {
    const handleSelectionChange = (value: string) => {
        const baseline = value === 'actuals' ? actualsBaseline : plannerBaseline;
        if (baseline) {
            onSelect(baseline);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Select Baseline</CardTitle>
                    <CardDescription>Loading baseline data...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Select Baseline</CardTitle>
                <CardDescription>
                    Choose whether to use actual transaction data or your planner projections
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup defaultValue={defaultSelection} onValueChange={handleSelectionChange}>
                    {/* Actuals Option */}
                    {actualsBaseline && (
                        <div className="flex items-start space-x-3 space-y-0">
                            <RadioGroupItem value="actuals" id="actuals" />
                            <div className="flex-1">
                                <Label htmlFor="actuals" className="font-medium cursor-pointer">
                                    Use Actuals (Recommended)
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Based on your actual transactions {actualsBaseline.periodWindow}
                                </p>
                                <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monthly Income:</span>
                                        <span className="font-medium">{formatCurrency(actualsBaseline.monthlyIncome)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monthly Expenses:</span>
                                        <span className="font-medium">{formatCurrency(actualsBaseline.monthlyExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                                        <span className="text-muted-foreground">Net Cash Flow:</span>
                                        <span className={`font-medium ${calculateNetCashFlow(actualsBaseline.monthlyIncome, actualsBaseline.monthlyExpenses) >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {formatCurrency(calculateNetCashFlow(actualsBaseline.monthlyIncome, actualsBaseline.monthlyExpenses))}
                                        </span>
                                    </div>
                                </div>
                                {actualsBaseline.monthsCovered !== undefined && (
                                    <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border">
                                        {actualsBaseline.monthsCovered <= 1
                                            ? `Note: You have only uploaded data for ${actualsBaseline.periodWindow}. Results will be based on this month.`
                                            : `Note: Results are based on ${actualsBaseline.monthsCovered} months of data (${actualsBaseline.periodWindow}).`}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Planner Option */}
                    {plannerBaseline && (
                        <div className="flex items-start space-x-3 space-y-0">
                            <RadioGroupItem value="planner" id="planner" />
                            <div className="flex-1">
                                <Label htmlFor="planner" className="font-medium cursor-pointer">
                                    Use Planner
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Based on your planned budget entries
                                </p>
                                <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monthly Income:</span>
                                        <span className="font-medium">{formatCurrency(plannerBaseline.monthlyIncome)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monthly Expenses:</span>
                                        <span className="font-medium">{formatCurrency(plannerBaseline.monthlyExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                                        <span className="text-muted-foreground">Net Cash Flow:</span>
                                        <span className={`font-medium ${calculateNetCashFlow(plannerBaseline.monthlyIncome, plannerBaseline.monthlyExpenses) >= 0
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {formatCurrency(calculateNetCashFlow(plannerBaseline.monthlyIncome, plannerBaseline.monthlyExpenses))}
                                        </span>
                                    </div>
                                </div>
                                {plannerBaseline.monthsCovered !== undefined && (
                                    <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border">
                                        {plannerBaseline.monthsCovered <= 1
                                            ? `Note: You have only created planner entries for ${plannerBaseline.periodWindow}. Results will be based on this month.`
                                            : `Note: Results are based on ${plannerBaseline.monthsCovered} months of planner data (${plannerBaseline.periodWindow}).`}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </RadioGroup>

                {!actualsBaseline && !plannerBaseline && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            No baseline data available. Please add transactions or create planner entries first.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
