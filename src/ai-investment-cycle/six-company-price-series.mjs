const TICKERS = Object.freeze(["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"]);
const QUARTER_RE = /^(\\d{4})-Q([1-4])$/;

function validDate(value) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value ?? ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function mergeSixCompanyPriceImports(imports) {
  if (!Array.isArray(imports) || imports.length === 0) throw new TypeError("At least one parsed CSV import is required");
  const merged = new Map();
  for (const item of imports) {
    if (item?.priceBasis !== "adjusted-close" || item?.currency !== "USD" || !Array.isArray(item.observations)) {
      throw new TypeError("Every import must contain USD adjusted-close observations");
    }
    for (const row of item.observations) {
      const key = `${row.ticker}:${row.date}`;
      const existing = merged.get(key);
      if (existing && existing.close !== row.close) throw new TypeError(`Conflicting adjusted close for ${key}`);
      if (!existing) merged.set(key, row);
    }
  }
  const observations = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker));
  return {
    schemaVersion: 1,
    currency: "USD",
    priceBasis: "adjusted-close",
    observations,
    coverage: TICKERS.map(ticker => {
      const rows = observations.filter(row => row.ticker === ticker);
      return { ticker, count: rows.length, firstDate: rows[0]?.date ?? null, lastDate: rows.at(-1)?.date ?? null };
    }),
  };
}

export function deriveQuarterlyAdjustedClose(observations) {
  if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
  const grouped = new Map();
  for (const row of observations) {
    if (!TICKERS.includes(row?.ticker) || !validDate(row?.date) || !Number.isFinite(row?.close) || row.close <= 0) {
      throw new TypeError("Invalid adjusted-close observation");
    }
    const date = new Date(`${row.date}T00:00:00Z`);
    const quarter = `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    const key = `${row.ticker}:${quarter}`;
    const current = grouped.get(key);
    if (!current || row.date > current.date) grouped.set(key, { ticker: row.ticker, quarter, date: row.date, close: row.close });
  }
  return [...grouped.values()].sort((a, b) => a.quarter.localeCompare(b.quarter) || a.ticker.localeCompare(b.ticker));
}

export function deriveIndexedAdjustedClose(observations, options = {}) {
  const ticker = options.ticker ?? "ALL";
  const startDate = options.startDate ?? "0000-01-01";
  const selected = observations.filter(row => (ticker === "ALL" || row.ticker === ticker) && row.date >= startDate);
  const firstByTicker = new Map();
  for (const row of selected) if (!firstByTicker.has(row.ticker)) firstByTicker.set(row.ticker, row.close);
  return selected.map(row => ({
    ...row,
    indexedClose: (row.close / firstByTicker.get(row.ticker)) * 100,
    baseDate: selected.find(point => point.ticker === row.ticker)?.date ?? null,
  }));
}

export function filterPricePeriod(observations, period, asOfDate) {
  if (!["1Y", "3Y", "5Y", "MAX"].includes(period)) throw new TypeError("period must be 1Y, 3Y, 5Y, or MAX");
  if (period === "MAX") return observations;
  const years = Number(period.slice(0, -1));
  const end = new Date(`${asOfDate}T00:00:00Z`);
  const start = new Date(Date.UTC(end.getUTCFullYear() - years, end.getUTCMonth(), end.getUTCDate()));
  const startDate = start.toISOString().slice(0, 10);
  return observations.filter(row => row.date >= startDate && row.date <= asOfDate);
}

export function quarterIndex(label) {
  const match = QUARTER_RE.exec(String(label ?? ""));
  if (!match) throw new TypeError(`Invalid quarter: ${label}`);
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}
