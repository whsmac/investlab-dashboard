import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/review-only/20261108_atomic_shared_import_rpc.sql',import.meta.url),'utf8');
test('atomic import RPC is explicitly review-only and scoped to shared tables',()=>{
  assert.match(sql,/REVIEW ONLY/);
  assert.match(sql,/security invoker/i);
  assert.match(sql,/app_private\.is_data_owner\(\)/);
  assert.match(sql,/grant execute on function public\.import_shared_observations\(text,jsonb,text,text,text\) to authenticated/i);
  assert.doesNotMatch(sql,/insert into public\.ledger_transactions|update public\.ledger_transactions|delete from public\.ledger_transactions/i);
});
test('atomic import RPC inserts batch and observations within one function transaction',()=>{
  assert.match(sql,/insert into public\.import_batches/i);
  assert.match(sql,/insert into public\.market_price_observations/i);
  assert.match(sql,/insert into public\.quarterly_financial_observations/i);
  assert.match(sql,/raise exception 'Row count mismatch; transaction rolled back'/);
  assert.match(sql,/status='committed'/);
  assert.doesNotMatch(sql,/on conflict do update/i);
});
