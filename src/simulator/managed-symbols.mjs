// Read-only symbol selector using the original INVESTLAB portfolio's symbol management.
// The original index.html owns these three keys. No registration or storage writes.
const KEYS = Object.freeze({
  holdings: 'investlab_holdings',
  watchlist: 'investlab_watchlist',
  past: 'investlab_past_symbols'
});
const symbol = item => {
  const value=typeof item==='string'?item:item?.symbol??item?.ticker??'';
  return typeof value==='string'?value.trim().toUpperCase():'';
};
const valid = value => /^[A-Z0-9.^_-]{1,20}$/.test(value);
export function collectManagedSymbols({holdings=[],watchlist=[],past=[]}={}) {
  const found=new Map();
  for(const [items,category] of [[holdings,'보유'],[watchlist,'관심'],[past,'거래이력']]){
    if(!Array.isArray(items))continue;
    for(const item of items){
      const code=symbol(item);
      if(!valid(code)||code==='USD'||code==='USD-CASH')continue;
      if(!found.has(code))found.set(code,new Set());
      found.get(code).add(category);
    }
  }
  return [...found].sort(([a],[b])=>a.localeCompare(b)).map(([ticker,categories])=>({ticker,categories:[...categories]}));
}
export function readManagedSymbols(storage) {
  if(!storage)return [];
  const read=(key)=>{try{const parsed=JSON.parse(storage.getItem(key)||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}};
  return collectManagedSymbols({holdings:read(KEYS.holdings),watchlist:read(KEYS.watchlist),past:read(KEYS.past)});
}
