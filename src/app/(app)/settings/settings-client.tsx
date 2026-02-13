"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Plus, Trash2, Edit2, TestTube, Tag, Repeat, FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import {
    createCategory, updateCategory, deleteCategory,
    createCategorizationRule, deleteCategorizationRule,
    testCategorizationRule,
} from "@/app/actions/categories";
import {
    createRecurringRule, deleteRecurringRule,
} from "@/app/actions/recurring";
import type { Category, CategorizationRule, RecurringRule } from "@/types/database";

interface CategorizationRuleWithCategory extends CategorizationRule {
    category?: Category;
}

interface RecurringRuleWithCategory extends RecurringRule {
    category?: Category;
}

export default function SettingsClient({
    workspaceId,
    workspaceName,
    currency,
    categories: initialCategories,
    categorizationRules: initialCatRules,
    recurringRules: initialRecRules,
}: {
    workspaceId: string;
    workspaceName: string;
    currency: string;
    categories: Category[];
    categorizationRules: CategorizationRuleWithCategory[];
    recurringRules: RecurringRuleWithCategory[];
}) {
    const router = useRouter();
    const [categories] = useState(initialCategories);
    const [catRules] = useState(initialCatRules);
    const [recRules] = useState(initialRecRules);

    // Category form
    const [newCatName, setNewCatName] = useState("");
    const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");

    // Categorization rule form
    const [newRuleMatchType, setNewRuleMatchType] = useState<"contains" | "regex" | "exact">("contains");
    const [newRuleValue, setNewRuleValue] = useState("");
    const [newRuleCatId, setNewRuleCatId] = useState("");
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState<string | null>(null);

    // Recurring rule form
    const [newRecDirection, setNewRecDirection] = useState<"income" | "expense">("expense");
    const [newRecCatId, setNewRecCatId] = useState("");
    const [newRecDesc, setNewRecDesc] = useState("");
    const [newRecAmount, setNewRecAmount] = useState("");
    const [newRecCadence, setNewRecCadence] = useState<"monthly" | "quarterly" | "yearly">("monthly");
    const [newRecNextDate, setNewRecNextDate] = useState("");

    const handleAddCategory = async () => {
        if (!newCatName) return;
        try {
            await createCategory({
                workspace_id: workspaceId,
                name: newCatName,
                type: newCatType,
            });
            setNewCatName("");
            toast.success("Category added");
            router.refresh();
        } catch {
            toast.error("Failed to add category");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            await deleteCategory(id);
            toast.success("Category deleted");
            router.refresh();
        } catch {
            toast.error("Cannot delete — category may be in use");
        }
    };

    const handleAddCatRule = async () => {
        if (!newRuleValue || !newRuleCatId) return;
        try {
            await createCategorizationRule({
                workspace_id: workspaceId,
                match_type: newRuleMatchType,
                match_value: newRuleValue,
                category_id: newRuleCatId,
                priority: catRules.length,
                enabled: true,
            });
            setNewRuleValue("");
            toast.success("Categorization rule added");
            router.refresh();
        } catch {
            toast.error("Failed to add rule");
        }
    };

    const handleTestRule = async () => {
        if (!testText) return;
        try {
            const result = await testCategorizationRule(workspaceId, testText);
            if (result) {
                setTestResult(`Matched → ${(result as CategorizationRuleWithCategory).category?.name || "Unknown"} (${result.match_type}: "${result.match_value}")`);
            } else {
                setTestResult("No match found");
            }
        } catch {
            setTestResult("Error testing rule");
        }
    };

    const handleAddRecRule = async () => {
        if (!newRecCatId || !newRecDesc || !newRecAmount || !newRecNextDate) return;
        try {
            await createRecurringRule({
                workspace_id: workspaceId,
                direction: newRecDirection,
                category_id: newRecCatId,
                description: newRecDesc,
                amount: parseFloat(newRecAmount),
                cadence: newRecCadence,
                next_run_date: newRecNextDate,
                auto_post: false,
            });
            setNewRecDesc("");
            setNewRecAmount("");
            toast.success("Recurring rule added");
            router.refresh();
        } catch {
            toast.error("Failed to add recurring rule");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">{workspaceName}</p>
            </div>

            <Tabs defaultValue="categories" className="space-y-4">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="categories" className="gap-1.5">
                        <FolderTree className="h-3.5 w-3.5" /> Categories
                    </TabsTrigger>
                    <TabsTrigger value="categorization" className="gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Auto-Categorize
                    </TabsTrigger>
                    <TabsTrigger value="recurring" className="gap-1.5">
                        <Repeat className="h-3.5 w-3.5" /> Recurring
                    </TabsTrigger>
                </TabsList>

                {/* ---- CATEGORIES ---- */}
                <TabsContent value="categories" className="space-y-4">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Manage Categories</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Name</Label>
                                    <Input
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value)}
                                        placeholder="New category name"
                                        className="h-8"
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select value={newCatType} onValueChange={(v) => setNewCatType(v as "income" | "expense")}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={handleAddCategory} className="h-8">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                </Button>
                            </div>

                            <Separator />

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>System</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={cat.type === "income" ? "default" : "secondary"} className="text-[10px]">
                                                    {cat.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {cat.system_flag && <Badge variant="outline" className="text-[10px]">System</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                {!cat.system_flag && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- CATEGORIZATION RULES ---- */}
                <TabsContent value="categorization" className="space-y-4">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Categorization Rules</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-end gap-2 flex-wrap">
                                <div className="w-28 space-y-1">
                                    <Label className="text-xs">Match Type</Label>
                                    <Select value={newRuleMatchType} onValueChange={(v) => setNewRuleMatchType(v as "contains" | "regex" | "exact")}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="contains">Contains</SelectItem>
                                            <SelectItem value="exact">Exact</SelectItem>
                                            <SelectItem value="regex">Regex</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Match Value</Label>
                                    <Input
                                        value={newRuleValue}
                                        onChange={(e) => setNewRuleValue(e.target.value)}
                                        placeholder="e.g. Stripe"
                                        className="h-8"
                                    />
                                </div>
                                <div className="w-40 space-y-1">
                                    <Label className="text-xs">Category</Label>
                                    <Select value={newRuleCatId} onValueChange={setNewRuleCatId}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={handleAddCatRule} className="h-8">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                </Button>
                            </div>

                            <Separator />

                            {/* Test area */}
                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Test a description</Label>
                                    <Input
                                        value={testText}
                                        onChange={(e) => setTestText(e.target.value)}
                                        placeholder='e.g. "Stripe payment processing fee"'
                                        className="h-8"
                                    />
                                </div>
                                <Button size="sm" variant="outline" onClick={handleTestRule} className="h-8">
                                    <TestTube className="h-3.5 w-3.5 mr-1" /> Test
                                </Button>
                            </div>
                            {testResult && (
                                <p className="text-sm bg-muted/50 rounded-md px-3 py-2">{testResult}</p>
                            )}

                            <Separator />

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {catRules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">{rule.match_type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{rule.match_value}</TableCell>
                                            <TableCell>{rule.category?.name || "—"}</TableCell>
                                            <TableCell className="text-muted-foreground">{rule.priority}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={async () => {
                                                        await deleteCategorizationRule(rule.id);
                                                        toast.success("Rule deleted");
                                                        router.refresh();
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {catRules.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                No categorization rules yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- RECURRING RULES ---- */}
                <TabsContent value="recurring" className="space-y-4">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium">Recurring Rules</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                                <div className="space-y-1">
                                    <Label className="text-xs">Direction</Label>
                                    <Select value={newRecDirection} onValueChange={(v) => setNewRecDirection(v as "income" | "expense")}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Category</Label>
                                    <Select value={newRecCatId} onValueChange={setNewRecCatId}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories
                                                .filter((c) => c.type === newRecDirection)
                                                .map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        value={newRecDesc}
                                        onChange={(e) => setNewRecDesc(e.target.value)}
                                        placeholder="Item name"
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Amount</Label>
                                    <Input
                                        type="number"
                                        value={newRecAmount}
                                        onChange={(e) => setNewRecAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Cadence</Label>
                                    <Select value={newRecCadence} onValueChange={(v) => setNewRecCadence(v as "monthly" | "quarterly" | "yearly")}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Next Run</Label>
                                    <Input
                                        type="date"
                                        value={newRecNextDate}
                                        onChange={(e) => setNewRecNextDate(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                            <Button size="sm" onClick={handleAddRecRule}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add Recurring Rule
                            </Button>

                            <Separator />

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Direction</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Cadence</TableHead>
                                        <TableHead>Next Run</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recRules.map((rule) => (
                                        <TableRow key={rule.id}>
                                            <TableCell>
                                                <Badge variant={rule.direction === "income" ? "default" : "secondary"} className="text-[10px]">
                                                    {rule.direction}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{rule.category?.name || "—"}</TableCell>
                                            <TableCell className="font-medium">{rule.description}</TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(rule.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">{rule.cadence}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{rule.next_run_date}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={async () => {
                                                        await deleteRecurringRule(rule.id);
                                                        toast.success("Rule deleted");
                                                        router.refresh();
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recRules.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                No recurring rules yet
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
