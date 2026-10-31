const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

function quarterIndex(value) {
  const match = QUARTER_RE.exec(String(value ?? ""));
  if (!match) throw new TypeError(`Invalid quarter: ${value}`);
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}

function pearson(pairs) {
  if (pairs.length < 2) return null;
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let numerator = 0, sumX = 0, sumY = 0;
  for (const pair of pairs) {
    const dx = pair.x - meanX, dy = pair.y - meanY;
    numerator += dx * dy;
    sumX += dx * dx;
    sumY += dy * dy;
  }
  if (sumX === 0 || sumY === 0) return null;
  return numerator / Math.sqrt(sumX * sumY);
}

/**
 * Compounds quarterly shareholder total returns. Returns are percentages,
 * not additive contributions. A missing, stale, or non-contiguous quarter
 * blocks cumulative-from-first and any trailing-four-quarter result.
 */
export function deriveCompoundedMarketReturns(quarterlyRows) {
  if (!Array.isArray(quarterlyRows)) throw new TypeError("quarterlyRows must be an array");
  const sorted = quarterlyRows.map(row => {
    if (!row || typeof row.quarter !== "string") throw new TypeError("each row requires a quarter");
    return { ...row, _index: quarterIndex(row.quarter) };
  }).sort((a, b) => a._index - b._index);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i]._index === sorted[i - 1]._index) throw new TypeError(`Duplicate quarter: ${sorted[i].quarter}`);
  }

  let cumulativeFactor = 1;
  let cumulativeValid = sorted.length > 0;
  return sorted.map((row, index) => {
    const valid = row.status === "ok" &&
      Number.isFinite(row.companyReturnPercent) &&
      Number.isFinite(row.benchmarkReturnPercent) &&
      Number.isFinite(row.excessReturnPp) &&
      row.companyReturnPercent > -100 &&
      row.benchmarkReturnPercent > -100;
    if (index > 0 && row._index !== sorted[index - 1]._index + 1) cumulativeValid = false;
    if (!valid) cumulativeValid = false;
    if (cumulativeValid) cumulativeFactor *= 1 + row.companyReturnPercent / 100;

    const window = sorted.slice(Math.max(0, index - 3), index + 1);
    const contiguous = window.length === 4 &&
      window.every((item, i) => i === 0 || item._index === window[i - 1]._index + 1);
    const windowValid = contiguous && window.every(item =>
      item.status === "ok" &&
      Number.isFinite(item.companyReturnPercent) &&
      Number.isFinite(item.benchmarkReturnPercent) &&
      Number.isFinite(item.excessReturnPp) &&
      item.companyReturnPercent > -100 &&
      item.benchmarkReturnPercent > -100
    );
    const compound = field => windowValid
      ? (window.reduce((factor, item) => factor * (1 + item[field] / 100), 1) - 1) * 100
      : null;

    const { _index, ...clean } = row;
    return {
      ...clean,
      cumulativeCompanyReturnFromFirstPercent: cumulativeValid ? (cumulativeFactor - 1) * 100 : null,
      trailingFourQuarterCompanyReturnPercent: compound("companyReturnPercent"),
      trailingFourQuarterBenchmarkReturnPercent: compound("benchmarkReturnPercent"),
      trailingFourQuarterExcessReturnPp: windowValid
        ? compound("companyReturnPercent") - compound("benchmarkReturnPercent")
        : null,
      trailingFourQuarterStatus: windowValid ? "complete" : "incomplete-window",
      cumulativeStatus: cumulativeValid ? "continuous-from-first-quarter" : "blocked-by-gap-or-invalid-quarter",
    };
  });
}

/**
 * Aligns company-wide CAPEX YoY growth with shareholder returns in the same
 * calendar quarter. Correlations are descriptive only, never predictive.
 */
