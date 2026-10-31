import test from "node:test";
import assert from "node:assert/strict";
import { initMarketPerformanceImport } from "../src/ai-investment-cycle/market-performance-ui.mjs";

class FakeElement {
  constructor() {
    this.value = "";
    this.files = [];
    this.checked = false;
    this.disabled = false;
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.handlers = {};
  }
  addEventListener(name, callback) { this.handlers[name] = callback; }
  async click(name = "click") { await this.handlers[name]?.(); }
  querySelector() { return this.finalCard ?? (this.finalCard = new FakeElement()); }
}

const tickers = ["MSFT", "GOOGL", "AMZN", "META", "SPY"];
const dates = [
  "2022-12-30",
  "2023-03-31", "2023-06-30", "2023-09-29", "2023-12-29",
  "2024-03-28", "2024-06-28", "2024-09-30", "2024-12-31",
  "2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31",
  "2026-03-31", "2026-06-30", "2026-09-30",
];
function csvFor(ticker, offset) {
  return "ticker,date,adjustedClose\n" + dates.map((date, index) =>
    ticker + "," + date + "," + (100 + offset + index * (offset + 2))
  ).join("\n");
}
function makeElements() {
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, new FakeElement());
    return elements.get(id);
  };
  $("marketSource").value = "Test licensed source";
  $("marketSourceUrl").value = "https://example.org/market-data";
  $("marketLicenseNote").value = "Fixture terms permit local test use";
  $("marketRightsConfirmed").checked = true;
  for (const [index, ticker] of tickers.entries()) {
    $("priceFile" + ticker).files = [{ text: async () => csvFor(ticker, index * 7) }];
  }
  $("summaryCards").finalCard = new FakeElement();
  return $;
}
function companySeries() {
  return ["Microsoft", "Alphabet", "Amazon", "Meta"].flatMap((company, companyIndex) =>
    Array.from({ length: 15 }, (_, index) => ({
      company,
      quarter: dates.slice(1)[index].slice(0, 4) + "-Q" + (Math.floor(index % 4) + 1),
      capexYoYPercent: 10 + index + companyIndex,
    }))
  );
}

test("imports five normalized CSVs and renders quarterly, trailing, and CAPEX-linkage analysis", async () => {
  const $ = makeElements();
  initMarketPerformanceImport({
    $,
    svgLineChart: series => "<svg data-series='" + series.length + "'></svg>",
    fmtPct: value => Number.isFinite(value) ? value.toFixed(1) + "%" : "—",
    getCompanySeries: companySeries,
  });
  await $("importMarketPrices").click();
  assert.match($("marketImportStatus").textContent, /검증 완료/);
  assert.match($("marketQuarterlyChart").innerHTML, /data-series='5'/);
  assert.match($("marketTrailingChart").innerHTML, /data-series='5'/);
  assert.match($("marketReturnsTable").innerHTML, /MSFT/);
  assert.match($("marketLinkageTable").innerHTML, /주주 총수익률/);
  assert.match($("marketCoverage").textContent, /공통 관측일/);
  assert.match($("summaryCards").finalCard.innerHTML, /최근 분기 기업 평균 수익률/);
});

test("blocks import when the user has not confirmed source rights and adjustment methodology", async () => {
  const $ = makeElements();
  $("marketRightsConfirmed").checked = false;
  initMarketPerformanceImport({
    $,
    svgLineChart: () => "<svg></svg>",
    fmtPct: value => String(value),
    getCompanySeries: companySeries,
  });
  await $("importMarketPrices").click();
  assert.match($("marketImportStatus").textContent, /이용 조건과 배당·분할 조정방식/);
  assert.equal($("marketQuarterlyChart").innerHTML, "");
});

test("clear action removes selected files and resets market-return displays", async () => {
  const $ = makeElements();
  initMarketPerformanceImport({
    $,
    svgLineChart: () => "<svg></svg>",
    fmtPct: value => String(value),
    getCompanySeries: companySeries,
  });
  await $("importMarketPrices").click();
  await $("clearMarketPrices").click();
  assert.equal($("priceFileMSFT").value, "");
  assert.equal($("marketRightsConfirmed").checked, false);
  assert.match($("marketImportStatus").textContent, /아직 등록되지 않았습니다/);
  assert.match($("marketReturnsTable").innerHTML, /자료 미등록/);
});
