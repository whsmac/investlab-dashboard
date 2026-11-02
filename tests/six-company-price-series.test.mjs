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

test("period filtering keeps quarter-end closes derived from the complete daily history", () => {
  const daily = [
    { date: "2025-10-29", ticker: "MSFT", close: 100 },
    { date: "2025-10-30", ticker: "MSFT", close: 101 },
    { date: "2025-12-31", ticker: "MSFT", close: 110 },
    { date: "2026-01-02", ticker: "MSFT", close: 111 },
  ];
  const fullQuarterSeries = deriveQuarterlyAdjustedClose(daily);
  const windowed = filterPricePeriod(fullQuarterSeries, "1Y", "2026-10-30");
  assert.deepEqual(windowed.map(row => [row.quarter, row.date, row.close]), [
    ["2025-Q4", "2025-12-31", 110],
    ["2026-Q1", "2026-01-02", 111],
  ]);
});

test("quarter-end series is filtered after derivation, not recalculated from partial daily windows", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../six-company-price-preview.html", import.meta.url), "utf8");
  assert.match(html, /quarterFiltered=filterPricePeriod\(quarterRows,period,asOf\)/);
  assert.doesNotMatch(html, /quarterFiltered=deriveQuarterlyAdjustedClose\(filtered\)/);
});

test("indexed series sorts input chronologically before selecting each ticker baseline", () => {
  const rows = [
    { date: "2026-06-13", ticker: "SPCX", close: 55 },
    { date: "2023-01-04", ticker: "MSFT", close: 110 },
    { date: "2026-06-12", ticker: "SPCX", close: 50 },
    { date: "2023-01-03", ticker: "MSFT", close: 100 },
  ];
  const indexed = deriveIndexedAdjustedClose(rows);
  assert.deepEqual(indexed.map(row => [row.ticker, row.date, Number(row.indexedClose.toFixed(2))]), [
    ["MSFT", "2023-01-03", 100],
    ["MSFT", "2023-01-04", 110],
    ["SPCX", "2026-06-12", 100],
    ["SPCX", "2026-06-13", 110],
  ]);
  assert.deepEqual(indexed.filter(row => row.ticker === "SPCX").map(row => row.baseDate), ["2026-06-12", "2026-06-12"]);
});
