const QUARTER_RE = /^(\\d{4})-Q([1-4])$/;

function quarterIndex(quarter) {
  const match = QUARTER_RE.exec(String(quarter ?? ""));
  if (!match) throw new TypeError(`Invalid quarter: ${quarter}`);
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}

function finiteNonNegative(value, field, allowNull = false) {
  if (allowNull && (value === null || value === undefined || value === "")) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${field} must be a non-negative finite number`);
  }
  return number;
}

function pctChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current / previous) - 1) * 100;
}

function sumCompleteWindow(rows, endIndex, field, windowSize = 4) {
  const window = rows.slice(Math.max(0, endIndex - windowSize + 1), endIndex + 1);
  if (window.length !== windowSize) return null;
  for (let i = 1; i < window.length; i += 1) {
    if (quarterIndex(window[i].quarter) !== quarterIndex(window[i - 1].quarter) + 1) return null;
  }
  if (window.some(row => !Number.isFinite(row[field]))) return null;
  return window.reduce((sum, row) => sum + row[field], 0);
}

/**
 * Input amounts are USD millions. CAPEX is company-wide reported capital
 * expenditure, not an estimate of AI-only infrastructure spend.
 * aiRevenueUsdM must be null unless the company explicitly disclosed a
 * comparable AI revenue figure for that quarter.
 */
export function calculateCompanySeries(records) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  const seen = new Set();
  const rows = records.map(record => {
    if (!record || typeof record.company !== "string" || !record.company.trim()) {
      throw new TypeError("company is required");
    }
    const qIndex = quarterIndex(record.quarter);
    const key = `${record.company}:${record.quarter}`;
    if (seen.has(key)) throw new TypeError(`Duplicate company quarter: ${key}`);
    seen.add(key);
    return {
      ...record,
      capexUsdM: finiteNonNegative(record.capexUsdM, "capexUsdM"),
      aiRevenueUsdM: finiteNonNegative(record.aiRevenueUsdM, "aiRevenueUsdM", true),
      _qIndex: qIndex,
    };
  }).sort((a, b) => a.company.localeCompare(b.company) || a._qIndex - b._qIndex);

  const byCompany = new Map();
  for (const row of rows) {
    if (!byCompany.has(row.company)) byCompany.set(row.company, []);
    byCompany.get(row.company).push(row);
  }

  const output = [];
  for (const companyRows of byCompany.values()) {
    for (let i = 0; i < companyRows.length; i += 1) {
      const row = companyRows[i];
      const candidatePrevious = companyRows[i - 1];
      const previous = candidatePrevious?._qIndex === row._qIndex - 1 ? candidatePrevious : null;
      const yearAgo = companyRows.find(item => item._qIndex === row._qIndex - 4);
      const yoyCapex = pctChange(row.capexUsdM, yearAgo?.capexUsdM);
      const yoyAiRevenue = pctChange(row.aiRevenueUsdM, yearAgo?.aiRevenueUsdM);
      const trailingCapex = sumCompleteWindow(companyRows, i, "capexUsdM");
      const trailingAiRevenue = sumCompleteWindow(companyRows, i, "aiRevenueUsdM");
      const previousYoy = previous
        ? pctChange(previous.capexUsdM, companyRows.find(item => item._qIndex === previous._qIndex - 4)?.capexUsdM)
        : null;
      const accelerationPp = yoyCapex !== null && previousYoy !== null
        ? yoyCapex - previousYoy
        : null;

      let cycleSignal = "insufficient-data";
      if (yoyCapex !== null && accelerationPp !== null) {
        if (yoyCapex < 0 || accelerationPp <= -10) cycleSignal = "decelerating";
        else if (yoyCapex >= 25 && accelerationPp >= 10) cycleSignal = "accelerating";
        else cycleSignal = "steady";
      }

      output.push({
        company: row.company,
        quarter: row.quarter,
        capexUsdM: row.capexUsdM,
        aiRevenueUsdM: row.aiRevenueUsdM,
        capexQoQPercent: pctChange(row.capexUsdM, previous?.capexUsdM),
        capexYoYPercent: yoyCapex,
        capexYoYAccelerationPp: accelerationPp,
        aiRevenueYoYPercent: yoyAiRevenue,
        trailingFourQuarterCapexUsdM: trailingCapex,
        trailingFourQuarterAiRevenueUsdM: trailingAiRevenue,
        trailingAiRevenueToCapexPercent: trailingCapex > 0 && trailingAiRevenue !== null
          ? (trailingAiRevenue / trailingCapex) * 100
          : null,
        cycleSignal,
        source: row.source ?? null,
        sourceUrl: row.sourceUrl ?? null,
        aiRevenueDefinition: row.aiRevenueDefinition ?? null,
        aiRevenueComparable: row.aiRevenueComparable === true,
      });
    }
  }
  return output;
}

/**
 * Calculates market total return from adjusted-close observations. The benchmark
 * comparison is kept separate from operating AI revenue/CAPEX metrics.
 */
export function calculateMarketPerformance(companyPrices, benchmarkPrices, startDate, endDate) {
  const index = points => {
    if (!Array.isArray(points)) throw new TypeError("price observations must be arrays");
    const map = new Map();
    for (const point of points) {
      const value = Number(point?.adjustedClose);
      if (!point?.date || !Number.isFinite(value) || value <= 0) continue;
      map.set(String(point.date), value);
    }
    return map;
  };
  const company = index(companyPrices);
  const benchmark = index(benchmarkPrices);
  const dates = [...company.keys()].filter(date =>
    date >= String(startDate) && date <= String(endDate) && benchmark.has(date)
  ).sort();
  if (dates.length < 2) {
    return { startDate: null, endDate: null, companyReturnPercent: null, benchmarkReturnPercent: null, excessReturnPp: null, observations: dates.length };
  }
  const first = dates[0], last = dates[dates.length - 1];
  const companyReturnPercent = pctChange(company.get(last), company.get(first));
  const benchmarkReturnPercent = pctChange(benchmark.get(last), benchmark.get(first));
  return {
    startDate: first,
    endDate: last,
    companyReturnPercent,
    benchmarkReturnPercent,
    excessReturnPp: companyReturnPercent - benchmarkReturnPercent,
    observations: dates.length,
  };
}

/**
 * Sums reported company CAPEX for a quarter and reports coverage explicitly.
 * A partial sum is never labelled as the universe total.
 */
export function aggregateQuarterlyCapex(series, companies) {
  const universe = [...new Set(companies ?? [])];
  if (!universe.length) throw new TypeError("at least one company is required");
  const quarters = [...new Set(series.map(row => row.quarter))].sort((a, b) => quarterIndex(a) - quarterIndex(b));
  return quarters.map(quarter => {
    const rows = series.filter(row => row.quarter === quarter && universe.includes(row.company));
    const present = new Set(rows.map(row => row.company));
    const totalUsdM = rows.reduce((sum, row) => sum + row.capexUsdM, 0);
    return {
      quarter,
      totalUsdM: present.size === universe.length ? totalUsdM : null,
      partialTotalUsdM: totalUsdM,
      companiesReported: present.size,
      companiesExpected: universe.length,
      coveragePercent: (present.size / universe.length) * 100,
    };
  });
}
