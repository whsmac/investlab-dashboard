import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../shared-data.html", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("shared data view is linked from the existing dashboard", () => {
  assert.match(dashboard, /href="\.\/shared-data\.html"/);
});

test("shared data uses a separate, fixed test-project connection", () => {
  assert.match(page, /https:\/\/gopofxyezhwpfxbecrxd\.supabase\.co/);
  assert.match(page, /investlab_shared_data_connection_v1/);
  assert.match(page, /investlab_shared_data_auth_v1/);
  assert.match(page, /url !== TARGET_URL/);
});

test("shared data view never exposes signup or write operations", () => {
  assert.doesNotMatch(page, /\.auth\.signUp\s*\(/);
  assert.doesNotMatch(page, /\.from\([^)]*\)\.(insert|upsert|update|delete)\s*\(/);
  assert.match(page, /\.select\(/);
  assert.match(page, /service_role/i);
  assert.match(page, /sb_secret_/i);
});

test("shared data page reads only the three approved shared tables", () => {
  for (const table of ["companies", "market_price_observations", "quarterly_financial_observations"]) {
    assert.match(page, new RegExp('"' + table + '"'));
  }
  assert.doesNotMatch(page, /ledger_transactions|from\(["']holdings["']\)/);
});


test("recent observations are ordered on the server before limiting results", () => {
  assert.match(page, /query\.order\("trading_date", \{ ascending: false \}\)/);
  assert.match(page, /query\.order\("fiscal_period", \{ ascending: false \}\)/);
  assert.match(page, /return query\.limit\(100\)/);
  assert.match(page, /count: "exact"/);
});
