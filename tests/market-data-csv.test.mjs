import test from "node:test";
import assert from "node:assert/strict";
import { parseAdjustedPriceCsv } from "../src/ai-investment-cycle/market-data-csv.mjs";

const metadata = {
  ticker: "MSFT",
  source: "Public downloadable sample",
  sourceUrl: "https://example.org/data",
  retrievedAt: "2026-10-31T06:00:00Z",
  adjustmentBasis: "split_and_cash_dividends",
  currency: "USD",
  licenseNote: "Pilot test fixture only; verify source terms before real import",
};

test("parses manual adjusted-price CSV, sorts dates, and preserves provenance", () => {
  const csv = "ticker,date,adjustedClose\r\nMSFT,2025-03-31,390.25\r\nMSFT,2024-12-31,378.10\r\n";
  const result = parseAdjustedPriceCsv(csv, metadata);
  assert.equal(result.importMethod, "manual-csv");
  assert.equal(result.adjustmentBasis, "split_and_cash_dividends");
  assert.equal(result.observations.length, 2);
  assert.equal(result.observations[0].date, "2024-12-31");
  assert.equal(result.observations[1].adjustedClose, 390.25);
  assert.equal(result.sourceUrl, metadata.sourceUrl);
  assert.equal(result.licenseNote, metadata.licenseNote);
});

test("supports quoted CSV fields and a UTF-8 BOM", () => {
  const csv = '\uFEFFticker,date,adjustedClose\nMSFT,2025-01-02,410.5\n';
  const result = parseAdjustedPriceCsv(csv, { ...metadata, source: "Source, with comma" });
  assert.equal(result.source, "Source, with comma");
  assert.equal(result.observations[0].adjustedClose, 410.5);
});

test("rejects missing or reordered headers and malformed rows", () => {
  assert.throws(() => parseAdjustedPriceCsv("date,ticker,adjustedClose\n2025-01-02,MSFT,10", metadata), /header/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02", metadata), /columns/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-02-30,10", metadata), /valid YYYY-MM-DD/);
});

test("rejects duplicate dates, ticker mismatch, and non-positive prices", () => {
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,10\nMSFT,2025-01-02,11", metadata), /Duplicate/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nSPY,2025-01-02,10", metadata), /ticker does not match/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,0", metadata), /positive decimal/);
  assert.throws(() => parseAdjustedPriceCsv('ticker,date,adjustedClose\nMSFT,2025-01-02,"1,000"', metadata), /positive decimal/);
});

test("requires explicit USD split-and-dividend adjustment and source provenance", () => {
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,10", { ...metadata, adjustmentBasis: "split_only" }), /split and cash-dividend/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,10", { ...metadata, currency: "KRW" }), /USD/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,10", { ...metadata, sourceUrl: "http://example.org" }), /HTTPS/);
  assert.throws(() => parseAdjustedPriceCsv("ticker,date,adjustedClose\nMSFT,2025-01-02,10", { ...metadata, retrievedAt: "2026-10-31" }), /ISO timestamp/);
});