export function deriveCapexMarketLinkage(capexRows, marketSeries, options = {}) {
  if (!Array.isArray(capexRows) || !Array.isArray(marketSeries)) {
    throw new TypeError("capexRows and marketSeries must be arrays");
  }
  const minObservations = options.minObservations ?? 6;
  if (!Number.isInteger(minObservations) || minObservations < 2) {
    throw new TypeError("minObservations must be an integer of at least 2");
  }
  const companyToTicker = options.companyToTicker ?? {
    Microsoft: "MSFT", Alphabet: "GOOGL", Amazon: "AMZN", Meta: "META",
  };
  const output = [];
  for (const market of marketSeries) {
    if (!market || typeof market.ticker !== "string" || !Array.isArray(market.results)) {
      throw new TypeError("each market series requires ticker and results");
    }
    const company = Object.keys(companyToTicker).find(name => companyToTicker[name] === market.ticker);
    if (!company) continue;
    const marketByQuarter = new Map();
    for (const row of market.results) {
      quarterIndex(row.quarter);
      if (marketByQuarter.has(row.quarter)) throw new TypeError(`Duplicate market quarter: ${market.ticker} ${row.quarter}`);
      marketByQuarter.set(row.quarter, row);
    }
    const capexByQuarter = new Map();
    for (const row of capexRows.filter(item => item.company === company)) {
      quarterIndex(row.quarter);
      if (capexByQuarter.has(row.quarter)) throw new TypeError(`Duplicate CAPEX quarter: ${company} ${row.quarter}`);
      capexByQuarter.set(row.quarter, row);
    }
    const pairsFor = field => [...capexByQuarter.keys()].sort((a, b) => quarterIndex(a) - quarterIndex(b))
      .flatMap(quarter => {
        const capex = capexByQuarter.get(quarter), marketRow = marketByQuarter.get(quarter);
        const x = capex?.capexYoYPercent, y = marketRow?.[field];
        return marketRow?.status === "ok" && Number.isFinite(x) && Number.isFinite(y)
          ? [{ quarter, x, y }] : [];
      });
    for (const metric of [
      { field: "companyReturnPercent", id: "shareholder_total_return" },
      { field: "excessReturnPp", id: "sp500_proxy_excess_return" },
    ]) {
      const pairs = pairsFor(metric.field);
      output.push({
        company,
        ticker: market.ticker,
        metric: metric.id,
        observations: pairs.length,
        correlation: pairs.length >= minObservations ? pearson(pairs) : null,
        status: pairs.length >= minObservations ? "descriptive-only" : "insufficient-observations",
        alignedQuarters: pairs.map(pair => pair.quarter),
        caveat: "Same-quarter descriptive correlation only; company-wide CAPEX is not AI-only spend. This does not establish causation, predict returns, or constitute a trading signal.",
      });
    }
  }
  return output;
}

/**
 * Counts consecutive quarters in which CAPEX YoY growth decelerates.
 * This is a descriptive diagnostic; it intentionally emits no alert or trade signal.
 */
export function deriveCapexDeceleration(rows) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const byCompany = new Map();
  for (const row of rows) {
    if (!row || typeof row.company !== "string") throw new TypeError("company is required");
    quarterIndex(row.quarter);
    if (!byCompany.has(row.company)) byCompany.set(row.company, []);
    byCompany.get(row.company).push(row);
  }
  const result = [];
  for (const [company, companyRows] of byCompany) {
    companyRows.sort((a, b) => quarterIndex(a.quarter) - quarterIndex(b.quarter));
    let streak = 0;
    for (let i = 0; i < companyRows.length; i += 1) {
      const row = companyRows[i];
      const previous = companyRows[i - 1];
      const contiguous = !previous || quarterIndex(row.quarter) === quarterIndex(previous.quarter) + 1;
      const acceleration = row.capexYoYAccelerationPp;
      if (!contiguous || !Number.isFinite(acceleration)) streak = 0;
      else if (acceleration < 0) streak += 1;
      else streak = 0;
      result.push({
        company,
        quarter: row.quarter,
        capexYoYPercent: Number.isFinite(row.capexYoYPercent) ? row.capexYoYPercent : null,
        capexYoYAccelerationPp: Number.isFinite(acceleration) ? acceleration : null,
        consecutiveDecelerationQuarters: Number.isFinite(acceleration) ? streak : null,
        status: streak >= 2 ? "multi-quarter-deceleration-observed" :
          Number.isFinite(acceleration) ? "descriptive-monitoring" : "insufficient-data",
        interpretation: "CAPEX growth-rate deceleration only; not necessarily falling CAPEX, AI spending, business returns, or a market-cycle turning point.",
      });
    }
  }
  return result.sort((a, b) => a.company.localeCompare(b.company) || quarterIndex(a.quarter) - quarterIndex(b.quarter));
}
