"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type GradientShowcaseCard = {
    title: string;
    desc: string;
    gradientFrom: string;
    gradientTo: string;
    icon?: React.ReactNode;
};

type GradientCardShowcaseProps = {
    cards: GradientShowcaseCard[];
    className?: string;
};

export function GradientCardShowcase({ cards, className }: GradientCardShowcaseProps) {
    return (
        <div className={cn("flex flex-wrap justify-center gap-x-14 gap-y-12 py-4", className)}>
            {cards.map(({ title, desc, gradientFrom, gradientTo, icon }, idx) => (
                <div
                    key={`${title}-${idx}`}
                    className="group relative w-[320px] max-w-[92vw] transition-all duration-500"
                >
                    <div className="relative h-[360px]">
                        <span
                            className="absolute top-0 left-[50px] h-full w-1/2 rounded-2xl skew-x-[15deg] transition-all duration-500 group-hover:left-[20px] group-hover:w-[calc(100%-90px)] group-hover:skew-x-0"
                            style={{ background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})` }}
                        />
                        <span
                            className="absolute top-0 left-[50px] h-full w-1/2 rounded-2xl skew-x-[15deg] blur-[30px] transition-all duration-500 group-hover:left-[20px] group-hover:w-[calc(100%-90px)] group-hover:skew-x-0"
                            style={{ background: `linear-gradient(315deg, ${gradientFrom}, ${gradientTo})` }}
                            aria-hidden="true"
                        />

                        <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                            <span className="cc-blob absolute left-0 top-0 h-0 w-0 rounded-2xl bg-[rgba(255,255,255,0.08)] opacity-0 backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.12)] transition-all duration-100 group-hover:left-[50px] group-hover:top-[-50px] group-hover:h-[100px] group-hover:w-[100px] group-hover:opacity-100" />
                            <span className="cc-blob cc-blob-delay absolute bottom-0 right-0 h-0 w-0 rounded-2xl bg-[rgba(255,255,255,0.08)] opacity-0 backdrop-blur-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.12)] transition-all duration-500 group-hover:bottom-[-50px] group-hover:right-[50px] group-hover:h-[100px] group-hover:w-[100px] group-hover:opacity-100" />
                        </span>

                        <div className="relative z-20 h-full rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] p-6 text-white shadow-lg backdrop-blur-[10px] transition-all duration-500 group-hover:left-[-20px] group-hover:px-8 group-hover:py-10">
                            <div className="flex items-start gap-4">
                                {icon ? (
                                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                                        <div className="text-white/90">{icon}</div>
                                    </div>
                                ) : null}
                                <div className="min-w-0">
                                    <h3 className="text-xl font-bold leading-tight">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-white/70">{desc}</p>
                                </div>
                            </div>

                            <div className="mt-6 h-px w-full bg-gradient-to-r from-white/0 via-white/12 to-white/0" />

                            <div className="mt-5 text-xs text-white/60">
                                Hover for details
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

