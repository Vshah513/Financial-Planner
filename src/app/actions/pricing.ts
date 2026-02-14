"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Calculate pricing and margins for a product
 */
export async function calculatePricing(
    fixedCosts: number,
    variableCostPerUnit: number,
    desiredMarginPct: number,
    expectedVolume: number
) {
    // Calculate cost per unit (fixed costs allocated across volume)
    const fixedCostPerUnit = expectedVolume > 0 ? fixedCosts / expectedVolume : 0;
    const totalCostPerUnit = fixedCostPerUnit + variableCostPerUnit;

    // Calculate price based on desired margin
    // Margin % = (Price - Cost) / Price
    // Solving for Price: Price = Cost / (1 - Margin%)
    const marginDecimal = desiredMarginPct / 100;
    const recommendedPrice = totalCostPerUnit / (1 - marginDecimal);

    // Calculate break-even volume (where revenue = total costs)
    // Break-even: Fixed Costs / (Price - Variable Cost)
    const contributionMargin = recommendedPrice - variableCostPerUnit;
    const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : null;

    // Calculate metrics at expected volume
    const revenue = recommendedPrice * expectedVolume;
    const totalCosts = fixedCosts + variableCostPerUnit * expectedVolume;
    const profit = revenue - totalCosts;
    const actualMarginPct = recommendedPrice > 0 ? ((profit / revenue) * 100) : 0;

    return {
        recommendedPrice,
        totalCostPerUnit,
        fixedCostPerUnit,
        variableCostPerUnit,
        contributionMargin,
        breakEvenUnits,
        expectedVolume,
        revenue,
        totalCosts,
        profit,
        actualMarginPct,
    };
}

/**
 * Run sensitivity analysis on pricing
 */
export async function runSensitivityAnalysis(
    baseCalculation: {
        fixedCosts: number;
        variableCostPerUnit: number;
        recommendedPrice: number;
    },
    volumeRange: { min: number; max: number; step: number }
) {
    const scenarios = [];

    for (
        let volume = volumeRange.min;
        volume <= volumeRange.max;
        volume += volumeRange.step
    ) {
        const revenue = baseCalculation.recommendedPrice * volume;
        const totalCosts =
            baseCalculation.fixedCosts + baseCalculation.variableCostPerUnit * volume;
        const profit = revenue - totalCosts;
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

        scenarios.push({
            volume,
            revenue,
            totalCosts,
            profit,
            marginPct,
        });
    }

    return scenarios;
}

/**
 * Calculate competitive pricing scenarios
 */
export async function calculateCompetitiveScenarios(
    fixedCosts: number,
    variableCostPerUnit: number,
    expectedVolume: number,
    competitorPrices: number[]
) {
    const scenarios = competitorPrices.map((price) => {
        const revenue = price * expectedVolume;
        const totalCosts = fixedCosts + variableCostPerUnit * expectedVolume;
        const profit = revenue - totalCosts;
        const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
        const contributionMargin = price - variableCostPerUnit;
        const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : null;

        return {
            price,
            revenue,
            totalCosts,
            profit,
            marginPct,
            contributionMargin,
            breakEvenUnits,
        };
    });

    return scenarios;
}

/**
 * Save a pricing model
 */
export async function savePricingModel(
    workspaceId: string,
    name: string,
    productName: string,
    calculation: {
        fixedCosts: number;
        variableCostPerUnit: number;
        desiredMarginPct: number;
        expectedVolume: number;
        recommendedPrice: number;
        breakEvenUnits: number | null;
        profit: number;
        actualMarginPct: number;
    }
) {
    const supabase = await createClient();

    const { data: model, error } = await supabase
        .from("pricing_models")
        .insert({
            workspace_id: workspaceId,
            name,
            product_name: productName,
            fixed_costs: calculation.fixedCosts,
            variable_cost_per_unit: calculation.variableCostPerUnit,
            desired_margin_pct: calculation.desiredMarginPct,
            expected_volume: calculation.expectedVolume,
            recommended_price: calculation.recommendedPrice,
            break_even_units: calculation.breakEvenUnits,
            projected_profit: calculation.profit,
            actual_margin_pct: calculation.actualMarginPct,
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save pricing model: ${error.message}`);
    }

    return model;
}

/**
 * Get saved pricing models
 */
export async function getPricingModels(workspaceId: string, limit = 10) {
    const supabase = await createClient();

    const { data: models } = await supabase
        .from("pricing_models")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);

    return models || [];
}

/**
 * Get a single pricing model
 */
export async function getPricingModel(modelId: string) {
    const supabase = await createClient();

    const { data: model } = await supabase
        .from("pricing_models")
        .select("*")
        .eq("id", modelId)
        .single();

    return model;
}

/**
 * Delete a pricing model
 */
export async function deletePricingModel(modelId: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("pricing_models").delete().eq("id", modelId);

    if (error) {
        throw new Error(`Failed to delete pricing model: ${error.message}`);
    }

    return { success: true };
}
