import test from "node:test";
import assert from "node:assert/strict";
import { calculateCompanySeries, aggregateQuarterlyCapex } from "../src/ai-investment-cycle/metrics.mjs";

const sample = [
  { company: "A", quarter: "2024-Q1", capexUsdM: 100, aiRevenueUsdM: 20 },
  { company: "A", quarter: "2024-Q2", capexUsdM: 110, aiRevenueUsdM: 22 },
  { company: "A", quarter: "2024-Q3", capexUsdM: 120, aiRevenueUsdM: 25 },
  { company: "A", quarter: "2024-Q4", capexUsdM: 130, aiRevenueUsdM: 28 },
  { company: "A", quarter: "2025-Q1", capexUsdM: 150, aiRevenueUsdM: 35 },
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
    { company: "B", quarter: "2025-Q1", capexUsdM: 50, aiRevenueUsdM: null },
  ]);
  const result = aggregateQuarterlyCapex(rows, ["A", "B"]);
  const q1 = result.find(row => row.quarter === "2025-Q1");
  const q2 = result.find(row => row.quarter === "2024-Q1");
  assert.equal(q1.totalUsdM, 200);
  assert.equal(q1.coveragePercent, 100);
  assert.equal(q2.totalUsdM, null);
  assert.equal(q2.partialTotalUsdM, 100);
  assert.equal(q2.coveragePercent, 50);
});
