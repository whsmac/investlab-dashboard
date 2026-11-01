import test from "node:test";
import assert from "node:assert/strict";
import { normalizeStandaloneQuarters } from "../src/ai-investment-cycle/quarterly-normalizer.mjs";

function fact({ start, end, value, period, form = "10-Q", accession, tag = "PaymentsToAcquirePropertyPlantAndEquipment" }) {
  return {
    metric: "capex",
    tag,
    unit: "USD",
    value,
    start,
    end,
    form,
    fiscalYear: 2026,
    fiscalPeriod: period,
    filed: end,
    accession,
    sourceUrl: `https://www.sec.gov/Archives/edgar/data/1/${accession}/`,
  };
}

test("derives standalone Q2 and Q3 CAPEX from same-fiscal-year YTD facts", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1", accession: "q1" }),
    fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }),
    fact({ start: "2026-01-01", end: "2026-09-30", value: -55, period: "Q3", accession: "q3" }),
  ];
  const result = normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment" });
  assert.deepEqual(result.map(row => row.value), [10, 18, 27]);
  assert.deepEqual(result.map(row => row.derivation), ["reported-quarter", "ytd-delta", "ytd-delta"]);
  assert.equal(result[1].rawValue, -18);
  assert.equal(result[1].sourceObservations.length, 2);
});

test("derives Q4 from annual less nine-month cumulative value", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1", accession: "q1" }),
    fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }),
    fact({ start: "2026-01-01", end: "2026-09-30", value: -55, period: "Q3", accession: "q3" }),
    fact({ start: "2026-01-01", end: "2026-12-31", value: -80, period: "FY", form: "10-K", accession: "fy" }),
  ];
  const result = normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment" });
  assert.equal(result.at(-1).fiscalPeriod, "Q4");
  assert.equal(result.at(-1).value, 25);
  assert.equal(result.at(-1).derivation, "annual-less-nine-months");
});

test("does not combine different XBRL tags or units", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1", accession: "q1" }),
    { ...fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }), tag: "PaymentsToAcquireProductiveAssets" },
  ];
  const result = normalizeStandaloneQuarters(rows, { metric: "capex" });
  assert.equal(result.length, 1);
  assert.equal(result[0].fiscalPeriod, "Q1");
});

test("returns no fabricated quarter when cumulative comparison is missing", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }),
  ];
  assert.deepEqual(normalizeStandaloneQuarters(rows, { metric: "capex" }), []);
});

test("revenue values retain their reported sign and do not use CAPEX absolute-value rule", () => {
  const revenue = fact({ start: "2026-01-01", end: "2026-03-31", value: 42, period: "Q1", accession: "rev", tag: "RevenueFromContractWithCustomerExcludingAssessedTax" });
  revenue.metric = "revenue";
  const result = normalizeStandaloneQuarters([revenue], { metric: "revenue", tag: "RevenueFromContractWithCustomerExcludingAssessedTax" });
  assert.equal(result[0].value, 42);
});
