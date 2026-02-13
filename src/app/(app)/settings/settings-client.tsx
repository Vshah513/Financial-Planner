"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
    Plus, Trash2, Building2, User, Sparkles,
    FolderOpen, Tag, Zap, RotateCw, TestTube2, Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
    createCategory, deleteCategory, createCategoryGroup,
    deleteCategoryGroup, createCategorizationRule, deleteCategorizationRule,
    testCategorizationRule,
} from "@/app/actions/categories";
import {
    createRecurringRule, deleteRecurringRule,
} from "@/app/actions/recurring";
import { updateWorkspaceMode } from "@/app/actions/workspace";
import { TEMPLATES } from "@/lib/templates";
import type { Category, CategoryGroup, WorkspaceMode } from "@/types/database";

interface SettingsClientProps {
    workspaceId: string;
    workspaceName: string;
    currency: string;
    workspaceMode: WorkspaceMode;
    categories: Category[];
    categoryGroups: CategoryGroup[];
    categorizationRules: Array<{
        id: string;
        match_type: string;
        match_value: string;
        category_id: string;
        priority: number;
        enabled: boolean;
        category: { name: string } | null;
    }>;
    recurringRules: Array<{
        id: string;
        direction: string;
        description: string;
        amount: number;
        cadence: string;
        next_run_date: string;
        auto_post: boolean;
        category: { name: string } | null;
    }>;
}

