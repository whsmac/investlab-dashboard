import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCompanySeries, aggregateQuarterlyCapex, calculateMarketPerformance } from "../src/ai-investment-cycle/metrics.mjs";
import { calculateYoYPercent, calculateOperatingMarginPercent, deriveBusinessPerformance } from "../src/ai-investment-cycle/business-performance.mjs";

const sample = [
  { company: "A", capexBasis: "cash_capex_net", quarter: "2024-Q1", capexUsdM: 100, aiRevenueUsdM: 20 },
  { company: "A", capexBasis: "cash_capex_net", quarter: "2024-Q2", capexUsdM: 110, aiRevenueUsdM: 22 },
  { company: "A", capexBasis: "cash_capex_net", quarter: "2024-Q3", capexUsdM: 120, aiRevenueUsdM: 25 },
  { company: "A", capexBasis: "cash_capex_net", quarter: "2024-Q4", capexUsdM: 130, aiRevenueUsdM: 28 },
  { company: "A", capexBasis: "cash_capex_net", quarter: "2025-Q1", capexUsdM: 150, aiRevenueUsdM: 35 },
];

test("calculates year-over-year and quarter-over-quarter CAPEX growth", () => {
  const result = calculateCompanySeries(sample);
  assert.equal(result.at(-1).capexYoYPercent, 50);
  assert.ok(Math.abs(result.at(-1).capexQoQPercent - 15.3846153846) < 1e-8);
  assert.equal(result.at(-1).aiRevenueYoYPercent, 75);
});

test("calculates trailing four-quarter totals only for a complete contiguous window", () => {
  const result = calculateCompanySeries(sample);
  assert.equal(result.at(-1).trailingFourQuarterCapexUsdM, 510);
  assert.equal(result.at(-1).trailingFourQuarterAiRevenueUsdM, 110);
  assert.ok(Math.abs(result.at(-1).trailingAiRevenueToCapexPercent - (110 / 510 * 100)) < 1e-8);
});

test("does not infer missing AI revenue or call a revenue yield investment ROI", () => {
  const rows = sample.map(row => ({ ...row, aiRevenueUsdM: null }));
  const result = calculateCompanySeries(rows);
  assert.equal(result.at(-1).trailingFourQuarterAiRevenueUsdM, null);
  assert.equal(result.at(-1).trailingAiRevenueToCapexPercent, null);
});

test("rejects duplicate quarters and malformed period labels", () => {
  assert.throws(() => calculateCompanySeries([sample[0], sample[0]]), /Duplicate/);
  assert.throws(() => calculateCompanySeries([{ ...sample[0], quarter: "2024-Q5" }]), /Invalid quarter/);
});

test("quarterly aggregate marks incomplete universe coverage instead of overstating total", () => {
  const rows = calculateCompanySeries(sample).concat([
    { company: "B", capexBasis: "cash_capex_net", quarter: "2025-Q1", capexUsdM: 50, aiRevenueUsdM: null },
  ]);
  const result = aggregateQuarterlyCapex(rows, ["A", "B"]);
  const q1 = result.find(row => row.quarter === "2025-Q1");
  const q2 = result.find(row => row.quarter === "2024-Q1");
  assert.equal(q1.totalUsdM, 200);
  assert.equal(q1.aggregationStatus, "comparable");
  assert.equal(q1.coveragePercent, 100);
  assert.equal(q2.totalUsdM, null);
  assert.equal(q2.partialTotalUsdM, 100);
  assert.equal(q2.coveragePercent, 50);
});

test("calculates adjusted-price total return and benchmark-relative return", () => {
  const company = [
    { date: "2025-01-02", adjustedClose: 100 },
    { date: "2025-06-02", adjustedClose: 120 },
    { date: "2026-01-02", adjustedClose: 150 },
  ];
  const benchmark = [
    { date: "2025-01-02", adjustedClose: 100 },
    { date: "2025-06-02", adjustedClose: 110 },
    { date: "2026-01-02", adjustedClose: 125 },
  ];
  const result = calculateMarketPerformance(company, benchmark, "2025-01-01", "2026-01-31");
  assert.equal(result.companyReturnPercent, 50);
  assert.equal(result.benchmarkReturnPercent, 25);
  assert.equal(result.excessReturnPp, 25);
  assert.equal(result.observations, 3);
});

test("returns null market performance when there are not two aligned observations", () => {
  const result = calculateMarketPerformance(
    [{ date: "2025-01-02", adjustedClose: 100 }],
    [{ date: "2025-01-02", adjustedClose: 100 }],
    "2025-01-01",
    "2025-12-31",
  );
  assert.equal(result.companyReturnPercent, null);
  assert.equal(result.excessReturnPp, null);
});

test("does not aggregate company CAPEX when reported definitions differ", () => {
  const mixed = [
    { company: "A", quarter: "2026-Q3", capexUsdM: 51400, capexBasis: "cash_capex_net", aiRevenueUsdM: null },
    { company: "B", quarter: "2026-Q3", capexUsdM: 45200, capexBasis: "management_capex_including_finance_leases", aiRevenueUsdM: null },
  ];
  const result = aggregateQuarterlyCapex(mixed, ["A", "B"])[0];
  assert.equal(result.totalUsdM, null);
  assert.equal(result.partialTotalUsdM, 96600);
  assert.equal(result.aggregationStatus, "mixed-or-unspecified-basis");
});

