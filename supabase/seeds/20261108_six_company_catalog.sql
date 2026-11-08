-- INVESTLAB six-company catalog seed (TEST project only).
-- Run manually in the SQL Editor of investlab-ledger-test after verifying the project.
-- This is NOT a migration, and does not touch ledger_transactions or auth data.
-- Intended universe verified against PR #27 (docs/six-company-sec-ingestion.md).
-- Do not infer exchange, listing date, or fiscal year-end from ticker alone.
begin;

do $verify$
begin
  if to_regclass('public.companies') is null then
    raise exception 'Shared companies table is missing. Stop before seeding.';
  end if;
  if exists (
    select 1
    from public.companies c
    join (values
      ('MSFT', 'Microsoft'),
      ('GOOGL', 'Alphabet'),
      ('AMZN', 'Amazon'),
      ('META', 'Meta Platforms'),
      ('TSLA', 'Tesla'),
      ('SPCX', 'SpaceX')
    ) as expected(ticker, company_name)
      on c.ticker = expected.ticker
    where c.company_name is distinct from expected.company_name
  ) then
    raise exception 'Existing company name differs from approved catalog. Review manually.';
  end if;
end
$verify$;

insert into public.companies (ticker, company_name)
values
  ('MSFT', 'Microsoft'),
  ('GOOGL', 'Alphabet'),
  ('AMZN', 'Amazon'),
  ('META', 'Meta Platforms'),
  ('TSLA', 'Tesla'),
  ('SPCX', 'SpaceX')
on conflict (ticker) do nothing;

commit;

-- Read-only verification (expect exactly six target ticker rows):
select ticker, company_name, is_active
from public.companies
where ticker in ('MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPCX')
order by ticker;
