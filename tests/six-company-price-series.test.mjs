import test from "node:test";
import assert from "node:assert/strict";
import { mergeSixCompanyPriceImports, deriveQuarterlyAdjustedClose, deriveIndexedAdjustedClose, filterPricePeriod } from "../src/ai-investment-cycle/six-company-price-series.mjs";

const imported = observations => ({ currency: "USD", priceBasis: "adjusted-close", observations });

test("merges yearly imports, removes exact overlap, and rejects conflicting ticker-date values", () => {
  const a = imported([{ date: "2023-03-31", ticker: "MSFT", close: 100 }]);
  const b = imported([{ date: "2023-03-31", ticker: "MSFT", close: 100 }, { date: "2023-06-30", ticker: "MSFT", close: 110 }]);
  assert.equal(mergeSixCompanyPriceImports([a, b]).observations.length, 2);
  assert.throws(() => mergeSixCompanyPriceImports([a, imported([{ date: "2023-03-31", ticker: "MSFT", close: 101 }])]), /Conflicting adjusted close/);
});

test("derives quarter-end adjusted close from the last available trading date per ticker", () => {
  const rows = [
    { date: "2023-03-30", ticker: "MSFT", close: 99 },
    { date: "2023-03-31", ticker: "MSFT", close: 100 },
    { date: "2023-03-30", ticker: "GOOGL", close: 90 },
    { date: "2023-04-03", ticker: "MSFT", close: 105 },
  ];
  const q = deriveQuarterlyAdjustedClose(rows);
  assert.deepEqual(q.map(row => [row.ticker, row.quarter, row.date, row.close]), [
    ["GOOGL", "2023-Q1", "2023-03-30", 90],
    ["MSFT", "2023-Q1", "2023-03-31", 100],
    ["MSFT", "2023-Q2", "2023-04-03", 105],
  ]);
});

test("indexes each ticker independently from its first selected observation", () => {
  const rows = [
    { date: "2023-01-03", ticker: "MSFT", close: 100 },
    { date: "2023-01-04", ticker: "MSFT", close: 110 },
    { date: "2026-06-12", ticker: "SPCX", close: 50 },
    { date: "2026-06-13", ticker: "SPCX", close: 55 },
  ];
  const indexed = deriveIndexedAdjustedClose(rows);
  assert.deepEqual(indexed.map(row => Number(row.indexedClose.toFixed(6))), [100, 110, 100, 110]);
  assert.equal(indexed[2].baseDate, "2026-06-12");
});

test("filters period windows without forward filling", () => {
  const rows = [
    { date: "2023-01-03", ticker: "MSFT", close: 100 },
    { date: "2025-01-03", ticker: "MSFT", close: 200 },
    { date: "2026-10-30", ticker: "MSFT", close: 300 },
  ];
  assert.deepEqual(filterPricePeriod(rows, "1Y", "2026-10-30").map(row => row.close), [300]);
  assert.equal(filterPricePeriod(rows, "MAX", "2026-10-30").length, 3);
});
