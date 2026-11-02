import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../six-company-price-preview.html", import.meta.url), "utf8");

test("Phase 1 preview includes manual quarterly revenue and CAPEX panels", () => {
  assert.match(html, /분기 재무자료 가져오기/);
  assert.match(html, /④ 분기별 매출/);
  assert.match(html, /⑤ 분기별 CAPEX/);
  assert.match(html, /parseSixCompanyFinancialCsv/);
  assert.match(html, /six-company-quarterly-financial-template\.csv/);
});

test("financial charts use the same ticker and period controls and keep CAPEX definition visible", () => {
  assert.match(html, /const ticker=\$\("company"\)\.value/);
  assert.match(html, /const period=\$\("period"\)\.value/);
  assert.match(html, /CAPEX 산정 기준/);
  assert.match(html, /SEC 자동 수집은 이 단계에서 구현하지 않습니다/);
});

test("missing financial observations create chart gaps instead of false zero-value drops", () => {
  assert.match(html, /if\(!point\|\|!Number\.isFinite\(point\[valueKey\]\)\)\{drawing=false;continue;\}/);
});

test("shared company and period controls refresh financial charts even before price CSV is loaded", () => {
  assert.match(html, /function render\(\)\{\s*renderFinancial\(\);\s*if\(!allRows\.length\)return;/);
});

test("financial period selectors use rolling quarter windows rather than calendar-year cutoffs", () => {
  assert.match(html, /latestQuarterIndex-years\*4\+1/);
  assert.match(html, /quarterNumber\(row\.period\)/);
});

test("price CSV imports append to existing browser data and retain prior data on validation failure", () => {
  assert.match(html, /mergeSixCompanyPriceImports\(existingImport\?\[existingImport,\.\.\.imports\]:imports\)/);
  assert.match(html, /가져오기 실패: .*기존에 불러온 자료는 유지했습니다/);
  assert.doesNotMatch(html, /catch\(error\)\{allRows=\[\];quarterRows=\[\]/);
});

test("financial CSV imports append to existing quarters and preserve prior data on conflicts", () => {
  assert.match(html, /for\(const row of financialRows\)map\.set/);
  assert.match(html, /prior\.revenueUsdBn!==row\.revenueUsdBn/);
  assert.match(html, /재무자료 가져오기 실패: .*기존에 불러온 재무자료는 유지했습니다/);
  assert.doesNotMatch(html, /catch\(error\)\{financialRows=\[\]/);
});

test("financial coverage distinguishes absent company rows from blank revenue and CAPEX metrics", () => {
  assert.match(html, /id="financialCoverage"/);
  assert.match(html, /관측행 없음/);
  assert.match(html, /매출 .*개 · CAPEX .*개/);
  assert.match(html, /공란은 0으로 간주하지 않으며/);
  assert.match(html, /관측행이 없는 분기는 미수집 여부를 판정하지 않습니다/);
});
test("financial reset clears the displayed coverage summary", () => {
  assert.match(html, /financialCoverage"\)\.textContent="재무자료를 불러오면 기업별·지표별 입력 현황을 표시합니다\."/);
});

test("empty financial state is not mislabeled as six missing company observations", () => {
  assert.match(html, /if\(!financialRows\.length\)\{[\s\S]*?financialCoverage"\)\.textContent="재무자료를 불러오면 기업별·지표별 입력 현황을 표시합니다\."/);
});
