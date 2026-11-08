import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261106090000_shared_data_schema_foundation.sql', import.meta.url),
  'utf8'
);

const tables = [
  'companies',
  'import_batches',
  'market_price_observations',
  'quarterly_financial_observations'
];

test('preflight aborts rather than adopting pre-existing target objects', () => {
  assert.match(migration, /raise exception 'Preflight required:[\s\S]*app_private already exists/i);
  assert.match(migration, /to_regclass\('public\.companies'\)/);
  assert.match(migration, /to_regclass\('public\.quarterly_financial_observations'\)/);
  assert.doesNotMatch(migration, /create table if not exists public\./i);
});

test('creates the four expected tables with RLS and authenticated read policies', () => {
  for (const table of tables) {
    assert.match(migration, new RegExp('create table public\\.' + table + '\\s*\\('));
    assert.match(migration, new RegExp('alter table public\\.' + table + ' enable row level security'));
    assert.match(migration, new RegExp('on public\\.' + table + ' for select to authenticated'));
    assert.match(migration, new RegExp('on public\\.' + table + ' for all to authenticated'));
  }
});

test('owner helper is private, hardened, and has no seeded owner', () => {
  assert.match(migration, /create table app_private\.data_owners/);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /revoke all on table app_private\.data_owners from public, anon, authenticated/);
  assert.match(migration, /alter table app_private\\.data_owners enable row level security/i);
  assert.match(migration, /grant execute on function app_private\.is_data_owner\(\) to authenticated/);
  assert.doesNotMatch(migration, /insert into app_private\.data_owners/i);
});

test('import ownership and data provenance are enforced', () => {
  assert.match(migration, /submitted_by uuid not null references auth\.users\(id\)/);
  assert.match(migration, /and submitted_by = \(select auth\.uid\(\)\)/);
  assert.equal((migration.match(/import_batch_id bigint not null references public\.import_batches/g) ?? []).length, 2);
  assert.match(migration, /source_url text check \(source_url is null or source_url ~ '\^https:\/\/'\)/);
});

test('market-price duplicates and financial revisions are constrained', () => {
  assert.match(migration, /unique \(company_id, trading_date, price_basis\)/);
  assert.match(migration, /unique \(company_id, fiscal_period, revision_number\)/);
  assert.match(migration, /create unique index quarterly_financial_one_current_idx[\s\S]*where is_current/);
  assert.match(migration, /check \(capex_usd_bn is null or length\(trim\(coalesce\(capex_definition, ''\)\)\) > 0\)/);
});

test('migration contains no seed data or changes to personal ledger tables', () => {
  assert.doesNotMatch(migration, /insert into public\.(companies|market_price_observations|quarterly_financial_observations)/i);
  assert.doesNotMatch(migration, /\b(holdings|instruments|transactions)\b/i);
});
