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
