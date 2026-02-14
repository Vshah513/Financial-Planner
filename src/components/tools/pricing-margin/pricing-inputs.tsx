"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface PricingInputsProps {
    onCalculate: (inputs: {
        fixedCosts: number;
        variableCostPerUnit: number;
        desiredMarginPct: number;
        expectedVolume: number;
    }) => void;
}

export function PricingInputs({ onCalculate }: PricingInputsProps) {
    const [fixedCosts, setFixedCosts] = useState(10000);
    const [variableCostPerUnit, setVariableCostPerUnit] = useState(25);
    const [desiredMarginPct, setDesiredMarginPct] = useState(40);
    const [expectedVolume, setExpectedVolume] = useState(500);

    const handleCalculate = () => {
        onCalculate({
            fixedCosts,
            variableCostPerUnit,
            desiredMarginPct,
            expectedVolume,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pricing Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Fixed Costs */}
                <div className="space-y-2">
                    <Label htmlFor="fixedCosts">Fixed Costs (Monthly)</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                            id="fixedCosts"
                            type="number"
                            step="100"
                            value={fixedCosts}
                            onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Rent, salaries, software, etc. that don't change with volume
                    </p>
                </div>

                {/* Variable Cost Per Unit */}
                <div className="space-y-2">
                    <Label htmlFor="variableCost">Variable Cost Per Unit</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <Input
                            id="variableCost"
                            type="number"
                            step="0.01"
                            value={variableCostPerUnit}
                            onChange={(e) => setVariableCostPerUnit(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Materials, labor, shipping per unit
                    </p>
                </div>

                {/* Desired Margin */}
                <div className="space-y-2">
                    <Label htmlFor="desiredMargin">Desired Margin (%)</Label>
                    <Input
                        id="desiredMargin"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={desiredMarginPct}
                        onChange={(e) => setDesiredMarginPct(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Target profit margin (typical: 30-50%)
                    </p>
                </div>

                {/* Expected Volume */}
                <div className="space-y-2">
                    <Label htmlFor="expectedVolume">Expected Volume (Units/Month)</Label>
                    <Input
                        id="expectedVolume"
                        type="number"
                        step="10"
                        value={expectedVolume}
                        onChange={(e) => setExpectedVolume(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                        How many units do you expect to sell?
                    </p>
                </div>

                {/* Calculate Button */}
                <Button onClick={handleCalculate} className="w-full gap-2">
                    <Calculator className="h-4 w-4" />
                    Calculate Pricing
                </Button>
            </CardContent>
        </Card>
    );
}
