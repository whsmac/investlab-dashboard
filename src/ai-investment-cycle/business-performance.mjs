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


function toQuarterIndex(value) {
  const match = /^([0-9]{4})-Q([1-4])$/.exec(String(value ?? ""));
  if (!match) throw new TypeError(`Invalid quarter: ${value}`);
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}

/**
 * Derives like-for-like quarterly business growth from a source-backed history.
 * Each series must retain one stable metric definition. Missing quarters are
 * never interpolated; YoY growth is null unless the exact prior-year quarter
 * is present. Revenue is a broad segment metric, not AI revenue unless the
 * source explicitly defines it that way.
 */
export function deriveQuarterlyBusinessSeries(dataset) {
  if (!dataset || !Array.isArray(dataset.series)) {
    throw new TypeError("dataset.series must be an array");
  }
  return dataset.series.map(series => {
    if (!series || typeof series.company !== "string" || !series.company.trim() ||
        typeof series.metricId !== "string" || !series.metricId.trim() ||
        typeof series.metricName !== "string" || !series.metricName.trim() ||
        !Array.isArray(series.observations)) {
      throw new TypeError("Each business series requires company, metricId, metricName, and observations");
    }
    const indexed = new Map();
    for (const observation of series.observations) {
      const index = toQuarterIndex(observation.quarter);
      if (indexed.has(index)) throw new TypeError(`Duplicate business quarter: ${series.company} ${observation.quarter}`);
      for (const field of ["revenueUsdM", "operatingIncomeUsdM"]) {
        const value = observation[field];
        if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) {
          throw new TypeError(`${field} must be a non-negative finite number or null`);
        }
      }
      if (typeof observation.sourceUrl !== "string" || !observation.sourceUrl.startsWith("https://")) {
        throw new TypeError("Every quarterly observation requires an HTTPS sourceUrl");
      }
      indexed.set(index, { ...observation, _quarterIndex: index });
    }
    return {
      company: series.company,
      ticker: series.ticker,
      metricId: series.metricId,
      metricName: series.metricName,
      metricType: series.metricType,
      aiLinkage: series.aiLinkage,
      comparability: series.comparability,
      fiscalCalendar: series.fiscalCalendar,
      observations: [...indexed.values()].sort((a, b) => a._quarterIndex - b._quarterIndex).map(observation => {
        const prior = indexed.get(observation._quarterIndex - 4);
        return {
          ...observation,
          businessGrowthPercent: prior
            ? calculateYoYPercent(observation.revenueUsdM, prior.revenueUsdM)
            : null,
          operatingMarginPercent: calculateOperatingMarginPercent(
            observation.operatingIncomeUsdM,
            observation.revenueUsdM,
          ),
          _quarterIndex: undefined,
        };
      }),
    };
  });
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
      const segmentKey = metric.metric.toLowerCase()
        .replace(/operating income|revenue|segment/g, "")
        .replace(/\\s+/g, " ")
        .trim();
      const revenue = revenueByCategory.find(candidate =>
        candidate.comparability === metric.comparability &&
        candidate.metric.toLowerCase().replace(/operating income|revenue|segment/g, "").replace(/\\s+/g, " ").trim() === segmentKey
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
