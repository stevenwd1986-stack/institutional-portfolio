-- Migration 005: Price sync infrastructure for the advise-platform schema
-- Run this in the Supabase SQL editor for the advise-platform project
-- (https://supabase.com/dashboard/project/sjpywyynhgmqvblptkbi/sql)

-- ─── 1. Columns on instruments for correct GBX → GBP conversion ───────────────

ALTER TABLE public.instruments
  ADD COLUMN IF NOT EXISTS quote_currency text NOT NULL DEFAULT 'GBP';

ALTER TABLE public.instruments
  ADD COLUMN IF NOT EXISTS price_scale integer NOT NULL DEFAULT 1;

-- LSE equities are priced in pence (GBX) by EODHD — set those now.
-- You can refine per-instrument after if needed.
UPDATE public.instruments
SET quote_currency = 'GBX', price_scale = 100
WHERE exchange = 'LSE'
  AND quote_currency = 'GBP';

-- ─── 2. Price history table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.instrument_prices_daily (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id     uuid          NOT NULL REFERENCES public.instruments(id) ON DELETE CASCADE,
  price_date        date          NOT NULL,
  close_price_quote numeric(18,6) NOT NULL,
  close_price_gbp   numeric(18,6) NOT NULL,
  source            text          NOT NULL DEFAULT 'eodhd',
  daily_change_pct  numeric(8,4),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (instrument_id, price_date)
);

CREATE INDEX IF NOT EXISTS instrument_prices_daily_date_idx
  ON public.instrument_prices_daily(price_date DESC);

CREATE INDEX IF NOT EXISTS instrument_prices_daily_instrument_idx
  ON public.instrument_prices_daily(instrument_id);

-- ─── 3. Propagate prices into holdings ────────────────────────────────────────
-- Assumes holdings.instrument_id is the FK to instruments.
-- Run after every sync to keep current_price / current_value fresh.

CREATE OR REPLACE FUNCTION public.refresh_holding_prices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.holdings h
  SET
    current_price = latest.close_price_gbp,
    current_value = h.units * latest.close_price_gbp,
    updated_at    = now()
  FROM (
    SELECT DISTINCT ON (instrument_id)
      instrument_id,
      close_price_gbp
    FROM public.instrument_prices_daily
    ORDER BY instrument_id, price_date DESC
  ) latest
  WHERE h.instrument_id = latest.instrument_id;
END;
$$;

-- ─── 4. pg_cron schedule — runs Mon–Fri at 22:30 UTC (after LSE close) ────────
-- Enable the pg_cron extension first if not already:
--   Extensions tab → search "pg_cron" → enable
--
-- Then uncomment and run:
--
-- SELECT cron.schedule(
--   'sync-prices-nightly',
--   '30 22 * * 1-5',
--   $$
--     SELECT net.http_post(
--       url    := current_setting('app.supabase_url') || '/functions/v1/sync-prices',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.sync_prices_secret')
--       ),
--       body   := '{}'::jsonb
--     );
--   $$
-- );
