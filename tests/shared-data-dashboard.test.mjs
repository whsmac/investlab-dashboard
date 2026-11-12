import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../shared-data.html", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("shared data view is linked from the existing dashboard", () => {
  assert.match(dashboard, /href="\.\/shared-data\.html"/);
});

test("shared data uses a separate, fixed test-project connection", () => {
  assert.match(page, /https:\/\/gopofxyezhwpfbxebcrxd\.supabase\.co/);
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

test("quarterly financial absence is explicit and never presented as zero-dollar performance", () => {
  assert.match(page, /financialTotal === 0/);
  assert.match(page, /분기 재무 데이터 없음/);
  assert.match(page, /미수집은 0 USD가 아닙니다/);
  assert.match(page, /\$\("financialCount"\)\.textContent = financialTotal\.toLocaleString/);
  assert.match(page, /\$\("prices"\)\.innerHTML = table/);
});

test("pilot instructions are read-only and describe the verified TEST baseline", () => {
  assert.match(page, /1차 Pilot 확인 순서/);
  assert.match(page, /기업 6개·주가 4,938건·분기 재무 0건/);
  assert.match(page, /2026-11-12 사전 확인 기준/);
  assert.match(page, /이 페이지는 데이터를 수정하지 않습니다/);
  assert.doesNotMatch(page, /공유 데이터 스키마 적용 전/);
});
