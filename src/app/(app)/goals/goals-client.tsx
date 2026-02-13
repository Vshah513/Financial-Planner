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
import { Plus, Target, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { createGoal, updateGoal, deleteGoal } from "@/app/actions/goals";
import type { Category } from "@/types/database";

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

interface GoalWithCategory {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
    linked_category_id: string | null;
    linked_category?: { id: string; name: string } | null;
}

interface GoalsClientProps {
    goals: GoalWithCategory[];
    categories: Category[];
    workspaceId: string;
    currency: string;
}

export default function GoalsClient({
    goals,
    categories,
    workspaceId,
    currency,
}: GoalsClientProps) {
    const router = useRouter();
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newName, setNewName] = useState("");
    const [newTarget, setNewTarget] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newCategoryId, setNewCategoryId] = useState("");

    const handleCreate = async () => {
        if (!newName.trim() || !newTarget) return;
        try {
            await createGoal({
                workspace_id: workspaceId,
                name: newName.trim(),
                target_amount: parseFloat(newTarget),
                target_date: newDate || undefined,
                linked_category_id: newCategoryId || undefined,
            });
            setShowAddDialog(false);
            setNewName("");
            setNewTarget("");
            setNewDate("");
            setNewCategoryId("");
            toast.success("Goal created");
            router.refresh();
        } catch {
            toast.error("Failed to create goal");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteGoal(id);
            toast.success("Goal deleted");
            router.refresh();
        } catch {
            toast.error("Failed to delete goal");
        }
    };

    const handleUpdateAmount = async (id: string, amount: string) => {
        const value = parseFloat(amount);
        if (isNaN(value)) return;
        try {
            await updateGoal(id, { current_amount: value });
            router.refresh();
        } catch {
            toast.error("Failed to update");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track progress toward your financial goals</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            New Goal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Goal Name</Label>
                                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Emergency Fund" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Target Amount</Label>
                                <Input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="10000" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Target Date (optional)</Label>
                                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Linked Category (optional)</Label>
                                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">Auto-track progress from transactions assigned to this category</p>
                            </div>
                            <Button className="w-full" onClick={handleCreate} disabled={!newName.trim() || !newTarget}>Create Goal</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {goals.length === 0 && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                    <CardContent className="py-12 text-center space-y-3">
                        <Target className="h-12 w-12 text-primary/20 mx-auto" />
                        <div>
                            <p className="font-medium">No goals yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Create savings goals and track your progress over time</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((goal) => {
                    const pct = goal.target_amount > 0
                        ? Math.min(Math.round((goal.current_amount / goal.target_amount) * 100), 100)
                        : 0;
                    const isComplete = pct >= 100;
                    const daysLeft = goal.target_date
                        ? Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        : null;

                    return (
                        <Card key={goal.id} className="border-border/50 bg-card/80 backdrop-blur-sm group relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(goal.id)}
                            >
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" />
                                    {goal.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {formatCurrency(goal.current_amount, currency)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            of {formatCurrency(goal.target_amount, currency)}
                                        </p>
                                    </div>
                                    <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                                        {pct}%
                                    </Badge>
                                </div>

                                {/* Progress bar */}
                                <div className="h-3 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-chart-2" : pct > 50 ? "bg-primary" : "bg-chart-3"
                                            }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-xs">
                                    {goal.linked_category?.name && (
                                        <Badge variant="outline" className="text-[9px]">
                                            🔗 {goal.linked_category.name}
                                        </Badge>
                                    )}
                                    {daysLeft !== null && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{daysLeft} days left</span>
                                        </div>
                                    )}
                                </div>

                                {!goal.linked_category_id && (
                                    <div className="pt-1">
                                        <Label className="text-[10px] text-muted-foreground">Manual Progress</Label>
                                        <Input
                                            type="number"
                                            defaultValue={goal.current_amount}
                                            className="h-7 text-xs mt-1"
                                            onBlur={(e) => handleUpdateAmount(goal.id, e.target.value)}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
