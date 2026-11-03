import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../six-company-price-preview.html", import.meta.url), "utf8");

test("six-company price preview is isolated from production and uses local CSV imports only", () => {
  assert.match(html, /SIX-COMPANY PREVIEW/);
  assert.match(html, /운영 대시보드 및 Supabase와 미연결/);
  assert.match(html, /parseSixCompanyPriceCsv/);
  assert.match(html, /multiple/);
  assert.doesNotMatch(html, /fetch\(["']https?:\/\//i);
  assert.doesNotMatch(html, /SUPABASE_URL|supabase-js|apiKey|apikey/i);
});

test("preview renders the three requested price views and shared controls", () => {
  assert.match(html, /① 일별 수정종가/);
  assert.match(html, /② 분기별 수정종가/);
  assert.match(html, /③ 기준일 100 지수/);
  assert.match(html, /id="company"/);
  assert.match(html, /id="period"/);
  assert.match(html, /분기별 수정종가/);
});

test("preview labels adjusted-close basis, SPCX listing start, and partial 2026 Q4", () => {
  assert.match(html, /배당 및 주식분할 반영 수정종가/);
  assert.match(html, /SPCX는 상장 후 별도 시작/);
  assert.match(html, /2026년 4분기는 2026-10-30까지의 부분 자료/);
});

test("indexed chart explicitly displays each selected company's actual baseline date", () => {
  assert.match(html, /id="indexBasis"/);
  assert.match(html, /기준일\(각 종목의 선택 기간 내 최초 관측일\)/);
  assert.match(html, /indexed\.find\(r=>r\.ticker===t\)/);
});

test("clearing price data also clears stale index baseline and range labels", () => {
  assert.match(html, /indexBasis"\)\.textContent="기준일 자료를 불러오면 종목별 기준일을 표시합니다\."/);
  assert.match(html, /rangeNote"\)\.textContent="자료를 불러오면 조회 기간이 표시됩니다\."/);
});

test("price import warns when cumulative data omits one or more supported companies", () => {
  assert.match(html, /const missingTickers=merged\.coverage\.filter\(item=>item\.count===0\)/);
  assert.match(html, /주의: .*자료가 누적 데이터에 없습니다/);
  assert.match(html, /6개 종목 자료 포함/);
  assert.match(html, /누적자료 종목별 현황/);
});
