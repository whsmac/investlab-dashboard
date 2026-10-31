import test from "node:test";
import assert from "node:assert/strict";
import { validateMarketPriceBundle } from "../src/ai-investment-cycle/market-data-bundle.mjs";

const tickers = ["MSFT", "GOOGL", "AMZN", "META", "SPY"];
const dates = ["2022-12-30", "2023-03-31", "2023-06-30"];
function bundle(overrides = {}) {
  return tickers.map((ticker, index) => ({
    schemaVersion: 1,
    ticker,
    currency: "USD",
    adjustmentBasis: "split_and_cash_dividends",
    source: "Pilot fixture",
    sourceUrl: "https://example.org/prices.csv",
    observations: dates.map((date, i) => ({ ticker, date, adjustedClose: 100 + index * 10 + i * (index + 1) })),
    ...overrides[ticker],
  }));
}

test("validates a five-symbol common-source bundle and derives quarterly company-vs-SPY returns", () => {
  const result = validateMarketPriceBundle(bundle(), { quarters: ["2023-Q1", "2023-Q2"] });
  assert.equal(result.status, "ready-for-analysis");
  assert.equal(result.baselineCommonDate, "2022-12-30");
  assert.equal(result.commonObservationCount, 3);
  assert.equal(result.quarterlyPerformance.length, 4);
  assert.equal(result.quarterlyPerformance[0].benchmark, "SPY");
  assert.equal(result.quarterlyPerformance[0].results[0].status, "ok");
});

test("blocks missing tickers and duplicate imported datasets", () => {
  const missing = validateMarketPriceBundle(bundle().filter(row => row.ticker !== "META"));
  assert.equal(missing.status, "blocked");
  assert.deepEqual(missing.missingTickers, ["META"]);
  const duplicate = validateMarketPriceBundle([...bundle(), bundle()[0]]);
  assert.equal(duplicate.status, "blocked");
  assert.ok(duplicate.errors.some(error => /Duplicate imported dataset/.test(error)));
});

test("blocks mixed source, currency, or adjustment methodology", () => {
  const rows = bundle({ GOOGL: { source: "Other source" } });
  const result = validateMarketPriceBundle(rows);
  assert.equal(result.status, "blocked");
  assert.ok(result.inconsistentMetadata.some(item => item.field === "source"));
});

test("blocks a set without a shared pre-2023 baseline", () => {
  const rows = bundle();
  for (const dataset of rows) {
    dataset.observations = dataset.observations.filter(row => row.date !== "2022-12-30");
  }
  const result = validateMarketPriceBundle(rows);
  assert.equal(result.status, "blocked");
  assert.equal(result.baselineCommonDate, null);
  assert.ok(result.errors.some(error => /on or before baseline/.test(error)));
});

test("rejects malformed options", () => {
  assert.throws(() => validateMarketPriceBundle([], { requiredTickers: ["SPY", "SPY"] }), /unique ticker/);
  assert.throws(() => validateMarketPriceBundle([], { baselineDate: "2023-02-30" }), /valid YYYY-MM-DD/);
});