test("Q3 2026 source snapshot preserves CAPEX definitions and does not mislabel segment revenue as AI revenue", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/source-snapshot-2026-q3.json", import.meta.url), "utf8"));
  assert.equal(snapshot.records.length, 4);
  assert.deepEqual(snapshot.records.map(row => row.company).sort(), ["Alphabet", "Amazon", "Meta", "Microsoft"]);
  assert.ok(snapshot.records.every(row => row.aiRevenueUsdM === null));
  assert.equal(new Set(snapshot.records.map(row => row.capexBasis)).size, 1);
  assert.ok(snapshot.records.every(row => row.capexBasis === "cash_purchases_ppe_gross"));
  assert.ok(snapshot.records.every(row => row.businessSignal === null || row.businessSignal.comparability === "not_ai_specific"));
  assert.ok(snapshot.limitations.some(note => note.includes("common cash-flow")));
});

test("historical hyperscaler series contains source-backed calendar quarters and preserves missing Amazon Q4", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/hyperscaler-capex-quarterly-2024-2026.json", import.meta.url), "utf8"));
  assert.equal(dataset.quarters.length, 11);
  const latest = dataset.quarters.find(row => row.quarter === "2026-Q3");
  assert.equal(latest.values.reduce((sum, row) => sum + row.capexUsdM, 0), 201959);
  assert.equal(latest.values.length, 4);
  const amazonQ4 = dataset.quarters.find(row => row.quarter === "2025-Q4");
  assert.equal(amazonQ4.values.some(row => row.company === "Amazon"), false);
  assert.ok(dataset.limitations.some(note => note.includes("Q4 Amazon")));
  assert.ok(dataset.quarters.every(q => q.values.every(row => row.capexBasis === "cash_purchases_ppe_gross")));
});

test("historical series calculates YoY CAPEX growth when four-quarter history is available", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/hyperscaler-capex-quarterly-2024-2026.json", import.meta.url), "utf8"));
  const rows = dataset.quarters.flatMap(q => q.values).filter(row => row.company === "Microsoft").map(row => ({
    ...row,
    quarter: dataset.quarters.find(q => q.values.includes(row)).quarter,
    aiRevenueUsdM: null,
  }));
  const result = calculateCompanySeries(rows);
  const latest = result.find(row => row.quarter === "2026-Q3");
  assert.equal(latest.capexYoYPercent, 103.09278350515463);
});

test("business performance derives cloud segment growth and operating margins without treating it as AI revenue", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-q3-2026.json", import.meta.url), "utf8"));
  const result = deriveBusinessPerformance(snapshot);
  const alphabet = result.find(row => row.company === "Alphabet");
  const cloudRevenue = alphabet.metrics.find(row => row.metric === "Google Cloud revenue");
  const cloudIncome = alphabet.metrics.find(row => row.metric === "Google Cloud operating income");
  assert.ok(Math.abs(cloudRevenue.calculatedGrowthPercent - 102.60605660750808) < 0.01);
  assert.ok(Math.abs(cloudIncome.operatingMarginPercent - (11121 / 30709 * 100)) < 1e-8);
  assert.equal(alphabet.directAiRevenueUsdM, null);
});

test("AWS revenue and operating income growth use the correct Q3 2025 reported comparatives", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-q3-2026.json", import.meta.url), "utf8"));
  const amazon = deriveBusinessPerformance(snapshot).find(row => row.company === "Amazon");
  const revenue = amazon.metrics.find(row => row.metric === "AWS segment revenue");
  const income = amazon.metrics.find(row => row.metric === "AWS segment operating income");
  assert.ok(Math.abs(revenue.calculatedGrowthPercent - ((46000 / 33006 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(income.calculatedGrowthPercent - ((17800 / 11434 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(income.operatingMarginPercent - (17800 / 46000 * 100)) < 1e-8);
});

test("business performance keeps Microsoft recast segment and Azure revenue as separate metrics", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-q3-2026.json", import.meta.url), "utf8"));
  const microsoft = deriveBusinessPerformance(snapshot).find(row => row.company === "Microsoft");
  const azure = microsoft.metrics.find(row => row.metric === "Azure revenue");
  const agents = microsoft.metrics.find(row => row.metric === "Agents and Infra segment revenue");
  assert.equal(azure.comparability, "cloud_product_revenue");
  assert.equal(agents.comparability, "newly_recast_segment");
  assert.ok(Math.abs(microsoft.metrics.find(row => row.metric === "Agents and Infra segment operating income").operatingMarginPercent - (40558 / 76795 * 100)) < 1e-8);
});

test("Meta operational indicators and one-off charge remain distinct from AI revenue", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-q3-2026.json", import.meta.url), "utf8"));
  const meta = deriveBusinessPerformance(snapshot).find(row => row.company === "Meta");
  assert.equal(meta.directAiRevenueUsdM, null);
  assert.equal(meta.specialItems[0].amountUsdM, 9890);
  assert.equal(meta.metrics.find(row => row.metric === "Family of Apps ad impressions growth").calculatedGrowthPercent, 10);
  assert.equal(meta.metrics.find(row => row.metric === "Operating income (GAAP)").reportedGrowthPercent, -37);
});

test("business performance helpers return null for missing or invalid comparison bases", () => {
  assert.equal(calculateYoYPercent(10, 0), null);
  assert.equal(calculateYoYPercent(null, null), null);
  assert.equal(calculateOperatingMarginPercent(10, 0), null);
});
