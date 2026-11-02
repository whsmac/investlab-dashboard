const TICKERS = Object.freeze(["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"]);
const HEADERS = ["ticker", "period", "revenue_usd_bn", "capex_usd_bn", "capex_definition", "source_url"];
const PERIOD_RE = /^\d{4}-Q[1-4]$/;

function rowsFromCsv(input) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = []; field = "";
    } else field += ch;
  }
  if (quoted) throw new TypeError("CSV has an unterminated quoted field");
  row.push(field);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}

function optionalAmount(value, label, rowNumber) {
  if (value === "") return null;
  if (!/^(?:\d+)(?:\.\d+)?$/.test(value)) throw new TypeError(`Row ${rowNumber}: ${label} must be a non-negative USD billions value or blank`);
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new TypeError(`Row ${rowNumber}: invalid ${label}`);
  return amount;
}

export function parseSixCompanyFinancialCsv(csvText) {
  const rows = rowsFromCsv(csvText);
  if (rows.length < 2) throw new TypeError("CSV needs a header and at least one quarterly observation");
  const header = rows[0].map(value => value.trim());
  if (header.length !== HEADERS.length || HEADERS.some((name, index) => header[index] !== name)) {
    throw new TypeError(`Header must be exactly: ${HEADERS.join(",")}`);
  }
  const seen = new Set();
  const observations = rows.slice(1).map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== HEADERS.length) throw new TypeError(`Row ${rowNumber} must contain ${HEADERS.length} columns`);
    const [tickerRaw, period, revenueRaw, capexRaw, capexDefinition, sourceUrl] = values.map(value => value.trim());
    const ticker = tickerRaw.toUpperCase();
    if (!TICKERS.includes(ticker)) throw new TypeError(`Row ${rowNumber}: unsupported ticker`);
    if (!PERIOD_RE.test(period)) throw new TypeError(`Row ${rowNumber}: period must be YYYY-Q1 through YYYY-Q4`);
    const key = `${ticker}:${period}`;
    if (seen.has(key)) throw new TypeError(`Duplicate financial observation: ${key}`);
    seen.add(key);
    const revenue = optionalAmount(revenueRaw, "revenue_usd_bn", rowNumber);
    const capex = optionalAmount(capexRaw, "capex_usd_bn", rowNumber);
    if (revenue === null && capex === null) throw new TypeError(`Row ${rowNumber}: revenue or CAPEX is required`);
    if (capex !== null && !capexDefinition) throw new TypeError(`Row ${rowNumber}: capex_definition is required when CAPEX is provided`);
    if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) throw new TypeError(`Row ${rowNumber}: source_url must be HTTPS`);
    return { ticker, period, revenueUsdBn: revenue, capexUsdBn: capex, capexDefinition: capexDefinition || null, sourceUrl: sourceUrl || null, currency: "USD", unit: "billions" };
  }).sort((a, b) => a.period.localeCompare(b.period) || a.ticker.localeCompare(b.ticker));
  return { schemaVersion: 1, importMethod: "manual-quarterly-csv", currency: "USD", unit: "billions", observations };
}
