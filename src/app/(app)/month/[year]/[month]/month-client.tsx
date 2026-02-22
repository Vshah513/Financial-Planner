"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Plus, Trash2, Save, ChevronLeft, ChevronRight, Clipboard, RotateCw,
    AlertTriangle, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
    createEntry, updateEntry, deleteEntry, bulkCreateEntries, upsertEntries,
} from "@/app/actions/entries";
import { upsertPeriodOverrides } from "@/app/actions/periods";
import { generateRecurringEntries } from "@/app/actions/recurring";
import { applyTemplate } from "@/app/actions/workspace";
import type { Category, CategoryGroup, PeriodOverride, Period, EntryRow } from "@/types/database";
import { calculateNetCashFlow, calculateRetainedEarnings, calculateClosingBalance, calculateSavingsRate } from "@/lib/calculations";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

interface MonthClientProps {
    period: Period;
    entries: EntryRow[];
    overrides: PeriodOverride | null;
    categories: Category[];
    categoryGroups: CategoryGroup[];
    workspaceId: string;
    currency: string;
    workspaceMode: string;
    year: number;
    month: number;
}

interface EntryTableRowProps {
    entry: EntryRow;
    index: number;
    relevantCategories: Category[];
    showCategory?: boolean;
    onUpdate: (id: string, field: string, value: string | number) => void;
    onRemove: (id: string) => void;
}

