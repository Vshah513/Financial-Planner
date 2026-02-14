-- ============================================================
-- Tools Platform - Additional Tables Migration
-- Adds missing tables for new tools implementation
-- Safe to run - uses CREATE TABLE IF NOT EXISTS
-- ============================================================

-- Add missing columns to categories table for tax deductibility
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'is_deductible'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN is_deductible boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- TAX RESERVE TABLES (Updated Schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade unique,
  calculation_mode text not null check (calculation_mode in ('revenue', 'profit')) default 'revenue',
  tax_rate numeric(5,2) not null check (tax_rate >= 0 and tax_rate <= 100) default 25.0,
  filing_frequency text not null check (filing_frequency in ('monthly', 'quarterly', 'annual')) default 'quarterly',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.tax_reserves (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  revenue numeric(15,2) not null default 0,
  deductible_expenses numeric(15,2) not null default 0,
  profit numeric(15,2) not null default 0,
  taxable_amount numeric(15,2) not null default 0,
  recommended_reserve numeric(15,2) not null default 0,
  actual_reserved numeric(15,2) not null default 0,
  effective_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, year, month)
);

-- ============================================================
-- BUSINESS KPI SNAPSHOTS (Updated Schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  snapshot_date date not null,
  current_cash numeric(15,2) not null default 0,
  monthly_revenue numeric(15,2) not null default 0,
  monthly_expenses numeric(15,2) not null default 0,
  burn_rate numeric(15,2) not null default 0,
  runway_months numeric(5,2),
  revenue_growth_pct numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  unique(workspace_id, snapshot_date)
);

-- ============================================================
-- PRICING MODELS (Updated Schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_models (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  product_name text not null,
  fixed_costs numeric(15,2) not null default 0,
  variable_cost_per_unit numeric(15,2) not null default 0,
  desired_margin_pct numeric(5,2) not null default 0,
  expected_volume int not null default 0,
  recommended_price numeric(15,2) not null default 0,
  break_even_units numeric(15,2),
  projected_profit numeric(15,2) not null default 0,
  actual_margin_pct numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- MONTHLY REPORTS (Board Pack Generator)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  report_data jsonb not null,
  commentary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, year, month)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tax_profiles_workspace ON public.tax_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tax_reserves_workspace ON public.tax_reserves(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tax_reserves_year_month ON public.tax_reserves(workspace_id, year, month);
CREATE INDEX IF NOT EXISTS idx_business_kpi_snapshots_workspace ON public.business_kpi_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pricing_models_workspace ON public.pricing_models(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_workspace ON public.monthly_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_year_month ON public.monthly_reports(workspace_id, year, month);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- TAX PROFILES
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tax profiles" ON public.tax_profiles;
CREATE POLICY "Members can view tax profiles"
  ON public.tax_profiles FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can manage tax profiles" ON public.tax_profiles;
CREATE POLICY "Members can manage tax profiles"
  ON public.tax_profiles FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- TAX RESERVES
ALTER TABLE public.tax_reserves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tax reserves" ON public.tax_reserves;
CREATE POLICY "Members can view tax reserves"
  ON public.tax_reserves FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can manage tax reserves" ON public.tax_reserves;
CREATE POLICY "Members can manage tax reserves"
  ON public.tax_reserves FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- BUSINESS KPI SNAPSHOTS
ALTER TABLE public.business_kpi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view business kpi snapshots" ON public.business_kpi_snapshots;
CREATE POLICY "Members can view business kpi snapshots"
  ON public.business_kpi_snapshots FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can manage business kpi snapshots" ON public.business_kpi_snapshots;
CREATE POLICY "Members can manage business kpi snapshots"
  ON public.business_kpi_snapshots FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- PRICING MODELS
ALTER TABLE public.pricing_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view pricing models" ON public.pricing_models;
CREATE POLICY "Members can view pricing models"
  ON public.pricing_models FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can manage pricing models" ON public.pricing_models;
CREATE POLICY "Members can manage pricing models"
  ON public.pricing_models FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- MONTHLY REPORTS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view monthly reports" ON public.monthly_reports;
CREATE POLICY "Members can view monthly reports"
  ON public.monthly_reports FOR SELECT
  USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can manage monthly reports" ON public.monthly_reports;
CREATE POLICY "Members can manage monthly reports"
  ON public.monthly_reports FOR ALL
  USING (public.can_write_workspace(workspace_id));
