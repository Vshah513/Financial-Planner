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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plus, Landmark, CreditCard, TrendingUp, PiggyBank,
    Wallet, Building2, MoreHorizontal, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { createAccount, upsertAccountBalance, computeAndSaveNetWorth } from "@/app/actions/accounts";

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    credit_card: "Credit Card",
    investment: "Investment",
    loan: "Loan",
    cash: "Cash",
    line_of_credit: "Line of Credit",
    other: "Other",
};

const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
    checking: <Wallet className="h-4 w-4" />,
    savings: <PiggyBank className="h-4 w-4" />,
    credit_card: <CreditCard className="h-4 w-4" />,
    investment: <TrendingUp className="h-4 w-4" />,
    loan: <Building2 className="h-4 w-4" />,
    cash: <DollarSign className="h-4 w-4" />,
    line_of_credit: <CreditCard className="h-4 w-4" />,
    other: <Landmark className="h-4 w-4" />,
};

interface AccountBalance {
    id: string;
    name: string;
    account_type: string;
    currency: string;
    is_active: boolean;
    institution_id: string | null;
    institution?: { id: string; name: string; logo_url?: string | null } | null;
    latest_balance: number | null;
    balance_date: string | null;
}

interface AccountsClientProps {
    accounts: any[];
    institutions: any[];
    balances: AccountBalance[];
    netWorthHistory: any[];
    workspaceId: string;
    currency: string;
}

export default function AccountsClient({
    accounts,
    institutions,
    balances,
    workspaceId,
    currency,
}: AccountsClientProps) {
    const router = useRouter();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("checking");
    const [newInstitutionId, setNewInstitutionId] = useState("");
    const [newBalance, setNewBalance] = useState("");

    // Compute net worth
    const totalAssets = useMemo(
        () =>
            balances
                .filter((b) => !["credit_card", "loan", "line_of_credit"].includes(b.account_type))
                .reduce((sum, b) => sum + Number(b.latest_balance || 0), 0),
        [balances]
    );

    const totalLiabilities = useMemo(
        () =>
            balances
                .filter((b) => ["credit_card", "loan", "line_of_credit"].includes(b.account_type))
                .reduce((sum, b) => sum + Number(b.latest_balance || 0), 0),
        [balances]
    );

    const netWorth = totalAssets - totalLiabilities;

    // Group by type
    const cashAccounts = balances.filter((b) => ["checking", "savings", "cash"].includes(b.account_type));
    const creditAccounts = balances.filter((b) => ["credit_card", "loan", "line_of_credit"].includes(b.account_type));
    const investmentAccounts = balances.filter((b) => ["investment"].includes(b.account_type));
    const otherAccounts = balances.filter((b) => ["other"].includes(b.account_type));

    const handleAddAccount = async () => {
        if (!newName.trim()) return;
        try {
            const account = await createAccount({
                workspace_id: workspaceId,
                name: newName.trim(),
                account_type: newType,
                currency,
                institution_id: newInstitutionId || undefined,
            });

            if (newBalance) {
                await upsertAccountBalance({
                    account_id: account.id,
                    as_of_date: new Date().toISOString().split("T")[0],
                    balance: parseFloat(newBalance),
                });
            }

            // Refresh net worth
            await computeAndSaveNetWorth(workspaceId);

            setShowAddDialog(false);
            setNewName("");
            setNewType("checking");
            setNewInstitutionId("");
            setNewBalance("");
            toast.success("Account added");
            router.refresh();
        } catch {
            toast.error("Failed to create account");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track your balances and net worth
                    </p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Account</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Account Name</Label>
                                <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g., Chase Checking"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Account Type</Label>
                                <Select value={newType} onValueChange={setNewType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {institutions.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Institution (optional)</Label>
                                    <Select value={newInstitutionId} onValueChange={setNewInstitutionId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {institutions.map((inst: any) => (
                                                <SelectItem key={inst.id} value={inst.id}>
                                                    {inst.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Current Balance</Label>
                                <Input
                                    type="number"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleAddAccount}
                                disabled={!newName.trim()}
                            >
                                Add Account
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Net Worth Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                                <TrendingUp className="h-5 w-5 text-chart-2" />
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Assets</p>
                                <p className="text-xl font-bold positive-value">
                                    {formatCurrency(totalAssets, currency)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-5/10">
                                <CreditCard className="h-5 w-5 text-chart-5" />
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Total Liabilities</p>
                                <p className="text-xl font-bold negative-value">
                                    {formatCurrency(totalLiabilities, currency)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Net Worth</p>
                                <p className={`text-xl font-bold ${netWorth >= 0 ? "positive-value" : "negative-value"}`}>
                                    {formatCurrency(netWorth, currency)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Account Tables by Type */}
            {balances.length === 0 ? (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center space-y-3">
                        <Landmark className="h-12 w-12 text-primary/20 mx-auto" />
                        <div>
                            <p className="font-medium">No accounts yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Add your bank accounts, credit cards, and investments to start tracking your net worth.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="all" className="text-xs">
                            All ({balances.length})
                        </TabsTrigger>
                        {cashAccounts.length > 0 && (
                            <TabsTrigger value="cash" className="text-xs">
                                Cash & Savings ({cashAccounts.length})
                            </TabsTrigger>
                        )}
                        {creditAccounts.length > 0 && (
                            <TabsTrigger value="credit" className="text-xs">
                                Credit & Loans ({creditAccounts.length})
                            </TabsTrigger>
                        )}
                        {investmentAccounts.length > 0 && (
                            <TabsTrigger value="investments" className="text-xs">
                                Investments ({investmentAccounts.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="all">
                        <AccountTable accounts={balances} currency={currency} />
                    </TabsContent>
                    <TabsContent value="cash">
                        <AccountTable accounts={cashAccounts} currency={currency} />
                    </TabsContent>
                    <TabsContent value="credit">
                        <AccountTable accounts={creditAccounts} currency={currency} />
                    </TabsContent>
                    <TabsContent value="investments">
                        <AccountTable accounts={investmentAccounts} currency={currency} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}

function AccountTable({ accounts, currency }: { accounts: AccountBalance[]; currency: string }) {
    return (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Account</TableHead>
                            <TableHead className="text-xs">Institution</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs text-right">Balance</TableHead>
                            <TableHead className="text-xs">As Of</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.map((account) => (
                            <TableRow key={account.id}>
                                <TableCell className="font-medium text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
                                            {ACCOUNT_TYPE_ICONS[account.account_type] || <Landmark className="h-4 w-4" />}
                                        </div>
                                        {account.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {account.institution?.name || "—"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px]">
                                        {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm">
                                    {account.latest_balance !== null ? (
                                        <span className={
                                            ["credit_card", "loan", "line_of_credit"].includes(account.account_type)
                                                ? "negative-value"
                                                : ""
                                        }>
                                            {formatCurrency(account.latest_balance, currency)}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {account.balance_date || "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
