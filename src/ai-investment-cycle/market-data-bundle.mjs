import { deriveQuarterlyMarketPerformance } from "./metrics.mjs";

const DEFAULT_TICKERS = ["MSFT", "GOOGL", "AMZN", "META", "SPY"];

/**
 * Validates a complete manual-import set before any cross-security comparison.
 * It checks source/methodology consistency and the shared pre-2023 baseline,
 * then derives company-vs-SPY quarterly total returns when the set is ready.
 */
export function validateMarketPriceBundle(datasets, options = {}) {
  if (!Array.isArray(datasets)) throw new TypeError("datasets must be an array");
  const requiredTickers = options.requiredTickers ?? DEFAULT_TICKERS;
  const baselineDate = options.baselineDate ?? "2022-12-31";
  const quarters = options.quarters ?? [
    "2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4",
    "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4",
    "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
    "2026-Q1", "2026-Q2", "2026-Q3",
  ];
  if (!Array.isArray(requiredTickers) || requiredTickers.length < 2 ||
      requiredTickers.some(ticker => typeof ticker !== "string" || !ticker.trim()) ||
      new Set(requiredTickers).size !== requiredTickers.length) {
    throw new TypeError("requiredTickers must contain at least two unique ticker symbols");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baselineDate) ||
      new Date(`${baselineDate}T00:00:00Z`).toISOString().slice(0, 10) !== baselineDate) {
    throw new TypeError("baselineDate must be a valid YYYY-MM-DD date");
  }

  const byTicker = new Map();
  const errors = [];
  for (const dataset of datasets) {
    if (!dataset || typeof dataset.ticker !== "string" || !dataset.ticker.trim()) {
      errors.push("A dataset is missing its ticker");
      continue;
    }
    if (byTicker.has(dataset.ticker)) {
      errors.push(`Duplicate imported dataset: ${dataset.ticker}`);
      continue;
    }
    byTicker.set(dataset.ticker, dataset);
  }

  const missingTickers = requiredTickers.filter(ticker => !byTicker.has(ticker));
  if (missingTickers.length) errors.push(`Missing required tickers: ${missingTickers.join(", ")}`);

  const present = requiredTickers.map(ticker => byTicker.get(ticker)).filter(Boolean);
  const metadataFields = ["source", "sourceUrl", "currency", "adjustmentBasis"];
  const reference = present[0];
  const inconsistentMetadata = [];
  if (reference) {
    for (const dataset of present.slice(1)) {
      for (const field of metadataFields) {
        if (dataset[field] !== reference[field]) {
          inconsistentMetadata.push({ ticker: dataset.ticker, field, expected: reference[field], actual: dataset[field] });
        }
      }
    }
  }
  if (inconsistentMetadata.length) errors.push("Imported datasets do not share one source and adjustment methodology");

  const dateSets = present.map(dataset => new Set(
    (Array.isArray(dataset.observations) ? dataset.observations : []).map(row => row.date)
  ));
  const commonDates = dateSets.length
    ? [...dateSets[0]].filter(date => dateSets.every(set => set.has(date))).sort()
    : [];
  const baselineCommonDate = [...commonDates].reverse().find(date => date <= baselineDate) ?? null;
  if (present.length === requiredTickers.length && !baselineCommonDate) {
    errors.push(`No common trading observation exists on or before baseline ${baselineDate}`);
  }

  const coverage = requiredTickers.map(ticker => {
    const dataset = byTicker.get(ticker);
    const dates = (dataset?.observations ?? []).map(row => row.date).sort();
    return {
      ticker,
      observations: dates.length,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
    };
  });

  const ready = errors.length === 0;
  const benchmark = byTicker.get("SPY");
  const quarterlyPerformance = ready && benchmark
    ? requiredTickers.filter(ticker => ticker !== "SPY").map(ticker => ({
        ticker,
        benchmark: "SPY",
        results: deriveQuarterlyMarketPerformance(
          byTicker.get(ticker).observations,
          benchmark.observations,
          quarters,
        ),
      }))
    : [];

  return {
    status: ready ? "ready-for-analysis" : "blocked",
    baselineDate,
    baselineCommonDate,
    requiredTickers: [...requiredTickers],
    importedTickers: [...byTicker.keys()].sort(),
    missingTickers,
    inconsistentMetadata,
    commonObservationCount: commonDates.length,
    firstCommonDate: commonDates[0] ?? null,
    lastCommonDate: commonDates.at(-1) ?? null,
    coverage,
    errors,
    quarterlyPerformance,
  };
}
