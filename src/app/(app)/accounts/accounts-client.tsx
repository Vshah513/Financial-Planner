"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Landmark, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createAccount, upsertAccountBalance } from "@/app/actions/accounts";
import type { Institution } from "@/types/database";

const ACCOUNT_TYPES = [
    { value: "checking", label: "Checking", icon: "🏦" },
    { value: "savings", label: "Savings", icon: "💰" },
    { value: "cash", label: "Cash", icon: "💵" },
    { value: "credit_card", label: "Credit Card", icon: "💳" },
    { value: "loan", label: "Loan", icon: "📋" },
    { value: "investment", label: "Investment", icon: "📈" },
    { value: "other", label: "Other", icon: "📦" },
];

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

interface AccountsClientProps {
    accounts: any[];
    institutions: Institution[];
    balances: any[];
    netWorthHistory: any[];
    workspaceId: string;
    currency: string;
}

export default function AccountsClient({
    balances,
    institutions,
    workspaceId,
    currency,
}: AccountsClientProps) {
    const router = useRouter();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("checking");
    const [newInstitutionId, setNewInstitutionId] = useState("");
    const [newBalance, setNewBalance] = useState("");

    const cashAccounts = balances.filter((b) =>
        ["checking", "savings", "cash"].includes(b.account_type)
    );
    const creditAccounts = balances.filter((b) =>
        ["credit_card", "loan"].includes(b.account_type)
    );
    const investmentAccounts = balances.filter((b) =>
        ["investment", "other"].includes(b.account_type)
    );

    const totalAssets = balances
        .filter((b) => !["credit_card", "loan"].includes(b.account_type))
        .reduce((s, b) => s + (b.latest_balance ?? 0), 0);
    const totalLiabilities = balances
        .filter((b) => ["credit_card", "loan"].includes(b.account_type))
        .reduce((s, b) => s + Math.abs(b.latest_balance ?? 0), 0);
    const netWorth = totalAssets - totalLiabilities;

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

            setNewName("");
            setNewBalance("");
            setShowAddDialog(false);
            toast.success("Account created");
            router.refresh();
        } catch {
            toast.error("Failed to create account");
        }
    };

    const AccountTable = ({ accounts }: { accounts: typeof balances }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs">Institution</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                    <TableHead className="text-xs text-right">Last Updated</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {accounts.map((acc) => {
                    const typeInfo = ACCOUNT_TYPES.find((t) => t.value === acc.account_type);
                    return (
                        <TableRow key={acc.id} className="group">
                            <TableCell className="font-medium text-sm">
                                <div className="flex items-center gap-2">
                                    <span>{typeInfo?.icon}</span>
                                    {acc.name}
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {(Array.isArray(acc.institution) ? acc.institution[0]?.name : acc.institution?.name) || "—"}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-[10px]">{typeInfo?.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                                {acc.latest_balance !== null ? (
                                    <span className={acc.latest_balance >= 0 ? "positive-value" : "negative-value"}>
                                        {formatCurrency(acc.latest_balance, acc.currency)}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                                {acc.balance_date || "Never"}
                            </TableCell>
                        </TableRow>
                    );
                })}
                {accounts.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                            No accounts in this category
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your financial accounts and track balances</p>
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
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Chase Checking" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Account Type</Label>
                                <Select value={newType} onValueChange={setNewType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {institutions.length > 0 && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Institution (optional)</Label>
                                    <Select value={newInstitutionId} onValueChange={setNewInstitutionId}>
                                        <SelectTrigger><SelectValue placeholder="Select institution" /></SelectTrigger>
                                        <SelectContent>
                                            {institutions.map((i) => (
                                                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Current Balance (optional)</Label>
                                <Input type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="0.00" />
                            </div>
                            <Button className="w-full" onClick={handleAddAccount} disabled={!newName.trim()}>
                                Create Account
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
                                <p className="text-xl font-bold positive-value">{formatCurrency(totalAssets, currency)}</p>
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
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Liabilities</p>
                                <p className="text-xl font-bold negative-value">{formatCurrency(totalLiabilities, currency)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Wallet className="h-5 w-5 text-primary" />
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

            {/* Account Tabs */}
            <Tabs defaultValue="cash">
                <TabsList className="bg-muted/50 backdrop-blur-sm">
                    <TabsTrigger value="cash" className="text-xs flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5" />
                        Cash ({cashAccounts.length})
                    </TabsTrigger>
                    <TabsTrigger value="credit" className="text-xs flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5" />
                        Credit & Loans ({creditAccounts.length})
                    </TabsTrigger>
                    <TabsTrigger value="investments" className="text-xs flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Investments ({investmentAccounts.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cash">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Cash Accounts</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <AccountTable accounts={cashAccounts} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="credit">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Credit Cards & Loans</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <AccountTable accounts={creditAccounts} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="investments">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Investments & Other</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <AccountTable accounts={investmentAccounts} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
