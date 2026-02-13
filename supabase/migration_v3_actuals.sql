-- ============================================================
-- Migration V3: Actuals Layer – Accounts, Transactions, Reporting
-- Run AFTER migration_v2_category_groups.sql
-- This migration is IDEMPOTENT — safe to re-run
-- ============================================================

-- ============================================================
-- 1. INSTITUTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  provider text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_institutions_workspace ON public.institutions(workspace_id);

-- ============================================================
-- 2. ACCOUNTS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.account_type_enum AS ENUM (
    'checking','savings','cash','credit_card','loan','investment','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking','savings','cash','credit_card','loan','investment','other')),
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_workspace ON public.accounts(workspace_id);

-- ============================================================
-- 3. ACCOUNT BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  balance numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON public.account_balances(account_id, as_of_date);

-- ============================================================
-- 4. TRANSACTIONS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.txn_direction AS ENUM ('inflow','outflow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.txn_status AS ENUM ('pending','posted','excluded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  posted_at date NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inflow','outflow')),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.category_groups(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('pending','posted','excluded')),
  notes text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_workspace_date ON public.transactions(workspace_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON public.transactions(account_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- ============================================================
-- 5. TRANSACTION RULES (auto-categorization for actuals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  match_type text NOT NULL CHECK (match_type IN ('contains','regex','exact')),
  match_value text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transaction_rules_workspace ON public.transaction_rules(workspace_id);

-- ============================================================
-- 6. NET WORTH SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  total_assets numeric(14,2) NOT NULL DEFAULT 0,
  total_liabilities numeric(14,2) NOT NULL DEFAULT 0,
  net_worth numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_net_worth_workspace ON public.net_worth_snapshots(workspace_id, as_of_date);

-- ============================================================
-- 7. BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  rollover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_budgets_workspace ON public.budgets(workspace_id, period_id);

-- ============================================================
-- 8. GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(14,2) NOT NULL DEFAULT 0,
  current_amount numeric(14,2) NOT NULL DEFAULT 0,
  target_date date,
  linked_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_workspace ON public.goals(workspace_id);


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- INSTITUTIONS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Admins can insert institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Admins can update institutions" ON public.institutions;
  DROP POLICY IF EXISTS "Admins can delete institutions" ON public.institutions;
END $$;
CREATE POLICY "Members can view institutions"
  ON public.institutions FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert institutions"
  ON public.institutions FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can update institutions"
  ON public.institutions FOR UPDATE
  USING (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can delete institutions"
  ON public.institutions FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ACCOUNTS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view accounts" ON public.accounts;
  DROP POLICY IF EXISTS "Admins can insert accounts" ON public.accounts;
  DROP POLICY IF EXISTS "Admins can update accounts" ON public.accounts;
  DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;
END $$;
CREATE POLICY "Members can view accounts"
  ON public.accounts FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can update accounts"
  ON public.accounts FOR UPDATE
  USING (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can delete accounts"
  ON public.accounts FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- ACCOUNT BALANCES
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view account balances" ON public.account_balances;
  DROP POLICY IF EXISTS "Writers can insert account balances" ON public.account_balances;
  DROP POLICY IF EXISTS "Writers can update account balances" ON public.account_balances;
  DROP POLICY IF EXISTS "Writers can delete account balances" ON public.account_balances;
END $$;
CREATE POLICY "Members can view account balances"
  ON public.account_balances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND public.is_workspace_member(a.workspace_id)
    )
  );
CREATE POLICY "Writers can insert account balances"
  ON public.account_balances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND public.can_write_workspace(a.workspace_id)
    )
  );
CREATE POLICY "Writers can update account balances"
  ON public.account_balances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND public.can_write_workspace(a.workspace_id)
    )
  );
CREATE POLICY "Writers can delete account balances"
  ON public.account_balances FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND public.can_write_workspace(a.workspace_id)
    )
  );

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Writers can insert transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Writers can update transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Writers can delete transactions" ON public.transactions;
END $$;
CREATE POLICY "Members can view transactions"
  ON public.transactions FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Writers can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can delete transactions"
  ON public.transactions FOR DELETE
  USING (public.can_write_workspace(workspace_id));

