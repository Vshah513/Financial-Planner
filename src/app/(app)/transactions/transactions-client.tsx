"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
    Plus, Search, Filter, Upload, CheckSquare, Layers,
    ArrowDownLeft, ArrowUpRight, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
    createTransaction, updateTransaction, bulkUpdateTransactions,
    importTransactionsFromCSV, createTransactionRule,
} from "@/app/actions/transactions";
import type { Category, CategoryGroup } from "@/types/database";

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

interface TransactionsClientProps {
    transactions: Array<{
        id: string;
        posted_at: string;
        description: string;
        amount: number;
        direction: string;
        category_id: string | null;
        group_id: string | null;
        status: string;
        account_id: string;
        notes: string | null;
        account?: { id: string; name: string } | null;
        category?: { id: string; name: string } | null;
        group?: { id: string; name: string } | null;
    }>;
    accounts: Array<{ id: string; name: string; account_type: string }>;
    categories: Category[];
    categoryGroups: CategoryGroup[];
    workspaceId: string;
    currency: string;
}

export default function TransactionsClient({
    transactions: initialTransactions,
    accounts,
    categories,
    categoryGroups,
    workspaceId,
    currency,
}: TransactionsClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [filterAccount, setFilterAccount] = useState("all");
    const [filterCategory, setFilterCategory] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showRuleDialog, setShowRuleDialog] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Add transaction form
    const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
    const [newDesc, setNewDesc] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newDirection, setNewDirection] = useState<"inflow" | "outflow">("outflow");
    const [newAccountId, setNewAccountId] = useState(accounts[0]?.id || "");
    const [newCategoryId, setNewCategoryId] = useState("");

    // Rule form
    const [ruleMatchType, setRuleMatchType] = useState("contains");
    const [ruleMatchValue, setRuleMatchValue] = useState("");
    const [ruleCategoryId, setRuleCategoryId] = useState("");

    // CSV import
    const [csvData, setCsvData] = useState("");
    const [importAccountId, setImportAccountId] = useState(accounts[0]?.id || "");

    const filteredTransactions = useMemo(() => {
        return initialTransactions.filter((t) => {
            if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterAccount !== "all" && t.account_id !== filterAccount) return false;
            if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
            if (filterStatus !== "all" && t.status !== filterStatus) return false;
            return true;
        });
    }, [initialTransactions, search, filterAccount, filterCategory, filterStatus]);

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
        }
    };

    const handleBulkCategory = async (categoryId: string) => {
        try {
            await bulkUpdateTransactions(Array.from(selectedIds), { category_id: categoryId });
            setSelectedIds(new Set());
            toast.success(`Updated ${selectedIds.size} transactions`);
            router.refresh();
        } catch { toast.error("Failed to update"); }
    };

    const handleBulkStatus = async (status: string) => {
        try {
            await bulkUpdateTransactions(Array.from(selectedIds), { status: status as "posted" | "excluded" });
            setSelectedIds(new Set());
            toast.success(`Updated ${selectedIds.size} transactions`);
            router.refresh();
        } catch { toast.error("Failed to update"); }
    };

    const handleAddTransaction = async () => {
        if (!newDesc.trim() || !newAmount) return;
        try {
            await createTransaction({
                workspace_id: workspaceId,
                account_id: newAccountId,
                posted_at: newDate,
                description: newDesc.trim(),
                amount: parseFloat(newAmount),
                direction: newDirection,
                category_id: newCategoryId || undefined,
            });
            setShowAddDialog(false);
            setNewDesc("");
            setNewAmount("");
            toast.success("Transaction added");
            router.refresh();
        } catch { toast.error("Failed to add transaction"); }
    };

    const handleImportCSV = async () => {
        if (!csvData.trim()) return;
        try {
            const lines = csvData.trim().split("\n").filter((l) => l.trim());
            const rows = lines.map((line) => {
                const parts = line.split(",");
                const date = parts[0]?.trim() || new Date().toISOString().split("T")[0];
                const desc = parts[1]?.trim() || "Unknown";
                const rawAmt = parseFloat(parts[2]?.replace(/[^0-9.-]/g, "") || "0");
                return {
                    posted_at: date,
                    description: desc,
                    amount: Math.abs(rawAmt),
                    direction: (rawAmt >= 0 ? "inflow" : "outflow") as "inflow" | "outflow",
                };
            });
            const result = await importTransactionsFromCSV(workspaceId, importAccountId, rows);
            setShowImportDialog(false);
            setCsvData("");
            toast.success(`Imported ${result.imported} transactions (${result.categorized} auto-categorized)`);
            router.refresh();
        } catch { toast.error("Failed to import CSV"); }
    };

    const handleCreateRule = async () => {
        if (!ruleMatchValue.trim() || !ruleCategoryId) return;
        try {
            await createTransactionRule({
                workspace_id: workspaceId,
                match_type: ruleMatchType,
                match_value: ruleMatchValue.trim(),
                category_id: ruleCategoryId,
            });
            setShowRuleDialog(false);
            setRuleMatchValue("");
            toast.success("Rule created");
        } catch { toast.error("Failed to create rule"); }
    };

    const handleInlineCategory = async (txnId: string, categoryId: string) => {
        try {
            await updateTransaction(txnId, { category_id: categoryId });
            router.refresh();
        } catch { toast.error("Failed to update"); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {filteredTransactions.length} transactions
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                Import CSV
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Import Transactions from CSV</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Account</Label>
                                    <Select value={importAccountId} onValueChange={setImportAccountId}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">CSV Data (date, description, amount)</Label>
                                    <textarea
                                        className="w-full h-40 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                                        value={csvData}
                                        onChange={(e) => setCsvData(e.target.value)}
                                        placeholder={"2025-01-15,Starbucks,-4.50\n2025-01-14,Payroll,3500.00"}
                                    />
                                </div>
                                <Button className="w-full" onClick={handleImportCSV}>Import</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Layers className="h-3.5 w-3.5 mr-1.5" />
                                Rules
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Create Categorization Rule</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Match Type</Label>
                                    <Select value={ruleMatchType} onValueChange={setRuleMatchType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="contains">Contains</SelectItem>
                                            <SelectItem value="exact">Exact Match</SelectItem>
                                            <SelectItem value="regex">Regex</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Match Value</Label>
                                    <Input value={ruleMatchValue} onChange={(e) => setRuleMatchValue(e.target.value)} placeholder="e.g., Starbucks" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Category</Label>
                                    <Select value={ruleCategoryId} onValueChange={setRuleCategoryId}>
                                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                        <SelectContent>
                                            {categoryGroups.map((g) => {
                                                const cats = categories.filter((c) => c.group_id === g.id);
                                                if (cats.length === 0) return null;
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
                                <Button className="w-full" onClick={handleCreateRule}>Create Rule</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Date</Label>
                                        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Direction</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={newDirection === "outflow" ? "default" : "outline"}
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setNewDirection("outflow")}
                                            >
                                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                                Expense
                                            </Button>
                                            <Button
                                                variant={newDirection === "inflow" ? "default" : "outline"}
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setNewDirection("inflow")}
                                            >
                                                <ArrowDownLeft className="h-3 w-3 mr-1" />
                                                Income
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Merchant / payee" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Amount</Label>
                                    <Input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Account</Label>
                                    <Select value={newAccountId} onValueChange={setNewAccountId}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Category (optional)</Label>
                                    <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                        <SelectContent>
                                            {categoryGroups.map((g) => {
                                                const cats = categories.filter((c) => c.group_id === g.id);
                                                if (cats.length === 0) return null;
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
                                <Button className="w-full" onClick={handleAddTransaction} disabled={!newDesc.trim() || !newAmount}>
                                    Add Transaction
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Search transactions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button
                    variant={showFilters ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filters
                    {(filterAccount !== "all" || filterCategory !== "all" || filterStatus !== "all") && (
                        <Badge variant="secondary" className="ml-1.5 text-[9px] px-1">Active</Badge>
                    )}
                </Button>
                {selectedIds.size > 0 && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                                Bulk Edit ({selectedIds.size})
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="end">
                            <div className="space-y-3">
                                <p className="text-xs font-medium">Bulk Actions</p>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Set Category</Label>
                                    <Select onValueChange={handleBulkCategory}>
                                        <SelectTrigger className="h-8"><SelectValue placeholder="Choose" /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleBulkStatus("excluded")}>
                                        Exclude
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleBulkStatus("posted")}>
                                        Mark Posted
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            {showFilters && (
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border/30">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Account</Label>
                        <Select value={filterAccount} onValueChange={setFilterAccount}>
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Category</Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="posted">Posted</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="excluded">Excluded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs mt-auto"
                        onClick={() => { setFilterAccount("all"); setFilterCategory("all"); setFilterStatus("all"); }}
                    >
                        Clear
                    </Button>
                </div>
            )}

            {/* Transaction Table */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-border"
                                    />
                                </TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs">Account</TableHead>
                                <TableHead className="text-xs">Category</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.map((txn) => (
                                <TableRow key={txn.id} className="group">
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(txn.id)}
                                            onChange={() => toggleSelect(txn.id)}
                                            className="rounded border-border"
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {txn.posted_at}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium max-w-xs truncate">
                                        <div className="flex items-center gap-1.5">
                                            {txn.direction === "inflow" ? (
                                                <ArrowDownLeft className="h-3 w-3 text-chart-2 shrink-0" />
                                            ) : (
                                                <ArrowUpRight className="h-3 w-3 text-chart-5 shrink-0" />
                                            )}
                                            {txn.description}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {txn.account?.name || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={txn.category_id || "none"}
                                            onValueChange={(v) => handleInlineCategory(txn.id, v)}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] border-0 bg-transparent hover:bg-muted/50 w-36">
                                                <SelectValue placeholder="Uncategorized" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categoryGroups.map((g) => {
                                                    const cats = categories.filter((c) => c.group_id === g.id);
                                                    if (cats.length === 0) return null;
                                                    return (
                                                        <div key={g.id}>
                                                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{g.name}</div>
                                                            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </div>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-sm whitespace-nowrap">
                                        <span className={txn.direction === "inflow" ? "positive-value" : "negative-value"}>
                                            {txn.direction === "outflow" ? "-" : ""}
                                            {formatCurrency(Number(txn.amount), currency)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={txn.status === "posted" ? "secondary" : txn.status === "excluded" ? "outline" : "default"}
                                            className="text-[9px]"
                                        >
                                            {txn.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">
                                        No transactions found. Add manual transactions or import from CSV.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
