import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261106090000_shared_data_schema_foundation.sql', import.meta.url),
  'utf8'
);

test('creates only the four shared-data public tables', () => {
  for (const table of [
    'companies',
    'import_batches',
    'market_price_observations',
    'quarterly_financial_observations'
  ]) {
    assert.match(migration, new RegExp('create table if not exists public\\.' + table));
    assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security'));
  }
});

test('keeps owner registration empty and writes owner-gated', () => {
  assert.match(migration, /create table if not exists app_private\.data_owners/);
  assert.doesNotMatch(migration, /insert into app_private\.data_owners/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /create policy "Owners manage market prices"[\s\S]*app_private\.is_data_owner/);
});

test('preserves observation provenance and revision constraints', () => {
  assert.match(migration, /import_batch_id bigint not null references public\.import_batches/);
  assert.match(migration, /unique \(company_id, trading_date, price_basis\)/);
  assert.match(migration, /unique \(company_id, fiscal_period, revision_number\)/);
  assert.match(migration, /where is_current/);
  assert.match(migration, /capex_definition/);
});

test('does not seed companies or financial observations', () => {
  assert.doesNotMatch(migration, /insert into public\.(companies|market_price_observations|quarterly_financial_observations)/i);
});
