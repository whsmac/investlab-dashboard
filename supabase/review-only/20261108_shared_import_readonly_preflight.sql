-- READ-ONLY preflight for investlab-ledger-test ONLY.
-- Run in the TEST project's SQL editor; do not run against personal/production projects.
-- This file contains SELECT statements only and makes no schema or data changes.
select
  current_database() as connected_database,
  current_user as execution_role,
  to_regclass('public.companies') is not null as companies_present,
  to_regclass('public.import_batches') is not null as batches_present,
  to_regclass('public.market_price_observations') is not null as prices_present,
  to_regclass('public.quarterly_financial_observations') is not null as financials_present,
  to_regclass('app_private.data_owners') is not null as owners_present,
  to_regprocedure('public.import_shared_observations(text,jsonb,text,text,text)') is not null as import_rpc_already_present;

select 'companies' as object_name, count(*) as row_count from public.companies
union all select 'import_batches', count(*) from public.import_batches
union all select 'market_price_observations', count(*) from public.market_price_observations
union all select 'quarterly_financial_observations', count(*) from public.quarterly_financial_observations;

select ticker, company_name from public.companies
where ticker in ('MSFT','GOOGL','AMZN','META','TSLA','SPCX')
order by ticker;

-- Do not output owner UUIDs or any secrets.
select count(*) as configured_owner_count from app_private.data_owners;
