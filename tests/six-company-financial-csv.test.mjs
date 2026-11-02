import test from "node:test";
import assert from "node:assert/strict";
import { parseSixCompanyFinancialCsv } from "../src/ai-investment-cycle/six-company-financial-csv.mjs";

const header = "ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url";
test("parses quarterly revenue and CAPEX with issuer definitions and source URLs", () => {
  const result = parseSixCompanyFinancialCsv([
    header,
    "MSFT,2026-Q3,92.279,39.367,gross cash PP&E purchases,https://www.sec.gov/example",
    "SPCX,2026-Q3,14.575,19.593,YTD cash PP&E purchases less prior YTD,https://www.sec.gov/example",
  ].join("\n"));
  assert.equal(result.observations.length, 2);
  assert.equal(result.observations[0].revenueUsdBn, 92.279);
  assert.equal(result.observations[0].capexUsdBn, 39.367);
  assert.equal(result.observations[0].capexDefinition, "gross cash PP&E purchases");
});

test("allows missing metrics but requires at least one value and a CAPEX definition", () => {
  assert.equal(parseSixCompanyFinancialCsv([header, "META,2026-Q3,64.601,,,,",].join("\n")).observations[0].capexUsdBn, null);
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q3,64.601,33.942,,,",].join("\n")), /capex_definition/);
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q3,,,,,",].join("\n")), /revenue or CAPEX/);
});

test("rejects invalid period, duplicate ticker-period, unsupported ticker and invalid values", () => {
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q5,1,,,,",].join("\n")), /period/);
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q3,1,,,,", "META,2026-Q3,2,,,,",].join("\n")), /Duplicate/);
  assert.throws(() => parseSixCompanyFinancialCsv([header, "XYZ,2026-Q3,1,,,,",].join("\n")), /ticker/);
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q3,-1,,,,",].join("\n")), /non-negative/);
});

test("requires HTTPS source links when provided and exact headers", () => {
  assert.throws(() => parseSixCompanyFinancialCsv([header, "META,2026-Q3,1,,,http://example.com",].join("\n")), /HTTPS/);
  assert.throws(() => parseSixCompanyFinancialCsv(["ticker,period,revenue,capex,definition,url", "META,2026-Q3,1,,,,",].join("\n")), /Header/);
});
