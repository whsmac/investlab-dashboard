const QUARTER_RE = /^([0-9]{4})-Q([1-4])$/;

function toQuarterIndex(value) {
  const match = QUARTER_RE.exec(String(value ?? ""));
  if (!match) throw new TypeError(`Invalid quarter: ${value}`);
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}

function pearsonCorrelation(pairs) {
  if (pairs.length < 2) return null;
  const xMean = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const yMean = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  let covariance = 0, xVariance = 0, yVariance = 0;
  for (const pair of pairs) {
    const x = pair.x - xMean, y = pair.y - yMean;
    covariance += x * y;
    xVariance += x * x;
    yVariance += y * y;
  }
  if (xVariance === 0 || yVariance === 0) return null;
  return covariance / Math.sqrt(xVariance * yVariance);
}

/**
 * Tests whether reported CAPEX growth tends to precede business growth.
 * A positive lag means CAPEX growth in quarter t is paired with business
 * growth in quarter t + lag. This is descriptive correlation, not causation
 * or a forecast. Use only like-for-like company metrics and adequate history.
 */
export function calculateLaggedBusinessLinkage(capexSeries, businessSeries, options = {}) {
  if (!Array.isArray(capexSeries) || !Array.isArray(businessSeries)) {
    throw new TypeError("capexSeries and businessSeries must be arrays");
  }
  const maxLag = options.maxLag ?? 4;
  const minObservations = options.minObservations ?? 6;
  if (!Number.isInteger(maxLag) || maxLag < 0 || maxLag > 12) {
    throw new RangeError("maxLag must be an integer from 0 to 12");
  }
  if (!Number.isInteger(minObservations) || minObservations < 3) {
    throw new RangeError("minObservations must be an integer of at least 3");
  }

  const normalize = (rows, field, label) => {
    const map = new Map();
    for (const row of rows) {
      if (!row || typeof row.company !== "string" || !row.company.trim()) {
        throw new TypeError(`${label} company is required`);
      }
      const index = toQuarterIndex(row.quarter);
      const key = `${row.company}:${index}`;
      if (map.has(key)) throw new TypeError(`Duplicate ${label} company quarter: ${key}`);
      const value = row[field] === null || row[field] === undefined ? null : Number(row[field]);
      if (value !== null && !Number.isFinite(value)) throw new TypeError(`${field} must be finite or null`);
      map.set(key, { company: row.company, quarter: row.quarter, index, value });
    }
    return map;
  };

  const capex = normalize(capexSeries, "capexYoYPercent", "CAPEX");
  const business = normalize(businessSeries, "businessGrowthPercent", "business");
  const companies = [...new Set([...capex.values(), ...business.values()].map(row => row.company))].sort();

  return companies.flatMap(company => {
    const companyCapex = [...capex.values()].filter(row => row.company === company);
    return Array.from({ length: maxLag + 1 }, (_, lag) => {
      const pairs = [];
      for (const capexRow of companyCapex) {
        if (!Number.isFinite(capexRow.value)) continue;
        const businessRow = business.get(`${company}:${capexRow.index + lag}`);
        if (!businessRow || !Number.isFinite(businessRow.value)) continue;
        pairs.push({
          capexQuarter: capexRow.quarter,
          businessQuarter: businessRow.quarter,
          x: capexRow.value,
          y: businessRow.value,
        });
      }
      const correlation = pairs.length >= minObservations ? pearsonCorrelation(pairs) : null;
      return {
        company,
        lagQuarters: lag,
        observations: pairs.length,
        correlation,
        status: correlation === null ? "insufficient-or-constant-data" : "descriptive-only",
        interpretation: lag === 0 ? "same-quarter association" : `CAPEX growth leads business growth by ${lag} quarter(s)`,
      };
    });
  });
}
