-- ============================================================
-- Tools Platform Infrastructure Migration
-- Creates shared tables for multi-tool platform
-- ============================================================

-- ============================================================
-- 1. TOOLS METADATA - Track tool usage and favorites
-- ============================================================
create table public.tools_metadata (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tool_key text not null check (tool_key in (
    'life-event-simulator',
    'savings-optimizer',
    'negotiation-prep',
    'runway-burn',
    'tax-reserve',
    'pricing-margin',
    'board-pack'
  )),
  is_favorite boolean default false,
  last_accessed_at timestamptz,
  access_count int not null default 0,
  created_at timestamptz not null default now(),
  unique(workspace_id, tool_key)
);

-- ============================================================
-- 2. SCENARIO BASELINES - Shared baseline snapshots
-- ============================================================
create table public.scenario_baselines (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('actuals', 'planner')),
  period_start date not null,
  period_end date not null,
  monthly_income numeric(15,2) not null,
  monthly_expenses numeric(15,2) not null,
  expense_breakdown jsonb, -- {category_id: amount}
  income_breakdown jsonb,
  snapshot_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. LIFE EVENT SIMULATOR TABLES
-- ============================================================

-- Scenarios
create table public.scenarios (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('personal', 'business')),
  event_type text not null check (event_type in ('move_house', 'have_baby', 'lose_job', 'buy_car', 'custom')),
  horizon_months int not null default 12 check (horizon_months > 0 and horizon_months <= 60),
  baseline_source text not null check (baseline_source in ('actuals', 'planner')),
  baseline_income numeric(15,2) not null,
  baseline_expenses numeric(15,2) not null,
  starting_cash numeric(15,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Scenario Assumptions
create table public.scenario_assumptions (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  variant text not null check (variant in ('conservative', 'base', 'aggressive')),
  income_delta_pct numeric(5,2), -- e.g., -20.00 for -20%
  expense_delta_pct numeric(5,2), -- e.g., +15.00 for +15%
  one_time_costs numeric(15,2) default 0,
  debt_monthly_payment numeric(15,2) default 0,
  debt_balance numeric(15,2) default 0,
  parameters_json jsonb, -- flexible storage for custom parameters
  created_at timestamptz not null default now(),
  unique(scenario_id, variant)
);

-- Scenario Results (cached projections)
create table public.scenario_results (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  variant text not null check (variant in ('conservative', 'base', 'aggressive')),
  month int not null check (month >= 0),
  projected_income numeric(15,2),
  projected_expenses numeric(15,2),
  net_cash numeric(15,2),
  ending_cash numeric(15,2),
  created_at timestamptz not null default now(),
  unique(scenario_id, variant, month)
);

-- ============================================================
-- 4. SAVINGS RATE OPTIMIZER TABLES
-- ============================================================

-- Category Flags (essential vs nonessential)
create table public.category_flags (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid not null references public.categories(id) on delete cascade unique,
  is_essential boolean not null default true,
  created_at timestamptz not null default now()
);

-- Optimizer Runs
create table public.optimizer_runs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  goal_id uuid, -- nullable, may not link to goals table yet
  target_amount numeric(15,2) not null,
  deadline date not null,
  baseline_source text not null check (baseline_source in ('actuals', 'planner')),
  required_monthly numeric(15,2) not null,
  current_savings numeric(15,2) not null,
  gap numeric(15,2) not null,
  created_at timestamptz not null default now()
);

