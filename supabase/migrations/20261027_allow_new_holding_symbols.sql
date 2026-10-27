-- Allow arbitrary valid ticker symbols in the existing holdings table.
-- This replaces the restrictive symbol whitelist while preserving all existing rows.
alter table public.holdings
  drop constraint if exists holdings_symbol_check;

alter table public.holdings
  add constraint holdings_symbol_check
  check (symbol = upper(symbol) and symbol ~ '^[A-Z0-9][A-Z0-9.-]{0,19}$');
