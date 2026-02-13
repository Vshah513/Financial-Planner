// ============================================================
// Database types for Solo Business Cash Clarity
// ============================================================

export type WorkspaceMode = "business" | "personal";
export type WorkspaceRole = "owner" | "admin" | "member" | "advisor_readonly";
export type CategoryType = "income" | "expense" | "asset" | "liability";
export type EntryDirection = "income" | "expense";
export type CadenceType = "monthly" | "quarterly" | "yearly";
export type MatchType = "contains" | "regex" | "exact";
export type AuditAction = "insert" | "update" | "delete";

export interface Workspace {
    id: string;
    name: string;
    mode: WorkspaceMode;
    default_currency: string;
    fiscal_year_start_month: number;
    created_at: string;
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    created_at: string;
}

export interface CategoryGroup {
    id: string;
    workspace_id: string;
    type: "income" | "expense";
    name: string;
    sort_order: number;
    is_system: boolean;
    created_at: string;
}

export interface Category {
    id: string;
    workspace_id: string;
    name: string;
    type: CategoryType;
    group_id: string | null;
    parent_category_id: string | null;
    sort_order: number;
    system_flag: boolean;
    created_at: string;
}

export interface Period {
    id: string;
    workspace_id: string;
    year: number;
    month: number;
    period_start_date: string;
    period_end_date: string;
    label: string;
    created_at: string;
}

export interface LedgerEntry {
    id: string;
    workspace_id: string;
    period_id: string;
    entry_date: string | null;
    direction: EntryDirection;
    category_id: string;
    description: string;
    amount: number;
    notes: string | null;
    recurring_rule_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface PeriodOverride {
    id: string;
    period_id: string;
    opening_balance_override: number | null;
    dividends_released: number;
    closing_balance_override: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface RecurringRule {
    id: string;
    workspace_id: string;
    direction: EntryDirection;
    category_id: string;
    description: string;
    amount: number;
    cadence: CadenceType;
    next_run_date: string;
    end_date: string | null;
    auto_post: boolean;
    created_at: string;
    updated_at: string;
}

export interface CategorizationRule {
    id: string;
    workspace_id: string;
    match_type: MatchType;
    match_value: string;
    category_id: string;
    priority: number;
    enabled: boolean;
    created_at: string;
}

export interface EntryAuditLog {
    id: string;
    workspace_id: string;
    entry_id: string;
    action: AuditAction;
    before_data: Record<string, unknown> | null;
    after_data: Record<string, unknown> | null;
    actor_user_id: string | null;
    created_at: string;
}

// ============================================================
// Computed types
// ============================================================

export interface MonthSummary {
    period: Period;
    revenue: number;
    expenses: number;
    netCashFlow: number;
    dividendsReleased: number;
    retainedEarnings: number;
    openingBalance: number | null;
    closingBalance: number;
}

export interface LedgerEntryWithCategory extends LedgerEntry {
    category: Category;
}

export interface YearSummary {
    year: number;
    months: MonthSummary[];
    totalRevenue: number;
    totalExpenses: number;
    totalNetCashFlow: number;
    totalDividends: number;
    totalRetainedEarnings: number;
}

// ============================================================
// UI helper types
// ============================================================

export interface CategoryGroupWithCategories extends CategoryGroup {
    categories: Category[];
}

export interface GroupedEntries {
    group: CategoryGroup;
    categories: {
        category: Category;
        entries: EntryRow[];
        total: number;
    }[];
    total: number;
}

export interface EntryRow {
    id: string;
    direction: "income" | "expense";
    category_id: string;
    description: string;
    amount: number;
    notes: string | null;
    category?: { name: string; group_id?: string | null } | null;
    isNew?: boolean;
    isEdited?: boolean;
}
