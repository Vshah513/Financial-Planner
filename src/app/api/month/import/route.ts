import { generateText, Output } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { aiAvailable, getAIModel } from "@/lib/ai";

export const maxDuration = 60;

const ImportSchema = z.object({
  entries: z
    .array(
      z.object({
        direction: z.enum(["income", "expense"]),
        description: z.string().min(1),
        amount: z.number().positive(),
        categoryId: z.string().describe("Category id from the provided list, or empty string if unclear"),
      })
    )
    .max(200),
});

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

  const body = (await req.json().catch(() => null)) as
    | { workspaceId?: string; periodId?: string; text?: string }
    | null;

  const workspaceId = body?.workspaceId?.trim() || "";
  const periodId = body?.periodId?.trim() || "";
  const text = body?.text || "";

  if (!workspaceId || !periodId || !text.trim()) {
    return new Response(JSON.stringify({ error: "Missing workspaceId, periodId, or text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!membership) return new Response("Forbidden", { status: 403 });

  const { data: period } = await supabase
    .from("periods")
    .select("id, workspace_id, year, month")
    .eq("id", periodId)
    .maybeSingle();
  if (!period || period.workspace_id !== workspaceId) {
    return new Response("Not Found", { status: 404 });
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("workspace_id", workspaceId)
    .in("type", ["income", "expense"]);

  const categoryList = (categories ?? [])
    .map((c) => `${c.id} | ${c.name} (${c.type})`)
    .join("\n");

  try {
    const { output } = await generateText({
      model: await getAIModel("smart"),
      output: Output.object({ schema: ImportSchema }),
      system:
        "You turn messy monthly financial notes into clean ledger entries. " +
        "Return only entries the user explicitly mentions. " +
        "Do not invent amounts. Use positive amounts. Choose the best matching categoryId from the provided list when possible.",
      prompt: `Target period: ${period.year}-${String(period.month).padStart(2, "0")}

Available categories (id | name (type)):
${categoryList || "(none)"}

User input:
${text}

Extract entries. If unsure of category, set categoryId to empty string.`,
    });

    const validCategoryIds = new Set((categories ?? []).map((c) => c.id));
    const defaultIncomeCat = (categories ?? []).find((c) => c.type === "income")?.id || "";
    const defaultExpenseCat = (categories ?? []).find((c) => c.type === "expense")?.id || "";

    const normalized = output.entries
      .map((e) => {
        const categoryOk = e.categoryId && validCategoryIds.has(e.categoryId);
        const fallback =
          e.direction === "income" ? defaultIncomeCat : defaultExpenseCat;
        return {
          direction: e.direction,
          description: e.description.trim(),
          amount: Number(e.amount),
          categoryId: categoryOk ? e.categoryId : fallback,
        };
      })
      .filter((e) => e.description && e.amount > 0 && e.categoryId);

    return new Response(JSON.stringify({ entries: normalized }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[/api/month/import] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "AI import failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

