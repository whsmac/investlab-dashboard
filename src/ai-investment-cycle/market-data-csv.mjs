const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_HEADERS = ["ticker", "date", "adjustedClose"];

function parseCsvRows(input) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const text = String(input ?? "").replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new TypeError("CSV contains an unterminated quoted field");
  row.push(field);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

function validDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") throw new TypeError("import metadata is required");
  for (const field of ["ticker", "source", "sourceUrl", "retrievedAt", "adjustmentBasis", "currency", "licenseNote"]) {
    if (typeof metadata[field] !== "string" || !metadata[field].trim()) {
      throw new TypeError(`metadata.${field} is required`);
    }
  }
  if (!/^[A-Z][A-Z0-9.\-^]{0,14}$/.test(metadata.ticker)) {
    throw new TypeError("metadata.ticker must be an uppercase market symbol");
  }
  if (!/^https:\/\//i.test(metadata.sourceUrl)) throw new TypeError("metadata.sourceUrl must be HTTPS");
  if (!Number.isFinite(Date.parse(metadata.retrievedAt)) || !/(Z|[+-]\d{2}:?\d{2})$/i.test(metadata.retrievedAt)) {
    throw new TypeError("metadata.retrievedAt must be an ISO timestamp with timezone");
  }
  if (metadata.currency !== "USD") throw new TypeError("only USD observations are supported");
  if (metadata.adjustmentBasis !== "split_and_cash_dividends") {
    throw new TypeError("adjustmentBasis must confirm split and cash-dividend adjustment");
  }
}

/**
 * Parse a user-supplied CSV export without network access or provider credentials.
 * The source's terms and the adjustment methodology must be confirmed by the
 * operator; this parser does not grant or infer data rights.
 */
export function parseAdjustedPriceCsv(csvText, metadata) {
  validateMetadata(metadata);
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
    const [tickerRaw, dateRaw, priceRaw] = row.map(value => value.trim());
    const ticker = tickerRaw.toUpperCase();
    if (ticker !== metadata.ticker) {
      throw new TypeError(`CSV row ${index + 2} ticker does not match metadata.ticker`);
    }
    if (!validDate(dateRaw)) throw new TypeError(`CSV row ${index + 2} date must be a valid YYYY-MM-DD date`);
    if (seen.has(dateRaw)) throw new TypeError(`Duplicate price date: ${dateRaw}`);
    seen.add(dateRaw);
    if (!/^(?:\d+)(?:\.\d+)?$/.test(priceRaw)) {
      throw new TypeError(`CSV row ${index + 2} adjustedClose must be a positive decimal number`);
    }
    const adjustedClose = Number(priceRaw);
    if (!Number.isFinite(adjustedClose) || adjustedClose <= 0) {
      throw new TypeError(`CSV row ${index + 2} adjustedClose must be a positive decimal number`);
    }
    return { ticker, date: dateRaw, adjustedClose };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return {
    schemaVersion: 1,
    ticker: metadata.ticker,
    currency: metadata.currency,
    adjustmentBasis: metadata.adjustmentBasis,
    source: metadata.source,
    sourceUrl: metadata.sourceUrl,
    retrievedAt: metadata.retrievedAt,
    licenseNote: metadata.licenseNote,
    importMethod: "manual-csv",
    observations,
  };
}
