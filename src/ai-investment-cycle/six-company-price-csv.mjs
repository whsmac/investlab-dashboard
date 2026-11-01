const DATE_RE = /^\\d{4}-\\d{2}-\\d{2}$/;
const REQUIRED_HEADERS = ["date", "ticker", "close"];
export const SIX_COMPANY_PRICE_TICKERS = Object.freeze(["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"]);
export const SPCX_LISTING_DATE = "2026-06-12";

function parseCsvRows(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(input ?? "").replace(/^\\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\\n" || char === "\\r") {
      if (char === "\\r" && source[i + 1] === "\\n") i += 1;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new TypeError("CSV contains an unterminated quoted field");
  row.push(field);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

function isValidDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Parse a combined manual daily-close CSV for the six-company monitor.
 * Partial ticker coverage is allowed so monthly uploads can append only new
 * observations; callers must merge by (ticker, date) and surface replacements.
 */
export function parseSixCompanyPriceCsv(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) throw new TypeError("CSV must contain a header and at least one observation");
  const headers = rows[0].map(value => value.trim());
  if (headers.length !== REQUIRED_HEADERS.length || REQUIRED_HEADERS.some((name, index) => headers[index] !== name)) {
    throw new TypeError(`CSV header must be exactly: ${REQUIRED_HEADERS.join(",")}`);
  }

  const seen = new Set();
  const observations = rows.slice(1).map((row, index) => {
    if (row.length !== REQUIRED_HEADERS.length) {
      throw new TypeError(`CSV row ${index + 2} must contain exactly ${REQUIRED_HEADERS.length} columns`);
    }
    const [date, tickerRaw, closeRaw] = row.map(value => value.trim());
    const ticker = tickerRaw.toUpperCase();
    if (!isValidDate(date)) throw new TypeError(`CSV row ${index + 2} date must be a valid YYYY-MM-DD date`);
    if (!SIX_COMPANY_PRICE_TICKERS.includes(ticker)) {
      throw new TypeError(`CSV row ${index + 2} ticker must be one of: ${SIX_COMPANY_PRICE_TICKERS.join(", ")}`);
    }
    if (ticker === "SPCX" && date < SPCX_LISTING_DATE) {
      throw new TypeError(`SPCX observations cannot predate listing date ${SPCX_LISTING_DATE}`);
    }
    const key = `${ticker}:${date}`;
    if (seen.has(key)) throw new TypeError(`Duplicate price observation: ${key}`);
    seen.add(key);
    if (!/^(?:\\d+)(?:\\.\\d+)?$/.test(closeRaw)) {
      throw new TypeError(`CSV row ${index + 2} close must be a positive decimal number in USD`);
    }
    const close = Number(closeRaw);
    if (!Number.isFinite(close) || close <= 0) {
      throw new TypeError(`CSV row ${index + 2} close must be a positive decimal number in USD`);
    }
    return { date, ticker, close, currency: "USD", priceBasis: "unadjusted-close" };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker));

  return {
    schemaVersion: 1,
    importMethod: "manual-csv",
    priceBasis: "unadjusted-close",
    currency: "USD",
    observations,
    coverage: SIX_COMPANY_PRICE_TICKERS.map(ticker => ({
      ticker,
      count: observations.filter(row => row.ticker === ticker).length,
    })),
  };
}
