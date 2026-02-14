"use client";

import { useState, useEffect } from "react";
import { BaselineSelector, BaselineData } from "@/components/tools/baseline-selector";
import { AssumptionDisplay } from "@/components/tools/assumption-display";
import { EventSelector } from "@/components/tools/life-event-simulator/event-selector";
import { ScenarioControls } from "@/components/tools/life-event-simulator/scenario-controls";
import { ScenarioResults } from "@/components/tools/life-event-simulator/scenario-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Sparkles, Save } from "lucide-react";
import Link from "next/link";
import type { LifeEventType } from "@/lib/scenario-engine";
import {
    getSimulatorBaselines,
    runScenarioSimulation,
    saveScenario,
} from "@/app/actions/simulator";

interface LifeEventSimulatorClientProps {
    workspaceId: string;
}

export function LifeEventSimulatorClient({ workspaceId }: LifeEventSimulatorClientProps) {
    const [step, setStep] = useState<"event" | "baseline" | "configure" | "results">("event");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Event selection
    const [eventType, setEventType] = useState<LifeEventType | null>(null);

    // Baseline data
    const [actualsBaseline, setActualsBaseline] = useState<BaselineData | null>(null);
    const [plannerBaseline, setPlannerBaseline] = useState<BaselineData | null>(null);
    const [selectedBaseline, setSelectedBaseline] = useState<BaselineData | null>(null);

    // Scenario configuration
    const [startingCash, setStartingCash] = useState(10000);
    const [monthsToProject, setMonthsToProject] = useState(12);
    const [customDeltas, setCustomDeltas] = useState<any>(undefined);

    // Results
    const [results, setResults] = useState<any>(null);
    const [scenarioName, setScenarioName] = useState("");

    // Load baselines on mount
    useEffect(() => {
        loadBaselines();
    }, [workspaceId]);

    const loadBaselines = async () => {
        setLoading(true);
        try {
            const baselines = await getSimulatorBaselines(workspaceId);
            setActualsBaseline(baselines.actualsBaseline);
            setPlannerBaseline(baselines.plannerBaseline);

            // Auto-select actuals if available
            if (baselines.actualsBaseline) {
                setSelectedBaseline(baselines.actualsBaseline);
            } else if (baselines.plannerBaseline) {
                setSelectedBaseline(baselines.plannerBaseline);
            }
        } catch (error) {
            console.error("Failed to load baselines:", error);
            alert("Failed to load baseline data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEventSelect = (type: LifeEventType) => {
        setEventType(type);
        setStep("baseline");
    };

    const handleBaselineSelect = (baseline: BaselineData) => {
        setSelectedBaseline(baseline);
    };

    const handleConfigChange = (config: {
        startingCash: number;
        monthsToProject: number;
        customDeltas?: any;
    }) => {
        setStartingCash(config.startingCash);
        setMonthsToProject(config.monthsToProject);
        setCustomDeltas(config.customDeltas);
    };

    const handleRunSimulation = async () => {
        if (!eventType || !selectedBaseline) return;

        setLoading(true);
        try {
            const simulation = await runScenarioSimulation(
                workspaceId,
                eventType,
                selectedBaseline.monthlyIncome,
                selectedBaseline.monthlyExpenses,
                startingCash,
                monthsToProject,
                customDeltas
            );

            setResults(simulation.results);
            setStep("results");
        } catch (error) {
            console.error("Failed to run simulation:", error);
            alert("Failed to run simulation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (variant: "conservative" | "base" | "aggressive") => {
        if (!eventType || !selectedBaseline || !results) return;

        if (!scenarioName.trim()) {
            alert("Please enter a name for this scenario");
            return;
        }

        setSaving(true);
        try {
            await saveScenario(
                workspaceId,
                scenarioName,
                eventType,
                selectedBaseline.source,
                startingCash,
                monthsToProject,
                variant,
                {
                    baseline_income: selectedBaseline.monthlyIncome,
                    baseline_expenses: selectedBaseline.monthlyExpenses,
                    custom_deltas: customDeltas,
                },
                results[variant]
            );

            alert("Scenario saved successfully!");
            setScenarioName("");
        } catch (error) {
            console.error("Failed to save scenario:", error);
            alert("Failed to save scenario. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setStep("event");
        setEventType(null);
        setSelectedBaseline(null);
        setResults(null);
        setScenarioName("");
    };

    const getEventTitle = (type: LifeEventType | null) => {
        const titles = {
            "move-house": "Move House",
            "have-baby": "Have a Baby",
            "lose-job": "Lose Job",
            "buy-car": "Buy a Car",
            "custom": "Custom Event",
        };
        return type ? titles[type] : "";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/tools"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Life Event Simulator</h1>
                        <p className="text-muted-foreground">
                            Model the financial impact of major life events
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Steps */}
            {step !== "event" && (
                <div className="flex items-center gap-2 text-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("event")}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        1. Event
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("baseline")}
                        disabled={!eventType}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        2. Baseline
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("configure")}
                        disabled={!selectedBaseline}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        3. Configure
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <span className={step === "results" ? "font-medium" : "text-muted-foreground"}>
                        4. Results
                    </span>
                </div>
            )}

            {/* Step 1: Event Selection */}
            {step === "event" && <EventSelector onSelect={handleEventSelect} />}

            {/* Step 2: Baseline Selection */}
            {step === "baseline" && (
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Selected Event: <strong>{getEventTitle(eventType)}</strong>
                    </div>
                    <BaselineSelector
                        actualsBaseline={actualsBaseline || undefined}
                        plannerBaseline={plannerBaseline || undefined}
                        onSelect={handleBaselineSelect}
                        loading={loading}
                    />
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("event")} className="flex-1">
                            Back
                        </Button>
                        <Button
                            onClick={() => setStep("configure")}
                            disabled={!selectedBaseline}
                            className="flex-1"
                        >
                            Continue to Configuration
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Configuration */}
            {step === "configure" && eventType && (
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Event: <strong>{getEventTitle(eventType)}</strong> | Baseline:{" "}
                        <strong>{selectedBaseline?.source === "actuals" ? "Actuals" : "Planner"}</strong>
                    </div>
                    <ScenarioControls eventType={eventType} onConfigChange={handleConfigChange} />

                    {selectedBaseline && (
                        <AssumptionDisplay
                            baselineSource={selectedBaseline.source}
                            periodWindow={selectedBaseline.periodWindow}
                            customAssumptions={{
                                event_type: getEventTitle(eventType),
                                starting_cash: `$${startingCash.toLocaleString()}`,
                                projection_period: `${monthsToProject} months`,
                                monthly_income: `$${selectedBaseline.monthlyIncome.toFixed(0)}`,
                                monthly_expenses: `$${selectedBaseline.monthlyExpenses.toFixed(0)}`,
                            }}
                        />
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("baseline")} className="flex-1">
                            Back
                        </Button>
                        <Button onClick={handleRunSimulation} disabled={loading} className="flex-1">
                            {loading ? "Running Simulation..." : "Run Simulation"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Results */}
            {step === "results" && results && eventType && (
                <div className="space-y-4">
                    <ScenarioResults results={results} eventType={getEventTitle(eventType)} />

                    {/* Save Scenario */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="scenarioName">Save this scenario</Label>
                            <Input
                                id="scenarioName"
                                placeholder="e.g., Moving to NYC - Conservative"
                                value={scenarioName}
                                onChange={(e) => setScenarioName(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => handleSave("base")}
                            disabled={saving || !scenarioName.trim()}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </div>

                    {selectedBaseline && (
                        <AssumptionDisplay
                            baselineSource={selectedBaseline.source}
                            periodWindow={selectedBaseline.periodWindow}
                            customAssumptions={{
                                event_type: getEventTitle(eventType),
                                starting_cash: `$${startingCash.toLocaleString()}`,
                                projection_period: `${monthsToProject} months`,
                            }}
                        />
                    )}

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep("configure")} className="flex-1">
                            Back to Configuration
                        </Button>
                        <Button variant="outline" onClick={handleReset} className="flex-1">
                            Start New Simulation
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
