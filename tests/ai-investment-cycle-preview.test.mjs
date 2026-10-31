import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../ai-investment-cycle-preview.html", import.meta.url), "utf8");

test("AI investment cycle preview is isolated from the production dashboard entry point", () => {
  assert.match(html, /ANALYSIS PREVIEW/);
  assert.match(html, /기존 운영 대시보드와 미연결/);
  assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*(?:supabase|quote|marketdata)/i);
});

test("preview loads source-backed CAPEX and business history through local repository data files", () => {
  assert.match(html, /hyperscaler-capex-quarterly-2023-2026\.json/);
  assert.match(html, /business-performance-microsoft-quarterly-2023-2026\.json/);
  assert.match(html, /business-performance-alphabet-quarterly-2023-2026\.json/);
  assert.match(html, /business-performance-aws-quarterly-2023-2026\.json/);
  assert.match(html, /business-performance-meta-quarterly-2023-2026\.json/);
  assert.match(html, /deriveQuarterlyBusinessSeries/);
  assert.match(html, /deriveCapexDeceleration/);
});

test("CAPEX chart aligns all companies to the same quarter axis and preserves missing quarters", () => {
  assert.match(html, /const quarters=\[\.\.\.new Set\(capexRows\.map\(r=>r\.quarter\)\)\]\.sort\(\)/);
  assert.match(html, /return \{quarter,value:row\?row\.capexUsdM\/1000:null\}/);
});

test("preview explicitly distinguishes company-wide CAPEX, mixed business metrics, and unavailable shareholder returns", () => {
  assert.match(html, /AI 전용 CAPEX가 아닙니다/);
  assert.match(html, /AI와 비AI 사업이 혼합된 지표/);
  assert.match(html, /주가 데이터가 아직 등록되지 않았습니다/);
  assert.match(html, /AI CAPEX의 투자수익률\(ROI\)이 아닙니다/);
  assert.match(html, /매수·매도 신호를 제공하지 않습니다/);
});

test("preview does not introduce live market-price fetching or provider credentials", () => {
  assert.doesNotMatch(html, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(html, /apiKey|apikey|SUPABASE_URL|supabase-js/i);
  assert.match(html, /조정주가 데이터 미수집/);
});
