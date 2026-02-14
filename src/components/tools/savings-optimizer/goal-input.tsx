"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface GoalInputProps {
    onSubmit: (targetAmount: number, deadline: Date) => void;
    loading?: boolean;
}

export function GoalInput({ onSubmit, loading }: GoalInputProps) {
    const [targetAmount, setTargetAmount] = useState("");
    const [deadline, setDeadline] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(targetAmount);
        const date = new Date(deadline);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid target amount");
            return;
        }

        if (isNaN(date.getTime()) || date <= new Date()) {
            alert("Please enter a valid future date");
            return;
        }

        onSubmit(amount, date);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Set Your Savings Goal</CardTitle>
                <CardDescription>
                    Enter your target amount and deadline to see what you need to save monthly
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="targetAmount">Target Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                $
                            </span>
                            <Input
                                id="targetAmount"
                                type="number"
                                step="0.01"
                                placeholder="10000"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                className="pl-7"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="deadline">Deadline</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="deadline"
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="pl-10"
                                required
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Calculating..." : "Calculate Savings Plan"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
