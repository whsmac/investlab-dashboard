// Authenticated, owner-only batch importer. Never accepts a service_role key.
// The caller must supply an already authenticated Supabase JS v2 client.
// No writes occur unless commit:true is explicitly passed.
import {validateSharedCsv} from './csv-import-validator.mjs';
const TABLE = {price:'market_price_observations',financial:'quarterly_financial_observations'};
function fail(error, step) { if (error) throw new Error(step+': '+error.message); }
export async function prepareSharedImport(client, csvText, kind) {
  const checked = validateSharedCsv(csvText,kind);
  const {data:{user},error:authError} = await client.auth.getUser();
  fail(authError,'auth');
  if (!user?.id) throw new Error('Sign in before preparing import');
  // The private schema is intentionally not exposed via PostgREST. RLS is the
  // final authorization gate; no browser-side owner check can replace it.
  const {data:companies,error:companiesError} = await client.from('companies').select('id,ticker');
  fail(companiesError,'companies');
  const ids = new Map((companies||[]).map(c=>[c.ticker,c.id]));
  const missing = [...new Set(checked.observations.map(x=>x.ticker).filter(t=>!ids.has(t)))];
  if (missing.length) throw new Error('Missing companies: '+missing.join(', '));
  const records = checked.observations.map(({ticker,...observation})=>({ticker,company_id:ids.get(ticker),...observation}));
  const dateColumn = kind==='price'?'trading_date':'fiscal_period';
  // Preflight detects collisions; DB unique constraints remain the final guard.
  for (const ticker of new Set(checked.observations.map(x=>x.ticker))) {
    const companyId = ids.get(ticker);
    const dates = records.filter(r=>r.company_id===companyId).map(r=>r[dateColumn]);
    const {data:existing,error} = await client.from(TABLE[kind])
      .select(dateColumn).eq('company_id',companyId).in(dateColumn,dates);
    fail(error,'existing observation check');
    if (existing?.length) throw new Error('Existing '+ticker+' '+dateColumn+': '+existing.map(x=>x[dateColumn]).join(', '));
  }
  return {kind,rows:records.length,records,userId:user.id};
}
export async function importSharedCsv(client,csvText,kind,{commit=false,sourceName=null,sourceUrl=null,fileName=null}={}) {
  const prepared = await prepareSharedImport(client,csvText,kind);
  if (!commit) return {status:'validated',written:0,rows:prepared.rows};
  if (sourceUrl && !/^https:\/\//.test(sourceUrl)) throw new Error('sourceUrl must be HTTPS');
  // Deliberately fail closed for multi-step writes: a single transaction via
  // server-side RPC is required to avoid orphaned batches/partial observations.
  throw new Error('Commit disabled until atomic owner-only import RPC is deployed and verified. No rows written.');
}
