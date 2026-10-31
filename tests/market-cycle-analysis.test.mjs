import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveCompoundedMarketReturns,
  deriveCapexMarketLinkage,
  deriveCapexDeceleration,
} from "../src/ai-investment-cycle/market-cycle-analysis.mjs";

const row = (quarter, companyReturnPercent, benchmarkReturnPercent, status = "ok") => ({
  quarter,
  companyReturnPercent,
  benchmarkReturnPercent,
  excessReturnPp: companyReturnPercent - benchmarkReturnPercent,
  status,
});

test("compounds four quarterly returns instead of adding them", () => {
  const result = deriveCompoundedMarketReturns([
    row("2025-Q1", 10, 5),
    row("2025-Q2", 10, 5),
    row("2025-Q3", -10, -5),
    row("2025-Q4", 5, 2),
  ]);
  const expected = (1.1 * 1.1 * 0.9 * 1.05 - 1) * 100;
  assert.ok(Math.abs(result[3].trailingFourQuarterCompanyReturnPercent - expected) < 1e-10);
  assert.notEqual(result[3].trailingFourQuarterCompanyReturnPercent, 15);
  assert.equal(result[3].trailingFourQuarterStatus, "complete");
  assert.equal(result[3].cumulativeStatus, "continuous-from-first-quarter");
});

test("does not calculate trailing or cumulative return across a missing quarter", () => {
  const result = deriveCompoundedMarketReturns([
    row("2025-Q1", 10, 5),
    row("2025-Q2", 10, 5),
    row("2025-Q4", 5, 2),
    row("2026-Q1", 3, 1),
  ]);
  assert.equal(result[1].cumulativeCompanyReturnFromFirstPercent, 21);
  assert.equal(result[2].cumulativeCompanyReturnFromFirstPercent, null);
  assert.equal(result[3].cumulativeCompanyReturnFromFirstPercent, null);
  assert.equal(result[3].trailingFourQuarterCompanyReturnPercent, null);
  assert.equal(result[3].trailingFourQuarterStatus, "incomplete-window");
});

test("stale and invalid quarterly rows block compounded results", () => {
  const result = deriveCompoundedMarketReturns([
    row("2025-Q1", 10, 5),
    row("2025-Q2", null, null, "stale-observation"),
    row("2025-Q3", 4, 2),
    row("2025-Q4", 3, 1),
  ]);
  assert.equal(result[1].cumulativeCompanyReturnFromFirstPercent, null);
  assert.equal(result[3].trailingFourQuarterCompanyReturnPercent, null);
  assert.equal(result[3].cumulativeStatus, "blocked-by-gap-or-invalid-quarter");
});

test("rejects duplicate quarter labels in market return input", () => {
  assert.throws(() => deriveCompoundedMarketReturns([
    row("2025-Q1", 1, 1), row("2025-Q1", 2, 1),
  ]), /Duplicate quarter/);
});

test("aligns CAPEX growth and shareholder returns by exact quarter and labels correlation descriptive-only", () => {
  const capexRows = Array.from({ length: 6 }, (_, i) => ({
    company: "Microsoft",
    quarter: `2024-Q${i + 1}`,
    capexYoYPercent: [1, 2, 3, 4, 5, 6][i],
  }));
  const results = Array.from({ length: 6 }, (_, i) => ({
    quarter: `2024-Q${i + 1}`,
    companyReturnPercent: [2, 4, 6, 8, 10, 12][i],
    excessReturnPp: [1, 2, 3, 4, 5, 6][i],
    status: "ok",
  }));
  const linkage = deriveCapexMarketLinkage(capexRows, [{ ticker: "MSFT", results }]);
  assert.equal(linkage.length, 2);
  assert.equal(linkage[0].observations, 6);
  assert.equal(linkage[0].correlation, 1);
  assert.equal(linkage[0].status, "descriptive-only");
  assert.deepEqual(linkage[0].alignedQuarters, capexRows.map(item => item.quarter));
  assert.match(linkage[0].caveat, /does not establish causation/);
});

test("does not correlate non-overlapping quarters or insufficient observations", () => {
  const capexRows = [{ company: "Amazon", quarter: "2025-Q1", capexYoYPercent: 10 }];
  const market = [{ ticker: "AMZN", results: [
    { quarter: "2025-Q2", companyReturnPercent: 5, excessReturnPp: 2, status: "ok" },
  ] }];
  const result = deriveCapexMarketLinkage(capexRows, market);
  assert.equal(result[0].observations, 0);
  assert.equal(result[0].correlation, null);
  assert.equal(result[0].status, "insufficient-observations");
});

test("counts consecutive CAPEX growth deceleration but emits no buy/sell signal", () => {
  const result = deriveCapexDeceleration([
    { company: "Alphabet", quarter: "2025-Q1", capexYoYPercent: 40, capexYoYAccelerationPp: -2 },
    { company: "Alphabet", quarter: "2025-Q2", capexYoYPercent: 35, capexYoYAccelerationPp: -5 },
    { company: "Alphabet", quarter: "2025-Q3", capexYoYPercent: 36, capexYoYAccelerationPp: 1 },
    { company: "Alphabet", quarter: "2025-Q4", capexYoYPercent: 30, capexYoYAccelerationPp: -6 },
    { company: "Alphabet", quarter: "2026-Q2", capexYoYPercent: 25, capexYoYAccelerationPp: -4 },
  ]);
  assert.equal(result[1].consecutiveDecelerationQuarters, 2);
  assert.equal(result[1].status, "multi-quarter-deceleration-observed");
  assert.equal(result[2].consecutiveDecelerationQuarters, 0);
  assert.equal(result[4].consecutiveDecelerationQuarters, 0);
  assert.ok(result.every(item => !("signal" in item) && !("recommendation" in item)));
  assert.match(result[1].interpretation, /not necessarily falling CAPEX/);
});

test("missing CAPEX acceleration resets deceleration streak", () => {
  const result = deriveCapexDeceleration([
    { company: "Meta", quarter: "2025-Q1", capexYoYPercent: 20, capexYoYAccelerationPp: -1 },
    { company: "Meta", quarter: "2025-Q2", capexYoYPercent: null, capexYoYAccelerationPp: null },
    { company: "Meta", quarter: "2025-Q3", capexYoYPercent: 15, capexYoYAccelerationPp: -3 },
  ]);
  assert.equal(result[1].consecutiveDecelerationQuarters, null);
  assert.equal(result[2].consecutiveDecelerationQuarters, 1);
});
