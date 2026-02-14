"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateTaxProfile } from "@/app/actions/tax-reserve";

interface TaxSettingsProps {
    profile: {
        calculation_mode: "revenue" | "profit";
        tax_rate: number;
        filing_frequency: "monthly" | "quarterly" | "annual";
    };
    workspaceId: string;
    onUpdate: () => void;
}

export function TaxSettings({ profile, workspaceId, onUpdate }: TaxSettingsProps) {
    const [calculationMode, setCalculationMode] = useState(profile.calculation_mode);
    const [taxRate, setTaxRate] = useState(profile.tax_rate);
    const [filingFrequency, setFilingFrequency] = useState(profile.filing_frequency);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateTaxProfile(workspaceId, {
                calculation_mode: calculationMode,
                tax_rate: taxRate,
                filing_frequency: filingFrequency,
            });
            onUpdate();
            alert("Tax settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Calculation Mode */}
                <div className="space-y-3">
                    <Label>Calculation Mode</Label>
                    <RadioGroup value={calculationMode} onValueChange={(v: any) => setCalculationMode(v)}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="revenue" id="revenue" />
                            <Label htmlFor="revenue" className="font-normal cursor-pointer">
                                <div>
                                    <div className="font-medium">Revenue-Based</div>
                                    <div className="text-sm text-muted-foreground">
                                        Calculate tax on total revenue (simpler, more conservative)
                                    </div>
                                </div>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="profit" id="profit" />
                            <Label htmlFor="profit" className="font-normal cursor-pointer">
                                <div>
                                    <div className="font-medium">Profit-Based</div>
                                    <div className="text-sm text-muted-foreground">
                                        Calculate tax on profit (revenue minus deductible expenses)
                                    </div>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Tax Rate */}
                <div className="space-y-2">
                    <Label htmlFor="taxRate">Estimated Tax Rate (%)</Label>
                    <Input
                        id="taxRate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Include federal, state, and self-employment tax. Typical range: 25-35%
                    </p>
                </div>

                {/* Filing Frequency */}
                <div className="space-y-2">
                    <Label htmlFor="filingFrequency">Filing Frequency</Label>
                    <Select value={filingFrequency} onValueChange={(v: any) => setFilingFrequency(v)}>
                        <SelectTrigger id="filingFrequency">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save Settings"}
                </Button>
            </CardContent>
        </Card>
    );
}