export default function SettingsClient({
    workspaceId,
    workspaceName,
    currency,
    workspaceMode: initialMode,
    categories,
    categoryGroups,
    categorizationRules,
    recurringRules,
}: SettingsClientProps) {
    const router = useRouter();
    const [mode, setMode] = useState<WorkspaceMode>(initialMode);

    // New group form
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupType, setNewGroupType] = useState<"income" | "expense">("expense");

    // New category form
    const [newCatName, setNewCatName] = useState("");
    const [newCatType, setNewCatType] = useState<"income" | "expense">("expense");
    const [newCatGroupId, setNewCatGroupId] = useState("");

    // Categorization rule form
    const [ruleMatchType, setRuleMatchType] = useState("contains");
    const [ruleMatchValue, setRuleMatchValue] = useState("");
    const [ruleCategoryId, setRuleCategoryId] = useState("");
    const [rulePriority, setRulePriority] = useState(10);
    const [testText, setTestText] = useState("");
    const [testResult, setTestResult] = useState<string | null>(null);

    // Recurring rule form
    const [recDirection, setRecDirection] = useState<"income" | "expense">("expense");
    const [recCategoryId, setRecCategoryId] = useState("");
    const [recDescription, setRecDescription] = useState("");
    const [recAmount, setRecAmount] = useState(0);
    const [recCadence, setRecCadence] = useState("monthly");
    const [recNextRun, setRecNextRun] = useState("");
    const [recAutoPost, setRecAutoPost] = useState(false);

    const incomeGroups = categoryGroups.filter((g) => g.type === "income");
    const expenseGroups = categoryGroups.filter((g) => g.type === "expense");
    const filteredGroupsForCat = categoryGroups.filter((g) => g.type === newCatType);

    const handleModeSwitch = async (newMode: WorkspaceMode) => {
        try {
            setMode(newMode);
            await updateWorkspaceMode(workspaceId, newMode);
            toast.success(`Mode switched to ${newMode}. Template categories merged.`);
            router.refresh();
        } catch {
            setMode(initialMode);
            toast.error("Failed to switch mode");
        }
    };

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            await createCategoryGroup({
                workspace_id: workspaceId,
                name: newGroupName.trim(),
                type: newGroupType,
                sort_order: categoryGroups.filter((g) => g.type === newGroupType).length * 10 + 10,
            });
            setNewGroupName("");
            toast.success("Group created");
            router.refresh();
        } catch {
            toast.error("Failed to create group");
        }
    };

    const handleDeleteGroup = async (id: string) => {
        try {
            await deleteCategoryGroup(id);
            toast.success("Group deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete group. Unlink categories first.");
        }
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        try {
            await createCategory({
                workspace_id: workspaceId,
                name: newCatName.trim(),
                type: newCatType,
                group_id: newCatGroupId || undefined,
            });
            setNewCatName("");
            toast.success("Category created");
            router.refresh();
        } catch {
            toast.error("Failed to create category");
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            await deleteCategory(id);
            toast.success("Category deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete category. Remove entries first.");
        }
    };

    const handleAddRule = async () => {
        if (!ruleMatchValue.trim() || !ruleCategoryId) return;
        try {
            await createCategorizationRule({
                workspace_id: workspaceId,
                match_type: ruleMatchType as "contains" | "regex" | "exact",
                match_value: ruleMatchValue.trim(),
                category_id: ruleCategoryId,
                priority: rulePriority,
                enabled: true,
            });
            setRuleMatchValue("");
            toast.success("Rule created");
            router.refresh();
        } catch {
            toast.error("Failed to create rule");
        }
    };

    const handleDeleteRule = async (id: string) => {
        try {
            await deleteCategorizationRule(id);
            toast.success("Rule deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete rule");
        }
    };

    const handleTestRule = async () => {
        if (!testText.trim()) return;
        const result = await testCategorizationRule(workspaceId, testText);
        if (result && result.category) {
            const cat = result.category as { name: string };
            setTestResult(`Matched: ${cat.name} (${result.match_type}: "${result.match_value}")`);
        } else {
            setTestResult("No match found");
        }
    };

    const handleAddRecurring = async () => {
        if (!recDescription.trim() || !recCategoryId || !recNextRun) return;
        try {
            await createRecurringRule({
                workspace_id: workspaceId,
                direction: recDirection,
                category_id: recCategoryId,
                description: recDescription.trim(),
                amount: recAmount,
                cadence: recCadence as "monthly" | "quarterly" | "yearly",
                next_run_date: recNextRun,
                auto_post: recAutoPost,
            });
            setRecDescription("");
            setRecAmount(0);
            toast.success("Recurring rule created");
            router.refresh();
        } catch {
            toast.error("Failed to create recurring rule");
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        try {
            await deleteRecurringRule(id);
            toast.success("Recurring rule deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete recurring rule");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your workspace: {workspaceName}
                </p>
            </div>

            <Tabs defaultValue="mode" className="space-y-4">
                <TabsList className="bg-muted/50 backdrop-blur-sm">
                    <TabsTrigger value="mode" className="flex items-center gap-1.5 text-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        Mode
                    </TabsTrigger>
                    <TabsTrigger value="groups" className="flex items-center gap-1.5 text-xs">
                        <Layers className="h-3.5 w-3.5" />
                        Groups
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs">
                        <Tag className="h-3.5 w-3.5" />
                        Categories
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="flex items-center gap-1.5 text-xs">
                        <Zap className="h-3.5 w-3.5" />
                        Auto-Cat Rules
                    </TabsTrigger>
                    <TabsTrigger value="recurring" className="flex items-center gap-1.5 text-xs">
                        <RotateCw className="h-3.5 w-3.5" />
                        Recurring
                    </TabsTrigger>
                </TabsList>

                {/* ---- MODE TAB ---- */}
                <TabsContent value="mode">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Workspace Mode</CardTitle>
                            <CardDescription>
                                Switch between Business and Personal mode. Switching applies any missing template groups & categories (existing data is preserved).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(["business", "personal"] as const).map((m) => {
                                    const template = TEMPLATES[m];
                                    const isActive = mode === m;
                                    return (
                                        <div
                                            key={m}
                                            className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${isActive
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border/50 hover:border-border"
                                                }`}
                                            onClick={() => handleModeSwitch(m)}
                                        >
                                            {isActive && (
                                                <Badge
                                                    className="absolute top-3 right-3 bg-primary/10 text-primary border-primary/20"
                                                    variant="outline"
                                                >
                                                    Active
                                                </Badge>
                                            )}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive
                                                    ? "bg-primary/20 ring-1 ring-primary/30"
                                                    : "bg-muted/50"
                                                    }`}>
                                                    {m === "business" ? (
                                                        <Building2 className="h-5 w-5" />
                                                    ) : (
                                                        <User className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{template.label}</h3>
                                                    <p className="text-xs text-muted-foreground">{template.description}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1 mt-3">
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                    Template Groups
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {template.groups.map((g) => (
                                                        <Badge
                                                            key={g.name}
                                                            variant="secondary"
                                                            className="text-[10px]"
                                                        >
                                                            {g.type === "income" ? "📈" : "📉"} {g.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- GROUPS TAB ---- */}
                <TabsContent value="groups">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                Category Groups
                            </CardTitle>
                            <CardDescription>
                                Groups organize your categories (e.g. "Payroll" groups Salaries + Contractors).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add group form */}
                            <div className="flex items-end gap-3">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Group Name</Label>
                                    <Input
                                        placeholder="e.g., Marketing"
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select value={newGroupType} onValueChange={(v) => setNewGroupType(v as "income" | "expense")}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add
                                </Button>
                            </div>

                            {/* Income groups */}
                            {incomeGroups.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Income Groups
                                    </p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Name</TableHead>
                                                <TableHead className="text-xs w-24">Categories</TableHead>
                                                <TableHead className="text-xs w-20">System</TableHead>
                                                <TableHead className="w-12" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {incomeGroups.map((g) => {
                                                const catCount = categories.filter((c) => c.group_id === g.id).length;
                                                return (
                                                    <TableRow key={g.id}>
                                                        <TableCell className="font-medium text-sm">{g.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px]">{catCount}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {g.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                                                        </TableCell>
                                                        <TableCell>
                                                            {!g.is_system && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleDeleteGroup(g.id)}
                                                                >
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Expense groups */}
                            {expenseGroups.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Expense Groups
                                    </p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Name</TableHead>
                                                <TableHead className="text-xs w-24">Categories</TableHead>
                                                <TableHead className="text-xs w-20">System</TableHead>
                                                <TableHead className="w-12" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expenseGroups.map((g) => {
                                                const catCount = categories.filter((c) => c.group_id === g.id).length;
                                                return (
                                                    <TableRow key={g.id}>
                                                        <TableCell className="font-medium text-sm">{g.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px]">{catCount}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {g.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                                                        </TableCell>
                                                        <TableCell>
                                                            {!g.is_system && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => handleDeleteGroup(g.id)}
                                                                >
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {categoryGroups.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    No groups yet. Add one above or switch modes to apply a template.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- CATEGORIES TAB ---- */}
                <TabsContent value="categories">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Categories
                            </CardTitle>
                            <CardDescription>
                                Manage expense and income categories. Each category belongs to a group.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add category form */}
                            <div className="flex items-end gap-3">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Category Name</Label>
                                    <Input
                                        placeholder="e.g., SaaS Tools"
                                        value={newCatName}
                                        onChange={(e) => setNewCatName(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="w-28 space-y-1">
                                    <Label className="text-xs">Type</Label>
                                    <Select value={newCatType} onValueChange={(v) => {
                                        setNewCatType(v as "income" | "expense");
                                        setNewCatGroupId("");
                                    }}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="income">Income</SelectItem>
                                            <SelectItem value="expense">Expense</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-40 space-y-1">
                                    <Label className="text-xs">Group</Label>
                                    <Select value={newCatGroupId} onValueChange={setNewCatGroupId}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredGroupsForCat.map((g) => (
                                                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={handleAddCategory} disabled={!newCatName.trim()}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add
                                </Button>
                            </div>

                            {/* Categories grouped by groups */}
                            {categoryGroups.map((group) => {
                                const groupCats = categories.filter((c) => c.group_id === group.id);
                                if (groupCats.length === 0) return null;
                                return (
                                    <div key={group.id}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant={group.type === "income" ? "default" : "secondary"} className="text-[10px]">
                                                {group.type}
                                            </Badge>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                {group.name}
                                            </p>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Name</TableHead>
                                                    <TableHead className="text-xs w-20">System</TableHead>
                                                    <TableHead className="w-12" />
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupCats.map((cat) => (
                                                    <TableRow key={cat.id}>
                                                        <TableCell className="text-sm">{cat.name}</TableCell>
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
                                    </div>
                                );
                            })}

                            {/* Ungrouped categories */}
                            {categories.filter((c) => !c.group_id).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Ungrouped
                                    </p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Name</TableHead>
                                                <TableHead className="text-xs w-20">Type</TableHead>
                                                <TableHead className="text-xs w-20">System</TableHead>
                                                <TableHead className="w-12" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {categories.filter((c) => !c.group_id).map((cat) => (
                                                <TableRow key={cat.id}>
                                                    <TableCell className="text-sm">{cat.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px]">{cat.type}</Badge>
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
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- AUTO-CAT RULES TAB ---- */}
                <TabsContent value="rules">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                Categorization Rules
                            </CardTitle>
                            <CardDescription>
                                Auto-assign categories to imported entries by matching descriptions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add rule */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                <div className="space-y-1">
                                    <Label className="text-xs">Match Type</Label>
                                    <Select value={ruleMatchType} onValueChange={setRuleMatchType}>
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
                                <div className="space-y-1">
                                    <Label className="text-xs">Match Value</Label>
                                    <Input
                                        value={ruleMatchValue}
                                        onChange={(e) => setRuleMatchValue(e.target.value)}
                                        className="h-8"
                                        placeholder="e.g., Stripe"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Category</Label>
                                    <Select value={ruleCategoryId} onValueChange={setRuleCategoryId}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} ({c.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Priority</Label>
                                    <Input
                                        type="number"
                                        value={rulePriority}
                                        onChange={(e) => setRulePriority(parseInt(e.target.value) || 10)}
                                        className="h-8"
                                    />
                                </div>
                                <Button size="sm" onClick={handleAddRule} disabled={!ruleMatchValue.trim() || !ruleCategoryId}>
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Rule
                                </Button>
                            </div>

                            {/* Test */}
                            <div className="flex items-end gap-3">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs flex items-center gap-1">
                                        <TestTube2 className="h-3 w-3" />
                                        Test Description
                                    </Label>
                                    <Input
                                        value={testText}
                                        onChange={(e) => setTestText(e.target.value)}
                                        className="h-8"
                                        placeholder="Enter a description to test matching"
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={handleTestRule}>
                                    Test
                                </Button>
                            </div>
                            {testResult && (
                                <p className="text-xs px-3 py-2 rounded-md bg-muted/50">{testResult}</p>
                            )}

                            {/* Existing rules */}
                            {categorizationRules.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Match</TableHead>
                                            <TableHead className="text-xs">Value</TableHead>
                                            <TableHead className="text-xs">Category</TableHead>
                                            <TableHead className="text-xs w-16">Priority</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categorizationRules.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">{r.match_type}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm font-mono">{r.match_value}</TableCell>
                                                <TableCell className="text-sm">{r.category?.name}</TableCell>
                                                <TableCell className="text-sm text-center">{r.priority}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteRule(r.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    No categorization rules yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---- RECURRING TAB ---- */}
                <TabsContent value="recurring">
                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RotateCw className="h-4 w-4" />
                                Recurring Rules
                            </CardTitle>
                            <CardDescription>
                                Define recurring income and expenses that auto-generate each period.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add recurring */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div className="space-y-1">
                                    <Label className="text-xs">Direction</Label>
                                    <Select value={recDirection} onValueChange={(v) => setRecDirection(v as "income" | "expense")}>
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
                                    <Select value={recCategoryId} onValueChange={setRecCategoryId}>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories
                                                .filter((c) => c.type === recDirection)
                                                .map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        value={recDescription}
                                        onChange={(e) => setRecDescription(e.target.value)}
                                        className="h-8"
                                        placeholder="e.g., Office rent"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Amount</Label>
                                    <Input
                                        type="number"
                                        value={recAmount}
                                        onChange={(e) => setRecAmount(parseFloat(e.target.value) || 0)}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Cadence</Label>
                                    <Select value={recCadence} onValueChange={setRecCadence}>
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
                                    <Label className="text-xs">Next Run Date</Label>
                                    <Input
                                        type="date"
                                        value={recNextRun}
                                        onChange={(e) => setRecNextRun(e.target.value)}
                                        className="h-8"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={recAutoPost}
                                    onCheckedChange={setRecAutoPost}
                                    id="auto-post"
                                />
                                <Label htmlFor="auto-post" className="text-xs">
                                    Auto-post (generate without manual trigger)
                                </Label>
                                <Button
                                    size="sm"
                                    onClick={handleAddRecurring}
                                    disabled={!recDescription.trim() || !recCategoryId || !recNextRun}
                                    className="ml-auto"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Add Rule
                                </Button>
                            </div>

                            <Separator />

                            {/* Existing recurring rules */}
                            {recurringRules.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Description</TableHead>
                                            <TableHead className="text-xs">Category</TableHead>
                                            <TableHead className="text-xs w-16">Dir</TableHead>
                                            <TableHead className="text-xs w-24 text-right">Amount</TableHead>
                                            <TableHead className="text-xs w-20">Cadence</TableHead>
                                            <TableHead className="text-xs w-24">Next Run</TableHead>
                                            <TableHead className="w-12" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recurringRules.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell className="text-sm">{r.description}</TableCell>
                                                <TableCell className="text-sm">{r.category?.name}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={r.direction === "income" ? "default" : "secondary"}
                                                        className="text-[10px]"
                                                    >
                                                        {r.direction}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {new Intl.NumberFormat("en-US", {
                                                        style: "currency",
                                                        currency,
                                                    }).format(r.amount)}
                                                </TableCell>
                                                <TableCell className="text-sm">{r.cadence}</TableCell>
                                                <TableCell className="text-sm">{r.next_run_date}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteRecurring(r.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    No recurring rules yet.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
