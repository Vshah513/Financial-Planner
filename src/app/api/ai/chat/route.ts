import { streamText, tool, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAIModel, aiAvailable } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    if (!aiAvailable()) {
        return new Response(
            JSON.stringify({
                error:
                    "AI is not configured. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local (https://aistudio.google.com/app/apikey) and restart the dev server.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
        );
    }

    const { messages, workspaceId }: { messages: UIMessage[]; workspaceId: string } =
        await req.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
    if (!membership) return new Response("Forbidden", { status: 403 });

    try {
        const result = streamText({
            model: await getAIModel("smart"),
            system: `You are Cash Clarity's AI financial advisor. You have access to the user's real workspace data via tools.
Always call the appropriate tool before answering questions about specific numbers — never guess.
Format dollar amounts with the user's currency. Keep replies short and direct (under 120 words unless asked for detail).
Today's date: ${new Date().toISOString().split("T")[0]}.`,
            messages: await convertToModelMessages(messages),
            tools: {
                getCashflowSummary: tool({
                    description: "Get year cash flow summary: total income, expenses, net by month for a given year.",
                    inputSchema: z.object({
                        year: z.number().describe("4-digit year, e.g. 2026"),
                    }),
                    execute: async ({ year }) => {
                        const { data: periods } = await supabase
                            .from("periods")
                            .select("id, month")
                            .eq("workspace_id", workspaceId)
                            .eq("year", year);
                        if (!periods?.length) return { months: [], totalIncome: 0, totalExpense: 0 };
                        const periodIds = periods.map((p) => p.id);
                        const { data: entries } = await supabase
                            .from("ledger_entries")
                            .select("period_id, direction, amount")
                            .in("period_id", periodIds);
                        const byMonth: Record<number, { income: number; expense: number }> = {};
                        let totalIncome = 0, totalExpense = 0;
                        for (const p of periods) byMonth[p.month] = { income: 0, expense: 0 };
                        for (const e of entries ?? []) {
                            const period = periods.find((p) => p.id === e.period_id);
                            if (!period) continue;
                            if (e.direction === "income") {
                                byMonth[period.month].income += Number(e.amount);
                                totalIncome += Number(e.amount);
                            } else {
                                byMonth[period.month].expense += Number(e.amount);
                                totalExpense += Number(e.amount);
                            }
                        }
                        return {
                            months: Object.entries(byMonth).map(([m, v]) => ({ month: Number(m), ...v, net: v.income - v.expense })),
                            totalIncome,
                            totalExpense,
                            net: totalIncome - totalExpense,
                        };
                    },
                }),
                getTopCategories: tool({
                    description: "Get top spending or income categories within a date range.",
                    inputSchema: z.object({
                        direction: z.enum(["income", "expense"]),
                        year: z.number(),
                        month: z.number().optional(),
                        limit: z.number().default(5),
                    }),
                    execute: async ({ direction, year, month, limit }) => {
                        let q = supabase
                            .from("periods")
                            .select("id")
                            .eq("workspace_id", workspaceId)
                            .eq("year", year);
                        if (month) q = q.eq("month", month);
                        const { data: periods } = await q;
                        if (!periods?.length) return { categories: [] };

                        const { data: entries } = await supabase
                            .from("ledger_entries")
                            .select("amount, category_id, categories(name)")
                            .in("period_id", periods.map((p) => p.id))
                            .eq("direction", direction);

                        const totals: Record<string, { name: string; total: number }> = {};
                        for (const e of (entries ?? []) as unknown as Array<{ amount: number; category_id: string; categories: { name: string } | { name: string }[] | null }>) {
                            const key = e.category_id;
                            const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
                            const name = cat?.name ?? "Uncategorized";
                            if (!totals[key]) totals[key] = { name, total: 0 };
                            totals[key].total += Number(e.amount);
                        }
                        return {
                            categories: Object.values(totals)
                                .sort((a, b) => b.total - a.total)
                                .slice(0, limit),
                        };
                    },
                }),
                getRecentTransactions: tool({
                    description: "List recent transactions, optionally filtered by description keyword.",
                    inputSchema: z.object({
                        keyword: z.string().optional(),
                        limit: z.number().default(10),
                    }),
                    execute: async ({ keyword, limit }) => {
                        let q = supabase
                            .from("transactions")
                            .select("date, description, amount, direction")
                            .eq("workspace_id", workspaceId)
                            .order("date", { ascending: false })
                            .limit(limit);
                        if (keyword) q = q.ilike("description", `%${keyword}%`);
                        const { data } = await q;
                        return { transactions: data ?? [] };
                    },
                }),
                getBudgetStatus: tool({
                    description: "Compare budget vs actual spend for a given month.",
                    inputSchema: z.object({
                        year: z.number(),
                        month: z.number(),
                    }),
                    execute: async ({ year, month }) => {
                        const { data: period } = await supabase
                            .from("periods")
                            .select("id")
                            .eq("workspace_id", workspaceId)
                            .eq("year", year)
                            .eq("month", month)
                            .maybeSingle();
                        if (!period) return { budgets: [] };

                        const { data: budgets } = await supabase
                            .from("budgets")
                            .select("amount, category_id, categories(name)")
                            .eq("period_id", period.id);

                        const { data: actuals } = await supabase
                            .from("ledger_entries")
                            .select("amount, category_id")
                            .eq("period_id", period.id)
                            .eq("direction", "expense");

                        const actualByCat: Record<string, number> = {};
                        for (const a of actuals ?? []) {
                            actualByCat[a.category_id] = (actualByCat[a.category_id] ?? 0) + Number(a.amount);
                        }
                        return {
                            budgets: ((budgets ?? []) as unknown as Array<{ amount: number; category_id: string; categories: { name: string } | { name: string }[] | null }>).map((b) => {
                                const cat = Array.isArray(b.categories) ? b.categories[0] : b.categories;
                                return {
                                    category: cat?.name ?? "Unknown",
                                    budgeted: Number(b.amount),
                                    actual: actualByCat[b.category_id] ?? 0,
                                    diff: Number(b.amount) - (actualByCat[b.category_id] ?? 0),
                                };
                            }),
                        };
                    },
                }),
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (err) {
        console.error("[/api/ai/chat] error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "AI request failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
