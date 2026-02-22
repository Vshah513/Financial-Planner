"use server";

import { createClient } from "@/lib/supabase/server";
import {
    projectScenario,
    generateScenarioVariants,
    type ScenarioConfig,
    type ScenarioResult,
    type LifeEventType,
} from "@/lib/scenario-engine";

/**
 * Get baseline data for Life Event Simulator
 * Same as optimizer but returns full breakdown
 */
export async function getSimulatorBaselines(workspaceId: string) {
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
        console.log("ACTUALS BASELINE CALCULATED:", actualsBaseline);
    } else {
        console.log("NO TRANSACTIONS FOUND OR ARRAY EMPTY:", transactions);
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
                console.log("PLANNER BASELINE CALCULATED:", plannerBaseline);
                break; // Found the latest populated period, stop looking
            }
        }
    } else {
        console.log("NO PERIOD FOUND FOR WORKSPACE:", workspaceId);
    }

    return {
        actualsBaseline,
        plannerBaseline,
    };
}

/**
 * Run a scenario simulation
 */
export async function runScenarioSimulation(
    workspaceId: string,
    eventType: LifeEventType,
    baselineIncome: number,
    baselineExpenses: number,
    startingCash: number,
    monthsToProject: number,
    customDeltas?: {
        incomeDeltaPct?: number;
        expenseDeltaPct?: number;
        oneTimeCosts?: number;
        debtPayment?: number;
    }
) {
    const baseConfig: ScenarioConfig = {
        startingCash,
        monthlyIncome: baselineIncome,
        monthlyExpenses: baselineExpenses,
        monthsToProject,
        incomeDeltaPct: 0,
        expenseDeltaPct: 0,
        oneTimeCosts: 0,
    };

    // Generate all three variants
    const variants = generateScenarioVariants(baseConfig, eventType, customDeltas);

    // Project each variant
    const results = {
        conservative: projectScenario({
            ...baseConfig,
            ...variants.conservative,
        }),
        base: projectScenario({
            ...baseConfig,
            ...variants.base,
        }),
        aggressive: projectScenario({
            ...baseConfig,
            ...variants.aggressive,
        }),
    };

    return {
        eventType,
        variants,
        results,
    };
}

/**
 * Save a scenario to the database
 */
export async function saveScenario(
    workspaceId: string,
    name: string,
    eventType: LifeEventType,
    baselineSource: "actuals" | "planner",
    startingCash: number,
    monthsToProject: number,
    selectedVariant: "conservative" | "base" | "aggressive",
    assumptions: Record<string, any>,
    result: ScenarioResult
) {
    const supabase = await createClient();

    // Insert scenario
    const { data: scenario, error: scenarioError } = await supabase
        .from("scenarios")
        .insert({
            workspace_id: workspaceId,
            name,
            event_type: eventType,
            baseline_source: baselineSource,
            starting_cash: startingCash,
            months_projected: monthsToProject,
            selected_variant: selectedVariant,
        })
        .select()
        .single();

    if (scenarioError || !scenario) {
        throw new Error(`Failed to save scenario: ${scenarioError?.message}`);
    }

    // Insert assumptions
    const assumptionEntries = Object.entries(assumptions).map(([key, value]) => ({
        scenario_id: scenario.id,
        assumption_key: key,
        assumption_value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));

    if (assumptionEntries.length > 0) {
        const { error: assumptionsError } = await supabase
            .from("scenario_assumptions")
            .insert(assumptionEntries);

        if (assumptionsError) {
            throw new Error(`Failed to save assumptions: ${assumptionsError.message}`);
        }
    }

    // Insert results
    const { error: resultsError } = await supabase.from("scenario_results").insert({
        scenario_id: scenario.id,
        final_cash: result.finalCash,
        runway_months: result.runwayMonths,
        worst_month_cash: result.worstMonthCash,
        break_even_month: result.breakEvenMonth,
        monthly_projections: result.monthlyProjections,
    });

    if (resultsError) {
        throw new Error(`Failed to save results: ${resultsError.message}`);
    }

    return { scenarioId: scenario.id };
}

/**
 * Get saved scenarios
 */
export async function getSavedScenarios(workspaceId: string, limit = 10) {
    const supabase = await createClient();

    const { data: scenarios } = await supabase
        .from("scenarios")
        .select(`
      id,
      name,
      event_type,
      baseline_source,
      starting_cash,
      months_projected,
      selected_variant,
      created_at,
      scenario_results(
        final_cash,
        runway_months,
        worst_month_cash,
        break_even_month
      )
    `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return scenarios || [];
}

/**
 * Get a single scenario with full details
 */
export async function getScenarioDetails(scenarioId: string) {
    const supabase = await createClient();

    const { data: scenario } = await supabase
        .from("scenarios")
        .select(`
      *,
      scenario_assumptions(*),
      scenario_results(*)
    `)
        .eq("id", scenarioId)
        .single();

    return scenario;
}
