"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Plus, Trash2, Save, ChevronLeft, ChevronRight, Clipboard, RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import {
    createEntry, updateEntry, deleteEntry, bulkCreateEntries,
} from "@/app/actions/entries";
import { upsertPeriodOverrides } from "@/app/actions/periods";
import { generateRecurringEntries } from "@/app/actions/recurring";
import type { Category, PeriodOverride, Period } from "@/types/database";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

interface EntryRow {
    id: string;
    direction: "income" | "expense";
    category_id: string;
    description: string;
    amount: number;
    notes: string | null;
    category?: { name: string } | null;
    isNew?: boolean;
    isEdited?: boolean;
}

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

export default function MonthClient({
    period,
    entries: initialEntries,
    overrides: initialOverrides,
    categories,
    workspaceId,
    currency,
    year,
    month,
}: {
    period: Period;
    entries: EntryRow[];
    overrides: PeriodOverride | null;
    categories: Category[];
    workspaceId: string;
    currency: string;
    year: number;
    month: number;
}) {
    const router = useRouter();
    const [entries, setEntries] = useState<EntryRow[]>(initialEntries);
    const [dividends, setDividends] = useState(initialOverrides?.dividends_released ?? 0);
    const [openingBalance, setOpeningBalance] = useState<string>(
        initialOverrides?.opening_balance_override?.toString() ?? ""
    );
    const [closingOverride, setClosingOverride] = useState<string>(
        initialOverrides?.closing_balance_override?.toString() ?? ""
    );
    const [saving, setSaving] = useState(false);

    const incomeCategories = categories.filter((c) => c.type === "income");
    const expenseCategories = categories.filter((c) => c.type === "expense");

    const incomeEntries = entries.filter((e) => e.direction === "income");
    const expenseEntries = entries.filter((e) => e.direction === "expense");

    const revenue = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
    const expenseTotal = expenseEntries.reduce((s, e) => s + Number(e.amount), 0);
    const netCashFlow = revenue - expenseTotal;
    const retainedEarnings = netCashFlow - dividends;
    const openBal = openingBalance ? parseFloat(openingBalance) : 0;
    const closingBalance = closingOverride
        ? parseFloat(closingOverride)
        : openBal + netCashFlow - dividends;

    const addRow = (direction: "income" | "expense", categoryId?: string) => {
        const defaultCat =
            direction === "income"
                ? incomeCategories[0]?.id || ""
                : categoryId || expenseCategories[0]?.id || "";
        setEntries((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}`,
                direction,
                category_id: defaultCat,
                description: "",
                amount: 0,
                notes: null,
                isNew: true,
            },
        ]);
    };

    const updateRow = (id: string, field: string, value: string | number) => {
        setEntries((prev) =>
            prev.map((e) =>
                e.id === id ? { ...e, [field]: value, isEdited: !e.isNew } : e
            )
        );
    };

    const removeRow = async (id: string) => {
        if (id.startsWith("new-")) {
            setEntries((prev) => prev.filter((e) => e.id !== id));
            return;
        }
        try {
            await deleteEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            toast.success("Entry deleted");
        } catch {
            toast.error("Failed to delete entry");
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            // Save new entries
            const newEntries = entries.filter((e) => e.isNew && e.description);
            if (newEntries.length > 0) {
                await bulkCreateEntries(
                    newEntries.map((e) => ({
                        workspace_id: workspaceId,
                        period_id: period.id,
                        direction: e.direction,
                        category_id: e.category_id,
                        description: e.description,
                        amount: Number(e.amount),
                    }))
                );
            }

            // Save edited entries
            const editedEntries = entries.filter((e) => e.isEdited);
            for (const entry of editedEntries) {
                await updateEntry(entry.id, {
                    description: entry.description,
                    amount: Number(entry.amount),
                    category_id: entry.category_id,
                });
            }

            // Save overrides
            await upsertPeriodOverrides(period.id, {
                opening_balance_override: openingBalance ? parseFloat(openingBalance) : null,
                dividends_released: dividends,
                closing_balance_override: closingOverride ? parseFloat(closingOverride) : null,
            });

            toast.success("All changes saved");
            router.refresh();
        } catch {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handlePaste = useCallback(
        async (direction: "income" | "expense") => {
            try {
                const text = await navigator.clipboard.readText();
                const lines = text.split("\n").filter((l) => l.trim());
                const defaultCat =
                    direction === "income"
                        ? incomeCategories[0]?.id || ""
                        : expenseCategories[0]?.id || "";

                const newRows: EntryRow[] = lines.map((line) => {
                    const parts = line.split("\t");
                    const description = parts[0]?.trim() || "";
                    const amount = parseFloat(parts[1]?.replace(/[^0-9.-]/g, "") || "0");
                    return {
                        id: `new-${Date.now()}-${Math.random()}`,
                        direction,
                        category_id: defaultCat,
                        description,
                        amount: isNaN(amount) ? 0 : amount,
                        notes: null,
                        isNew: true,
                    };
                });

                setEntries((prev) => [...prev, ...newRows]);
                toast.success(`Pasted ${newRows.length} rows`);
            } catch {
                toast.error("Failed to read clipboard");
            }
        },
        [incomeCategories, expenseCategories]
    );

    const handleGenerate = async () => {
        try {
            const result = await generateRecurringEntries(workspaceId, period.id, year, month);
            toast.success(`Generated ${result.generated} recurring entries`);
            router.refresh();
        } catch {
            toast.error("Failed to generate recurring entries");
        }
    };

    // Group expenses by category
    const expensesByCategory: Record<string, EntryRow[]> = {};
    for (const entry of expenseEntries) {
        const catName = entry.category?.name || categories.find((c) => c.id === entry.category_id)?.name || "Other";
        if (!expensesByCategory[catName]) expensesByCategory[catName] = [];
        expensesByCategory[catName].push(entry);
    }

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={`/month/${prevYear}/${prevMonth}`}>
                        <Button variant="outline" size="icon">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {MONTH_NAMES[month - 1]} {year}
                        </h1>
                        <p className="text-sm text-muted-foreground">Monthly Financial Detail</p>
                    </div>
                    <Link href={`/month/${nextYear}/${nextMonth}`}>
                        <Button variant="outline" size="icon">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Generate Recurring
                    </Button>
                    <Button size="sm" onClick={saveAll} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saving ? "Saving..." : "Save All"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Main content - 3 cols */}
                <div className="xl:col-span-3 space-y-6">
                    {/* REVENUE */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                                    Revenue
                                </Badge>
                            </CardTitle>
                            <div className="flex gap-1.5">
                                <Button variant="ghost" size="sm" onClick={() => handlePaste("income")}>
                                    <Clipboard className="h-3.5 w-3.5 mr-1" />
                                    Paste
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => addRow("income")}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="w-32">Category</TableHead>
                                        <TableHead className="w-36 text-right">Amount</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incomeEntries.map((entry, i) => (
                                        <TableRow key={entry.id} className="group">
                                            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={entry.description}
                                                    onChange={(e) => updateRow(entry.id, "description", e.target.value)}
                                                    className="h-8 border-0 bg-transparent px-1 focus-visible:bg-background/50"
                                                    placeholder="Description"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={entry.category_id}
                                                    onValueChange={(v) => updateRow(entry.id, "category_id", v)}
                                                >
                                                    <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {incomeCategories.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    value={entry.amount}
                                                    onChange={(e) => updateRow(entry.id, "amount", parseFloat(e.target.value) || 0)}
                                                    className="h-8 border-0 bg-transparent px-1 text-right focus-visible:bg-background/50"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeRow(entry.id)}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {incomeEntries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No income entries yet. Click &quot;Add&quot; to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* EXPENSES */}
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/30">
                                    Expenses
                                </Badge>
                            </CardTitle>
                            <div className="flex gap-1.5">
                                <Button variant="ghost" size="sm" onClick={() => handlePaste("expense")}>
                                    <Clipboard className="h-3.5 w-3.5 mr-1" />
                                    Paste
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => addRow("expense")}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                            {expenseCategories.map((cat) => {
                                const catEntries = entries.filter(
                                    (e) => e.direction === "expense" && e.category_id === cat.id
                                );
                                const catTotal = catEntries.reduce((s, e) => s + Number(e.amount), 0);

                                return (
                                    <div key={cat.id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    {cat.name}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {formatCurrency(catTotal, currency)}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => addRow("expense", cat.id)}
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="w-36 text-right">Amount</TableHead>
                                                    <TableHead className="w-12" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {catEntries.map((entry, i) => (
                                                    <TableRow key={entry.id} className="group">
                                                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={entry.description}
                                                                onChange={(e) => updateRow(entry.id, "description", e.target.value)}
                                                                className="h-8 border-0 bg-transparent px-1 focus-visible:bg-background/50"
                                                                placeholder="Description"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Input
                                                                type="number"
                                                                value={entry.amount}
                                                                onChange={(e) => updateRow(entry.id, "amount", parseFloat(e.target.value) || 0)}
                                                                className="h-8 border-0 bg-transparent px-1 text-right focus-visible:bg-background/50"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => removeRow(entry.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {catEntries.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-xs">
                                                            No {cat.name.toLowerCase()} entries
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        <Separator className="my-2" />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Panel - 1 col */}
                <div className="space-y-4">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm sticky top-6">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <SummaryRow label="Revenue" value={revenue} currency={currency} positive />
                            <SummaryRow label="Expenses" value={expenseTotal} currency={currency} negative />
                            <Separator />
                            <SummaryRow label="Net Cash Flow" value={netCashFlow} currency={currency} bold />
                            <Separator />

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Dividends Released</label>
                                <Input
                                    type="number"
                                    value={dividends}
                                    onChange={(e) => setDividends(parseFloat(e.target.value) || 0)}
                                    className="h-8 text-right"
                                />
                            </div>

                            <SummaryRow label="Retained Earnings" value={retainedEarnings} currency={currency} bold />
                            <Separator />

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Opening Balance</label>
                                <Input
                                    type="number"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    className="h-8 text-right"
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">
                                    Closing Balance
                                    {!closingOverride && <span className="ml-1 text-[10px]">(auto)</span>}
                                </label>
                                <Input
                                    type="number"
                                    value={closingOverride || closingBalance.toFixed(2)}
                                    onChange={(e) => setClosingOverride(e.target.value)}
                                    className="h-8 text-right font-semibold"
                                    placeholder="Auto-calculated"
                                />
                            </div>

                            <Separator />

                            <div className="pt-2 p-3 rounded-lg bg-muted/30 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Closing Balance</span>
                                    <span className={`font-bold ${closingBalance >= 0 ? "positive-value" : "negative-value"}`}>
                                        {formatCurrency(closingBalance, currency)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    = Opening ({formatCurrency(openBal, currency)}) + Net Cash Flow ({formatCurrency(netCashFlow, currency)}) − Dividends ({formatCurrency(dividends, currency)})
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    currency,
    positive,
    negative,
    bold,
}: {
    label: string;
    value: number;
    currency: string;
    positive?: boolean;
    negative?: boolean;
    bold?: boolean;
}) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span
                className={`text-sm ${bold ? "font-bold" : "font-medium"} ${positive
                        ? "positive-value"
                        : negative
                            ? "negative-value"
                            : value > 0
                                ? "positive-value"
                                : value < 0
                                    ? "negative-value"
                                    : ""
                    }`}
            >
                {formatCurrency(value, currency)}
            </span>
        </div>
    );
}
