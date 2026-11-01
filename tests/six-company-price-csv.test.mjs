import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSixCompanyPriceCsv,
  SPCX_LISTING_DATE,
  SIX_COMPANY_PRICE_TICKERS,
} from "../src/ai-investment-cycle/six-company-price-csv.mjs";

test("parses a combined six-company CSV, sorts observations, and reports partial coverage", () => {
  const csv = [
    "date,ticker,close",
    "2026-10-02,MSFT,523.10",
    "2026-10-01,SPCX,185.40",
    "2026-10-01,MSFT,521.40",
    "2026-10-01,GOOGL,248.30",
  ].join("\n");
  const result = parseSixCompanyPriceCsv(csv);
  assert.equal(result.importMethod, "manual-csv");
  assert.equal(result.currency, "USD");
  assert.equal(result.priceBasis, "unadjusted-close");
  assert.deepEqual(result.observations.map(row => [row.date, row.ticker]), [
    ["2026-10-01", "GOOGL"],
    ["2026-10-01", "MSFT"],
    ["2026-10-01", "SPCX"],
    ["2026-10-02", "MSFT"],
  ]);
  assert.equal(result.coverage.find(row => row.ticker === "MSFT").count, 2);
  assert.equal(result.coverage.find(row => row.ticker === "TSLA").count, 0);
});

test("accepts all six supported symbols and same date across different symbols", () => {
  const csv = [
    "date,ticker,close",
    ...SIX_COMPANY_PRICE_TICKERS.map(ticker => `2026-10-01,${ticker},100.25`),
  ].join("\n");
  assert.equal(parseSixCompanyPriceCsv(csv).observations.length, 6);
});

test("supports UTF-8 BOM, CRLF, and quoted fields without changing numeric semantics", () => {
  const result = parseSixCompanyPriceCsv("\uFEFFdate,ticker,close\r\n2026-10-01,MSFT,\"521.40\"\r\n");
  assert.equal(result.observations[0].close, 521.4);
});

test("rejects malformed headers, rows, dates, and unsupported tickers", () => {
  assert.throws(() => parseSixCompanyPriceCsv("ticker,date,close\\nMSFT,2026-10-01,10"), /header/);
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-10-01,MSFT"), /columns/);
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-02-30,MSFT,10"), /valid YYYY-MM-DD/);
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-10-01,SPY,10"), /ticker must be one of/);
});

test("rejects duplicate ticker-date observations and non-positive or non-numeric closes", () => {
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-10-01,MSFT,10\\n2026-10-01,MSFT,11"), /Duplicate price observation/);
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-10-01,MSFT,0"), /positive decimal/);
  assert.throws(() => parseSixCompanyPriceCsv("date,ticker,close\\n2026-10-01,MSFT,1,000"), /columns/);
});

test("enforces the SpaceX listing-date boundary", () => {
  assert.throws(() => parseSixCompanyPriceCsv(`date,ticker,close\\n2026-06-11,SPCX,100`), new RegExp(SPCX_LISTING_DATE));
  assert.equal(parseSixCompanyPriceCsv(`date,ticker,close\\n${SPCX_LISTING_DATE},SPCX,100`).observations[0].ticker, "SPCX");
});
