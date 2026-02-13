"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, PiggyBank, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { upsertBudget } from "@/app/actions/budgets";
import type { Category, CategoryGroup } from "@/types/database";

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

interface BudgetRow {
    id: string;
    category_id: string;
    amount: number;
    rollover: boolean;
    actual: number;
    remaining: number;
    percentUsed: number;
    category: { id: string; name: string; type: string; group_id: string | null };
}

interface BudgetClientProps {
    budgetData: BudgetRow[];
    categories: Category[];
    categoryGroups: CategoryGroup[];
    workspaceId: string;
    periodId: string;
    currency: string;
    periodLabel: string;
}

export default function BudgetClient({
    budgetData,
    categories,
    categoryGroups,
    workspaceId,
    periodId,
    currency,
    periodLabel,
}: BudgetClientProps) {
    const router = useRouter();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newCategoryId, setNewCategoryId] = useState("");
    const [newAmount, setNewAmount] = useState("");

    const totalBudget = budgetData.reduce((s, b) => s + Number(b.amount), 0);
    const totalActual = budgetData.reduce((s, b) => s + Number(b.actual), 0);
    const totalRemaining = totalBudget - totalActual;

    // Group budgets by category group
    const groupedBudgets = categoryGroups
        .filter((g) => g.type === "expense")
        .map((group) => ({
            group,
            budgets: budgetData.filter((b) => b.category?.group_id === group.id),
        }))
        .filter((g) => g.budgets.length > 0);

    const handleAddBudget = async () => {
        if (!newCategoryId || !newAmount) return;
        try {
            await upsertBudget({
                workspace_id: workspaceId,
                period_id: periodId,
                category_id: newCategoryId,
                amount: parseFloat(newAmount),
            });
            setShowAddDialog(false);
            setNewAmount("");
            setNewCategoryId("");
            toast.success("Budget set");
            router.refresh();
        } catch {
            toast.error("Failed to set budget");
        }
    };

    const handleInlineUpdate = async (categoryId: string, amount: string) => {
        const value = parseFloat(amount);
        if (isNaN(value)) return;
        try {
            await upsertBudget({
                workspace_id: workspaceId,
                period_id: periodId,
                category_id: categoryId,
                amount: value,
            });
            router.refresh();
        } catch {
            toast.error("Failed to update");
        }
    };

    if (!periodId) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center">
                        <PiggyBank className="h-12 w-12 text-primary/20 mx-auto mb-3" />
                        <p className="text-muted-foreground">No period found for this month. Create a period first from the Dashboard.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
                    <p className="text-sm text-muted-foreground mt-1">{periodLabel} · Budget vs Actual</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Set Budget
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Set Category Budget</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Category</Label>
                                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        {categoryGroups.filter((g) => g.type === "expense").map((g) => {
                                            const cats = categories.filter((c) => c.group_id === g.id);
                                            return (
                                                <div key={g.id}>
                                                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{g.name}</div>
                                                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </div>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Monthly Budget Amount</Label>
                                <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button className="w-full" onClick={handleAddBudget}>Save Budget</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Budget</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(totalBudget, currency)}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Spent</p>
                        <p className="text-xl font-bold mt-1 negative-value">{formatCurrency(totalActual, currency)}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Remaining</p>
                        <p className={`text-xl font-bold mt-1 ${totalRemaining >= 0 ? "positive-value" : "negative-value"}`}>
                            {formatCurrency(totalRemaining, currency)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Budget vs Actual by Group */}
            {groupedBudgets.map(({ group, budgets }) => (
                <Card key={group.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium">{group.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Category</TableHead>
                                    <TableHead className="text-xs text-right">Budget</TableHead>
                                    <TableHead className="text-xs text-right">Actual</TableHead>
                                    <TableHead className="text-xs text-right">Remaining</TableHead>
                                    <TableHead className="text-xs w-48">Progress</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budgets.map((b) => {
                                    const pct = Math.min(b.percentUsed, 100);
                                    const isOver = b.remaining < 0;
                                    return (
                                        <TableRow key={b.id}>
                                            <TableCell className="text-sm font-medium">{b.category.name}</TableCell>
                                            <TableCell className="text-right text-sm">{formatCurrency(b.amount, currency)}</TableCell>
                                            <TableCell className="text-right text-sm negative-value">{formatCurrency(b.actual, currency)}</TableCell>
                                            <TableCell className="text-right text-sm">
                                                <span className={isOver ? "negative-value" : "positive-value"}>
                                                    {formatCurrency(b.remaining, currency)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${isOver ? "bg-chart-5" : pct > 80 ? "bg-chart-3" : "bg-chart-2"
                                                                }`}
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground w-10 text-right">
                                                        {b.percentUsed}%
                                                    </span>
                                                    {isOver ? (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-chart-5" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-chart-2/50" />
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}

            {budgetData.length === 0 && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center space-y-3">
                        <PiggyBank className="h-12 w-12 text-primary/20 mx-auto" />
                        <div>
                            <p className="font-medium">No budgets set yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Set category budgets to track your spending against targets</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
