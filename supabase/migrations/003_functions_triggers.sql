-- Migration 003: Helper functions and triggers

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger firms_updated_at
  before update on public.firms for each row execute function public.set_updated_at();
create trigger advisers_updated_at
  before update on public.advisers for each row execute function public.set_updated_at();
create trigger clients_updated_at
  before update on public.clients for each row execute function public.set_updated_at();
create trigger tax_wrappers_updated_at
  before update on public.tax_wrappers for each row execute function public.set_updated_at();
create trigger sub_accounts_updated_at
  before update on public.sub_accounts for each row execute function public.set_updated_at();
create trigger holdings_updated_at
  before update on public.holdings for each row execute function public.set_updated_at();
create trigger platform_transfers_updated_at
  before update on public.platform_transfers for each row execute function public.set_updated_at();
create trigger integration_configs_updated_at
  before update on public.integration_configs for each row execute function public.set_updated_at();

-- ─── Auto-create a DIRECT_HOLDINGS sub-account when a tax_wrapper is inserted ─
create or replace function public.create_default_sub_account()
returns trigger language plpgsql as $$
begin
  insert into public.sub_accounts (id, firm_id, tax_wrapper_id, name, sub_account_type)
  values (gen_random_uuid(), new.firm_id, new.id, 'Default', 'DIRECT_HOLDINGS');
  return new;
end;
$$;

create trigger tax_wrapper_default_sub_account
  after insert on public.tax_wrappers
  for each row execute function public.create_default_sub_account();

-- ─── Ledger balance check (callable from Edge Functions) ─────────────────────
create or replace function public.check_transaction_ledger_balance(p_transaction_id uuid)
returns boolean language sql stable security definer as $$
  select abs(
    coalesce(sum(case when side = 'DEBIT'  then amount else 0 end), 0) -
    coalesce(sum(case when side = 'CREDIT' then amount else 0 end), 0)
  ) < 0.01
  from public.ledger_entries
  where transaction_id = p_transaction_id;
$$;

-- ─── Aggregate client AUM (for adviser dashboard) ────────────────────────────
-- Returns current total AUM across all wrappers for a given client
-- using the most recent valuation per wrapper.
create or replace function public.get_client_aum(p_client_id uuid)
returns numeric language sql stable security definer as $$
  select coalesce(sum(v.market_value), 0)
  from public.tax_wrappers tw
  join lateral (
    select market_value
    from public.valuations val
    where val.tax_wrapper_id = tw.id
    order by val.valuation_date desc
    limit 1
  ) v on true
  where tw.client_id = p_client_id
    and tw.is_active = true;
$$;

-- ─── Get firm AUM total ───────────────────────────────────────────────────────
create or replace function public.get_firm_aum(p_firm_id uuid)
returns numeric language sql stable security definer as $$
  select coalesce(sum(public.get_client_aum(c.id)), 0)
  from public.clients c
  where c.firm_id = p_firm_id and c.is_active = true;
$$;
