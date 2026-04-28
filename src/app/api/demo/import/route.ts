import { generateText, Output } from "ai";
import { z } from "zod";
import { aiAvailable, getAIModel } from "@/lib/ai";

export const maxDuration = 60;

const DemoImportSchema = z.object({
  entries: z
    .array(
      z.object({
        direction: z.enum(["income", "expense"]),
        description: z.string().min(1),
        amount: z.number().positive(),
        category: z.enum([
          "Salary",
          "Subscriptions",
          "Rent",
          "Groceries",
          "Transportation",
          "Dining",
          "Utilities",
          "Other",
        ]),
      })
    )
    .max(50),
});

function heuristicParse(text: string) {
  const lines = text
    .split(/\r?\n|,/g)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: Array<z.infer<typeof DemoImportSchema>["entries"][number]> = [];
  for (const line of lines) {
    const amtMatch = line.match(/(-?\$?\s*\d[\d,]*\.?\d*)/);
    if (!amtMatch) continue;
    const raw = amtMatch[1].replace(/[^\d.-]/g, "");
    const amount = Math.abs(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const description = line.replace(amtMatch[1], "").trim().replace(/^[-–—:]+/, "").trim() || line;

    const lc = line.toLowerCase();
    const direction: "income" | "expense" =
      /(paycheck|salary|income|deposit|client|invoice|bonus)/.test(lc) ? "income" : "expense";

    let category: z.infer<typeof DemoImportSchema>["entries"][number]["category"] = "Other";
    if (/(cursor|netflix|spotify|subscription|saas|software)/.test(lc)) category = "Subscriptions";
    else if (/(rent|lease|mortgage)/.test(lc)) category = "Rent";
    else if (/(grocery|trader joe|whole foods|kroger|aldi|costco)/.test(lc)) category = "Groceries";
    else if (/(uber|lyft|gas|fuel|metro|train|bus|parking)/.test(lc)) category = "Transportation";
    else if (/(dining|restaurant|cafe|coffee|doordash|ubereats)/.test(lc)) category = "Dining";
    else if (/(electric|water|internet|utility|phone)/.test(lc)) category = "Utilities";
    else if (direction === "income") category = "Salary";

    out.push({ direction, description, amount, category });
  }
  return out.slice(0, 50);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text ?? "";
  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Missing text" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Demo route: works without auth; uses AI when configured, otherwise heuristics.
  if (!aiAvailable()) {
    return new Response(JSON.stringify({ entries: heuristicParse(text), mode: "heuristic" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { output } = await generateText({
      model: await getAIModel("fast"),
      output: Output.object({ schema: DemoImportSchema }),
      system:
        "You convert a messy list of personal finance items into structured entries. " +
        "Do not invent entries or amounts. Use positive amounts. Choose the closest category.",
      prompt: `User input:\n${text}\n\nExtract entries.`,
    });

    return new Response(JSON.stringify({ entries: output.entries, mode: "ai" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Fallback so the demo always works.
    return new Response(JSON.stringify({ entries: heuristicParse(text), mode: "heuristic" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

