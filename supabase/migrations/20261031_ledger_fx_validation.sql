-- Define FX rate direction and fee treatment for the isolated unified ledger.
-- FX applied_fx_rate is quoted as target-currency units per one source-currency unit.
-- FX fees are denominated in currency (= to_currency) and reduce the target cash credit.
-- Cash deposit/withdrawal fees use transaction currency; opening balances are already net.

alter table public.ledger_transactions
  add constraint ledger_transactions_opening_balance_fee_zero check (
    transaction_type not in ('OPENING_POSITION', 'OPENING_CASH') or fees = 0
  );

alter table public.ledger_transactions
  add constraint ledger_transactions_cash_deposit_fee_limit check (
    transaction_type <> 'CASH_DEPOSIT' or fees <= gross_amount
  );

alter table public.ledger_transactions
  add constraint ledger_transactions_fx_fee_limit check (
    transaction_type <> 'FX_CONVERSION' or fees <= to_amount
  );

alter table public.ledger_transactions
  add constraint ledger_transactions_fx_rate_consistency check (
    transaction_type <> 'FX_CONVERSION'
    or (
      applied_fx_rate is not null
      and abs(applied_fx_rate - (to_amount / from_amount))
        <= greatest(0.00000001, abs(to_amount / from_amount) * 0.00000001)
    )
  );
