-- Extend the isolated unified ledger with dividend accounting.
-- Additive follow-up migration: safe for environments where the base ledger schema
-- has already been applied. This does not touch existing holdings or transactions.

alter table public.ledger_transactions
  add column if not exists withholding_tax numeric(20,8) not null default 0
  check (withholding_tax >= 0);

alter table public.ledger_transactions
  drop constraint if exists ledger_transactions_type_fields;

alter table public.ledger_transactions
  add constraint ledger_transactions_type_fields check (
    (
      transaction_type in ('BUY', 'SELL', 'OPENING_POSITION')
      and symbol is not null
      and quantity is not null
      and unit_price is not null
      and gross_amount is null
      and withholding_tax = 0
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
      and withholding_tax = 0
      and from_currency is null and from_amount is null
      and to_currency is null and to_amount is null
    )
    or
    (
      transaction_type = 'DIVIDEND'
      and symbol is not null
      and quantity is null
      and unit_price is null
      and gross_amount is not null
      and gross_amount > 0
      and withholding_tax <= gross_amount
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
      and withholding_tax = 0
      and from_currency is not null
      and from_amount is not null
      and to_currency is not null
      and to_amount is not null
      and from_currency <> to_currency
    )
  )
);

alter table public.ledger_transactions
  drop constraint if exists ledger_transactions_cash_amount;

alter table public.ledger_transactions
  add constraint ledger_transactions_cash_amount check (
    transaction_type not in ('CASH_DEPOSIT', 'CASH_WITHDRAWAL')
    or gross_amount > 0
  );

alter table public.ledger_transactions
  drop constraint if exists ledger_transactions_dividend_amount;

alter table public.ledger_transactions
  add constraint ledger_transactions_dividend_amount check (
    transaction_type <> 'DIVIDEND'
    or (gross_amount > 0 and withholding_tax >= 0 and withholding_tax + fees <= gross_amount)
  );
