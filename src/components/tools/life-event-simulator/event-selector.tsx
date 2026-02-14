"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Home, Baby, Briefcase, Car, Sparkles } from "lucide-react";
import type { LifeEventType } from "@/lib/scenario-engine";

interface EventSelectorProps {
    onSelect: (eventType: LifeEventType) => void;
}

const EVENT_TYPES = [
    {
        type: "move-house" as LifeEventType,
        icon: Home,
        title: "Move House",
        description: "Model the impact of moving to a new home with different rent/mortgage",
        color: "blue",
    },
    {
        type: "have-baby" as LifeEventType,
        icon: Baby,
        title: "Have a Baby",
        description: "Project childcare costs, reduced income, and new expenses",
        color: "pink",
    },
    {
        type: "lose-job" as LifeEventType,
        icon: Briefcase,
        title: "Lose Job",
        description: "See how long your runway lasts with reduced or no income",
        color: "red",
    },
    {
        type: "buy-car" as LifeEventType,
        icon: Car,
        title: "Buy a Car",
        description: "Factor in down payment, monthly payments, and maintenance",
        color: "green",
    },
    {
        type: "custom" as LifeEventType,
        icon: Sparkles,
        title: "Custom Event",
        description: "Create your own scenario with custom income/expense changes",
        color: "purple",
    },
];

export function EventSelector({ onSelect }: EventSelectorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Select Life Event</CardTitle>
                <CardDescription>
                    Choose a major life event to simulate its financial impact
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {EVENT_TYPES.map((event) => {
                        const Icon = event.icon;
                        const colorClasses = {
                            blue: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20",
                            pink: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-pink-500/20",
                            red: "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20",
                            green: "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20",
                            purple: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20",
                        };

                        return (
                            <button
                                key={event.type}
                                onClick={() => onSelect(event.type)}
                                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${colorClasses[event.color as keyof typeof colorClasses]}
                `}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold mb-1">{event.title}</h3>
                                        <p className="text-sm opacity-80">{event.description}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
