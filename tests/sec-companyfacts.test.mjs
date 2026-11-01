import test from "node:test";
import assert from "node:assert/strict";
import {
  SEC_COMPANIES,
  SEC_ISSUER_FACT_CANDIDATES,
  extractCompanyFactObservations,
  fetchSecCompanyFacts,
  groupFactVersions,
} from "../src/ai-investment-cycle/sec-companyfacts.mjs";

function fixture() {
  return {
    cik: 789019,
    facts: { "us-gaap": {
      RevenueFromContractWithCustomerExcludingAssessedTax: {
        label: "Revenue",
        units: { USD: [
          { start: "2025-01-01", end: "2025-03-31", val: 100, form: "10-Q", fy: 2025, fp: "Q1", filed: "2025-04-25", accn: "0000789019-25-000001" },
          { start: "2025-01-01", end: "2025-06-30", val: 210, form: "10-Q", fy: 2025, fp: "Q2", filed: "2025-07-25", accn: "0000789019-25-000002" },
          { start: "2025-01-01", end: "2025-06-30", val: 215, form: "10-Q/A", fy: 2025, fp: "Q2", filed: "2025-08-01", accn: "0000789019-25-000003" },
          { start: "2025-01-01", end: "2025-06-30", val: 999, form: "8-K", fy: 2025, fp: "Q2", filed: "2025-07-25", accn: "0000789019-25-000004" },
        ] }
      },
      PaymentsToAcquirePropertyPlantAndEquipment: {
        label: "Payments to acquire PP&E",
        units: { USD: [
          { start: "2025-01-01", end: "2025-06-30", val: -40, form: "10-Q", fy: 2025, fp: "Q2", filed: "2025-07-25", accn: "0000789019-25-000005" },
        ] }
      }
    } }
  };
}

test("company universe contains six issuers and SpaceX listing boundary", () => {
  assert.deepEqual(Object.keys(SEC_COMPANIES), ["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"]);
  assert.equal(SEC_COMPANIES.SPCX.listedFrom, "2026-06-12");
  assert.equal(SEC_ISSUER_FACT_CANDIDATES.AMZN.capex, "PaymentsToAcquirePropertyPlantAndEquipment");
  assert.equal(SEC_ISSUER_FACT_CANDIDATES.AMZN.status, "statement_reviewed_tag_unverified");
  assert.equal(SEC_ISSUER_FACT_CANDIDATES.META.status, "statement_reviewed_tag_unverified");
  assert.equal(SEC_ISSUER_FACT_CANDIDATES.SPCX.revenue, null);
});

test("extracts only supported SEC periodic filings and preserves raw YTD values/sign", () => {
  const rows = extractCompanyFactObservations(fixture());
  assert.equal(rows.length, 4);
  const capex = rows.find(row => row.metric === "capex");
  assert.equal(capex.value, -40);
  assert.equal(capex.durationDays, 181);
  assert.equal(capex.fiscalPeriod, "Q2");
  assert.equal(rows.some(row => row.form === "8-K"), false);
});

test("retains amendments as separate filing versions", () => {
  const rows = extractCompanyFactObservations(fixture());
  const revenue = rows.filter(row => row.metric === "revenue");
  const groups = groupFactVersions(revenue);
  const amendedPeriod = groups.find(group => group.versions.length === 2);
  assert.ok(amendedPeriod);
  assert.equal(amendedPeriod.versions.at(-1).value, 215);
});

test("rejects missing SEC User-Agent", async () => {
  await assert.rejects(() => fetchSecCompanyFacts("789019", {
    fetchImpl: async () => { throw new Error("should not be called"); },
  }), /User-Agent/);
});

test("validates CIK and verifies response identity", async () => {
  await assert.rejects(() => fetchSecCompanyFacts("abc", {
    userAgent: "INVESTLAB dev contact@example.com",
    fetchImpl: async () => ({ ok: true, json: async () => ({ cik: 123, facts: {} }) }),
  }), /does not match/);
});
