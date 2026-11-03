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
  const result = normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD" });
  assert.deepEqual(result.map(row => row.value), [10, 18, 27]);
  assert.deepEqual(result.map(row => row.derivation), ["reported-quarter", "ytd-delta", "ytd-delta"]);
  assert.equal(result[1].rawValue, -18);
  assert.equal(result[1].sourceObservations.length, 2);
  assert.equal(result[1].periodStart, "2026-04-01");
  assert.equal(result[1].periodEnd, "2026-06-30");
  assert.equal(result[2].periodStart, "2026-07-01");
  assert.equal(result[2].periodEnd, "2026-09-30");
});

test("derives Q4 from annual less nine-month cumulative value", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1", accession: "q1" }),
    fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }),
    fact({ start: "2026-01-01", end: "2026-09-30", value: -55, period: "Q3", accession: "q3" }),
    fact({ start: "2026-01-01", end: "2026-12-31", value: -80, period: "FY", form: "10-K", accession: "fy" }),
  ];
  const result = normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD" });
  assert.equal(result.at(-1).fiscalPeriod, "Q4");
  assert.equal(result.at(-1).value, 25);
  assert.equal(result.at(-1).derivation, "annual-less-nine-months");
  assert.equal(result.at(-1).periodStart, "2026-10-01");
  assert.equal(result.at(-1).periodEnd, "2026-12-31");
});

test("does not combine different XBRL tags or units", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1", accession: "q1" }),
    { ...fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }), tag: "PaymentsToAcquireProductiveAssets" },
  ];
  const result = normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD" });
  assert.equal(result.length, 1);
  assert.equal(result[0].fiscalPeriod, "Q1");
});

test("returns no fabricated quarter when cumulative comparison is missing", () => {
  const rows = [
    fact({ start: "2026-01-01", end: "2026-06-30", value: -28, period: "Q2", accession: "h1" }),
  ];
  assert.deepEqual(normalizeStandaloneQuarters(rows, { metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD" }), []);
});

test("revenue values retain their reported sign and do not use CAPEX absolute-value rule", () => {
  const revenue = fact({ start: "2026-01-01", end: "2026-03-31", value: 42, period: "Q1", accession: "rev", tag: "RevenueFromContractWithCustomerExcludingAssessedTax", unit: "USD" });
  revenue.metric = "revenue";
  const result = normalizeStandaloneQuarters([revenue], { metric: "revenue", tag: "RevenueFromContractWithCustomerExcludingAssessedTax", unit: "USD" });
  assert.equal(result[0].value, 42);
});

test("does not combine identical tag names across different taxonomies", () => {
  const base = fact({ start: "2026-07-01", end: "2026-09-30", value: -30, period: "Q3", accession: "q3" });
  const rows = [
    { ...base, taxonomy: "us-gaap" },
    { ...base, taxonomy: "spcx-2026", value: -45, accession: "custom-q3" },
  ];
  const result = normalizeStandaloneQuarters(rows, {
    metric: "capex",
    tag: "PaymentsToAcquirePropertyPlantAndEquipment",
    unit: "USD",
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(row => row.value).sort((a, b) => a - b), [30, 45]);
  assert.deepEqual(result.map(row => row.taxonomy).sort(), ["spcx-2026", "us-gaap"]);

  const selected = normalizeStandaloneQuarters(rows, {
    metric: "capex",
    tag: "PaymentsToAcquirePropertyPlantAndEquipment",
    unit: "USD",
    taxonomy: "spcx-2026",
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].value, 45);
  assert.equal(selected[0].taxonomy, "spcx-2026");
});

test("rejects an empty explicit taxonomy selector", () => {
  const row = fact({ start: "2026-01-01", end: "2026-03-31", value: -10, period: "Q1" });
  assert.throws(() => normalizeStandaloneQuarters([row], {
    metric: "capex", tag: "PaymentsToAcquirePropertyPlantAndEquipment", unit: "USD", taxonomy: " ",
  }), /taxonomy must be a non-empty namespace/);
});
