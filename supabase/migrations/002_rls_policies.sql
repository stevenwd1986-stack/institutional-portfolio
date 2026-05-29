-- Migration 002: Row-Level Security policies
-- Every table is scoped to firm_id. Advisers only see their own firm's data.
-- service_role bypasses RLS (used by Edge Functions and price feed ingestion).

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
alter table public.firms              enable row level security;
alter table public.advisers           enable row level security;
alter table public.clients            enable row level security;
alter table public.tax_wrappers       enable row level security;
alter table public.sub_accounts       enable row level security;
alter table public.holdings           enable row level security;
alter table public.transactions       enable row level security;
alter table public.platform_transfers enable row level security;
alter table public.ledger_entries     enable row level security;
alter table public.valuations         enable row level security;
alter table public.benchmarks         enable row level security;
alter table public.benchmark_prices   enable row level security;
alter table public.integration_configs enable row level security;
alter table public.import_jobs        enable row level security;
alter table public.alerts             enable row level security;

-- ─── Helper: resolve current adviser's firm_id from auth.uid() ───────────────
create or replace function public.current_firm_id()
returns uuid language sql stable security definer as $$
  select firm_id from public.advisers where auth_user_id = auth.uid() limit 1;
$$;

-- ─── Firms ────────────────────────────────────────────────────────────────────
create policy "firms_own_firm" on public.firms
  for all using (id = public.current_firm_id());

-- ─── Advisers ─────────────────────────────────────────────────────────────────
create policy "advisers_own_firm" on public.advisers
  for all using (firm_id = public.current_firm_id());

-- ─── Clients ──────────────────────────────────────────────────────────────────
create policy "clients_own_firm" on public.clients
  for all using (firm_id = public.current_firm_id());

-- ─── Tax Wrappers ─────────────────────────────────────────────────────────────
create policy "tax_wrappers_own_firm" on public.tax_wrappers
  for all using (firm_id = public.current_firm_id());

-- ─── Sub Accounts ─────────────────────────────────────────────────────────────
create policy "sub_accounts_own_firm" on public.sub_accounts
  for all using (firm_id = public.current_firm_id());

-- ─── Holdings ─────────────────────────────────────────────────────────────────
create policy "holdings_own_firm" on public.holdings
  for all using (firm_id = public.current_firm_id());

-- ─── Transactions ─────────────────────────────────────────────────────────────
create policy "transactions_own_firm" on public.transactions
  for all using (firm_id = public.current_firm_id());

-- ─── Platform Transfers ───────────────────────────────────────────────────────
create policy "platform_transfers_own_firm" on public.platform_transfers
  for all using (firm_id = public.current_firm_id());

-- ─── Ledger Entries ───────────────────────────────────────────────────────────
create policy "ledger_entries_own_firm" on public.ledger_entries
  for all using (firm_id = public.current_firm_id());

-- ─── Valuations ───────────────────────────────────────────────────────────────
create policy "valuations_own_firm" on public.valuations
  for all using (firm_id = public.current_firm_id());

-- ─── Benchmarks: system benchmarks (firm_id IS NULL) readable by all ─────────
create policy "benchmarks_read" on public.benchmarks
  for select using (firm_id is null or firm_id = public.current_firm_id());

create policy "benchmarks_write_own_firm" on public.benchmarks
  for insert with check (firm_id = public.current_firm_id());

create policy "benchmarks_update_own_firm" on public.benchmarks
  for update using (firm_id = public.current_firm_id());

-- ─── Benchmark Prices: readable if parent benchmark is accessible ─────────────
create policy "benchmark_prices_read" on public.benchmark_prices
  for select using (
    exists (
      select 1 from public.benchmarks b
      where b.id = benchmark_id
        and (b.firm_id is null or b.firm_id = public.current_firm_id())
    )
  );

create policy "benchmark_prices_write" on public.benchmark_prices
  for insert with check (
    exists (
      select 1 from public.benchmarks b
      where b.id = benchmark_id
        and b.firm_id = public.current_firm_id()
    )
  );

-- ─── Assets: readable by all authenticated users (shared master registry) ─────
create policy "assets_read" on public.assets
  for select using (auth.role() = 'authenticated');

-- ─── Asset Prices: readable by all authenticated ──────────────────────────────
create policy "asset_prices_read" on public.asset_prices
  for select using (auth.role() = 'authenticated');

-- ─── Integration Configs ──────────────────────────────────────────────────────
create policy "integration_configs_own_firm" on public.integration_configs
  for all using (firm_id = public.current_firm_id());

-- ─── Import Jobs ──────────────────────────────────────────────────────────────
create policy "import_jobs_own_firm" on public.import_jobs
  for all using (firm_id = public.current_firm_id());

-- ─── Alerts ───────────────────────────────────────────────────────────────────
create policy "alerts_own_firm" on public.alerts
  for all using (firm_id = public.current_firm_id());
