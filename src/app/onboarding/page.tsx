"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowRight, Check, Building2, Calendar, Coins, User, Sparkles } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import type { WorkspaceMode } from "@/types/database";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "CHF"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [fiscalStart, setFiscalStart] = useState("1");
    const [mode, setMode] = useState<WorkspaceMode>("business");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleCreate = async () => {
        setLoading(true);
        setError("");
        try {
            const currentYear = new Date().getFullYear();
            await createWorkspace(name, currency, parseInt(fiscalStart), currentYear, mode);
            setStep(4);
            setTimeout(() => router.push("/dashboard"), 1500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An error occurred";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            icon: <Building2 className="h-6 w-6" />,
            title: "Name Your Workspace",
            description: "What's your business or budget called?",
        },
        {
            icon: <Sparkles className="h-6 w-6" />,
            title: "Choose Mode",
            description: "Are you tracking business or personal finances?",
        },
        {
            icon: <Coins className="h-6 w-6" />,
            title: "Choose Currency",
            description: "Select your primary operating currency",
        },
        {
            icon: <Calendar className="h-6 w-6" />,
            title: "Fiscal Year",
            description: "When does your fiscal year start?",
        },
        {
            icon: <Check className="h-6 w-6" />,
            title: "All Set!",
            description: "Your workspace is ready",
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-chart-2/8 blur-3xl" />
            </div>

            <div className="relative w-full max-w-lg space-y-8">
                {/* Progress */}
                <div className="flex items-center justify-center gap-2">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${i <= step
                                ? "w-10 bg-primary"
                                : "w-6 bg-border"
                                }`}
                        />
                    ))}
                </div>

                <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="text-center space-y-3">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                            {steps[step].icon}
                        </div>
                        <CardTitle className="text-2xl font-bold">{steps[step].title}</CardTitle>
                        <CardDescription>{steps[step].description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Step 0: Name */}
                        {step === 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Workspace Name</Label>
                                <Input
                                    id="name"
                                    placeholder="My Business"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-background/50"
                                    autoFocus
                                />
                                <Button
                                    className="w-full mt-4"
                                    onClick={() => name && setStep(1)}
                                    disabled={!name}
                                >
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Step 1: Mode */}
                        {step === 1 && (
                            <div className="space-y-4">
                                {(["business", "personal"] as const).map((m) => {
                                    const template = TEMPLATES[m];
                                    const isSelected = mode === m;
                                    return (
                                        <div
                                            key={m}
                                            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border/50 hover:border-border"
                                                }`}
                                            onClick={() => setMode(m)}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3">
                                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isSelected
                                                    ? "bg-primary/20"
                                                    : "bg-muted/50"
                                                    }`}>
                                                    {m === "business" ? (
                                                        <Building2 className="h-5 w-5" />
                                                    ) : (
                                                        <User className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold">{template.label}</h3>
                                                    <p className="text-xs text-muted-foreground">{template.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {template.groups.slice(0, 6).map((g) => (
                                                    <Badge key={g.name} variant="secondary" className="text-[10px]">
                                                        {g.name}
                                                    </Badge>
                                                ))}
                                                {template.groups.length > 6 && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        +{template.groups.length - 6} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <Button className="w-full mt-2" onClick={() => setStep(2)}>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Currency */}
                        {step === 2 && (
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button className="w-full mt-4" onClick={() => setStep(3)}>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Step 3: Fiscal Year Start */}
                        {step === 3 && (
                            <div className="space-y-2">
                                <Label>Fiscal Year Start Month</Label>
                                <Select value={fiscalStart} onValueChange={setFiscalStart}>
                                    <SelectTrigger className="bg-background/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m, i) => (
                                            <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {error && (
                                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <div className="bg-muted/50 rounded-lg p-4 mt-4 space-y-1 text-sm">
                                    <p className="font-medium text-foreground">Summary</p>
                                    <p className="text-muted-foreground">Workspace: <span className="text-foreground">{name}</span></p>
                                    <p className="text-muted-foreground">Mode: <span className="text-foreground capitalize">{mode}</span></p>
                                    <p className="text-muted-foreground">Currency: <span className="text-foreground">{currency}</span></p>
                                    <p className="text-muted-foreground">Fiscal Start: <span className="text-foreground">{MONTHS[parseInt(fiscalStart) - 1]}</span></p>
                                    <p className="text-muted-foreground text-xs mt-2">
                                        Template: {TEMPLATES[mode].groups.length} groups will be created with categories.
                                    </p>
                                </div>

                                <Button
                                    className="w-full mt-4"
                                    onClick={handleCreate}
                                    disabled={loading}
                                >
                                    {loading ? "Creating..." : "Create Workspace"}
                                </Button>
                            </div>
                        )}

                        {/* Step 4: Complete */}
                        {step === 4 && (
                            <div className="text-center py-6">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-chart-2/20 mb-4">
                                    <Check className="h-8 w-8 text-chart-2" />
                                </div>
                                <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
