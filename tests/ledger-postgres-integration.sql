-- Apply after both ledger migrations have been applied to the ephemeral CI database.
\set ON_ERROR_STOP on

-- Seed one row for another user as the database owner (RLS bypass).
insert into public.ledger_transactions (
  user_id, transaction_date, sequence_no, transaction_type,
  symbol, quantity, unit_price, currency, idempotency_key
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-30', 1, 'BUY',
  'TSLA', 1, 250, 'USD', 'user-b-seed'
);

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

-- Authenticated user can create their own row.
insert into public.ledger_transactions (
  user_id, transaction_date, sequence_no, transaction_type,
  symbol, quantity, unit_price, currency, idempotency_key
) values (
  auth.uid(), '2026-10-30', 1, 'BUY', 'TSLA', 2, 200, 'USD', 'user-a-buy'
);

-- RLS must hide the other user's row.
do $$
begin
  if (select count(*) from public.ledger_transactions) <> 1 then
    raise exception 'RLS read isolation failed: expected exactly one visible row';
  end if;
end;
$$;

-- RLS must reject writes targeting another user.
do $$
begin
  begin
    insert into public.ledger_transactions (
      user_id, transaction_date, sequence_no, transaction_type,
      symbol, quantity, unit_price, currency, idempotency_key
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-30', 2, 'BUY',
      'TSLA', 1, 200, 'USD', 'cross-user-write'
    );
    raise exception 'RLS write isolation failed: cross-user insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

-- Same idempotency key for one user must be rejected.
do $$
begin
  begin
    insert into public.ledger_transactions (
      user_id, transaction_date, sequence_no, transaction_type,
      symbol, quantity, unit_price, currency, idempotency_key
    ) values (
      auth.uid(), '2026-10-31', 1, 'BUY', 'TSLA', 1, 200, 'USD', 'user-a-buy'
    );
    raise exception 'Idempotency test failed: duplicate key unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;
end;
$$;

-- A repeated sequence number on the same user/date must be rejected.
do $$
begin
  begin
    insert into public.ledger_transactions (
      user_id, transaction_date, sequence_no, transaction_type,
      symbol, quantity, unit_price, currency, idempotency_key
    ) values (
      auth.uid(), '2026-10-30', 1, 'BUY', 'NVDA', 1, 100, 'USD', 'user-a-seq-duplicate'
    );
    raise exception 'Sequence uniqueness test failed: duplicate sequence unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;
end;
$$;

-- Dividend amount, withholding, and fee validation.
insert into public.ledger_transactions (
  user_id, transaction_date, sequence_no, transaction_type,
  symbol, gross_amount, fees, withholding_tax, currency, idempotency_key
) values (
  auth.uid(), '2026-10-30', 2, 'DIVIDEND',
  'TSLA', 10, 1, 2, 'USD', 'user-a-dividend'
);

do $$
begin
  begin
    insert into public.ledger_transactions (
      user_id, transaction_date, sequence_no, transaction_type,
      symbol, gross_amount, fees, withholding_tax, currency, idempotency_key
    ) values (
      auth.uid(), '2026-10-30', 3, 'DIVIDEND',
      'TSLA', 10, 2, 9, 'USD', 'user-a-invalid-dividend'
    );
    raise exception 'Dividend constraint test failed: invalid withholding/fees unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
end;
$$;

rollback;

-- Confirm migration did not alter legacy tables or their sentinel rows.
reset role;
do $$
begin
  if (select marker from public.holdings where symbol = 'KEEP-HOLDINGS') <> 'untouched'
     or (select marker from public.transactions where id = 1) <> 'untouched'
     or (select marker from public.instruments where symbol = 'KEEP-INSTRUMENTS') <> 'untouched' then
    raise exception 'Legacy table isolation failed';
  end if;
end;
$$;

select 'PostgreSQL ledger integration checks passed' as result;
