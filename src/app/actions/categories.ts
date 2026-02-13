"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Category, CategorizationRule } from "@/types/database";

export async function getCategories(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Category[];
}

export async function createCategory(data: {
    workspace_id: string;
    name: string;
    type: "income" | "expense" | "asset" | "liability";
    parent_category_id?: string;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").insert(data);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function updateCategory(
    id: string,
    data: { name?: string; type?: string; parent_category_id?: string | null }
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("categories")
        .update(data)
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function deleteCategory(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

// ---- CATEGORIZATION RULES ----

export async function getCategorizationRules(workspaceId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("categorization_rules")
        .select("*, category:categories(*)")
        .eq("workspace_id", workspaceId)
        .order("priority", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function createCategorizationRule(data: {
    workspace_id: string;
    match_type: "contains" | "regex" | "exact";
    match_value: string;
    category_id: string;
    priority: number;
    enabled: boolean;
}) {
    const supabase = await createClient();
    const { error } = await supabase.from("categorization_rules").insert(data);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function updateCategorizationRule(
    id: string,
    data: Partial<CategorizationRule>
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("categorization_rules")
        .update(data)
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function deleteCategorizationRule(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("categorization_rules")
        .delete()
        .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/settings");
}

export async function testCategorizationRule(
    workspaceId: string,
    sampleText: string
) {
    const supabase = await createClient();
    const { data: rules } = await supabase
        .from("categorization_rules")
        .select("*, category:categories(*)")
        .eq("workspace_id", workspaceId)
        .eq("enabled", true)
        .order("priority", { ascending: true });

    if (!rules) return null;

    for (const rule of rules) {
        let matched = false;
        if (rule.match_type === "exact") {
            matched = sampleText.toLowerCase() === rule.match_value.toLowerCase();
        } else if (rule.match_type === "contains") {
            matched = sampleText
                .toLowerCase()
                .includes(rule.match_value.toLowerCase());
        } else if (rule.match_type === "regex") {
            try {
                matched = new RegExp(rule.match_value, "i").test(sampleText);
            } catch {
                continue;
            }
        }
        if (matched) return rule;
    }

    return null;
}

// ---- AUDIT LOG ----

export async function getAuditLog(
    workspaceId: string,
    limit: number = 50,
    offset: number = 0
) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("entry_audit_log")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return data || [];
}
