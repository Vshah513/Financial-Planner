"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateNetCashFlow } from "@/lib/calculations";
import { redirect } from "next/navigation";

/**
 * Get baseline data for the Savings Rate Optimizer
 * Calculates average income/expenses from actuals or planner
 */
export async function getOptimizerBaselines(workspaceId: string) {
    const supabase = await createClient();

    // Get all transactions to find the date range and calculate averages
    const { data: transactions } = await supabase
        .from("transactions")
        .select(`
      date,
      amount,
      type,
      category_id,
      categories(name, type)
    `)
        .eq("workspace_id", workspaceId)
        .order("date", { ascending: false });

    let actualsBaseline = null;

    if (transactions && transactions.length > 0) {
        // Find date range
        const dates = transactions.map((t) => new Date(t.date));
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        const monthsCovered = Math.max(1, (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1);

        const totalIncome = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalExpenses = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // Build expense breakdown by category
        const expenseBreakdown: Record<string, number> = {};
        transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const categoryName = (t.categories as any)?.name || "Uncategorized";
                expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + (Number(t.amount) / monthsCovered);
            });

        // Format period window
        let periodWindow = "";
        if (monthsCovered === 1) {
            periodWindow = minDate.toLocaleString("default", { month: "long", year: "numeric" });
        } else {
            periodWindow = `${minDate.toLocaleString("default", { month: "short", year: "numeric" })} - ${maxDate.toLocaleString("default", { month: "short", year: "numeric" })}`;
        }

        actualsBaseline = {
            source: "actuals" as const,
            monthlyIncome: totalIncome / monthsCovered,
            monthlyExpenses: totalExpenses / monthsCovered,
            periodWindow,
            expenseBreakdown,
            monthsCovered,
        };
    }

    // Get planner baselines - sort periods by newest first to find the most recent populated one
    const { data: periods } = await supabase
        .from("periods")
        .select("id, year, month")
        .eq("workspace_id", workspaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

    let plannerBaseline = null;

    if (periods && periods.length > 0) {
        // Find the most recent period that actually has ledger entries
        for (const p of periods) {
            const { data: entries } = await supabase
                .from("ledger_entries")
                .select(`
            amount,
            direction,
            category_id,
            categories(name, type)
          `)
                .eq("period_id", p.id);

            if (entries && entries.length > 0) {
                const totalIncome = entries
                    .filter((e) => e.direction === "income")
                    .reduce((sum, e) => sum + Number(e.amount), 0);

                const totalExpenses = entries
                    .filter((e) => e.direction === "expense")
                    .reduce((sum, e) => sum + Number(e.amount), 0);

                // Build expense breakdown by category
                const expenseBreakdown: Record<string, number> = {};
                entries
                    .filter((e) => e.direction === "expense")
                    .forEach((e) => {
                        const categoryName = (e.categories as any)?.name || "Uncategorized";
                        expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + Number(e.amount);
                    });

                const periodDate = new Date(p.year, p.month - 1);
                const periodWindow = periodDate.toLocaleString("default", { month: "long", year: "numeric" });

                plannerBaseline = {
                    source: "planner" as const,
                    monthlyIncome: totalIncome,
                    monthlyExpenses: totalExpenses,
                    periodWindow,
                    expenseBreakdown,
                    monthsCovered: 1,
                };
                break; // Found the latest populated period, stop looking
            }
        }
    }

    return {
        actualsBaseline,
        plannerBaseline,
    };
}

/**
 * Get all categories with their essential/nonessential flags
 */
export async function getCategoryFlags(workspaceId: string) {
    const supabase = await createClient();

    const { data: categories } = await supabase
        .from("categories")
        .select(`
      id,
      name,
      type,
      category_flags(is_essential)
    `)
        .eq("workspace_id", workspaceId)
        .eq("type", "expense")
        .order("name");

    return (
        categories?.map((cat) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            isEssential: (cat.category_flags as any)?.[0]?.is_essential ?? true, // Default to essential
        })) || []
    );
}

/**
 * Update category essential/nonessential flag
 */
export async function updateCategoryFlag(categoryId: string, isEssential: boolean) {
    const supabase = await createClient();

    // Upsert the flag
    const { error } = await supabase
        .from("category_flags")
        .upsert(
            {
                category_id: categoryId,
                is_essential: isEssential,
            },
            {
                onConflict: "category_id",
            }
        );

    if (error) {
        throw new Error(`Failed to update category flag: ${error.message}`);
    }

    return { success: true };
}

