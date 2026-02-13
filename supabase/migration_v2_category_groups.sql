-- ============================================================
-- Migration V2: Category Groups + Workspace Mode
-- Run AFTER schema.sql in your Supabase SQL Editor
-- This migration is IDEMPOTENT — safe to re-run
-- ============================================================

-- 1. Add workspace mode enum + column
DO $$ BEGIN
  CREATE TYPE public.fp_workspace_mode AS ENUM ('business', 'personal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add mode column if not exists
DO $$ BEGIN
  ALTER TABLE public.workspaces ADD COLUMN mode public.fp_workspace_mode NOT NULL DEFAULT 'business';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Drop the old text mode column if it exists and differs from enum
-- (The original schema had mode text default 'solo' — we need to handle this)
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'mode';

  IF col_type = 'text' THEN
    ALTER TABLE public.workspaces ALTER COLUMN mode DROP DEFAULT;
    ALTER TABLE public.workspaces ALTER COLUMN mode TYPE public.fp_workspace_mode USING 'business'::public.fp_workspace_mode;
    ALTER TABLE public.workspaces ALTER COLUMN mode SET DEFAULT 'business';
  END IF;
END $$;


-- 2. Create category_groups table
CREATE TABLE IF NOT EXISTS public.category_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, type, name)
);

