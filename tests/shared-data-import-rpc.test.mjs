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

test('RPC installation refuses to overwrite an existing function',()=>{
  assert.match(sql,/to_regprocedure\('public\.import_shared_observations\(text,jsonb,text,text,text\)'\)/);
  assert.match(sql,/create function public\.import_shared_observations/);
  assert.doesNotMatch(sql,/create or replace function public\.import_shared_observations/i);
});
test('preflight script is read-only and never reveals owner IDs',()=>{
  const preflight=readFileSync(new URL('../supabase/review-only/20261108_shared_import_readonly_preflight.sql',import.meta.url),'utf8');
  const active=preflight.replace(/--[^\n]*/g,'');
  assert.doesNotMatch(active,/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i);
  assert.match(active,/configured_owner_count/);
  assert.doesNotMatch(active,/select\s+user_id/i);
});

test('RPC installation uses a valid dollar-quoted PostgreSQL guard block',()=>{
  assert.match(sql,/\bdo \$\$\s*begin[\s\S]*?end \$\$;/i);
  assert.doesNotMatch(sql,/\bdo \$\s*begin/i);
  assert.match(sql,/\bbegin;[\s\S]*\bcommit;/i);
});
