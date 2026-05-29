-- Migration 001: Core schema
-- Run after creating a fresh Supabase project

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type wrapper_type as enum ('SIPP','ISA','GIA','OFFSHORE_BOND','LISA','JISA');
create type sub_account_type as enum ('DIRECT_HOLDINGS','DISCRETIONARY_MANDATE','SUB_GIA');
create type transaction_type as enum (
  'BUY','SELL','DIVIDEND','INTEREST','FEE','TAX',
  'TRANSFER_IN_SPECIE','TRANSFER_OUT_SPECIE',
  'TRANSFER_IN_CASH','TRANSFER_OUT_CASH',
  'CORPORATE_ACTION_SPLIT','CORPORATE_ACTION_MERGE',
  'CONTRIBUTION','WITHDRAWAL','BENEFIT_CRYSTALLISATION'
);
create type asset_class    as enum ('EQUITY','FIXED_INCOME','CASH','ALTERNATIVES','PROPERTY','COMMODITY','MIXED');
create type risk_profile   as enum ('VERY_LOW','LOW','MEDIUM_LOW','MEDIUM','MEDIUM_HIGH','HIGH','VERY_HIGH');
create type import_status  as enum ('PENDING','PROCESSING','COMPLETED','FAILED');
create type alert_severity as enum ('INFO','WARNING','CRITICAL');
create type alert_category as enum ('PERFORMANCE_ANOMALY','DATA_GAP','PENDING_TRANSFER','COMPLIANCE_FLAG','RECONCILIATION_ERROR');
create type ledger_side    as enum ('DEBIT','CREDIT');

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.firms (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  fca_reference text        unique,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.advisers (
  id           uuid        primary key default gen_random_uuid(),
  firm_id      uuid        not null references public.firms(id),
  auth_user_id uuid        unique,               -- references auth.users(id)
  first_name   text        not null,
  last_name    text        not null,
  email        text        not null unique,
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index advisers_firm_id_idx on public.advisers(firm_id);

create table public.clients (
  id                 uuid         primary key default gen_random_uuid(),
  firm_id            uuid         not null references public.firms(id),
  adviser_id         uuid         not null references public.advisers(id),
  first_name         text         not null,
  last_name          text         not null,
  date_of_birth      date,
  national_insurance text,
  risk_profile       risk_profile not null default 'MEDIUM',
  last_review_date   date,
  is_active          boolean      not null default true,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now()
);
create index clients_firm_id_idx    on public.clients(firm_id);
create index clients_adviser_id_idx on public.clients(adviser_id);

create table public.tax_wrappers (
  id                 uuid         primary key default gen_random_uuid(),
  firm_id            uuid         not null references public.firms(id),
  client_id          uuid         not null references public.clients(id),
  wrapper_type       wrapper_type not null,
  platform_name      text,
  platform_reference text,
  currency           char(3)      not null default 'GBP',
  is_active          boolean      not null default true,
  opened_date        date,
  closed_date        date,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now()
);
create index tax_wrappers_firm_id_idx      on public.tax_wrappers(firm_id);
create index tax_wrappers_client_id_idx    on public.tax_wrappers(client_id);
create index tax_wrappers_wrapper_type_idx on public.tax_wrappers(wrapper_type);

create table public.sub_accounts (
  id                    uuid             primary key default gen_random_uuid(),
  firm_id               uuid             not null references public.firms(id),
  tax_wrapper_id        uuid             not null references public.tax_wrappers(id),
  name                  text             not null,
  sub_account_type      sub_account_type not null default 'DIRECT_HOLDINGS',
  discretionary_manager text,
  is_active             boolean          not null default true,
  created_at            timestamptz      not null default now(),
  updated_at            timestamptz      not null default now()
);
create index sub_accounts_firm_id_idx       on public.sub_accounts(firm_id);
create index sub_accounts_tax_wrapper_id_idx on public.sub_accounts(tax_wrapper_id);

create table public.assets (
  id          uuid        primary key default gen_random_uuid(),
  isin        char(12)    unique,
  sedol       char(7)     unique,
  ticker      text,
  name        text        not null,
  asset_class asset_class not null default 'EQUITY',
  currency    char(3)     not null default 'GBP',
  exchange    text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table public.asset_prices (
  id         uuid        primary key default gen_random_uuid(),
  asset_id   uuid        not null references public.assets(id),
  price_date date        not null,
  open       numeric(18,6),
  high       numeric(18,6),
  low        numeric(18,6),
  close      numeric(18,6) not null,
  volume     bigint,
  currency   char(3)     not null default 'GBP',
  unique (asset_id, price_date)
);
create index asset_prices_price_date_idx on public.asset_prices(price_date);

create table public.holdings (
  id              uuid        primary key default gen_random_uuid(),
  firm_id         uuid        not null references public.firms(id),
  sub_account_id  uuid        not null references public.sub_accounts(id),
  asset_id        uuid        not null references public.assets(id),
  units           numeric(20,8) not null,
  avg_cost_basis  numeric(18,6) not null,
  currency        char(3)     not null default 'GBP',
  last_price      numeric(18,6),
  last_price_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (sub_account_id, asset_id)
);
create index holdings_firm_id_idx on public.holdings(firm_id);

create table public.platform_transfers (
  id                  uuid        primary key default gen_random_uuid(),
  firm_id             uuid        not null references public.firms(id),
  from_platform       text        not null,
  to_platform         text        not null,
  transfer_date       date        not null,
  settled_date        date,
  is_complete         boolean     not null default false,
  original_cost_basis numeric(18,6),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.transactions (
  id                   uuid             primary key default gen_random_uuid(),
  firm_id              uuid             not null references public.firms(id),
  sub_account_id       uuid             not null references public.sub_accounts(id),
  asset_id             uuid             references public.assets(id),
  transaction_type     transaction_type not null,
  trade_date           date             not null,
  settlement_date      date,
  units                numeric(20,8),
  price                numeric(18,6),
  gross_amount         numeric(18,4)    not null,
  net_amount           numeric(18,4)    not null,
  fees                 numeric(18,4)    not null default 0,
  currency             char(3)          not null default 'GBP',
  is_book_over         boolean          not null default false,
  platform_transfer_id uuid             references public.platform_transfers(id),
  external_ref         text,
  notes                text,
  created_at           timestamptz      not null default now()
);
create index transactions_firm_id_idx       on public.transactions(firm_id);
create index transactions_sub_account_id_idx on public.transactions(sub_account_id);
create index transactions_trade_date_idx    on public.transactions(trade_date);
create index transactions_type_idx          on public.transactions(transaction_type);

create table public.ledger_entries (
  id             uuid        primary key default gen_random_uuid(),
  firm_id        uuid        not null references public.firms(id),
  transaction_id uuid        not null references public.transactions(id),
  account_code   text        not null,
  side           ledger_side not null,
  amount         numeric(18,4) not null,
  currency       char(3)     not null default 'GBP',
  created_at     timestamptz not null default now()
);
create index ledger_entries_transaction_id_idx on public.ledger_entries(transaction_id);
create index ledger_entries_firm_id_idx        on public.ledger_entries(firm_id);

create table public.valuations (
  id             uuid        primary key default gen_random_uuid(),
  firm_id        uuid        not null references public.firms(id),
  tax_wrapper_id uuid        not null references public.tax_wrappers(id),
  valuation_date date        not null,
  market_value   numeric(18,4) not null,
  cost_basis     numeric(18,4) not null,
  currency       char(3)     not null default 'GBP',
  created_at     timestamptz not null default now(),
  unique (tax_wrapper_id, valuation_date)
);
create index valuations_firm_id_date_idx on public.valuations(firm_id, valuation_date);

create table public.benchmarks (
  id                uuid        primary key default gen_random_uuid(),
  firm_id           uuid        references public.firms(id),   -- null = system benchmark
  name              text        not null,
  description       text,
  is_blended        boolean     not null default false,
  blend_composition jsonb,
  currency          char(3)     not null default 'GBP',
  created_at        timestamptz not null default now()
);

create table public.benchmark_prices (
  id           uuid        primary key default gen_random_uuid(),
  benchmark_id uuid        not null references public.benchmarks(id),
  price_date   date        not null,
  level        numeric(18,6) not null,
  currency     char(3)     not null default 'GBP',
  unique (benchmark_id, price_date)
);
create index benchmark_prices_price_date_idx on public.benchmark_prices(price_date);

create table public.integration_configs (
  id                text        primary key default gen_random_uuid(),
  firm_id           uuid        not null references public.firms(id),
  platform          text        not null,
  api_key_encrypted text        not null,
  api_base_url      text,
  is_active         boolean     not null default true,
  last_sync_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (firm_id, platform)
);

create table public.import_jobs (
  id             uuid         primary key default gen_random_uuid(),
  firm_id        uuid         not null references public.firms(id),
  source         text         not null,
  status         import_status not null default 'PENDING',
  storage_path   text,
  rows_total     int          not null default 0,
  rows_processed int          not null default 0,
  rows_failed    int          not null default 0,
  error_log      jsonb,
  started_at     timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz  not null default now()
);
create index import_jobs_firm_id_idx on public.import_jobs(firm_id);

create table public.alerts (
  id          uuid           primary key default gen_random_uuid(),
  firm_id     uuid           not null references public.firms(id),
  client_id   uuid           references public.clients(id),
  category    alert_category not null,
  severity    alert_severity not null default 'WARNING',
  title       text           not null,
  message     text           not null,
  metadata    jsonb,
  is_resolved boolean        not null default false,
  resolved_at timestamptz,
  created_at  timestamptz    not null default now()
);
create index alerts_firm_id_resolved_idx on public.alerts(firm_id, is_resolved);

-- Seed system benchmarks (no firm_id = available to all)
insert into public.benchmarks (id, name, description, currency) values
  (gen_random_uuid(), 'S&P 500',    'S&P 500 Total Return Index (USD)',    'USD'),
  (gen_random_uuid(), 'FTSE 100',   'FTSE 100 Total Return Index (GBP)',   'GBP'),
  (gen_random_uuid(), 'MSCI World', 'MSCI World Total Return Index (USD)', 'USD');
