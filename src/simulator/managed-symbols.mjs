// Read-only symbol selector for the existing INVESTLAB pilot ledger.
// No registration, storage writes, Supabase calls or portfolio mutations.
const KEYS = Object.freeze({
  portfolio: 'investlab-pilot-portfolio-symbols-v1',
  watch: 'investlab-pilot-watchlist-v1',
  trades: 'investlab-pilot-trades-v1'
});
const symbol = item => (typeof item === 'string' ? item : item?.symbol ?? item?.ticker ?? '').trim().toUpperCase();
const valid = value => /^[A-Z0-9.^_-]{1,20}$/.test(value);
export function collectManagedSymbols({portfolio={},watchlist=[],trades=[]}={}) {
  const found=new Map();
  for(const [items,category] of [[portfolio.holdings,'보유'],[portfolio.watchlist,'관심'],[portfolio.past,'거래이력'],[watchlist,'관심'],[trades,'거래이력']]){
    if(!Array.isArray(items))continue;
    for(const item of items){const code=symbol(item);if(!valid(code))continue;
      if(!found.has(code))found.set(code,new Set());
      found.get(code).add(category);
    }
  }
  return [...found].sort(([a],[b])=>a.localeCompare(b)).map(([ticker,categories])=>({ticker,categories:[...categories]}));
}
export function readManagedSymbols(storage) {
  if(!storage)return [];
  const read=(key,fallback)=>{try{return JSON.parse(storage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  return collectManagedSymbols({portfolio:read(KEYS.portfolio,{}),watchlist:read(KEYS.watch,[]),trades:read(KEYS.trades,[])});
}
