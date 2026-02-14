"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Generate monthly report data
 */
export async function generateMonthlyReport(
    workspaceId: string,
    year: number,
    month: number
) {
    const supabase = await createClient();

    // Get date range
    const monthStart = `${year}-${month.toString().padStart(2, "0")}-01`;
    const monthEnd = new Date(year, month, 0).toISOString().split("T")[0];

    // Get previous month for comparison
    const prevDate = new Date(year, month - 1, 0);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevMonthStart = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01`;
    const prevMonthEnd = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

    // Get current month transactions
    const { data: currentTxns } = await supabase
        .from("transactions")
        .select(`
      amount,
      type,
      date,
      category_id,
      categories(name, type, category_group_id, category_groups(name))
    `)
        .eq("workspace_id", workspaceId)
        .gte("date", monthStart)
        .lte("date", monthEnd);

    // Get previous month transactions
    const { data: prevTxns } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("workspace_id", workspaceId)
        .gte("date", prevMonthStart)
        .lte("date", prevMonthEnd);

    // Get current cash position
    const { data: accounts } = await supabase
        .from("accounts")
        .select("balance")
        .eq("workspace_id", workspaceId);

    const currentCash = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

    // Calculate current month metrics
    const currentRevenue = currentTxns
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const currentExpenses = currentTxns
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const currentProfit = currentRevenue - currentExpenses;

    // Calculate previous month metrics
    const prevRevenue = prevTxns
        ?.filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const prevExpenses = prevTxns
        ?.filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    const prevProfit = prevRevenue - prevExpenses;

    // Calculate changes
    const revenueChange = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const expenseChange = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const profitChange = prevProfit !== 0 ? ((currentProfit - prevProfit) / Math.abs(prevProfit)) * 100 : 0;

    // Category breakdown
    const categoryBreakdown: Record<string, { revenue: number; expenses: number }> = {};
    currentTxns?.forEach((t) => {
        const groupName =
            (t.categories as any)?.category_groups?.name ||
            (t.categories as any)?.name ||
            "Uncategorized";

        if (!categoryBreakdown[groupName]) {
            categoryBreakdown[groupName] = { revenue: 0, expenses: 0 };
        }

        if (t.type === "income") {
            categoryBreakdown[groupName].revenue += Number(t.amount);
        } else {
            categoryBreakdown[groupName].expenses += Number(t.amount);
        }
    });

    // Top revenue and expense categories
    const topRevenue = Object.entries(categoryBreakdown)
        .filter(([_, data]) => data.revenue > 0)
        .map(([name, data]) => ({ name, amount: data.revenue }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const topExpenses = Object.entries(categoryBreakdown)
        .filter(([_, data]) => data.expenses > 0)
        .map(([name, data]) => ({ name, amount: data.expenses }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    // Calculate burn rate and runway
    const avgBurn = currentExpenses - currentRevenue;
    const runway = avgBurn > 0 ? currentCash / avgBurn : null;

    // Daily transaction count
    const dailyActivity = currentTxns?.reduce((acc, t) => {
        const date = t.date;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {} as Record<string, number>) || {};

    const avgDailyTransactions = Object.keys(dailyActivity).length > 0
        ? Object.values(dailyActivity).reduce((sum, count) => sum + count, 0) / Object.keys(dailyActivity).length
        : 0;

    return {
        period: {
            year,
            month,
            monthName: new Date(year, month - 1).toLocaleDateString("en-US", { month: "long" }),
        },
        kpis: {
            currentCash,
            revenue: currentRevenue,
            expenses: currentExpenses,
            profit: currentProfit,
            burnRate: avgBurn,
            runway,
            revenueChange,
            expenseChange,
            profitChange,
        },
        previous: {
            revenue: prevRevenue,
            expenses: prevExpenses,
            profit: prevProfit,
        },
        breakdown: {
            topRevenue,
            topExpenses,
        },
        activity: {
            totalTransactions: currentTxns?.length || 0,
            avgDailyTransactions,
            activeDays: Object.keys(dailyActivity).length,
        },
    };
}

/**
 * Save a monthly report
 */
export async function saveMonthlyReport(
    workspaceId: string,
    year: number,
    month: number,
    reportData: any,
    commentary?: string
) {
    const supabase = await createClient();

    const { data: report, error } = await supabase
        .from("monthly_reports")
        .upsert(
            {
                workspace_id: workspaceId,
                year,
                month,
                report_data: reportData,
                commentary,
            },
            { onConflict: "workspace_id,year,month" }
        )
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save monthly report: ${error.message}`);
    }

    return report;
}

/**
 * Get saved monthly reports
 */
export async function getMonthlyReports(workspaceId: string, limit = 12) {
    const supabase = await createClient();

    const { data: reports } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(limit);

    return reports || [];
}

/**
 * Get a single monthly report
 */
export async function getMonthlyReport(workspaceId: string, year: number, month: number) {
    const supabase = await createClient();

    const { data: report } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .eq("month", month)
        .single();

    return report;
}
