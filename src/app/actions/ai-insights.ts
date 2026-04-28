"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAIModel, aiAvailable } from "@/lib/ai";

const InsightsSchema = z.object({
    insights: z
        .array(
            z.object({
                title: z.string().describe("Short, punchy headline (max 10 words)"),
                body: z
                    .string()
                    .describe("One concrete observation with a number, one sentence (max 28 words)"),
                tone: z
                    .enum(["positive", "warning", "neutral"])
                    .describe("positive = good news, warning = action needed, neutral = informational"),
                metric: z
                    .string()
                    .optional()
                    .describe("Optional headline metric to display, e.g. '+$1,240' or '23%'"),
            })
        )
        .min(3)
        .max(3),
});

export type AIInsight = z.infer<typeof InsightsSchema>["insights"][number];

export async function getAIInsights(workspaceId: string): Promise<{
    insights: AIInsight[];
    available: boolean;
    error?: string;
}> {
    if (!aiAvailable()) {
        return {
            available: false,
            insights: [
                { title: "AI not configured yet", body: "On Vercel: enable AI Gateway for this project. Or set GOOGLE_GENERATIVE_AI_API_KEY in Vercel env vars to unlock smart insights.", tone: "neutral" },
                { title: "Live data is ready", body: "Your real Supabase data flows in — once AI is enabled, it can generate insights from your ledger.", tone: "neutral" },
                { title: "Assistant import + chat", body: "Once AI is enabled, the month importer and chat assistant will work in production too.", tone: "neutral" },
            ],
        };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { available: false, insights: [], error: "Unauthorized" };

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
    if (!membership) return { available: false, insights: [], error: "Forbidden" };

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const { data: periods } = await supabase
        .from("periods")
        .select("id, month")
        .eq("workspace_id", workspaceId)
        .eq("year", year);

    const { data: entries } = await supabase
        .from("ledger_entries")
        .select("amount, direction, period_id, categories(name)")
        .in("period_id", (periods ?? []).map((p) => p.id));

    const byMonth: Record<number, { income: number; expense: number }> = {};
    const byCategory: Record<string, number> = {};
    for (const p of periods ?? []) byMonth[p.month] = { income: 0, expense: 0 };
    for (const e of (entries ?? []) as unknown as Array<{ amount: number; direction: string; period_id: string; categories: { name: string } | { name: string }[] | null }>) {
        const m = (periods ?? []).find((p) => p.id === e.period_id)?.month;
        if (m && e.direction === "income") byMonth[m].income += Number(e.amount);
        if (m && e.direction === "expense") byMonth[m].expense += Number(e.amount);
        if (e.direction === "expense") {
            const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
            const cname = cat?.name ?? "Uncategorized";
            byCategory[cname] = (byCategory[cname] ?? 0) + Number(e.amount);
        }
    }

    const topCats = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const summary = {
        year,
        currentMonth: month,
        monthlyTotals: byMonth,
        topExpenseCategories: topCats,
    };

    try {
        const { output } = await generateText({
            model: await getAIModel("smart"),
            output: Output.object({ schema: InsightsSchema }),
            system:
                "You are a sharp financial advisor. Generate exactly 3 insights from the data. Be specific with numbers. Mix one positive, one warning if applicable, and one informational.",
            prompt: `Workspace data for ${year}:\n${JSON.stringify(summary, null, 2)}\n\nReturn 3 short, useful insights.`,
        });
        return { available: true, insights: output.insights };
    } catch (err) {
        return {
            available: false,
            insights: [],
            error: err instanceof Error ? err.message : "AI request failed",
        };
    }
}
