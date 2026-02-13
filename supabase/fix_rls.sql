-- ============================================================
-- Additional functions for workspace creation
-- Run this in your Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- Function to create a workspace + member + categories atomically
-- Runs as the DB owner (security definer) to bypass RLS
create or replace function public.fn_create_workspace(
  p_user_id uuid,
  p_name text,
  p_currency text default 'USD',
  p_fiscal_year_start int default 1
)
returns uuid as $$
declare
  v_workspace_id uuid;
begin
  -- Create workspace
  insert into public.workspaces (name, default_currency, fiscal_year_start_month)
  values (p_name, p_currency, p_fiscal_year_start)
  returning id into v_workspace_id;

  -- Add user as owner
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, p_user_id, 'owner');

  -- Seed categories
  perform public.fn_seed_categories(v_workspace_id);

  return v_workspace_id;
end;
$$ language plpgsql security definer;

-- Function to create periods (bypasses RLS)
create or replace function public.fn_create_periods(p_periods jsonb)
returns void as $$
declare
  v_period jsonb;
begin
  for v_period in select * from jsonb_array_elements(p_periods)
  loop
    insert into public.periods (workspace_id, year, month, period_start_date, period_end_date, label)
    values (
      (v_period->>'workspace_id')::uuid,
      (v_period->>'year')::int,
      (v_period->>'month')::int,
      (v_period->>'period_start_date')::date,
      (v_period->>'period_end_date')::date,
      v_period->>'label'
    )
    on conflict (workspace_id, year, month) do nothing;
  end loop;
end;
$$ language plpgsql security definer;
