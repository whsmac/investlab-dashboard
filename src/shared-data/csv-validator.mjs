// Pure CSV validation for the isolated INVESTLAB shared-data import pipeline.
// No network, database, browser storage or credentials are accessed.
const HEADERS = {
  market_price: ['date', 'ticker', 'close'],
  quarterly_financial: ['ticker', 'period', 'revenue_usd_bn', 'capex_usd_bn', 'capex_definition', 'source_url']
};
export function parseCsv(text) {
  if (typeof text !== 'string') throw new TypeError('CSV text required');
  const rows = []; let row = [], cell = '', quoted = false, afterQuote = false;
  const input = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; afterQuote = true; }
      else cell += ch;
    } else if (afterQuote) {
      if (ch === ',') { row.push(cell); cell = ''; afterQuote = false; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; afterQuote = false; }
      else if (ch !== ' ' && ch !== '\t') throw new Error('Unexpected character after closing quote');
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch === '"') throw new Error('Unexpected quote in unquoted field');
    else cell += ch;
  }
  if (quoted) throw new Error('Unterminated quoted field');
  if (cell !== '' || row.length || afterQuote) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
}
function positiveNumber(s, allowZero = false) {
  if (!/^(?:\d+)(?:\.\d+)?$/.test(s)) return false;
  const n = Number(s);
  return Number.isFinite(n) && (allowZero ? n >= 0 : n > 0);
}
export function validateSharedCsv(text, datasetType, allowedTickers) {
  const expected = HEADERS[datasetType];
  if (!expected) throw new Error('Unsupported dataset type');
  const rows = parseCsv(text);
  if (!rows.length || rows[0].join(',') !== expected.join(',')) throw new Error('CSV headers must exactly match: ' + expected.join(','));
  const allowed = new Set(allowedTickers || []);
  const accepted = [], rejected = [], seen = new Set();
  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i], line = i + 1;
    if (fields.length !== expected.length) { rejected.push({ line, reason: 'Column count mismatch' }); continue; }
    const item = Object.fromEntries(expected.map((key, index) => [key, fields[index].trim()]));
    const key = datasetType === 'market_price' ? item.ticker + '/' + item.date : item.ticker + '/' + item.period;
    let reason = '';
    if (!allowed.has(item.ticker)) reason = 'Ticker not in registered catalog';
    else if (datasetType === 'market_price') {
      if (!validDate(item.date)) reason = 'Invalid trading date';
      else if (!positiveNumber(item.close)) reason = 'Adjusted close must be positive';
    } else {
      if (!/^\d{4}-Q[1-4]$/.test(item.period)) reason = 'Invalid fiscal period';
      else if (!item.revenue_usd_bn && !item.capex_usd_bn) reason = 'At least one metric required';
      else if (item.revenue_usd_bn && !positiveNumber(item.revenue_usd_bn, true)) reason = 'Invalid revenue';
      else if (item.capex_usd_bn && !positiveNumber(item.capex_usd_bn, true)) reason = 'Invalid CAPEX';
      else if (item.capex_usd_bn && !item.capex_definition) reason = 'CAPEX definition required';
      else if (item.source_url && !/^https:\/\/[^\s]+$/i.test(item.source_url)) reason = 'Source URL must use HTTPS';
    }
    if (!reason && seen.has(key)) reason = 'Duplicate ticker and period/date';
    if (reason) rejected.push({ line, key, reason });
    else { seen.add(key); accepted.push(item); }
  }
  return { datasetType, total: rows.length - 1, accepted, rejected, valid: rejected.length === 0 };
}
