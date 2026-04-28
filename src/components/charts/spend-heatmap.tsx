"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getDailySpendHeatmap } from "@/app/actions/analytics";

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function dateKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function SpendHeatmap({ workspaceId, year, currency }: { workspaceId: string; year: number; currency: string }) {
    const [data, setData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getDailySpendHeatmap(workspaceId, year).then((rows) => {
            if (cancelled) return;
            const map: Record<string, number> = {};
            for (const r of rows) map[r.date] = r.value;
            setData(map);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [workspaceId, year]);

    const { weeks, max } = useMemo(() => {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        const startDow = (start.getDay() + 6) % 7;
        const cells: { date: string; value: number }[] = [];

        for (let i = 0; i < startDow; i++) cells.push({ date: "", value: -1 });
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const k = dateKey(d);
            cells.push({ date: k, value: data[k] ?? 0 });
        }

        const weeksArr: { date: string; value: number }[][] = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeksArr.push(cells.slice(i, i + 7));
        }

        let mx = 0;
        for (const c of cells) if (c.value > mx) mx = c.value;
        return { weeks: weeksArr, max: mx || 1 };
    }, [data, year]);

    const colorFor = (v: number) => {
        if (v <= 0) return "oklch(0.22 0.035 265 / 50%)";
        const t = Math.min(1, v / max);
        const lightness = 0.45 + t * 0.25;
        return `oklch(${lightness} 0.22 270 / ${0.4 + t * 0.6})`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl glass-card p-5 overflow-hidden"
        >
            <h3 className="font-bold text-sm mb-1">Daily Spend Heatmap</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Each square is one day · {year}</p>
            {loading ? (
                <div className="h-32 rounded-2xl bg-foreground/5 animate-pulse" />
            ) : (
                <div className="overflow-x-auto thin-scrollbar pb-2">
                    <div className="flex gap-3">
                        <div className="flex flex-col gap-[3px] mt-[14px] text-[9px] text-muted-foreground shrink-0">
                            {DAY_LABELS.map((d, i) => (
                                <div key={i} className="h-[10px] flex items-center">{d}</div>
                            ))}
                        </div>
                        <div className="flex gap-[3px]">
                            {weeks.map((week, wi) => (
                                <div key={wi} className="flex flex-col gap-[3px]">
                                    {Array.from({ length: 7 }).map((_, di) => {
                                        const cell = week[di];
                                        if (!cell || cell.value === -1) {
                                            return <div key={di} className="h-[10px] w-[10px]" />;
                                        }
                                        return (
                                            <motion.div
                                                key={di}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.3, delay: (wi * 7 + di) * 0.001 }}
                                                title={
                                                    cell.value > 0
                                                        ? `${cell.date}: ${new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cell.value)}`
                                                        : `${cell.date}: no spend`
                                                }
                                                className="h-[10px] w-[10px] rounded-[2px] cursor-pointer hover:ring-1 hover:ring-primary"
                                                style={{ background: colorFor(cell.value) }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 text-[9px] text-muted-foreground">
                        <span>Less</span>
                        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                            <span key={t} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: colorFor(t * max) }} />
                        ))}
                        <span>More</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
