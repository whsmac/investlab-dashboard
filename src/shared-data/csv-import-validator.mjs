// Pure, offline validation only. This module never connects to Supabase.
export const PRICE_HEADERS = ['date','ticker','close'];
export const FINANCIAL_HEADERS = ['ticker','period','revenue_usd_bn','capex_usd_bn','capex_definition','source_url'];
const ALLOWED = new Set(['MSFT','GOOGL','AMZN','META','TSLA','SPCX']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
function csvRows(input) {
  if (typeof input !== 'string') throw new TypeError('CSV text required');
  const text = input.replace(/^\uFEFF/, '');
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      if (cell.length) throw new Error('Unexpected quote');
      quoted = true;
    } else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i+1] === '\n') i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
function strictDate(value) {
  if (!ISO.test(value)) return false;
  const d = new Date(value+'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === value;
}
function number(value, label, required) {
  if (!value) { if (required) throw new Error(label+' is required'); return null; }
  if (!/^(?:\d+)(?:\.\d+)?$/.test(value)) throw new Error(label+' must be a nonnegative decimal');
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(label+' is not finite');
  return n;
}
export function validateSharedCsv(text, kind) {
  const headers = kind === 'price' ? PRICE_HEADERS : kind === 'financial' ? FINANCIAL_HEADERS : null;
  if (!headers) throw new Error('Unknown dataset kind');
  const rows = csvRows(text);
  if (!rows.length || rows[0].length !== headers.length || rows[0].some((v,i)=>v.trim()!==headers[i])) throw new Error('CSV headers do not match '+kind+' contract');
  const observations = [], seen = new Set();
  for (let i=1;i<rows.length;i++) {
    const values = rows[i].map(v=>v.trim()), line = i+1;
    try {
      if (values.length !== headers.length) throw new Error('Column count mismatch');
      const r = Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
      if (!ALLOWED.has(r.ticker)) throw new Error('Unsupported ticker');
      const key = kind==='price' ? r.ticker+'|'+r.date : r.ticker+'|'+r.period;
      if (seen.has(key)) throw new Error('Duplicate ticker/period');
      seen.add(key);
      if (kind==='price') {
        if (!strictDate(r.date)) throw new Error('Invalid trading date');
        if (r.ticker==='SPCX' && r.date<'2026-06-12') throw new Error('SPCX predates listing boundary');
        const close = number(r.close,'close',true);
        if (close<=0) throw new Error('close must be positive');
        observations.push({ticker:r.ticker,trading_date:r.date,close_price:close,price_basis:'adjusted_close',currency:'USD'});
      } else {
        if (!/^\d{4}-Q[1-4]$/.test(r.period)) throw new Error('Invalid fiscal period');
        const revenue = number(r.revenue_usd_bn,'revenue',false), capex = number(r.capex_usd_bn,'capex',false);
        if (revenue===null && capex===null) throw new Error('Both financial metrics missing');
        if (capex!==null && !r.capex_definition) throw new Error('CAPEX definition required');
        if (r.source_url && !/^https:\/\/[^\s]+$/.test(r.source_url)) throw new Error('HTTPS source URL required');
        observations.push({ticker:r.ticker,fiscal_period:r.period,revenue_usd_bn:revenue,capex_usd_bn:capex,capex_definition:r.capex_definition||null,source_url:r.source_url||null});
      }
    } catch(e) { throw new Error('CSV row '+line+': '+e.message); }
  }
  if (!observations.length) throw new Error('CSV has no observations');
  return {kind,rows:observations.length,observations};
}
