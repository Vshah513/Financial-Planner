"use client";

import { useEffect, useState } from "react";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { getCategoryRadarData } from "@/app/actions/analytics";

export function CategoryRadar({ workspaceId, year, currency }: { workspaceId: string; year: number; currency: string }) {
    const [data, setData] = useState<{ category: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getCategoryRadarData(workspaceId, year).then((d) => {
            if (!cancelled) {
                setData(d);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [workspaceId, year]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl glass-card p-5"
        >
            <h3 className="font-bold text-sm mb-1">Spending Footprint</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Top expense groups · {year}</p>
            {loading ? (
                <div className="h-72 rounded-2xl bg-foreground/5 animate-pulse" />
            ) : data.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                    No expense data yet
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={data}>
                        <PolarGrid stroke="oklch(1 0 0 / 12%)" />
                        <PolarAngleAxis
                            dataKey="category"
                            tick={{ fill: "oklch(0.65 0.03 260)", fontSize: 10 }}
                        />
                        <PolarRadiusAxis tick={false} axisLine={false} />
                        <Radar
                            name="Spend"
                            dataKey="value"
                            stroke="oklch(0.7 0.22 270)"
                            fill="oklch(0.7 0.22 270)"
                            fillOpacity={0.35}
                            strokeWidth={2}
                            animationDuration={900}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "oklch(0.17 0.035 265 / 95%)",
                                border: "1px solid oklch(1 0 0 / 12%)",
                                borderRadius: 12,
                                fontSize: 11,
                            }}
                            formatter={(v) =>
                                new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency,
                                    maximumFractionDigits: 0,
                                }).format(typeof v === "number" ? v : 0)
                            }
                        />
                    </RadarChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
}
