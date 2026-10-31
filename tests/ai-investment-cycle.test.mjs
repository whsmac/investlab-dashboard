import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCompanySeries, aggregateQuarterlyCapex, calculateMarketPerformance } from "../src/ai-investment-cycle/metrics.mjs";
import { calculateYoYPercent, calculateOperatingMarginPercent, deriveBusinessPerformance, deriveQuarterlyBusinessSeries } from "../src/ai-investment-cycle/business-performance.mjs";
import { calculateLaggedBusinessLinkage } from "../src/ai-investment-cycle/cycle-linkage.mjs";

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
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/hyperscaler-capex-quarterly-2023-2026.json", import.meta.url), "utf8"));
  assert.equal(dataset.quarters.length, 15);
  const latest = dataset.quarters.find(row => row.quarter === "2026-Q3");
  assert.equal(latest.values.reduce((sum, row) => sum + row.capexUsdM, 0), 201959);
  assert.equal(latest.values.length, 4);
  const amazonQ4 = dataset.quarters.find(row => row.quarter === "2025-Q4");
  assert.equal(amazonQ4.values.some(row => row.company === "Amazon"), false);
  const early = dataset.quarters.find(row => row.quarter === "2023-Q1");
  assert.equal(early.values.length, 4);
  assert.deepEqual(early.values.map(row => row.capexUsdM), [6610, 6290, 14210, 6840]);
  const microsoft2023Q2 = dataset.quarters.find(row => row.quarter === "2023-Q2").values.find(row => row.company === "Microsoft");
  assert.equal(microsoft2023Q2.sourceMethod, "cumulative-difference");
  assert.equal(microsoft2023Q2.sourceAccession.length, 2);
  assert.ok(microsoft2023Q2.sourceUrl.includes("ahasignals.com"));
  assert.ok(dataset.limitations.some(note => note.includes("Q4 Amazon")));
  assert.ok(dataset.quarters.every(q => q.values.every(row => row.capexBasis === "cash_purchases_ppe_gross")));
});

test("historical series calculates YoY CAPEX growth when four-quarter history is available", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/hyperscaler-capex-quarterly-2023-2026.json", import.meta.url), "utf8"));
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
  assert.equal(calculateYoYPercent(null, 10), null);
  assert.equal(calculateOperatingMarginPercent(10, 0), null);
  assert.equal(calculateOperatingMarginPercent(null, 10), null);
});

test("lagged linkage detects a two-quarter lead without claiming causation", () => {
  const values = [5, 80, 20, 65, 10, 95, 35, 50];
  const quarters = Array.from({ length: 10 }, (_, i) => {
    const year = 2024 + Math.floor(i / 4);
    return `${year}-Q${(i % 4) + 1}`;
  });
  const capex = values.map((value, i) => ({
    company: "Example",
    quarter: quarters[i],
    capexYoYPercent: value,
  }));
  const business = values.map((value, i) => ({
    company: "Example",
    quarter: quarters[i + 2],
    businessGrowthPercent: value,
  }));
  const result = calculateLaggedBusinessLinkage(capex, business, { maxLag: 3, minObservations: 6 });
  const twoQuarterLead = result.find(row => row.lagQuarters === 2);
  assert.equal(twoQuarterLead.observations, 8);
  assert.ok(Math.abs(twoQuarterLead.correlation - 1) < 1e-12);
  assert.equal(twoQuarterLead.status, "descriptive-only");
  assert.match(twoQuarterLead.interpretation, /leads business growth by 2 quarter/);
});

test("lagged linkage requires enough aligned observations and rejects duplicate quarters", () => {
  const capex = [
    { company: "A", quarter: "2024-Q1", capexYoYPercent: 10 },
    { company: "A", quarter: "2024-Q2", capexYoYPercent: 20 },
    { company: "A", quarter: "2024-Q3", capexYoYPercent: 30 },
  ];
  const business = [
    { company: "A", quarter: "2024-Q1", businessGrowthPercent: 5 },
    { company: "A", quarter: "2024-Q2", businessGrowthPercent: 10 },
    { company: "A", quarter: "2024-Q3", businessGrowthPercent: 15 },
  ];
  const result = calculateLaggedBusinessLinkage(capex, business, { maxLag: 1, minObservations: 6 });
  assert.ok(result.every(row => row.correlation === null));
  assert.ok(result.every(row => row.status === "insufficient-or-constant-data"));
  assert.throws(() => calculateLaggedBusinessLinkage([...capex, capex[0]], business), /Duplicate/);
  assert.throws(() => calculateLaggedBusinessLinkage(capex, business, { maxLag: 13 }), /maxLag/);
});


