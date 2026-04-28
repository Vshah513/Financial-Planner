"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAIModel, aiAvailable } from "@/lib/ai";

const ResultSchema = z.object({
    classifications: z.array(
        z.object({
            index: z.number().describe("Index of the transaction in the input array"),
            categoryId: z.string().describe("The chosen category id, or empty string if unclear"),
            confidence: z.number().min(0).max(1),
        })
    ),
});

export type CategorizeInput = {
    description: string;
    amount: number;
    direction: "inflow" | "outflow";
};

export async function aiCategorizeTransactions(
    workspaceId: string,
    transactions: CategorizeInput[]
): Promise<{
    available: boolean;
    classifications: { categoryId: string; confidence: number }[];
    error?: string;
}> {
    if (!aiAvailable()) {
        return {
            available: false,
            classifications: transactions.map(() => ({ categoryId: "", confidence: 0 })),
        };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { available: false, classifications: [], error: "Unauthorized" };

    const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
    if (!membership) return { available: false, classifications: [], error: "Forbidden" };

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("workspace_id", workspaceId);

    if (!categories?.length) {
        return { available: true, classifications: transactions.map(() => ({ categoryId: "", confidence: 0 })) };
    }

    const catList = categories.map((c) => `${c.id} | ${c.name} (${c.type})`).join("\n");
    const txnList = transactions
        .map((t, i) => `${i}: ${t.direction} $${Math.abs(t.amount).toFixed(2)} — ${t.description}`)
        .join("\n");

    try {
        const { output } = await generateText({
            model: await getAIModel("fast"),
            output: Output.object({ schema: ResultSchema }),
            system: `You categorize financial transactions. Choose the best matching category id from the list.
Use empty string only if no category fits. Confidence: 1.0 = certain, 0.5 = guess, 0.2 = unsure.`,
            prompt: `Available categories (id | name (type)):
${catList}

Transactions to classify:
${txnList}

Return one classification per transaction.`,
        });

        const map = new Map(output.classifications.map((c) => [c.index, c]));
        const result = transactions.map((_, i) => {
            const c = map.get(i);
            const valid = c && categories.find((cat) => cat.id === c.categoryId);
            return {
                categoryId: valid ? c!.categoryId : "",
                confidence: valid ? c!.confidence : 0,
            };
        });

        return { available: true, classifications: result };
    } catch (err) {
        return {
            available: false,
            classifications: transactions.map(() => ({ categoryId: "", confidence: 0 })),
            error: err instanceof Error ? err.message : "AI categorization failed",
        };
    }
}
