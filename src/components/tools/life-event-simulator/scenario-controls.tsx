"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { LifeEventType } from "@/lib/scenario-engine";

interface ScenarioControlsProps {
    eventType: LifeEventType;
    onConfigChange: (config: {
        startingCash: number;
        monthsToProject: number;
        customDeltas?: {
            incomeDeltaPct?: number;
            expenseDeltaPct?: number;
            oneTimeCosts?: number;
            debtPayment?: number;
        };
    }) => void;
}

export function ScenarioControls({ eventType, onConfigChange }: ScenarioControlsProps) {
    const [startingCash, setStartingCash] = useState(10000);
    const [monthsToProject, setMonthsToProject] = useState(12);

    // Custom deltas (only for custom event type)
    const [incomeDeltaPct, setIncomeDeltaPct] = useState(0);
    const [expenseDeltaPct, setExpenseDeltaPct] = useState(0);
    const [oneTimeCosts, setOneTimeCosts] = useState(0);
    const [debtPayment, setDebtPayment] = useState(0);

    const handleUpdate = () => {
        const customDeltas = eventType === "custom" ? {
            incomeDeltaPct,
            expenseDeltaPct,
            oneTimeCosts,
            debtPayment,
        } : undefined;

        onConfigChange({
            startingCash,
            monthsToProject,
            customDeltas,
        });
    };

    // Auto-update on changes
    const handleChange = (field: string, value: number) => {
        switch (field) {
            case "startingCash":
                setStartingCash(value);
                break;
            case "monthsToProject":
                setMonthsToProject(value);
                break;
            case "incomeDeltaPct":
                setIncomeDeltaPct(value);
                break;
            case "expenseDeltaPct":
                setExpenseDeltaPct(value);
                break;
            case "oneTimeCosts":
                setOneTimeCosts(value);
                break;
            case "debtPayment":
                setDebtPayment(value);
                break;
        }

        // Trigger update after state change
        setTimeout(handleUpdate, 0);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Scenario Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Starting Cash */}
                <div className="space-y-2">
                    <Label htmlFor="startingCash">Starting Cash</Label>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                            id="startingCash"
                            type="number"
                            step="1000"
                            value={startingCash}
                            onChange={(e) => handleChange("startingCash", parseFloat(e.target.value) || 0)}
                            className="flex-1"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        How much cash do you have available today?
                    </p>
                </div>

                {/* Months to Project */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Projection Period</Label>
                        <Badge variant="secondary">{monthsToProject} months</Badge>
                    </div>
                    <Slider
                        value={[monthsToProject]}
                        onValueChange={([value]) => handleChange("monthsToProject", value)}
                        min={3}
                        max={36}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        How far into the future should we project?
                    </p>
                </div>

                {/* Custom Event Deltas */}
                {eventType === "custom" && (
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium text-sm">Custom Adjustments</h4>

                        {/* Income Delta */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Income Change</Label>
                                <Badge variant="outline">{incomeDeltaPct > 0 ? "+" : ""}{incomeDeltaPct}%</Badge>
                            </div>
                            <Slider
                                value={[incomeDeltaPct]}
                                onValueChange={([value]) => handleChange("incomeDeltaPct", value)}
                                min={-100}
                                max={100}
                                step={5}
                            />
                        </div>

                        {/* Expense Delta */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Expense Change</Label>
                                <Badge variant="outline">{expenseDeltaPct > 0 ? "+" : ""}{expenseDeltaPct}%</Badge>
                            </div>
                            <Slider
                                value={[expenseDeltaPct]}
                                onValueChange={([value]) => handleChange("expenseDeltaPct", value)}
                                min={-100}
                                max={100}
                                step={5}
                            />
                        </div>

                        {/* One-Time Costs */}
                        <div className="space-y-2">
                            <Label htmlFor="oneTimeCosts" className="text-sm">One-Time Costs</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                    id="oneTimeCosts"
                                    type="number"
                                    step="100"
                                    value={oneTimeCosts}
                                    onChange={(e) => handleChange("oneTimeCosts", parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Debt Payment */}
                        <div className="space-y-2">
                            <Label htmlFor="debtPayment" className="text-sm">Monthly Debt Payment</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                    id="debtPayment"
                                    type="number"
                                    step="50"
                                    value={debtPayment}
                                    onChange={(e) => handleChange("debtPayment", parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