-- 3. Modify categories: add group_id, sort_order, is_system (if not exists)
DO $$ BEGIN
  ALTER TABLE public.categories ADD COLUMN group_id uuid REFERENCES public.category_groups(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.categories ADD COLUMN sort_order int NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- is_system already exists as system_flag — add alias column
-- Actually system_flag already exists, we'll keep using it

-- 4. Add indexes
CREATE INDEX IF NOT EXISTS idx_category_groups_workspace ON public.category_groups(workspace_id, type, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_group ON public.categories(workspace_id, group_id, type, sort_order);


-- ============================================================
-- 5. RLS for category_groups
-- ============================================================
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view category groups" ON public.category_groups;
  DROP POLICY IF EXISTS "Admins can manage category groups" ON public.category_groups;
  DROP POLICY IF EXISTS "Admins can update category groups" ON public.category_groups;
  DROP POLICY IF EXISTS "Admins can delete category groups" ON public.category_groups;
END $$;

CREATE POLICY "Members can view category groups"
  ON public.category_groups FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage category groups"
  ON public.category_groups FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update category groups"
  ON public.category_groups FOR UPDATE
  USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete category groups"
  ON public.category_groups FOR DELETE
  USING (public.is_workspace_admin(workspace_id));


-- ============================================================
-- 6. DATA BACKFILL: Assign existing categories to groups
-- For each workspace, create default groups and map categories
-- ============================================================
DO $$
DECLARE
  ws RECORD;
  grp_revenue_id uuid;
  grp_fees_id uuid;
  grp_software_id uuid;
  grp_staff_id uuid;
  grp_other_id uuid;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    -- Create income group: Revenue
    INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
    VALUES (ws.id, 'income', 'Revenue', 10, true)
    ON CONFLICT (workspace_id, type, name) DO NOTHING
    RETURNING id INTO grp_revenue_id;

    IF grp_revenue_id IS NULL THEN
      SELECT id INTO grp_revenue_id FROM public.category_groups
      WHERE workspace_id = ws.id AND type = 'income' AND name = 'Revenue';
    END IF;

    -- Create expense groups
    INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
    VALUES (ws.id, 'expense', 'Fees', 10, true)
    ON CONFLICT (workspace_id, type, name) DO NOTHING
    RETURNING id INTO grp_fees_id;
    IF grp_fees_id IS NULL THEN
      SELECT id INTO grp_fees_id FROM public.category_groups
      WHERE workspace_id = ws.id AND type = 'expense' AND name = 'Fees';
    END IF;

    INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
    VALUES (ws.id, 'expense', 'Software', 20, true)
    ON CONFLICT (workspace_id, type, name) DO NOTHING
    RETURNING id INTO grp_software_id;
    IF grp_software_id IS NULL THEN
      SELECT id INTO grp_software_id FROM public.category_groups
      WHERE workspace_id = ws.id AND type = 'expense' AND name = 'Software';
    END IF;

    INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
    VALUES (ws.id, 'expense', 'Staff / Payroll', 30, true)
    ON CONFLICT (workspace_id, type, name) DO NOTHING
    RETURNING id INTO grp_staff_id;
    IF grp_staff_id IS NULL THEN
      SELECT id INTO grp_staff_id FROM public.category_groups
      WHERE workspace_id = ws.id AND type = 'expense' AND name = 'Staff / Payroll';
    END IF;

    INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
    VALUES (ws.id, 'expense', 'Other Expenses', 40, true)
    ON CONFLICT (workspace_id, type, name) DO NOTHING
    RETURNING id INTO grp_other_id;
    IF grp_other_id IS NULL THEN
      SELECT id INTO grp_other_id FROM public.category_groups
      WHERE workspace_id = ws.id AND type = 'expense' AND name = 'Other Expenses';
    END IF;

    -- Map income categories
    UPDATE public.categories SET group_id = grp_revenue_id
    WHERE workspace_id = ws.id AND type = 'income' AND group_id IS NULL;

    -- Map expense categories by name
    UPDATE public.categories SET group_id = grp_fees_id
    WHERE workspace_id = ws.id AND type = 'expense' AND group_id IS NULL
      AND (lower(name) LIKE '%merchant%' OR lower(name) LIKE '%bank fee%' OR lower(name) LIKE '%fee%');

    UPDATE public.categories SET group_id = grp_software_id
    WHERE workspace_id = ws.id AND type = 'expense' AND group_id IS NULL
      AND (lower(name) LIKE '%software%' OR lower(name) LIKE '%saas%' OR lower(name) LIKE '%subscription%' OR lower(name) LIKE '%hosting%');

    UPDATE public.categories SET group_id = grp_staff_id
    WHERE workspace_id = ws.id AND type = 'expense' AND group_id IS NULL
      AND (lower(name) LIKE '%staff%' OR lower(name) LIKE '%payroll%' OR lower(name) LIKE '%salary%' OR lower(name) LIKE '%contractor%');

    -- Everything else -> Other Expenses
    UPDATE public.categories SET group_id = grp_other_id
    WHERE workspace_id = ws.id AND type = 'expense' AND group_id IS NULL;

  END LOOP;
END $$;


-- ============================================================
-- 7. Updated fn_create_workspace to seed groups + categories
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_workspace(
  p_user_id uuid,
  p_name text,
  p_currency text DEFAULT 'USD',
  p_fiscal_year_start int DEFAULT 1,
  p_mode text DEFAULT 'business'
)
RETURNS uuid AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Create workspace
  INSERT INTO public.workspaces (name, default_currency, fiscal_year_start_month, mode)
  VALUES (p_name, p_currency, p_fiscal_year_start, p_mode::public.fp_workspace_mode)
  RETURNING id INTO v_workspace_id;

  -- Add user as owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'owner');

  -- Seed groups + categories based on mode
  IF p_mode = 'personal' THEN
    PERFORM public.fn_seed_personal_template(v_workspace_id);
  ELSE
    PERFORM public.fn_seed_business_template(v_workspace_id);
  END IF;

  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 8. Business template seeder function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_seed_business_template(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
  grp_id uuid;
BEGIN
  -- Income: Revenue
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'income', 'Revenue', 10, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'income' AND name = 'Revenue';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Sales / Revenue', 'income', grp_id, 10, true),
    (p_workspace_id, 'Other Income', 'income', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: COGS
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'COGS', 10, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'COGS';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Cost of Goods', 'expense', grp_id, 10, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Payroll
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Payroll', 20, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Payroll';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Salaries', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Contractors', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Software
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Software', 30, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Software';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'SaaS Subscriptions', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Hosting', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Fees
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Fees', 40, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Fees';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Merchant Fees', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Bank Fees', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Marketing
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Marketing', 50, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Marketing';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Ads', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Content', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: G&A
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'G&A', 60, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'G&A';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Rent', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Utilities', 'expense', grp_id, 20, true),
    (p_workspace_id, 'Legal', 'expense', grp_id, 30, true),
    (p_workspace_id, 'Accounting', 'expense', grp_id, 40, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Taxes
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Taxes', 70, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Taxes';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Estimated Taxes', 'expense', grp_id, 10, true),
    (p_workspace_id, 'VAT / GST', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Expense: Other
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Other', 80, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Other';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Miscellaneous', 'expense', grp_id, 10, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 9. Personal template seeder function
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_seed_personal_template(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
  grp_id uuid;
BEGIN
  -- Income
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'income', 'Income', 10, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'income' AND name = 'Income';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Salary', 'income', grp_id, 10, true),
    (p_workspace_id, 'Freelance', 'income', grp_id, 20, true),
    (p_workspace_id, 'Other Income', 'income', grp_id, 30, true)
  ON CONFLICT DO NOTHING;

  -- Housing
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Housing', 10, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Housing';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Rent / Mortgage', 'income', grp_id, 10, true),
    (p_workspace_id, 'Utilities', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Transport
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Transport', 20, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Transport';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Fuel', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Public Transit', 'expense', grp_id, 20, true),
    (p_workspace_id, 'Ride-share', 'expense', grp_id, 30, true)
  ON CONFLICT DO NOTHING;

  -- Food
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Food', 30, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Food';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Groceries', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Dining Out', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Bills & Subscriptions
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Bills & Subscriptions', 40, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Bills & Subscriptions';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Phone', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Internet', 'expense', grp_id, 20, true),
    (p_workspace_id, 'Subscriptions', 'expense', grp_id, 30, true)
  ON CONFLICT DO NOTHING;

  -- Debt
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Debt', 50, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Debt';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Credit Card', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Loans', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Health
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Health', 60, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Health';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Insurance', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Medical', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Lifestyle
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Lifestyle', 70, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Lifestyle';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Entertainment', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Shopping', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;

  -- Savings & Investing
  INSERT INTO public.category_groups (workspace_id, type, name, sort_order, is_system)
  VALUES (p_workspace_id, 'expense', 'Savings & Investing', 80, true)
  ON CONFLICT (workspace_id, type, name) DO NOTHING
  RETURNING id INTO grp_id;
  IF grp_id IS NULL THEN
    SELECT id INTO grp_id FROM public.category_groups
    WHERE workspace_id = p_workspace_id AND type = 'expense' AND name = 'Savings & Investing';
  END IF;
  INSERT INTO public.categories (workspace_id, name, type, group_id, sort_order, system_flag)
  VALUES
    (p_workspace_id, 'Emergency Fund', 'expense', grp_id, 10, true),
    (p_workspace_id, 'Investments', 'expense', grp_id, 20, true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 10. Template apply function (non-destructive merge)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_apply_template(
  p_workspace_id uuid,
  p_mode text DEFAULT 'business'
)
RETURNS void AS $$
BEGIN
  -- Update workspace mode
  UPDATE public.workspaces SET mode = p_mode::public.fp_workspace_mode WHERE id = p_workspace_id;

  -- Seed template (non-destructive due to ON CONFLICT DO NOTHING)
  IF p_mode = 'personal' THEN
    PERFORM public.fn_seed_personal_template(p_workspace_id);
  ELSE
    PERFORM public.fn_seed_business_template(p_workspace_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 11. Keep fn_create_periods and fn_seed_categories
-- ============================================================
-- fn_create_periods already exists from fix_rls.sql
-- fn_seed_categories is now replaced by template functions above
-- but we keep it for backward compatibility
CREATE OR REPLACE FUNCTION public.fn_seed_categories(p_workspace_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM public.fn_seed_business_template(p_workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
