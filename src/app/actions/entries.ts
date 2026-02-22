"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEntry(data: {
    workspace_id: string;
    period_id: string;
    direction: "income" | "expense";
    category_id: string;
    description: string;
    amount: number;
    notes?: string;
    entry_date?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("ledger_entries").insert({
        ...data,
        created_by: user.id,
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/month`);
}

export async function upsertEntries(
    entries: {
        id: string; // The client-generated UUID
        workspace_id: string;
        period_id: string;
        direction: "income" | "expense";
        category_id: string;
        description: string;
        amount: number;
        notes?: string;
    }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const withUser = entries.map((e) => ({
        ...e,
        created_by: user.id,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("ledger_entries").upsert(withUser);

    if (error) throw new Error(error.message);
    revalidatePath(`/month`);
}

export async function updateEntry(
    id: string,
    data: {
        description?: string;
        amount?: number;
        category_id?: string;
        notes?: string;
        entry_date?: string;
    }
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("ledger_entries")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath(`/month`);
}

export async function deleteEntry(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("ledger_entries")
        .delete()
        .eq("id", id);

    if (error) throw new Error(error.message);
    revalidatePath(`/month`);
}

export async function bulkCreateEntries(
    entries: {
        workspace_id: string;
        period_id: string;
        direction: "income" | "expense";
        category_id: string;
        description: string;
        amount: number;
        notes?: string;
    }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const withUser = entries.map((e) => ({ ...e, created_by: user.id }));
    const { error } = await supabase.from("ledger_entries").insert(withUser);

    if (error) throw new Error(error.message);
    revalidatePath(`/month`);
}

export async function getEntriesForPeriod(periodId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ledger_entries")
        .select("*, category:categories(*)")
        .eq("period_id", periodId)
        .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}