/**
 * Calculate savings rate optimization
 */
export async function calculateSavingsOptimization(
    workspaceId: string,
    targetAmount: number,
    deadline: Date,
    baselineSource: "actuals" | "planner",
    baselineIncome: number,
    baselineExpenses: number,
    expenseBreakdown: Record<string, number>
) {
    const supabase = await createClient();

    // Calculate required monthly savings
    const now = new Date();
    const monthsToDeadline = Math.max(
        1,
        (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth())
    );

    const requiredMonthly = targetAmount / monthsToDeadline;
    const currentNetCashFlow = calculateNetCashFlow(baselineIncome, baselineExpenses);
    const currentSavings = Math.max(0, currentNetCashFlow);
    const gap = requiredMonthly - currentSavings;

    // If already on track, return early
    if (gap <= 0) {
        return {
            requiredMonthly,
            currentSavings,
            gap: 0,
            recommendations: [],
            onTrack: true,
        };
    }

    // Get category flags to identify nonessential categories
    const categories = await getCategoryFlags(workspaceId);
    const nonessentialCategories = categories.filter((c) => !c.isEssential);

    // Build recommendations: sort nonessential categories by spend amount (descending)
    const recommendations = nonessentialCategories
        .map((cat) => ({
            categoryId: cat.id,
            categoryName: cat.name,
            currentSpend: expenseBreakdown[cat.name] || 0,
        }))
        .filter((rec) => rec.currentSpend > 0)
        .sort((a, b) => b.currentSpend - a.currentSpend);

    // Allocate cuts to fill the gap
    let remainingGap = gap;
    const cutRecommendations = [];

    for (const rec of recommendations) {
        if (remainingGap <= 0) break;

        const suggestedCut = Math.min(rec.currentSpend, remainingGap);
        cutRecommendations.push({
            categoryId: rec.categoryId,
            categoryName: rec.categoryName,
            currentSpend: rec.currentSpend,
            suggestedCut,
            rank: cutRecommendations.length + 1,
        });

        remainingGap -= suggestedCut;
    }

    return {
        requiredMonthly,
        currentSavings,
        gap,
        recommendations: cutRecommendations,
        onTrack: false,
        canAchieve: remainingGap <= 0, // Can we fill the gap with available cuts?
    };
}

/**
 * Save an optimizer run to the database
 */
export async function saveOptimizerRun(
    workspaceId: string,
    targetAmount: number,
    deadline: Date,
    baselineSource: "actuals" | "planner",
    requiredMonthly: number,
    currentSavings: number,
    gap: number,
    recommendations: Array<{
        categoryId: string;
        suggestedCut: number;
        rank: number;
    }>
) {
    const supabase = await createClient();

    // Insert optimizer run
    const { data: run, error: runError } = await supabase
        .from("optimizer_runs")
        .insert({
            workspace_id: workspaceId,
            target_amount: targetAmount,
            deadline: deadline.toISOString().split("T")[0],
            baseline_source: baselineSource,
            required_monthly: requiredMonthly,
            current_savings: currentSavings,
            gap,
        })
        .select()
        .single();

    if (runError || !run) {
        throw new Error(`Failed to save optimizer run: ${runError?.message}`);
    }

    // Insert recommendations
    if (recommendations.length > 0) {
        const { error: recsError } = await supabase.from("optimizer_recommendations").insert(
            recommendations.map((rec) => ({
                run_id: run.id,
                category_id: rec.categoryId,
                suggested_cut_amount: rec.suggestedCut,
                rank: rec.rank,
            }))
        );

        if (recsError) {
            throw new Error(`Failed to save recommendations: ${recsError.message}`);
        }
    }

    return { runId: run.id };
}

/**
 * Get optimizer run history
 */
export async function getOptimizerHistory(workspaceId: string, limit = 10) {
    const supabase = await createClient();

    const { data: runs } = await supabase
        .from("optimizer_runs")
        .select(`
      id,
      target_amount,
      deadline,
      baseline_source,
      required_monthly,
      current_savings,
      gap,
      created_at,
      optimizer_recommendations(
        category_id,
        suggested_cut_amount,
        rank,
        categories(name)
      )
    `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return runs || [];
}
