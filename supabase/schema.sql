-- ============================================================
-- Solo Business Cash Clarity – Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. WORKSPACES
-- ============================================================
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  mode text not null default 'solo',
  default_currency text not null default 'USD',
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. WORKSPACE MEMBERS
-- ============================================================
create type public.workspace_role as enum ('owner', 'admin', 'member', 'advisor_readonly');

create table public.workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
create type public.category_type as enum ('income', 'expense', 'asset', 'liability');

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  parent_category_id uuid references public.categories(id) on delete set null,
  system_flag boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. PERIODS
-- ============================================================
create table public.periods (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  period_start_date date not null,
  period_end_date date not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id, year, month)
);

-- ============================================================
-- 5. LEDGER ENTRIES
-- ============================================================
create type public.entry_direction as enum ('income', 'expense');

create table public.ledger_entries (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_id uuid not null references public.periods(id) on delete cascade,
  entry_date date,
  direction public.entry_direction not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text not null default '',
  amount numeric(15,2) not null default 0,
  notes text,
  recurring_rule_id uuid, -- populated if generated from a recurring rule
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 6. PERIOD OVERRIDES
-- ============================================================
create table public.period_overrides (
  id uuid primary key default uuid_generate_v4(),
  period_id uuid not null references public.periods(id) on delete cascade unique,
  opening_balance_override numeric(15,2),
  dividends_released numeric(15,2) not null default 0,
  closing_balance_override numeric(15,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 7. RECURRING RULES
-- ============================================================
create type public.cadence_type as enum ('monthly', 'quarterly', 'yearly');

create table public.recurring_rules (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  direction public.entry_direction not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text not null,
  amount numeric(15,2) not null,
  cadence public.cadence_type not null default 'monthly',
  next_run_date date not null,
  end_date date,
  auto_post boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 8. CATEGORIZATION RULES
-- ============================================================
create type public.match_type as enum ('contains', 'regex', 'exact');

create table public.categorization_rules (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  match_type public.match_type not null default 'contains',
  match_value text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  priority int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 9. ENTRY AUDIT LOG
-- ============================================================
create type public.audit_action as enum ('insert', 'update', 'delete');

create table public.entry_audit_log (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_id uuid not null,
  action public.audit_action not null,
  before_data jsonb,
  after_data jsonb,
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_workspace_members_user on public.workspace_members(user_id);
create index idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index idx_categories_workspace on public.categories(workspace_id);
create index idx_periods_workspace_year on public.periods(workspace_id, year);
create index idx_ledger_entries_period on public.ledger_entries(period_id);
create index idx_ledger_entries_workspace on public.ledger_entries(workspace_id);
create index idx_audit_log_entry on public.entry_audit_log(entry_id);

-- ============================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================
create or replace function public.fn_audit_ledger_entry()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.entry_audit_log(workspace_id, entry_id, action, after_data, actor_user_id)
    values (NEW.workspace_id, NEW.id, 'insert', to_jsonb(NEW), auth.uid());
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.entry_audit_log(workspace_id, entry_id, action, before_data, after_data, actor_user_id)
    values (NEW.workspace_id, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    NEW.updated_at = now();
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.entry_audit_log(workspace_id, entry_id, action, before_data, actor_user_id)
    values (OLD.workspace_id, OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger trg_audit_ledger_entry
  after insert or update or delete on public.ledger_entries
  for each row execute function public.fn_audit_ledger_entry();

-- ============================================================
-- SEED CATEGORIES FUNCTION
-- ============================================================
create or replace function public.fn_seed_categories(p_workspace_id uuid)
returns void as $$
begin
  insert into public.categories(workspace_id, name, type, system_flag) values
    (p_workspace_id, 'Revenue', 'income', true),
    (p_workspace_id, 'Software', 'expense', true),
    (p_workspace_id, 'Staff', 'expense', true),
    (p_workspace_id, 'Merchant Fees', 'expense', true),
    (p_workspace_id, 'Other Expenses', 'expense', true);
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function: check if user is a member of a workspace
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper: check if user is owner or admin
create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$ language sql security definer stable;

-- Helper: check if user can write (not advisor_readonly)
create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin', 'member')
  );
$$ language sql security definer stable;

-- ---- WORKSPACES ----
alter table public.workspaces enable row level security;

create policy "Members can view their workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() is not null);

create policy "Admins can update workspaces"
  on public.workspaces for update
  using (public.is_workspace_admin(id));

-- ---- WORKSPACE MEMBERS ----
alter table public.workspace_members enable row level security;

create policy "Members can view membership"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners can manage membership"
  on public.workspace_members for insert
  with check (
    auth.uid() is not null
    and (
      -- Allow self-insertion during workspace creation
      user_id = auth.uid()
      or public.is_workspace_admin(workspace_id)
    )
  );

create policy "Admins can update membership"
  on public.workspace_members for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete membership"
  on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_id));

-- ---- CATEGORIES ----
alter table public.categories enable row level security;

create policy "Members can view categories"
  on public.categories for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can manage categories"
  on public.categories for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update categories"
  on public.categories for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete categories"
  on public.categories for delete
  using (public.is_workspace_admin(workspace_id));

-- ---- PERIODS ----
alter table public.periods enable row level security;

create policy "Members can view periods"
  on public.periods for select
  using (public.is_workspace_member(workspace_id));

create policy "Writers can manage periods"
  on public.periods for insert
  with check (public.can_write_workspace(workspace_id));

create policy "Writers can update periods"
  on public.periods for update
  using (public.can_write_workspace(workspace_id));

-- ---- LEDGER ENTRIES ----
alter table public.ledger_entries enable row level security;

create policy "Members can view entries"
  on public.ledger_entries for select
  using (public.is_workspace_member(workspace_id));

create policy "Writers can create entries"
  on public.ledger_entries for insert
  with check (public.can_write_workspace(workspace_id));

create policy "Writers can update entries"
  on public.ledger_entries for update
  using (public.can_write_workspace(workspace_id));

create policy "Writers can delete entries"
  on public.ledger_entries for delete
  using (public.can_write_workspace(workspace_id));

-- ---- PERIOD OVERRIDES ----
alter table public.period_overrides enable row level security;

create policy "Members can view overrides"
  on public.period_overrides for select
  using (
    exists(
      select 1 from public.periods p
      where p.id = period_id
        and public.is_workspace_member(p.workspace_id)
    )
  );

create policy "Writers can manage overrides"
  on public.period_overrides for insert
  with check (
    exists(
      select 1 from public.periods p
      where p.id = period_id
        and public.can_write_workspace(p.workspace_id)
    )
  );

create policy "Writers can update overrides"
  on public.period_overrides for update
  using (
    exists(
      select 1 from public.periods p
      where p.id = period_id
        and public.can_write_workspace(p.workspace_id)
    )
  );

-- ---- RECURRING RULES ----
alter table public.recurring_rules enable row level security;

create policy "Members can view recurring rules"
  on public.recurring_rules for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can manage recurring rules"
  on public.recurring_rules for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update recurring rules"
  on public.recurring_rules for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete recurring rules"
  on public.recurring_rules for delete
  using (public.is_workspace_admin(workspace_id));

-- ---- CATEGORIZATION RULES ----
alter table public.categorization_rules enable row level security;

create policy "Members can view categorization rules"
  on public.categorization_rules for select
  using (public.is_workspace_member(workspace_id));

create policy "Admins can manage categorization rules"
  on public.categorization_rules for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "Admins can update categorization rules"
  on public.categorization_rules for update
  using (public.is_workspace_admin(workspace_id));

create policy "Admins can delete categorization rules"
  on public.categorization_rules for delete
  using (public.is_workspace_admin(workspace_id));

-- ---- ENTRY AUDIT LOG ----
alter table public.entry_audit_log enable row level security;

create policy "Members can view audit log"
  on public.entry_audit_log for select
  using (public.is_workspace_member(workspace_id));

-- Audit log inserts are done by the trigger (security definer), not by users directly
