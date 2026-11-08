// Shared-data CSV preflight. Pure validation: no network, credentials or database writes.
// Import requires a separate, explicitly authorized commit workflow.
export const PRICE_HEADERS = ['date','ticker','close'];
export const FINANCIAL_HEADERS = ['ticker','period','revenue_usd_bn','capex_usd_bn','capex_definition','source_url'];

export function parseCsv(text) {
  if (typeof text !== 'string') throw new TypeError('CSV must be text');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closed = true; }
      } else cell += ch;
    } else if (ch === ',' || ch === '\n' || ch === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (ch !== ',') {
        if (ch === '\r' && source[i + 1] === '\n') i++;
        if (row.some(v => v.trim() !== '')) rows.push(row);
        row = [];
      }
    } else if (ch === '"' && cell === '' && !closed) quoted = true;
    else if (ch === '"' || closed) throw new Error('Invalid CSV quoting at character ' + (i + 1));
    else cell += ch;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  if (cell !== '' || row.length) {
    row.push(cell);
    if (row.some(v => v.trim() !== '')) rows.push(row);
  }
  return rows;
}

function dateIsValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m-1 && dt.getUTCDate() === d;
}
function numberOrNull(raw) {
  if (raw === '') return null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}
function validate(text, headers, rowValidator) {
  const rows = parseCsv(text);
  if (!rows.length) return {valid:false,records:[],errors:['CSV is empty']};
  if (rows[0].length !== headers.length || headers.some((h,i)=>rows[0][i].trim()!==h)) {
    return {valid:false,records:[],errors:['CSV headers must be exactly: '+headers.join(',')]};
  }
  const errors=[], records=[], seen=new Set();
  rows.slice(1).forEach((cells,i)=>{
    const line=i+2;
    if(cells.length!==headers.length) { errors.push('Row '+line+': expected '+headers.length+' columns'); return; }
    const obj=Object.fromEntries(headers.map((h,j)=>[h,cells[j].trim()]));
    const problem=rowValidator(obj);
    if(problem) { errors.push('Row '+line+': '+problem); return; }
    const key=headers===PRICE_HEADERS?obj.ticker+'|'+obj.date:obj.ticker+'|'+obj.period;
    if(seen.has(key)) { errors.push('Row '+line+': duplicate '+key); return; }
    seen.add(key); records.push(obj);
  });
  return {valid:errors.length===0,records,errors};
}
function tickerValid(t) { return /^[A-Z0-9][A-Z0-9.-]{0,19}$/.test(t); }
export function validatePriceCsv(text) {
  return validate(text,PRICE_HEADERS,r=>{
    if(!tickerValid(r.ticker)) return 'invalid ticker';
    if(!dateIsValid(r.date)) return 'invalid trading date';
    const price=numberOrNull(r.close);
    if(!Number.isFinite(price)||price<=0) return 'close must be a positive number';
    if(r.ticker==='SPCX'&&r.date<'2026-06-12') return 'SPCX predates listing boundary';
    return null;
  });
}
export function validateFinancialCsv(text) {
  return validate(text,FINANCIAL_HEADERS,r=>{
    if(!tickerValid(r.ticker)) return 'invalid ticker';
    if(!/^\d{4}-Q[1-4]$/.test(r.period)) return 'invalid fiscal period';
    const rev=numberOrNull(r.revenue_usd_bn), capex=numberOrNull(r.capex_usd_bn);
    if(Number.isNaN(rev)||Number.isNaN(capex)||rev<0||capex<0) return 'invalid revenue or CAPEX';
    if(rev===null&&capex===null) return 'at least one financial metric is required';
    if(capex!==null&&!r.capex_definition) return 'CAPEX definition is required';
    if(r.source_url&&!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(r.source_url)) return 'source URL must use HTTPS';
    return null;
  });
}