-- TRANSACTION RULES
ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view transaction rules" ON public.transaction_rules;
  DROP POLICY IF EXISTS "Admins can insert transaction rules" ON public.transaction_rules;
  DROP POLICY IF EXISTS "Admins can update transaction rules" ON public.transaction_rules;
  DROP POLICY IF EXISTS "Admins can delete transaction rules" ON public.transaction_rules;
END $$;
CREATE POLICY "Members can view transaction rules"
  ON public.transaction_rules FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Admins can insert transaction rules"
  ON public.transaction_rules FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can update transaction rules"
  ON public.transaction_rules FOR UPDATE
  USING (public.is_workspace_admin(workspace_id));
CREATE POLICY "Admins can delete transaction rules"
  ON public.transaction_rules FOR DELETE
  USING (public.is_workspace_admin(workspace_id));

-- NET WORTH SNAPSHOTS
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view net worth snapshots" ON public.net_worth_snapshots;
  DROP POLICY IF EXISTS "Writers can insert net worth snapshots" ON public.net_worth_snapshots;
  DROP POLICY IF EXISTS "Writers can update net worth snapshots" ON public.net_worth_snapshots;
END $$;
CREATE POLICY "Members can view net worth snapshots"
  ON public.net_worth_snapshots FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Writers can insert net worth snapshots"
  ON public.net_worth_snapshots FOR INSERT
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can update net worth snapshots"
  ON public.net_worth_snapshots FOR UPDATE
  USING (public.can_write_workspace(workspace_id));

-- BUDGETS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view budgets" ON public.budgets;
  DROP POLICY IF EXISTS "Writers can insert budgets" ON public.budgets;
  DROP POLICY IF EXISTS "Writers can update budgets" ON public.budgets;
  DROP POLICY IF EXISTS "Writers can delete budgets" ON public.budgets;
END $$;
CREATE POLICY "Members can view budgets"
  ON public.budgets FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Writers can insert budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can update budgets"
  ON public.budgets FOR UPDATE
  USING (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can delete budgets"
  ON public.budgets FOR DELETE
  USING (public.can_write_workspace(workspace_id));

-- GOALS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members can view goals" ON public.goals;
  DROP POLICY IF EXISTS "Writers can insert goals" ON public.goals;
  DROP POLICY IF EXISTS "Writers can update goals" ON public.goals;
  DROP POLICY IF EXISTS "Writers can delete goals" ON public.goals;
END $$;
CREATE POLICY "Members can view goals"
  ON public.goals FOR SELECT
  USING (public.is_workspace_member(workspace_id));
CREATE POLICY "Writers can insert goals"
  ON public.goals FOR INSERT
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can update goals"
  ON public.goals FOR UPDATE
  USING (public.can_write_workspace(workspace_id));
CREATE POLICY "Writers can delete goals"
  ON public.goals FOR DELETE
  USING (public.can_write_workspace(workspace_id));


-- ============================================================
-- 10. SEED DEFAULT INSTITUTION + ACCOUNT PER WORKSPACE
-- ============================================================
DO $$
DECLARE
  ws RECORD;
  inst_id uuid;
BEGIN
  FOR ws IN SELECT w.id, w.default_currency FROM public.workspaces w LOOP
    -- Create Manual institution if not exists
    INSERT INTO public.institutions (workspace_id, name, provider)
    SELECT ws.id, 'Manual', 'manual'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.institutions WHERE workspace_id = ws.id AND name = 'Manual'
    )
    RETURNING id INTO inst_id;

    IF inst_id IS NULL THEN
      SELECT id INTO inst_id FROM public.institutions WHERE workspace_id = ws.id AND name = 'Manual';
    END IF;

    -- Create Manual Cash account if not exists
    INSERT INTO public.accounts (workspace_id, institution_id, name, account_type, currency)
    SELECT ws.id, inst_id, 'Manual Cash', 'cash', ws.default_currency
    WHERE NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE workspace_id = ws.id AND name = 'Manual Cash'
    );
  END LOOP;