function EntryTableRow({
    entry,
    index,
    relevantCategories,
    showCategory = false,
    onUpdate,
    onRemove,
}: EntryTableRowProps) {
    return (
        <TableRow className="group">
            <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
            <TableCell>
                <Input
                    value={entry.description}
                    onChange={(e) => onUpdate(entry.id, "description", e.target.value)}
                    className="h-8 border-0 bg-transparent px-1 focus-visible:bg-background/50"
                    placeholder="Description"
                />
            </TableCell>
            {showCategory && (
                <TableCell>
                    <Select
                        value={entry.category_id}
                        onValueChange={(v) => onUpdate(entry.id, "category_id", v)}
                    >
                        <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {relevantCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
            )}
            <TableCell className="text-right">
                <Input
                    type="number"
                    value={entry.amount === 0 ? "" : entry.amount}
                    onChange={(e) => onUpdate(entry.id, "amount", parseFloat(e.target.value) || 0)}
                    className="h-8 border-0 bg-transparent px-1 text-right focus-visible:bg-background/50"
                />
            </TableCell>
            <TableCell>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(entry.id)}
                >
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

export default function MonthClient({
    period,
    entries: initialEntries,
    overrides: initialOverrides,
    categories,
    categoryGroups,
    workspaceId,
    currency,
    workspaceMode,
    year,
    month,
}: MonthClientProps) {
    const router = useRouter();
    const [entries, setEntries] = useState<EntryRow[]>(initialEntries);
    const [dividends, setDividends] = useState(initialOverrides?.dividends_released ?? 0);
    const [openingBalance, setOpeningBalance] = useState<string>(
        initialOverrides?.opening_balance_override?.toString() ?? ""
    );
    const [closingOverride, setClosingOverride] = useState<string>(
        initialOverrides?.closing_balance_override?.toString() ?? ""
    );
    const [closingOverrideEnabled, setClosingOverrideEnabled] = useState(
        !!initialOverrides?.closing_balance_override
    );
    const [saving, setSaving] = useState(false);
    const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const initialConfig = useRef({ openingBalance: openingBalance, dividends: dividends, closingOverrideEnabled: closingOverrideEnabled, closingOverride: closingOverride });

    // Auto-save effect
    useEffect(() => {
        const hasPendingChanges = entries.some(e => (e.isNew && e.description) || e.isEdited) ||
            openingBalance !== initialConfig.current.openingBalance ||
            dividends !== initialConfig.current.dividends ||
            closingOverrideEnabled !== initialConfig.current.closingOverrideEnabled ||
            closingOverride !== initialConfig.current.closingOverride;

        if (!hasPendingChanges) return;

        setSyncState("saving");
        const timer = setTimeout(() => {
            saveAll(false);
            initialConfig.current = { openingBalance, dividends, closingOverrideEnabled, closingOverride };
        }, 1500);

        return () => clearTimeout(timer);
    }, [entries, openingBalance, dividends, closingOverrideEnabled, closingOverride]);

    const incomeGroups = categoryGroups.filter((g) => g.type === "income");
    const expenseGroups = categoryGroups.filter((g) => g.type === "expense");

    const incomeEntries = entries.filter((e) => e.direction === "income");
    const expenseEntries = entries.filter((e) => e.direction === "expense");

    const revenue = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
    const expenseTotal = expenseEntries.reduce((s, e) => s + Number(e.amount), 0);
    const netCashFlow = calculateNetCashFlow(revenue, expenseTotal);
    const retainedEarnings = calculateRetainedEarnings(netCashFlow, dividends);
    const openBal = openingBalance ? parseFloat(openingBalance) : 0;
    const computedClosing = calculateClosingBalance(openBal, netCashFlow, dividends);
    const closingBalance = closingOverrideEnabled && closingOverride
        ? parseFloat(closingOverride)
        : computedClosing;

    // Build a map of category id -> group id
    const categoryGroupMap = useMemo(() => {
        const map: Record<string, string> = {};
        for (const cat of categories) {
            if (cat.group_id) map[cat.id] = cat.group_id;
        }
        return map;
    }, [categories]);

    // Get categories for a group
    const getCategoriesForGroup = useCallback((groupId: string) => {
        return categories.filter((c) => c.group_id === groupId);
    }, [categories]);

    // Get entries for a specific category
    const getEntriesForCategory = useCallback((categoryId: string, direction: "income" | "expense") => {
        return entries.filter(
            (e) => e.direction === direction && e.category_id === categoryId
        );
    }, [entries]);

    // Get entries for a group
    const getEntriesForGroup = useCallback((groupId: string, direction: "income" | "expense") => {
        const groupCats = getCategoriesForGroup(groupId);
        const catIds = new Set(groupCats.map((c) => c.id));
        return entries.filter(
            (e) => e.direction === direction && catIds.has(e.category_id)
        );
    }, [entries, getCategoriesForGroup]);

    const toggleGroupCollapse = (groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const addRow = (direction: "income" | "expense", categoryId?: string) => {
        const relevantCats = categories.filter((c) =>
            direction === "income"
                ? c.type === "income"
                : c.type === "expense"
        );
        const defaultCat = categoryId || relevantCats[0]?.id || "";
        setEntries((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
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
        const entryToRemove = entries.find((e) => e.id === id);
        if (entryToRemove?.isNew) {
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

    const saveAll = async (showToast = true) => {
        if (showToast) setSaving(true);

        try {
            const toSave = entries.filter((e) => (e.isNew && e.description) || e.isEdited);

            if (toSave.length > 0) {
                await upsertEntries(
                    toSave.map((e) => ({
                        id: e.id,
                        workspace_id: workspaceId,
                        period_id: period.id,
                        direction: e.direction,
                        category_id: e.category_id,
                        description: e.description,
                        amount: Number(e.amount),
                    }))
                );

                const savedIds = new Set(toSave.map(e => e.id));
                setEntries(prev => prev.map(e =>
                    savedIds.has(e.id) ? { ...e, isNew: false, isEdited: false } : e
                ));
            }

            await upsertPeriodOverrides(period.id, {
                opening_balance_override: openingBalance ? parseFloat(openingBalance) : null,
                dividends_released: dividends,
                closing_balance_override: closingOverrideEnabled && closingOverride
                    ? parseFloat(closingOverride) : null,
            });

            if (showToast) toast.success("All changes saved");
            setSyncState("saved");
            router.refresh();
        } catch {
            if (showToast) toast.error("Failed to save changes");
            setSyncState("error");
        } finally {
            if (showToast) setSaving(false);
        }
    };

    const handlePaste = useCallback(
        async (direction: "income" | "expense", categoryId?: string) => {
            try {
                const text = await navigator.clipboard.readText();
                const lines = text.split("\n").filter((l) => l.trim());
                const relevantCats = categories.filter((c) =>
                    direction === "income" ? c.type === "income" : c.type === "expense"
                );
                const defaultCat = categoryId || relevantCats[0]?.id || "";

                const newRows: EntryRow[] = lines.map((line) => {
                    const parts = line.split("\t");
                    const description = parts[0]?.trim() || "";
                    const amount = parseFloat(parts[1]?.replace(/[^0-9.-]/g, "") || "0");
                    return {
                        id: crypto.randomUUID(),
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
        [categories]
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

    const handleApplyTemplate = async () => {
        try {
            await applyTemplate(workspaceId, workspaceMode as "business" | "personal");
            toast.success("Template applied successfully");
            router.refresh();
        } catch {
            toast.error("Failed to apply template");
        }
    };

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    const hasGroups = categoryGroups.length > 0;



    // Render entries grouped by category within a group
    const renderGroupSection = (
        group: CategoryGroup,
        direction: "income" | "expense"
    ) => {
        const groupCats = getCategoriesForGroup(group.id);
        const groupEntries = getEntriesForGroup(group.id, direction);
        const groupTotal = groupEntries.reduce((s, e) => s + Number(e.amount), 0);
        const isCollapsed = collapsedGroups.has(group.id);

        return (
            <div key={group.id} className="border border-border/30 rounded-lg overflow-hidden">
                {/* Group header */}
                <div
                    className="flex items-center justify-between px-4 py-2.5 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleGroupCollapse(group.id)}
                >
                    <div className="flex items-center gap-2">
                        {isCollapsed ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] ml-1">
                            {formatCurrency(groupTotal, currency)}
                        </Badge>
                    </div>
                    <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => handlePaste(direction, groupCats[0]?.id)}
                        >
                            <Clipboard className="h-3 w-3 mr-1" />
                            Paste
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => addRow(direction, groupCats[0]?.id)}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                        </Button>
                    </div>
                </div>

                {/* Categories within group */}
                {!isCollapsed && (
                    <div className="px-3 py-2 space-y-3">
                        {groupCats.map((cat) => {
                            const catEntries = getEntriesForCategory(cat.id, direction);
                            const catTotal = catEntries.reduce((s, e) => s + Number(e.amount), 0);

                            return (
                                <div key={cat.id}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-medium text-muted-foreground/80 pl-1">
                                                {cat.name}
                                            </span>
                                            {catTotal > 0 && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatCurrency(catTotal, currency)}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 text-[10px] px-1.5"
                                            onClick={() => addRow(direction, cat.id)}
                                        >
                                            <Plus className="h-2.5 w-2.5" />
                                        </Button>
                                    </div>
                                    {catEntries.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-8 text-[10px]">#</TableHead>
                                                    <TableHead className="text-[10px]">Item</TableHead>
                                                    <TableHead className="w-32 text-right text-[10px]">Amount</TableHead>
                                                    <TableHead className="w-8" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {catEntries.map((entry, i) => (
                                                    <EntryTableRow
                                                        key={entry.id}
                                                        entry={entry}
                                                        index={i}
                                                        relevantCategories={groupCats}
                                                        onUpdate={updateRow}
                                                        onRemove={removeRow}
                                                    />
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground/50 pl-2 pb-1">
                                            No entries
                                        </p>
                                    )}
                                </div>
                            );
                        })}

                        {groupCats.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-3">
                                No categories in this group
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Render ungrouped entries (categories with no group_id)
    const renderUngroupedEntries = (direction: "income" | "expense") => {
        const ungrouped = categories.filter(
            (c) => c.type === direction && !c.group_id
        );
        const ungroupedEntries = entries.filter(
            (e) => e.direction === direction && (!categoryGroupMap[e.category_id])
        );
        if (ungrouped.length === 0 && ungroupedEntries.length === 0) return null;

        return (
            <div className="border border-border/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Uncategorized
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => addRow(direction)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                    </Button>
                </div>
                <div className="px-3 py-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8 text-[10px]">#</TableHead>
                                <TableHead className="text-[10px]">Item</TableHead>
                                <TableHead className="w-28 text-[10px]">Category</TableHead>
                                <TableHead className="w-32 text-right text-[10px]">Amount</TableHead>
                                <TableHead className="w-8" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ungroupedEntries.map((entry, i) => (
                                <EntryTableRow
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                    relevantCategories={categories.filter((c) => c.type === direction)}
                                    showCategory
                                    onUpdate={updateRow}
                                    onRemove={removeRow}
                                />
                            ))}
                            {ungroupedEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-xs">
                                        No uncategorized entries
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

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
                    <div className="flex items-center gap-2 mr-2 text-xs text-muted-foreground font-medium">
                        {syncState === "saving" && <span className="flex items-center gap-1.5"><RotateCw className="h-3 w-3 animate-spin" /> Saving...</span>}
                        {syncState === "saved" && <span className="flex items-center gap-1.5 text-emerald-500"><Save className="h-3 w-3" /> Saved</span>}
                        {syncState === "error" && <span className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3 w-3" /> Error saving</span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Generate Recurring
                    </Button>
                    <Button size="sm" onClick={() => saveAll(true)} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saving ? "Saving..." : "Save All"}
                    </Button>
                </div>
            </div>

            {/* Empty state: no groups */}
            {!hasGroups && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        <Sparkles className="h-12 w-12 text-primary/40 mx-auto" />
                        <div>
                            <h3 className="text-lg font-semibold">No Category Groups Yet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Apply a template to get started with pre-configured groups and categories.
                            </p>
                        </div>
                        <Button onClick={handleApplyTemplate}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Apply {workspaceMode === "personal" ? "Personal" : "Business"} Template
                        </Button>
                    </CardContent>
                </Card>
            )}

            {hasGroups && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main content - 3 cols */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* INCOME */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/30">
                                        Income
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {formatCurrency(revenue, currency)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                {incomeGroups.map((group) => renderGroupSection(group, "income"))}
                                {renderUngroupedEntries("income")}
                                {incomeGroups.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                        No income groups configured. <Link href="/settings" className="text-primary underline">Add groups</Link>
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* EXPENSES */}
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Badge variant="outline" className="bg-chart-5/10 text-chart-5 border-chart-5/30">
                                        Expenses
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {formatCurrency(expenseTotal, currency)}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                {expenseGroups.map((group) => renderGroupSection(group, "expense"))}
                                {renderUngroupedEntries("expense")}
                                {expenseGroups.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                        No expense groups configured. <Link href="/settings" className="text-primary underline">Add groups</Link>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Panel - 1 col (mode-aware) */}
                    <div className="space-y-4">
                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm sticky top-6">
                            <CardHeader className="py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">Summary</CardTitle>
                                    <Badge variant="outline" className="text-[9px] capitalize">
                                        {workspaceMode}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Common: Income/Revenue + Expenses */}
                                <SummaryRow
                                    label={workspaceMode === "business" ? "Revenue" : "Income"}
                                    value={revenue}
                                    currency={currency}
                                    positive
                                />
                                <SummaryRow label="Expenses" value={expenseTotal} currency={currency} negative />
                                <Separator />
                                <SummaryRow
                                    label={workspaceMode === "business" ? "Net Cash Flow" : "Net Income"}
                                    value={netCashFlow}
                                    currency={currency}
                                    bold
                                />
                                <Separator />

                                {/* Business mode: Dividends + Retained Earnings */}
                                {workspaceMode === "business" && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground">Owner Draw / Dividends</label>
                                            <Input
                                                type="number"
                                                value={dividends}
                                                onChange={(e) => setDividends(parseFloat(e.target.value) || 0)}
                                                className="h-8 text-right"
                                            />
                                        </div>
                                        <SummaryRow label="Retained Earnings" value={retainedEarnings} currency={currency} bold />
                                        <Separator />
                                    </>
                                )}

                                {/* Personal mode: Savings Rate */}
                                {workspaceMode === "personal" && (
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">Savings Rate</span>
                                            <span className={`text-sm font-bold ${revenue > 0 && netCashFlow > 0 ? "positive-value" : "negative-value"}`}>
                                                {calculateSavingsRate(revenue, netCashFlow).toFixed(1)}%
                                            </span>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Opening Balance / Starting Cash */}
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground">
                                        {workspaceMode === "business" ? "Opening Balance" : "Starting Cash"}
                                    </label>
                                    <Input
                                        type="number"
                                        value={openingBalance}
                                        onChange={(e) => setOpeningBalance(e.target.value)}
                                        className="h-8 text-right"
                                        placeholder="0"
                                    />
                                </div>

                                {/* Closing/Ending Balance Override */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">
                                            {workspaceMode === "business" ? "Override Closing Balance" : "Override Ending Cash"}
                                        </Label>
                                        <Switch
                                            checked={closingOverrideEnabled}
                                            onCheckedChange={(checked) => {
                                                setClosingOverrideEnabled(checked);
                                                if (!checked) setClosingOverride("");
                                            }}
                                        />
                                    </div>
                                    {closingOverrideEnabled && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                <span className="text-[10px] text-amber-500 font-medium">
                                                    Manual override active
                                                </span>
                                            </div>
                                            <Input
                                                type="number"
                                                value={closingOverride}
                                                onChange={(e) => setClosingOverride(e.target.value)}
                                                className="h-8 text-right border-amber-500/30"
                                                placeholder={computedClosing.toFixed(2)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Closing / Ending Balance Result */}
                                <div className="pt-2 p-3 rounded-lg bg-muted/30 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            {workspaceMode === "business" ? "Closing Balance" : "Ending Cash"}
                                            {closingOverrideEnabled && (
                                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-500/30 text-amber-500">
                                                    Override
                                                </Badge>
                                            )}
                                        </span>
                                        <span className={`font-bold ${closingBalance >= 0 ? "positive-value" : "negative-value"}`}>
                                            {formatCurrency(closingBalance, currency)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {workspaceMode === "business"
                                            ? `= Opening (${formatCurrency(openBal, currency)}) + Net Cash Flow (${formatCurrency(netCashFlow, currency)}) − Dividends (${formatCurrency(dividends, currency)})`
                                            : `= Starting Cash (${formatCurrency(openBal, currency)}) + Net Income (${formatCurrency(netCashFlow, currency)})`
                                        }
                                    </p>
                                    {closingOverrideEnabled && closingOverride && (
                                        <p className="text-[10px] text-amber-500/70">
                                            Computed: {formatCurrency(computedClosing, currency)} → Override: {formatCurrency(parseFloat(closingOverride), currency)}
                                        </p>
                                    )}
                                </div>

                                {/* Expense Breakdown by Group */}
                                {expenseGroups.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                Expense Breakdown
                                            </p>
                                            {expenseGroups.map((group) => {
                                                const groupTotal = getEntriesForGroup(group.id, "expense")
                                                    .reduce((s, e) => s + Number(e.amount), 0);
                                                if (groupTotal === 0) return null;
                                                return (
                                                    <div key={group.id} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">{group.name}</span>
                                                        <span className="font-medium">{formatCurrency(groupTotal, currency)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
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
