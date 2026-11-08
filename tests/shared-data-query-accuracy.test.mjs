import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../shared-data.html', import.meta.url), 'utf8');

test('shared dashboard uses exact counts, not the 20-row display limit', () => {
  for (const table of ['companies', 'market_price_observations', 'quarterly_financial_observations']) {
    assert.match(html, new RegExp('client\\.from\\("'+table+'"\\)\\.select\\("[^"]+", \\{ count: "exact" \\}\\)'));
  }
  assert.match(html, /priceResult\.count/);
  assert.match(html, /financialResult\.count/);
  assert.match(html, /\.limit\(20\)/);
  assert.doesNotMatch(html, /\.limit\(100\)\)\)/);
});

test('latest financial observations use current revision only', () => {
  assert.match(html, /\.eq\("is_current", true\)/);
  assert.match(html, /\.order\("fiscal_period", \{ ascending: false \}\)/);
});

test('isolated read-only shared-data boundary is preserved', () => {
  assert.match(html, /https:\/\/gopofxyezhwpfbxebcrxd\.supabase\.co/);
  assert.doesNotMatch(html, /client\.from\([^)]*\)\.(insert|update|delete|upsert)\(/);
  assert.doesNotMatch(html, /client\.from\(["']ledger_transactions["']\)/);
});