END $$;


-- ============================================================
-- 11. REPORTING RPC FUNCTIONS
-- ============================================================

-- cash_flow_summary
CREATE OR REPLACE FUNCTION public.fn_cash_flow_summary(
  p_workspace_id uuid,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE(
  total_income numeric,
  total_expenses numeric,
  net_income numeric,
  savings_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN t.direction = 'outflow' THEN t.amount ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN t.direction = 'outflow' THEN t.amount ELSE 0 END), 0) AS net_income,
    CASE
      WHEN COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0) = 0 THEN 0
      ELSE ROUND(
        (
          (COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN t.direction = 'outflow' THEN t.amount ELSE 0 END), 0))
          / COALESCE(SUM(CASE WHEN t.direction = 'inflow' THEN t.amount ELSE 0 END), 0)
        ) * 100, 2)
    END AS savings_rate
  FROM public.transactions t
  WHERE t.workspace_id = p_workspace_id
    AND t.posted_at >= p_date_from
    AND t.posted_at <= p_date_to
    AND t.status = 'posted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- cash_flow_by_group
CREATE OR REPLACE FUNCTION public.fn_cash_flow_by_group(
  p_workspace_id uuid,
  p_date_from date,
  p_date_to date
)
RETURNS TABLE(
  group_id uuid,
  group_name text,
  group_type text,
  direction text,
  total numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id AS group_id,
    cg.name AS group_name,
    cg.type AS group_type,
    t.direction,
    COALESCE(SUM(t.amount), 0) AS total
  FROM public.transactions t
  LEFT JOIN public.category_groups cg ON cg.id = t.group_id
  WHERE t.workspace_id = p_workspace_id
    AND t.posted_at >= p_date_from
    AND t.posted_at <= p_date_to
    AND t.status = 'posted'
  GROUP BY cg.id, cg.name, cg.type, t.direction
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- sankey_data (returns JSON for sankey chart)
CREATE OR REPLACE FUNCTION public.fn_sankey_data(
  p_workspace_id uuid,
  p_date_from date,
  p_date_to date,
  p_grouping_mode text DEFAULT 'group'
)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_total_income numeric;
  v_total_expenses numeric;
  v_net numeric;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END), 0)
  INTO v_total_income, v_total_expenses
  FROM public.transactions
  WHERE workspace_id = p_workspace_id
    AND posted_at >= p_date_from
    AND posted_at <= p_date_to
    AND status = 'posted';

  v_net := v_total_income - v_total_expenses;

  IF p_grouping_mode = 'category' THEN
    -- Category-level grouping
    WITH income_cats AS (
      SELECT c.name, COALESCE(SUM(t.amount), 0) AS total
      FROM public.transactions t
      JOIN public.categories c ON c.id = t.category_id
      WHERE t.workspace_id = p_workspace_id
        AND t.posted_at >= p_date_from AND t.posted_at <= p_date_to
        AND t.status = 'posted' AND t.direction = 'inflow'
      GROUP BY c.name
      HAVING SUM(t.amount) > 0
    ),
    expense_cats AS (
      SELECT c.name, COALESCE(SUM(t.amount), 0) AS total
      FROM public.transactions t
      JOIN public.categories c ON c.id = t.category_id
      WHERE t.workspace_id = p_workspace_id
        AND t.posted_at >= p_date_from AND t.posted_at <= p_date_to
        AND t.status = 'posted' AND t.direction = 'outflow'
      GROUP BY c.name
      HAVING SUM(t.amount) > 0
    )
    SELECT jsonb_build_object(
      'nodes', (
        SELECT jsonb_agg(jsonb_build_object('id', n.id))
        FROM (
          SELECT name AS id FROM income_cats
          UNION ALL SELECT 'Total Income'
          UNION ALL SELECT CASE WHEN v_net >= 0 THEN 'Net Savings' ELSE 'Shortfall' END
          UNION ALL SELECT name AS id FROM expense_cats
        ) n
      ),
      'links', (
        SELECT jsonb_agg(link)
        FROM (
          SELECT jsonb_build_object('source', name, 'target', 'Total Income', 'value', total) AS link FROM income_cats
          UNION ALL
          SELECT jsonb_build_object('source', 'Total Income', 'target', name, 'value', total) FROM expense_cats
          UNION ALL
          SELECT jsonb_build_object(
            'source', 'Total Income',
            'target', CASE WHEN v_net >= 0 THEN 'Net Savings' ELSE 'Shortfall' END,
            'value', ABS(v_net)
          ) WHERE v_net != 0
        ) links
      )
    ) INTO v_result;
  ELSE
    -- Group-level grouping
    WITH income_groups AS (
      SELECT COALESCE(cg.name, 'Other Income') AS name, COALESCE(SUM(t.amount), 0) AS total
      FROM public.transactions t
      LEFT JOIN public.category_groups cg ON cg.id = t.group_id
      WHERE t.workspace_id = p_workspace_id
        AND t.posted_at >= p_date_from AND t.posted_at <= p_date_to
        AND t.status = 'posted' AND t.direction = 'inflow'
      GROUP BY COALESCE(cg.name, 'Other Income')
      HAVING SUM(t.amount) > 0
    ),
    expense_groups AS (
      SELECT COALESCE(cg.name, 'Other Expenses') AS name, COALESCE(SUM(t.amount), 0) AS total
      FROM public.transactions t
      LEFT JOIN public.category_groups cg ON cg.id = t.group_id
      WHERE t.workspace_id = p_workspace_id
        AND t.posted_at >= p_date_from AND t.posted_at <= p_date_to
        AND t.status = 'posted' AND t.direction = 'outflow'
      GROUP BY COALESCE(cg.name, 'Other Expenses')
      HAVING SUM(t.amount) > 0
    )
    SELECT jsonb_build_object(
      'nodes', (
        SELECT jsonb_agg(jsonb_build_object('id', n.id))
        FROM (
          SELECT name AS id FROM income_groups
          UNION ALL SELECT 'Total Income'
          UNION ALL SELECT CASE WHEN v_net >= 0 THEN 'Net Savings' ELSE 'Shortfall' END
          UNION ALL SELECT name AS id FROM expense_groups
        ) n
      ),
      'links', (
        SELECT jsonb_agg(link)
        FROM (
          SELECT jsonb_build_object('source', name, 'target', 'Total Income', 'value', total) AS link FROM income_groups
          UNION ALL
          SELECT jsonb_build_object('source', 'Total Income', 'target', name, 'value', total) FROM expense_groups
          UNION ALL
          SELECT jsonb_build_object(
            'source', 'Total Income',
            'target', CASE WHEN v_net >= 0 THEN 'Net Savings' ELSE 'Shortfall' END,
            'value', ABS(v_net)
          ) WHERE v_net != 0
        ) links
      )
    ) INTO v_result;
  END IF;

  RETURN COALESCE(v_result, '{"nodes":[],"links":[]}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- 12. UPDATE fn_create_workspace to also seed institution + account
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
  v_inst_id uuid;
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

  -- Create default Manual institution and Manual Cash account
  INSERT INTO public.institutions (workspace_id, name, provider)
  VALUES (v_workspace_id, 'Manual', 'manual')
  RETURNING id INTO v_inst_id;

  INSERT INTO public.accounts (workspace_id, institution_id, name, account_type, currency)
  VALUES (v_workspace_id, v_inst_id, 'Manual Cash', 'cash', p_currency);

  RETURN v_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 13. TRIGGER: Sync group_id on transaction insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_transaction_group()
RETURNS trigger AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT group_id INTO NEW.group_id
    FROM public.categories
    WHERE id = NEW.category_id;
  ELSE
    NEW.group_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_transaction_group ON public.transactions;
CREATE TRIGGER trg_sync_transaction_group
  BEFORE INSERT OR UPDATE OF category_id ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_transaction_group();
