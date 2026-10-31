/**
 * Helpers for reported cloud/AI-adjacent business indicators.
 * These metrics remain separate from directly disclosed AI revenue.
 */
export function calculateYoYPercent(current, prior) {
  const now = Number(current), before = Number(prior);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  return ((now / before) - 1) * 100;
}

export function calculateOperatingMarginPercent(operatingIncome, revenue) {
  const income = Number(operatingIncome), sales = Number(revenue);
  if (!Number.isFinite(income) || !Number.isFinite(sales) || sales <= 0) return null;
  return (income / sales) * 100;
}

/**
 * Adds calculated growth and (where a segment revenue counterpart is supplied)
 * operating margin. Does not infer direct AI revenue from broad cloud metrics.
 */
export function deriveBusinessPerformance(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.companies)) {
    throw new TypeError("snapshot.companies must be an array");
  }
  return snapshot.companies.map(company => {
    if (company.directAiRevenueUsdM !== null && company.directAiRevenueUsdM !== undefined) {
      if (!Number.isFinite(company.directAiRevenueUsdM) || company.directAiRevenueUsdM < 0) {
        throw new TypeError("directAiRevenueUsdM must be null or a non-negative finite number");
      }
    }
    const metrics = (company.metrics ?? []).map(metric => {
      const growthPercent = Number.isFinite(Number(metric.currentUsdM)) && Number.isFinite(Number(metric.priorYearUsdM))
        ? calculateYoYPercent(metric.currentUsdM, metric.priorYearUsdM)
        : (Number.isFinite(metric.reportedGrowthPercent) ? metric.reportedGrowthPercent : null);
      return { ...metric, calculatedGrowthPercent: growthPercent };
    });
    const revenueByCategory = metrics.filter(metric =>
      ["cloud_segment_revenue", "cloud_product_revenue", "segment_revenue", "company_revenue"].includes(metric.category)
    );
    const enriched = metrics.map(metric => {
      if (metric.category !== "segment_operating_income") return metric;
      const revenue = revenueByCategory.find(candidate =>
        candidate.comparability === metric.comparability &&
        candidate.metric.toLowerCase().includes(metric.metric.replace(/operating income/i, "revenue").toLowerCase().replace("segment ", ""))
      );
      return {
        ...metric,
        operatingMarginPercent: revenue
          ? calculateOperatingMarginPercent(metric.currentUsdM, revenue.currentUsdM)
          : null,
      };
    });
    return {
      company: company.company,
      ticker: company.ticker,
      directAiRevenueUsdM: company.directAiRevenueUsdM ?? null,
      metrics: enriched,
      sources: company.sources ?? [],
      specialItems: company.specialItems ?? [],
    };
  });
}
