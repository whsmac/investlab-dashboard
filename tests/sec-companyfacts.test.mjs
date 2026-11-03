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

test("does not coerce null or empty SEC values to numeric zero", () => {
  const payload = fixture();
  payload.facts["us-gaap"].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD.push(
    { start: "2025-07-01", end: "2025-09-30", val: null, form: "10-Q", fy: 2025, fp: "Q3", filed: "2025-10-25", accn: "0000789019-25-000006" },
    { start: "2025-07-01", end: "2025-09-30", val: "", form: "10-Q", fy: 2025, fp: "Q3", filed: "2025-10-25", accn: "0000789019-25-000007" },
  );
  const rows = extractCompanyFactObservations(payload);
  assert.equal(rows.some(row => row.end === "2025-09-30"), false);
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

test("rejects malformed CIK before making a network request", async () => {
  let called = false;
  await assert.rejects(() => fetchSecCompanyFacts("abc", {
    userAgent: "INVESTLAB dev contact@example.com",
    fetchImpl: async () => { called = true; throw new Error("should not be called"); },
  }), /valid SEC CIK/);
  assert.equal(called, false);
});

test("validates SEC response identity for a well-formed CIK", async () => {
  await assert.rejects(() => fetchSecCompanyFacts("789019", {
    userAgent: "INVESTLAB dev contact@example.com",
    fetchImpl: async () => ({ ok: true, json: async () => ({ cik: 123, facts: {} }) }),
  }), /does not match/);
});

test("extracts issuer extension taxonomy facts only when explicitly configured", () => {
  const payload = {
    cik: 1181412,
    facts: {
      "us-gaap": {},
      "spcx-2026": {
        SpaceXRevenue: {
          label: "Consolidated revenue",
          units: { USD: [
            { start: "2026-07-01", end: "2026-09-30", val: 14575, form: "10-Q", fy: 2026, fp: "Q3", filed: "2026-10-30", accn: "0001181412-26-000001" },
          ] },
        },
        SpaceXCashPurchasesOfPropertyPlantAndEquipment: {
          label: "Purchases of property, plant and equipment",
          units: { USD: [
            { start: "2026-01-01", end: "2026-09-30", val: -48069, form: "10-Q", fy: 2026, fp: "Q3", filed: "2026-10-30", accn: "0001181412-26-000001" },
          ] },
        },
      },
    },
  };
  const defaultRows = extractCompanyFactObservations(payload);
  assert.equal(defaultRows.length, 0);

  const rows = extractCompanyFactObservations(payload, {
    taxonomies: ["spcx-2026"],
    tags: {
      revenue: ["SpaceXRevenue"],
      capex: ["SpaceXCashPurchasesOfPropertyPlantAndEquipment"],
    },
  });
  assert.equal(rows.length, 2);
  assert.ok(rows.every(row => row.taxonomy === "spcx-2026"));
  assert.ok(rows.every(row => row.accession === "0001181412-26-000001"));
  assert.equal(rows.find(row => row.metric === "capex").value, -48069);
});
