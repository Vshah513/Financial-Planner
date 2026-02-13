"use server";

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export async function exportYearCSV(workspaceId: string, year: number) {
    const data = await getExportData(workspaceId, year);
    const rows = [["Month", "Direction", "Category", "Description", "Amount", "Date", "Notes"]];

    for (const entry of data) {
        rows.push([
            entry.month,
            entry.direction,
            entry.category,
            entry.description,
            String(entry.amount),
            entry.date || "",
            entry.notes || "",
        ]);
    }

    return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export async function exportYearXLSX(workspaceId: string, year: number) {
    const data = await getExportData(workspaceId, year);
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [["Month", "Revenue", "Expenses", "Net Cash Flow", "Dividends", "Retained Earnings", "Opening Balance", "Closing Balance"]];

    const supabase = await createClient();
    const { data: periods } = await supabase
        .from("periods")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .order("month");

    if (periods) {
        for (const period of periods) {
            const entries = data.filter(
                (e) => e.monthNum === period.month
            );
            const revenue = entries
                .filter((e) => e.direction === "income")
                .reduce((s, e) => s + e.amount, 0);
            const expenses = entries
                .filter((e) => e.direction === "expense")
                .reduce((s, e) => s + e.amount, 0);

            const { data: override } = await supabase
                .from("period_overrides")
                .select("*")
                .eq("period_id", period.id)
                .single();

            const netCashFlow = revenue - expenses;
            const dividends = override?.dividends_released || 0;
            const retained = netCashFlow - dividends;
            const opening = override?.opening_balance_override ?? 0;
            const closing = override?.closing_balance_override ?? (opening + netCashFlow - dividends);

            summaryRows.push([
                MONTH_NAMES[period.month - 1],
                String(revenue),
                String(expenses),
                String(netCashFlow),
                String(dividends),
                String(retained),
                String(opening),
                String(closing),
            ]);
        }
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Detail sheet
    const detailRows = [["Month", "Direction", "Category", "Description", "Amount", "Date", "Notes"]];
    for (const entry of data) {
        detailRows.push([
            entry.month,
            entry.direction,
            entry.category,
            entry.description,
            String(entry.amount),
            entry.date || "",
            entry.notes || "",
        ]);
    }
    const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, detailWs, "Detail");

    const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    return buffer as string;
}

async function getExportData(workspaceId: string, year: number) {
    const supabase = await createClient();

    const { data: periods } = await supabase
        .from("periods")
        .select("id, month, label")
        .eq("workspace_id", workspaceId)
        .eq("year", year)
        .order("month");

    if (!periods) return [];

    const periodIds = periods.map((p) => p.id);
    const { data: entries } = await supabase
        .from("ledger_entries")
        .select("*, category:categories(name)")
        .in("period_id", periodIds)
        .order("created_at");

    if (!entries) return [];

    return entries.map((e) => {
        const period = periods.find((p) => p.id === e.period_id);
        return {
            month: period?.label || "",
            monthNum: period?.month || 0,
            direction: e.direction,
            category: (e.category as { name: string })?.name || "",
            description: e.description,
            amount: Number(e.amount),
            date: e.entry_date,
            notes: e.notes,
        };
    });
}

export async function importCSVData(
    workspaceId: string,
    year: number,
    rows: { direction: string; category: string; description: string; amount: number; month: number }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get periods
    const { data: periods } = await supabase
        .from("periods")
        .select("id, month")
        .eq("workspace_id", workspaceId)
        .eq("year", year);

    if (!periods) throw new Error("No periods found for this year");

    // Get categories
    const { data: categories } = await supabase
        .from("categories")
        .select("id, name, type")
        .eq("workspace_id", workspaceId);

    if (!categories) throw new Error("No categories found");

    const newEntries = [];
    for (const row of rows) {
        const period = periods.find((p) => p.month === row.month);
        if (!period) continue;

        const category = categories.find(
            (c) => c.name.toLowerCase() === row.category.toLowerCase()
        );
        if (!category) continue;

        newEntries.push({
            workspace_id: workspaceId,
            period_id: period.id,
            direction: row.direction as "income" | "expense",
            category_id: category.id,
            description: row.description,
            amount: row.amount,
            created_by: user.id,
        });
    }

    if (newEntries.length > 0) {
        const { error } = await supabase.from("ledger_entries").insert(newEntries);
        if (error) throw new Error(error.message);
    }

    return { imported: newEntries.length };
}
