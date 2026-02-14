"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Calculate business KPIs (burn rate, runway, cash position)
 */
export async function calculateBusinessKPIs(workspaceId: string, monthsBack: number = 3) {
    const supabase = await createClient();

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get all transactions in the period
    const { data: transactions } = await supabase
        .from("transactions")
        .select(`
      amount,
      type,
      date,
      category_id,
      categories(name, type, category_group_id, category_groups(name))
    `)
        .eq("workspace_id", workspaceId)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

    if (!transactions || transactions.length === 0) {
        return null;
    }

    // Calculate monthly metrics
    const monthlyData: Record<
        string,
        { revenue: number; expenses: number; net: number; date: Date }
    > = {};

    transactions.forEach((t) => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, expenses: 0, net: 0, date };
        }

        const amount = Number(t.amount);
        if (t.type === "income") {
            monthlyData[monthKey].revenue += amount;
        } else {
            monthlyData[monthKey].expenses += amount;
        }
        monthlyData[monthKey].net = monthlyData[monthKey].revenue - monthlyData[monthKey].expenses;
    });

    // Calculate averages
    const months = Object.values(monthlyData);
    const avgRevenue = months.reduce((sum, m) => sum + m.revenue, 0) / months.length;
    const avgExpenses = months.reduce((sum, m) => sum + m.expenses, 0) / months.length;
    const avgBurn = avgExpenses - avgRevenue; // Positive = burning cash

    // Get current cash position (sum of all account balances)
    const { data: accounts } = await supabase
        .from("accounts")
        .select("balance")
        .eq("workspace_id", workspaceId);

    const currentCash = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

    // Calculate runway (months until cash runs out)
    const runway = avgBurn > 0 ? currentCash / avgBurn : null;

    // Calculate growth metrics
    const sortedMonths = months.sort((a, b) => a.date.getTime() - b.date.getTime());
    const revenueGrowth =
        sortedMonths.length >= 2
            ? ((sortedMonths[sortedMonths.length - 1].revenue - sortedMonths[0].revenue) /
                sortedMonths[0].revenue) *
            100
            : 0;

    // Expense breakdown by category group
    const expenseBreakdown: Record<string, number> = {};
    transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
            const groupName =
                (t.categories as any)?.category_groups?.name ||
                (t.categories as any)?.name ||
                "Uncategorized";
            expenseBreakdown[groupName] = (expenseBreakdown[groupName] || 0) + Number(t.amount);
        });

    // Top expense drivers (sorted by amount)
    const topDrivers = Object.entries(expenseBreakdown)
        .map(([name, amount]) => ({ name, amount, percentage: (amount / avgExpenses) * 100 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return {
        currentCash,
        avgRevenue,
        avgExpenses,
        avgBurn,
        runway,
        revenueGrowth,
        monthlyData: sortedMonths,
        topDrivers,
        period: `${monthsBack} months`,
    };
}

/**
 * Save a KPI snapshot to the database
 */
export async function saveKPISnapshot(
    workspaceId: string,
    snapshotDate: Date,
    kpis: {
        currentCash: number;
        avgRevenue: number;
        avgExpenses: number;
        avgBurn: number;
        runway: number | null;
        revenueGrowth: number;
    }
) {
    const supabase = await createClient();

    const { error } = await supabase.from("business_kpi_snapshots").insert({
        workspace_id: workspaceId,
        snapshot_date: snapshotDate.toISOString().split("T")[0],
        current_cash: kpis.currentCash,
        monthly_revenue: kpis.avgRevenue,
        monthly_expenses: kpis.avgExpenses,
        burn_rate: kpis.avgBurn,
        runway_months: kpis.runway,
        revenue_growth_pct: kpis.revenueGrowth,
    });

    if (error) {
        throw new Error(`Failed to save KPI snapshot: ${error.message}`);
    }

    return { success: true };
}

/**
 * Get historical KPI snapshots
 */
export async function getKPIHistory(workspaceId: string, limit = 12) {
    const supabase = await createClient();

    const { data: snapshots } = await supabase
        .from("business_kpi_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("snapshot_date", { ascending: false })
        .limit(limit);

    return snapshots || [];
}

/**
 * Calculate month-over-month changes
 */
export async function calculateMoMChanges(workspaceId: string) {
    const supabase = await createClient();

    // Get current month and previous month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    // Get current month transactions
    const currentMonthStart = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`;
    const currentMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];

    const { data: currentTxns } = await supabase
        .from("transactions")
        .select("amount, type, categories(name, category_group_id, category_groups(name))")
        .eq("workspace_id", workspaceId)
        .gte("date", currentMonthStart)
        .lte("date", currentMonthEnd);

    // Get previous month transactions
    const prevMonthStart = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01`;
    const prevMonthEnd = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

    const { data: prevTxns } = await supabase
        .from("transactions")
        .select("amount, type, categories(name, category_group_id, category_groups(name))")
        .eq("workspace_id", workspaceId)
        .gte("date", prevMonthStart)
        .lte("date", prevMonthEnd);

    // Calculate totals
    const currentRevenue = currentTxns
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const currentExpenses = currentTxns
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const prevRevenue = prevTxns
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const prevExpenses = prevTxns
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Calculate changes
    const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseChange = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const burnChange =
        prevExpenses - prevRevenue > 0
            ? (((currentExpenses - currentRevenue - (prevExpenses - prevRevenue)) /
                (prevExpenses - prevRevenue)) *
                100)
            : 0;

    // Category-level changes
    const categoryChanges: Record<string, { current: number; previous: number; change: number }> = {};

    // Build current month category breakdown
    currentTxns?.filter((t) => t.type === "expense").forEach((t) => {
        const groupName =
            (t.categories as any)?.category_groups?.name || (t.categories as any)?.name || "Uncategorized";
        if (!categoryChanges[groupName]) {
            categoryChanges[groupName] = { current: 0, previous: 0, change: 0 };
        }
        categoryChanges[groupName].current += Number(t.amount);
    });

    // Build previous month category breakdown
    prevTxns?.filter((t) => t.type === "expense").forEach((t) => {
        const groupName =
            (t.categories as any)?.category_groups?.name || (t.categories as any)?.name || "Uncategorized";
        if (!categoryChanges[groupName]) {
            categoryChanges[groupName] = { current: 0, previous: 0, change: 0 };
        }
        categoryChanges[groupName].previous += Number(t.amount);
    });

    // Calculate percentage changes
    Object.keys(categoryChanges).forEach((key) => {
        const { current, previous } = categoryChanges[key];
        categoryChanges[key].change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    });

    // Sort by absolute change
    const topChanges = Object.entries(categoryChanges)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);

    return {
        revenue: { current: currentRevenue, previous: prevRevenue, change: revenueChange },
        expenses: { current: currentExpenses, previous: prevExpenses, change: expenseChange },
        burn: {
            current: currentExpenses - currentRevenue,
            previous: prevExpenses - prevRevenue,
            change: burnChange,
        },
        topCategoryChanges: topChanges,
    };
}
