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
import { DollarSign, ArrowRight, Check, Building2, Calendar, Coins } from "lucide-react";

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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleCreate = async () => {
        setLoading(true);
        setError("");
        try {
            const currentYear = new Date().getFullYear();
            await createWorkspace(name, currency, parseInt(fiscalStart), currentYear);
            setStep(3);
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
            description: "What's your business called?",
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
                        {step === 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Business Name</Label>
                                <Input
                                    id="name"
                                    placeholder="My Solo Business"
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

                        {step === 1 && (
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
                                <Button className="w-full mt-4" onClick={() => setStep(2)}>
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
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
                                    <p className="text-muted-foreground">Currency: <span className="text-foreground">{currency}</span></p>
                                    <p className="text-muted-foreground">Fiscal Start: <span className="text-foreground">{MONTHS[parseInt(fiscalStart) - 1]}</span></p>
                                    <p className="text-muted-foreground text-xs mt-2">
                                        Seed categories: Revenue, Software, Staff, Merchant Fees, Other Expenses
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

                        {step === 3 && (
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