-- Optimizer Recommendations
create table public.optimizer_recommendations (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.optimizer_runs(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  suggested_cut_amount numeric(15,2) not null,
  rank int not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. NEGOTIATION PREP TOOL TABLES
-- ============================================================

-- Negotiations
create table public.negotiations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('rent', 'salary', 'car_purchase', 'vendor', 'debt_settlement')),
  title text not null,
  counterpart text,
  negotiation_date date,
  current_price numeric(15,2),
  anchor_price numeric(15,2),
  target_price numeric(15,2),
  walkaway_price numeric(15,2),
  batna_text text,
  constraints_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Negotiation Scripts
create table public.negotiation_scripts (
  id uuid primary key default uuid_generate_v4(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade unique,
  opening text,
  pushback_1 text,
  pushback_2 text,
  closing text,
  concessions_json jsonb, -- [{trigger: "...", offer: "..."}]
  created_at timestamptz not null default now()
);

-- Negotiation Exports
create table public.negotiation_exports (
  id uuid primary key default uuid_generate_v4(),
  negotiation_id uuid not null references public.negotiations(id) on delete cascade,
  pdf_url text, -- Supabase Storage URL
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. BUSINESS TOOLS TABLES
-- ============================================================

-- Business KPI Snapshots (Runway + Burn Dashboard)
create table public.business_kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  cash numeric(15,2) not null,
  revenue numeric(15,2) not null,
  expenses numeric(15,2) not null,
  gross_burn numeric(15,2) not null,
  net_burn numeric(15,2) not null,
  runway_months numeric(5,2),
  burn_multiple numeric(5,2),
  created_at timestamptz not null default now(),
  unique(workspace_id, period_id)
);

-- Tax Profiles (Tax Reserve Engine)
create table public.tax_profiles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  mode text not null check (mode in ('revenue', 'profit')),
  tax_rate numeric(5,2) not null check (tax_rate >= 0 and tax_rate <= 100), -- e.g., 25.00 for 25%
  deductible_category_ids uuid[], -- array of category IDs
  frequency text not null check (frequency in ('monthly', 'quarterly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tax Reserve Entries
create table public.tax_reserve_entries (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  reserved_amount numeric(15,2) not null,
  paid_amount numeric(15,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique(workspace_id, period_id)
);

-- Pricing Models (Pricing & Margin Tool)
create table public.pricing_models (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  product_or_service text not null,
  unit_price numeric(15,2),
  unit_cogs numeric(15,2),
  variable_fee_pct numeric(5,2) default 0 check (variable_fee_pct >= 0 and variable_fee_pct <= 100),
  variable_fee_fixed numeric(15,2) default 0,
  fixed_monthly_overhead numeric(15,2),
  units_per_month int,
  assumptions_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pricing Runs
create table public.pricing_runs (
  id uuid primary key default uuid_generate_v4(),
  model_id uuid not null references public.pricing_models(id) on delete cascade,
  outputs_json jsonb, -- {contribution_margin, contribution_margin_pct, breakeven_units, etc.}
  created_at timestamptz not null default now()
);

-- Reports (Board Pack Generator)
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  type text not null check (type in ('board_pack')),
  status text not null check (status in ('draft', 'generating', 'ready', 'failed')),
  pdf_url text, -- Supabase Storage URL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Report Sections
create table public.report_sections (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid not null references public.reports(id) on delete cascade,
  section_key text not null check (section_key in ('executive_summary', 'financial_kpis', 'cash_flow', 'drivers', 'risks', 'priorities')),
  content_json jsonb, -- user-editable content
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(report_id, section_key)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_tools_metadata_workspace on public.tools_metadata(workspace_id);
create index idx_scenario_baselines_workspace on public.scenario_baselines(workspace_id);
create index idx_scenarios_workspace on public.scenarios(workspace_id);
create index idx_scenario_results_scenario on public.scenario_results(scenario_id);
create index idx_optimizer_runs_workspace on public.optimizer_runs(workspace_id);
create index idx_negotiations_workspace on public.negotiations(workspace_id);
create index idx_business_kpi_snapshots_workspace on public.business_kpi_snapshots(workspace_id);
create index idx_tax_reserve_entries_workspace on public.tax_reserve_entries(workspace_id);
create index idx_pricing_models_workspace on public.pricing_models(workspace_id);
create index idx_reports_workspace on public.reports(workspace_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- TOOLS METADATA
alter table public.tools_metadata enable row level security;

create policy "Members can view tools metadata"
  on public.tools_metadata for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage tools metadata"
  on public.tools_metadata for insert
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update tools metadata"
  on public.tools_metadata for update
  using (public.is_workspace_member(workspace_id));

-- SCENARIO BASELINES
alter table public.scenario_baselines enable row level security;

create policy "Members can view baselines"
  on public.scenario_baselines for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can create baselines"
  on public.scenario_baselines for insert
  with check (public.can_write_workspace(workspace_id));

-- SCENARIOS
alter table public.scenarios enable row level security;

create policy "Members can view scenarios"
  on public.scenarios for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can create scenarios"
  on public.scenarios for insert
  with check (public.can_write_workspace(workspace_id));

create policy "Members can update scenarios"
  on public.scenarios for update
  using (public.can_write_workspace(workspace_id));

create policy "Members can delete scenarios"
  on public.scenarios for delete
  using (public.can_write_workspace(workspace_id));

-- SCENARIO ASSUMPTIONS
alter table public.scenario_assumptions enable row level security;

create policy "Members can view scenario assumptions"
  on public.scenario_assumptions for select
  using (
    exists(
      select 1 from public.scenarios s
      where s.id = scenario_id
        and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "Members can manage scenario assumptions"
  on public.scenario_assumptions for all
  using (
    exists(
      select 1 from public.scenarios s
      where s.id = scenario_id
        and public.can_write_workspace(s.workspace_id)
    )
  );

-- SCENARIO RESULTS
alter table public.scenario_results enable row level security;

create policy "Members can view scenario results"
  on public.scenario_results for select
  using (
    exists(
      select 1 from public.scenarios s
      where s.id = scenario_id
        and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "Members can manage scenario results"
  on public.scenario_results for all
  using (
    exists(
      select 1 from public.scenarios s
      where s.id = scenario_id
        and public.can_write_workspace(s.workspace_id)
    )
  );

-- CATEGORY FLAGS
alter table public.category_flags enable row level security;

create policy "Members can view category flags"
  on public.category_flags for select
  using (
    exists(
      select 1 from public.categories c
      where c.id = category_id
        and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "Admins can manage category flags"
  on public.category_flags for all
  using (
    exists(
      select 1 from public.categories c
      where c.id = category_id
        and public.is_workspace_admin(c.workspace_id)
    )
  );

-- OPTIMIZER RUNS
alter table public.optimizer_runs enable row level security;

create policy "Members can view optimizer runs"
  on public.optimizer_runs for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can create optimizer runs"
  on public.optimizer_runs for insert
  with check (public.can_write_workspace(workspace_id));

-- OPTIMIZER RECOMMENDATIONS
alter table public.optimizer_recommendations enable row level security;

create policy "Members can view optimizer recommendations"
  on public.optimizer_recommendations for select
  using (
    exists(
      select 1 from public.optimizer_runs r
      where r.id = run_id
        and public.is_workspace_member(r.workspace_id)
    )
  );

create policy "Members can manage optimizer recommendations"
  on public.optimizer_recommendations for all
  using (
    exists(
      select 1 from public.optimizer_runs r
      where r.id = run_id
        and public.can_write_workspace(r.workspace_id)
    )
  );

-- NEGOTIATIONS
alter table public.negotiations enable row level security;

create policy "Members can view negotiations"
  on public.negotiations for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage negotiations"
  on public.negotiations for all
  using (public.can_write_workspace(workspace_id));

-- NEGOTIATION SCRIPTS
alter table public.negotiation_scripts enable row level security;

create policy "Members can view negotiation scripts"
  on public.negotiation_scripts for select
  using (
    exists(
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and public.is_workspace_member(n.workspace_id)
    )
  );

create policy "Members can manage negotiation scripts"
  on public.negotiation_scripts for all
  using (
    exists(
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and public.can_write_workspace(n.workspace_id)
    )
  );

-- NEGOTIATION EXPORTS
alter table public.negotiation_exports enable row level security;

create policy "Members can view negotiation exports"
  on public.negotiation_exports for select
  using (
    exists(
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and public.is_workspace_member(n.workspace_id)
    )
  );

create policy "Members can manage negotiation exports"
  on public.negotiation_exports for all
  using (
    exists(
      select 1 from public.negotiations n
      where n.id = negotiation_id
        and public.can_write_workspace(n.workspace_id)
    )
  );

-- BUSINESS KPI SNAPSHOTS
alter table public.business_kpi_snapshots enable row level security;

create policy "Members can view business kpi snapshots"
  on public.business_kpi_snapshots for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage business kpi snapshots"
  on public.business_kpi_snapshots for all
  using (public.can_write_workspace(workspace_id));

-- TAX PROFILES
alter table public.tax_profiles enable row level security;

create policy "Members can view tax profiles"
  on public.tax_profiles for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can manage tax profiles"
  on public.tax_profiles for all
  using (public.is_workspace_admin(workspace_id));

-- TAX RESERVE ENTRIES
alter table public.tax_reserve_entries enable row level security;

create policy "Members can view tax reserve entries"
  on public.tax_reserve_entries for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage tax reserve entries"
  on public.tax_reserve_entries for all
  using (public.can_write_workspace(workspace_id));

-- PRICING MODELS
alter table public.pricing_models enable row level security;

create policy "Members can view pricing models"
  on public.pricing_models for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage pricing models"
  on public.pricing_models for all
  using (public.can_write_workspace(workspace_id));

-- PRICING RUNS
alter table public.pricing_runs enable row level security;

create policy "Members can view pricing runs"
  on public.pricing_runs for select
  using (
    exists(
      select 1 from public.pricing_models m
      where m.id = model_id
        and public.is_workspace_member(m.workspace_id)
    )
  );

create policy "Members can manage pricing runs"
  on public.pricing_runs for all
  using (
    exists(
      select 1 from public.pricing_models m
      where m.id = model_id
        and public.can_write_workspace(m.workspace_id)
    )
  );

-- REPORTS
alter table public.reports enable row level security;

create policy "Members can view reports"
  on public.reports for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can manage reports"
  on public.reports for all
  using (public.can_write_workspace(workspace_id));

-- REPORT SECTIONS
alter table public.report_sections enable row level security;

create policy "Members can view report sections"
  on public.report_sections for select
  using (
    exists(
      select 1 from public.reports r
      where r.id = report_id
        and public.is_workspace_member(r.workspace_id)
    )
  );

create policy "Members can manage report sections"
  on public.report_sections for all
  using (
    exists(
      select 1 from public.reports r
      where r.id = report_id
        and public.can_write_workspace(r.workspace_id)
    )
  );