test("AWS quarterly history derives a continuous 12-quarter series with YoY growth and margins", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-aws-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const [series] = deriveQuarterlyBusinessSeries(dataset);
  assert.equal(series.company, "Amazon");
  assert.equal(series.observations.length, 12);
  assert.equal(series.observations[0].quarter, "2023-Q4");
  const q4_2024 = series.observations.find(row => row.quarter === "2024-Q4");
  assert.ok(Math.abs(q4_2024.businessGrowthPercent - ((28786 / 24204 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(q4_2024.operatingMarginPercent - (10632 / 28786 * 100)) < 1e-8);
  const q3_2026 = series.observations.find(row => row.quarter === "2026-Q3");
  assert.ok(Math.abs(q3_2026.businessGrowthPercent - ((45984 / 33006 - 1) * 100)) < 1e-8);
  assert.equal(series.aiLinkage, "ai_and_core_cloud_mixed");
  assert.equal(series.comparability, "aws_segment");
  assert.ok(series.observations.every(row => row.sourceUrl.startsWith("https://")));
});

test("quarterly business history does not interpolate missing prior-year quarters", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-aws-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const copy = structuredClone(dataset);
  copy.series[0].observations = copy.series[0].observations.filter(row => row.quarter !== "2025-Q3");
  const [series] = deriveQuarterlyBusinessSeries(copy);
  const q3_2026 = series.observations.find(row => row.quarter === "2026-Q3");
  assert.equal(q3_2026.businessGrowthPercent, null);
});

test("quarterly business history rejects duplicate quarters and invalid source records", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-aws-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const duplicate = structuredClone(dataset);
  duplicate.series[0].observations.push(duplicate.series[0].observations[0]);
  assert.throws(() => deriveQuarterlyBusinessSeries(duplicate), /Duplicate business quarter/);
  const missingSource = structuredClone(dataset);
  delete missingSource.series[0].observations[0].sourceUrl;
  assert.throws(() => deriveQuarterlyBusinessSeries(missingSource), /HTTPS sourceUrl/);
  const missingMetric = structuredClone(dataset);
  delete missingMetric.series[0].observations[0].revenueUsdM;
  assert.throws(() => deriveQuarterlyBusinessSeries(missingMetric), /revenueUsdM must be present/);
});


test("Alphabet quarterly Google Cloud history derives a continuous 12-quarter series", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-alphabet-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const [series] = deriveQuarterlyBusinessSeries(dataset);
  assert.equal(series.company, "Alphabet");
  assert.equal(series.observations.length, 12);
  const q4_2024 = series.observations.find(row => row.quarter === "2024-Q4");
  assert.ok(Math.abs(q4_2024.businessGrowthPercent - ((11955 / 9192 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(q4_2024.operatingMarginPercent - (2093 / 11955 * 100)) < 1e-8);
  const q3_2026 = series.observations.find(row => row.quarter === "2026-Q3");
  assert.ok(Math.abs(q3_2026.businessGrowthPercent - ((30709 / 15157 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(q3_2026.operatingMarginPercent - (11121 / 30709 * 100)) < 1e-8);
  assert.equal(series.aiLinkage, "ai_and_core_cloud_mixed");
  assert.ok(series.observations.every(row => row.reported && row.sourceUrl.startsWith("https://")));
});


test("Meta quarterly consolidated operating history derives a continuous 12-quarter series", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-meta-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const [series] = deriveQuarterlyBusinessSeries(dataset);
  assert.equal(series.company, "Meta");
  assert.equal(series.observations.length, 12);
  const q4_2024 = series.observations.find(row => row.quarter === "2024-Q4");
  assert.ok(Math.abs(q4_2024.businessGrowthPercent - ((48385 / 40111 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(q4_2024.operatingMarginPercent - (23365 / 48385 * 100)) < 1e-8);
  const q3_2026 = series.observations.find(row => row.quarter === "2026-Q3");
  assert.ok(Math.abs(q3_2026.businessGrowthPercent - ((64601 / 51242 - 1) * 100)) < 1e-8);
  assert.ok(Math.abs(q3_2026.operatingMarginPercent - (12988 / 64601 * 100)) < 1e-8);
  assert.equal(series.aiLinkage, "ai_and_core_business_mixed");
  assert.ok(series.observations.every(row => row.reported && row.sourceUrl.startsWith("https://")));
  assert.match(q3_2026.notes, /litigation-related/);
});


test("Microsoft Intelligent Cloud history maps fiscal quarters to calendar quarters and retains derived Q4 provenance", () => {
  const dataset = JSON.parse(readFileSync(new URL("../data/ai-investment-cycle/business-performance-microsoft-quarterly-2023-2026.json", import.meta.url), "utf8"));
  const [series] = deriveQuarterlyBusinessSeries(dataset);
  assert.equal(series.company, "Microsoft");
  assert.equal(series.observations.length, 12);
  assert.equal(series.observations[0].quarter, "2023-Q2");
  const q2_2024 = series.observations.find(row => row.quarter === "2024-Q2");
  assert.equal(q2_2024.revenueUsdM, 28515);
  assert.equal(q2_2024.operatingIncomeUsdM, 12859);
  assert.ok(q2_2024.additionalSourceUrls.length === 1);
  assert.match(q2_2024.sourceNote, /annual.*less.*nine-month/i);
  const q1_2026 = series.observations.find(row => row.quarter === "2026-Q1");
  assert.equal(q1_2026.revenueUsdM, 34681);
  assert.equal(q1_2026.operatingIncomeUsdM, 13753);
  assert.equal(series.fiscalCalendar, "fiscal_year_ends_june_30");
  assert.equal(series.aiLinkage, "ai_and_core_cloud_mixed");
  assert.ok(series.observations.every(row => row.reported && row.sourceUrl.startsWith("https://")));
});
