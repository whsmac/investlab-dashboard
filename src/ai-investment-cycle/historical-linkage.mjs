import { calculateCompanySeries } from "./metrics.mjs";
import { deriveQuarterlyBusinessSeries } from "./business-performance.mjs";
import { calculateLaggedBusinessLinkage } from "./cycle-linkage.mjs";

/**
 * Builds company-specific CAPEX-growth/business-growth lead-lag observations
 * from the normalized source datasets. It never pools companies or changes
 * metric definitions. Output correlations are descriptive only.
 */
export function deriveHistoricalCycleLinkage(capexDataset, businessDatasets, options = {}) {
  if (!capexDataset || !Array.isArray(capexDataset.quarters)) {
    throw new TypeError("capexDataset.quarters must be an array");
  }
  if (!Array.isArray(businessDatasets) || businessDatasets.length === 0) {
    throw new TypeError("businessDatasets must be a non-empty array");
  }

  const capexRecords = capexDataset.quarters.flatMap(quarter =>
    (quarter.values ?? []).map(value => ({
      ...value,
      quarter: quarter.quarter,
      aiRevenueUsdM: null,
    }))
  );
  const capexSeries = calculateCompanySeries(capexRecords);

  const businessSeries = businessDatasets.flatMap(dataset => deriveQuarterlyBusinessSeries(dataset));
  const companyMetric = new Map();
  const businessRows = [];
  for (const series of businessSeries) {
    if (companyMetric.has(series.company)) {
      throw new TypeError(`Multiple business metric series supplied for ${series.company}; choose one stable metric`);
    }
    companyMetric.set(series.company, {
      metricId: series.metricId,
      metricName: series.metricName,
      metricType: series.metricType,
      aiLinkage: series.aiLinkage,
      comparability: series.comparability,
      fiscalCalendar: series.fiscalCalendar,
    });
    for (const observation of series.observations) {
      businessRows.push({
        company: series.company,
        quarter: observation.quarter,
        businessGrowthPercent: observation.businessGrowthPercent,
      });
    }
  }

  const results = calculateLaggedBusinessLinkage(capexSeries, businessRows, options);
  return results.map(result => ({
    ...result,
    businessMetric: companyMetric.get(result.company) ?? null,
    status: result.status,
    interpretation: result.interpretation,
    caveat: "Descriptive correlation only; not causal, predictive, AI-attributable, or a trading signal.",
  }));
}
