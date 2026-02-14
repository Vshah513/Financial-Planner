"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get or create tax profile for workspace
 */
export async function getTaxProfile(workspaceId: string) {
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from("tax_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .single();

    if (profile) {
        return profile;
    }

    // Create default profile
    const { data: newProfile, error } = await supabase
        .from("tax_profiles")
        .insert({
            workspace_id: workspaceId,
            calculation_mode: "revenue",
            tax_rate: 25.0,
            filing_frequency: "quarterly",
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create tax profile: ${error.message}`);
    }

    return newProfile;
}

/**
 * Update tax profile settings
 */
export async function updateTaxProfile(
    workspaceId: string,
    settings: {
        calculation_mode?: "revenue" | "profit";
        tax_rate?: number;
        filing_frequency?: "monthly" | "quarterly" | "annual";
    }
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("tax_profiles")
        .update(settings)
        .eq("workspace_id", workspaceId);

    if (error) {
        throw new Error(`Failed to update tax profile: ${error.message}`);
    }

    return { success: true };
}

/**
 * Calculate tax reserve for a period
 */
export async function calculateTaxReserve(
    workspaceId: string,
    year: number,
    month: number,
    profile?: any
) {
    const supabase = await createClient();

    // Get tax profile
    const taxProfile = profile || (await getTaxProfile(workspaceId));

    // Get transactions for the month
    const monthStart = `${year}-${month.toString().padStart(2, "0")}-01`;
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

    const { data: transactions } = await supabase
        .from("transactions")
        .select(`
      amount,
      type,
      category_id,
      categories(name, type, is_deductible)
    `)
        .eq("workspace_id", workspaceId)
        .gte("date", monthStart)
        .lte("date", monthEnd);

    if (!transactions || transactions.length === 0) {
        return {
            revenue: 0,
            deductibleExpenses: 0,
            profit: 0,
            taxableAmount: 0,
            recommendedReserve: 0,
            effectiveRate: taxProfile.tax_rate,
        };
    }

    // Calculate revenue
    const revenue = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate deductible expenses
    const deductibleExpenses = transactions
        .filter((t) => t.type === "expense" && (t.categories as any)?.is_deductible === true)
        .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate profit
    const profit = revenue - deductibleExpenses;

    // Determine taxable amount based on calculation mode
    const taxableAmount =
        taxProfile.calculation_mode === "revenue" ? revenue : Math.max(0, profit);

    // Calculate recommended reserve
    const recommendedReserve = (taxableAmount * taxProfile.tax_rate) / 100;

    return {
        revenue,
        deductibleExpenses,
        profit,
        taxableAmount,
        recommendedReserve,
        effectiveRate: taxProfile.tax_rate,
        calculationMode: taxProfile.calculation_mode,
    };
}

/**
 * Save tax reserve entry
 */
export async function saveTaxReserve(
    workspaceId: string,
    year: number,
    month: number,
    calculation: {
        revenue: number;
        deductibleExpenses: number;
        profit: number;
        taxableAmount: number;
        recommendedReserve: number;
        effectiveRate: number;
    },
    actualReserved?: number
) {
    const supabase = await createClient();

    const { error } = await supabase.from("tax_reserves").upsert(
        {
            workspace_id: workspaceId,
            year,
            month,
            revenue: calculation.revenue,
            deductible_expenses: calculation.deductibleExpenses,
            profit: calculation.profit,
            taxable_amount: calculation.taxableAmount,
            recommended_reserve: calculation.recommendedReserve,
            actual_reserved: actualReserved || calculation.recommendedReserve,
            effective_rate: calculation.effectiveRate,
        },
        { onConflict: "workspace_id,year,month" }
    );

    if (error) {
        throw new Error(`Failed to save tax reserve: ${error.message}`);
    }

    return { success: true };
}

/**
 * Get tax reserves for a year
 */
export async function getTaxReserves(workspaceId: string, year: number) {
    const supabase = await createClient();

    const { data: reserves } = await supabase
        .from("tax_reserves")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .order("month", { ascending: true });

    return reserves || [];
}

/**
 * Get quarterly summary
 */
export async function getQuarterlySummary(workspaceId: string, year: number, quarter: number) {
    const supabase = await createClient();

    // Calculate month range for quarter
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;

    const { data: reserves } = await supabase
        .from("tax_reserves")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .gte("month", startMonth)
        .lte("month", endMonth);

    if (!reserves || reserves.length === 0) {
        return {
            quarter,
            totalRevenue: 0,
            totalDeductibleExpenses: 0,
            totalProfit: 0,
            totalTaxableAmount: 0,
            totalRecommendedReserve: 0,
            totalActualReserved: 0,
            months: [],
        };
    }

    const summary = {
        quarter,
        totalRevenue: reserves.reduce((sum, r) => sum + Number(r.revenue), 0),
        totalDeductibleExpenses: reserves.reduce((sum, r) => sum + Number(r.deductible_expenses), 0),
        totalProfit: reserves.reduce((sum, r) => sum + Number(r.profit), 0),
        totalTaxableAmount: reserves.reduce((sum, r) => sum + Number(r.taxable_amount), 0),
        totalRecommendedReserve: reserves.reduce((sum, r) => sum + Number(r.recommended_reserve), 0),
        totalActualReserved: reserves.reduce((sum, r) => sum + Number(r.actual_reserved), 0),
        months: reserves,
    };

    return summary;
}

/**
 * Mark categories as deductible/non-deductible
 */
export async function updateCategoryDeductible(categoryId: string, isDeductible: boolean) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("categories")
        .update({ is_deductible: isDeductible })
        .eq("id", categoryId);

    if (error) {
        throw new Error(`Failed to update category: ${error.message}`);
    }

    return { success: true };
}

/**
 * Get all categories with deductible status
 */
export async function getCategoriesWithDeductible(workspaceId: string) {
    const supabase = await createClient();

    const { data: categories } = await supabase
        .from("categories")
        .select("id, name, type, is_deductible")
        .eq("workspace_id", workspaceId)
        .order("name");

    return categories || [];
}
