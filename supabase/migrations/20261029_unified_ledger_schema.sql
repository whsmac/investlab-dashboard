-- INVESTLAB unified trade ledger: schema and RLS only.
-- Safe to apply before UI work: does not alter, copy, or delete public.holdings,
-- public.transactions, public.instruments, or any existing user data.
-- Review and apply manually in Supabase SQL Editor; this migration is not auto-deployed.

create table if not exists public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null,
  sequence_no integer not null check (sequence_no > 0),
  transaction_type text not null check (transaction_type in (
    'BUY', 'SELL', 'CASH_DEPOSIT', 'CASH_WITHDRAWAL',
    'FX_CONVERSION', 'OPENING_POSITION', 'OPENING_CASH'
  )),
  symbol text,
  quantity numeric(20,8),
  unit_price numeric(20,8),
  currency text not null default 'USD' check (currency in ('USD', 'KRW')),
  gross_amount numeric(20,8),
  fees numeric(20,8) not null default 0 check (fees >= 0),
  from_currency text,
  from_amount numeric(20,8),
  to_currency text,
  to_amount numeric(20,8),
  applied_fx_rate numeric(20,10),
  idempotency_key text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ledger_transactions_symbol_format check (
    symbol is null or (symbol = upper(symbol) and symbol ~ '^[A-Z0-9][A-Z0-9.-]{0,19}$')
  ),
  constraint ledger_transactions_positive_quantity check (
    quantity is null or quantity > 0
  ),
  constraint ledger_transactions_nonnegative_unit_price check (
    unit_price is null or unit_price >= 0
  ),
  constraint ledger_transactions_nonnegative_gross_amount check (
    gross_amount is null or gross_amount >= 0
  ),
  constraint ledger_transactions_positive_fx_amounts check (
    (from_amount is null or from_amount > 0) and
    (to_amount is null or to_amount > 0)
  ),
  constraint ledger_transactions_positive_fx_rate check (
    applied_fx_rate is null or applied_fx_rate > 0
  ),
  constraint ledger_transactions_fx_currencies check (
    (from_currency is null or from_currency in ('USD', 'KRW')) and
    (to_currency is null or to_currency in ('USD', 'KRW'))
  ),
  constraint ledger_transactions_type_fields check (
    (
      transaction_type in ('BUY', 'SELL', 'OPENING_POSITION')
      and symbol is not null
      and quantity is not null
      and unit_price is not null
      and gross_amount is null
      and from_currency is null and from_amount is null
      and to_currency is null and to_amount is null
    )
    or
    (
      transaction_type in ('CASH_DEPOSIT', 'CASH_WITHDRAWAL', 'OPENING_CASH')
      and symbol is null
      and quantity is null
      and unit_price is null
      and gross_amount is not null
      and from_currency is null and from_amount is null
      and to_currency is null and to_amount is null
    )
    or
    (
      transaction_type = 'FX_CONVERSION'
      and symbol is null
      and quantity is null
      and unit_price is null
      and gross_amount is null
      and from_currency is not null
      and from_amount is not null
      and to_currency is not null
      and to_amount is not null
      and from_currency <> to_currency
    )
  ),
  constraint ledger_transactions_cash_amount check (
    transaction_type not in ('CASH_DEPOSIT', 'CASH_WITHDRAWAL')
    or gross_amount > 0
  ),
  constraint ledger_transactions_opening_cash_amount check (
    transaction_type <> 'OPENING_CASH' or gross_amount >= 0
  ),
  constraint ledger_transactions_currency_consistency check (
    transaction_type <> 'FX_CONVERSION'
    or currency = to_currency
  ),
  constraint ledger_transactions_idempotency_unique unique (user_id, idempotency_key),
  constraint ledger_transactions_user_date_sequence unique (user_id, transaction_date, sequence_no)
);

create index if not exists ledger_transactions_user_date_idx
  on public.ledger_transactions (user_id, transaction_date, sequence_no);

create index if not exists ledger_transactions_user_symbol_date_idx
  on public.ledger_transactions (user_id, symbol, transaction_date, sequence_no)
  where symbol is not null;

alter table public.ledger_transactions enable row level security;

drop policy if exists "Users manage own ledger transactions" on public.ledger_transactions;
create policy "Users manage own ledger transactions"
  on public.ledger_transactions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.ledger_transactions to authenticated;
