-- Migration 004: Explicit grants for authenticated and service_role

-- ─── Authenticated users (via RLS) ───────────────────────────────────────────
grant select, insert, update, delete on public.firms               to authenticated;
grant select, insert, update, delete on public.advisers            to authenticated;
grant select, insert, update, delete on public.clients             to authenticated;
grant select, insert, update, delete on public.tax_wrappers        to authenticated;
grant select, insert, update, delete on public.sub_accounts        to authenticated;
grant select, insert, update, delete on public.holdings            to authenticated;
grant select, insert, update, delete on public.transactions        to authenticated;
grant select, insert, update, delete on public.platform_transfers  to authenticated;
grant select, insert, update, delete on public.ledger_entries      to authenticated;
grant select, insert, update, delete on public.valuations          to authenticated;
grant select, insert, update         on public.benchmarks          to authenticated;
grant select                         on public.benchmark_prices    to authenticated;
grant select                         on public.assets              to authenticated;
grant select                         on public.asset_prices        to authenticated;
grant select, insert, update, delete on public.integration_configs to authenticated;
grant select, insert, update, delete on public.import_jobs         to authenticated;
grant select, insert, update, delete on public.alerts              to authenticated;

-- Function grants
grant execute on function public.current_firm_id()                    to authenticated;
grant execute on function public.check_transaction_ledger_balance(uuid) to authenticated;
grant execute on function public.get_client_aum(uuid)                 to authenticated;
grant execute on function public.get_firm_aum(uuid)                   to authenticated;

-- ─── Service role (Edge Functions, price feed ingestion) ─────────────────────
-- service_role already bypasses RLS, but explicit grants are good practice
grant all on public.assets          to service_role;
grant all on public.asset_prices    to service_role;
grant all on public.benchmark_prices to service_role;
grant all on public.valuations      to service_role;
grant all on public.import_jobs     to service_role;
grant all on public.alerts          to service_role;
