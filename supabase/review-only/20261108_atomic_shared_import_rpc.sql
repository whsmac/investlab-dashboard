-- REVIEW ONLY. Do not run without explicit approval for investlab-ledger-test.
-- Atomic owner-only import: one function call, one PostgreSQL transaction.
-- Does not touch ledger_transactions, auth.users or any production project.
begin;
create or replace function public.import_shared_observations(
  p_kind text,
  p_rows jsonb,
  p_source_name text default null,
  p_source_url text default null,
  p_file_name text default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_batch bigint;
  v_count integer;
  v_invalid integer;
begin
  if v_user is null or not (select app_private.is_data_owner()) then
    raise exception 'Not authorized to import shared data' using errcode='42501';
  end if;
  if p_kind not in ('price','financial') or p_kind is null then
    raise exception 'Unsupported import kind';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array'
     or jsonb_array_length(p_rows) not between 1 and 5000 then
    raise exception 'Expected JSON array with 1 to 5000 observations';
  end if;
  if p_source_url is not null and p_source_url !~ '^https://' then
    raise exception 'Source URL must be HTTPS';
  end if;
  -- Reject missing/unknown ticker, invalid values and duplicate logical keys
  -- before creating a batch. Table constraints provide a second safety layer.
  if p_kind='price' then
    select count(*) into v_invalid
    from jsonb_to_recordset(p_rows) as r(ticker text,trading_date date,close_price numeric,price_basis text,currency text)
    left join public.companies c on c.ticker=r.ticker
    where c.id is null or r.trading_date is null or r.close_price is null
       or r.close_price<=0 or r.price_basis is distinct from 'adjusted_close'
       or r.currency is distinct from 'USD'
       or (r.ticker='SPCX' and r.trading_date<'2026-06-12');
    if v_invalid>0 then raise exception 'Invalid market price observations'; end if;
    if exists (
      select 1 from jsonb_to_recordset(p_rows)
      as r(ticker text,trading_date date)
      group by ticker,trading_date having count(*)>1
    ) then raise exception 'Duplicate price keys in import'; end if;
  else
    select count(*) into v_invalid
    from jsonb_to_recordset(p_rows) as r(ticker text,fiscal_period text,revenue_usd_bn numeric,capex_usd_bn numeric,capex_definition text,source_url text)
    left join public.companies c on c.ticker=r.ticker
    where c.id is null or r.fiscal_period is null or r.fiscal_period !~ '^[0-9]{4}-Q[1-4]$'
      or (r.revenue_usd_bn is null and r.capex_usd_bn is null)
      or r.revenue_usd_bn<0 or r.capex_usd_bn<0
      or (r.capex_usd_bn is not null and nullif(btrim(r.capex_definition),'') is null)
      or (r.source_url is not null and r.source_url !~ '^https://');
    if v_invalid>0 then raise exception 'Invalid quarterly financial observations'; end if;
    if exists (
      select 1 from jsonb_to_recordset(p_rows)
      as r(ticker text,fiscal_period text)
      group by ticker,fiscal_period having count(*)>1
    ) then raise exception 'Duplicate financial keys in import'; end if;
  end if;

  insert into public.import_batches(dataset_type,source_name,source_url,file_name,status,row_count,accepted_count,submitted_by)
  values (case when p_kind='price' then 'market_price' else 'quarterly_financial' end,
          p_source_name,p_source_url,p_file_name,'validated',jsonb_array_length(p_rows),0,v_user)
  returning id into v_batch;

  if p_kind='price' then
    insert into public.market_price_observations
      (company_id,trading_date,close_price,price_basis,currency,import_batch_id)
    select c.id,r.trading_date,r.close_price,r.price_basis,r.currency,v_batch
    from jsonb_to_recordset(p_rows)
      as r(ticker text,trading_date date,close_price numeric,price_basis text,currency text)
    join public.companies c on c.ticker=r.ticker;
  else
    insert into public.quarterly_financial_observations
      (company_id,fiscal_period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url,import_batch_id)
    select c.id,r.fiscal_period,r.revenue_usd_bn,r.capex_usd_bn,r.capex_definition,r.source_url,v_batch
    from jsonb_to_recordset(p_rows)
      as r(ticker text,fiscal_period text,revenue_usd_bn numeric,capex_usd_bn numeric,capex_definition text,source_url text)
    join public.companies c on c.ticker=r.ticker;
  end if;
  get diagnostics v_count = row_count;
  if v_count<>jsonb_array_length(p_rows) then
    raise exception 'Row count mismatch; transaction rolled back';
  end if;
  update public.import_batches
    set status='committed',accepted_count=v_count,completed_at=now()
    where id=v_batch;
  return jsonb_build_object('batch_id',v_batch,'accepted_count',v_count,'status','committed');
end
$$;
revoke all on function public.import_shared_observations(text,jsonb,text,text,text) from public,anon;
grant execute on function public.import_shared_observations(text,jsonb,text,text,text) to authenticated;
commit;
