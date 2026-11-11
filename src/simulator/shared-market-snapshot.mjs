// Read-only bridge to price snapshots saved by the original portfolio module.
// A persisted price is NOT proof of a live quote or its observation time.
const readRows=storage=>{try{const rows=JSON.parse(storage?.getItem('investlab_holdings')||'[]');return Array.isArray(rows)?rows:[];}catch{return [];}};
export function readSavedPortfolioQuotes(storage){
 const quotes=new Map();
 for(const row of readRows(storage)){
  const ticker=String(row?.symbol??'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker)||ticker==='USD'||ticker==='USD-CASH')continue;
  if(row.price==null||row.price==='')continue;
  const price=Number(row.price);
  if(!Number.isFinite(price)||price<=0)continue;
  quotes.set(ticker,{ticker,price,kind:'saved',observedAt:null,source:'기존 포트폴리오 저장값'});
 }
 return [...quotes.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
}
export function readQuoteEndpointConfig(storage){
 try{
  const config=JSON.parse(storage?.getItem('investlab_config')||'{}');
  const url=config?.quoteUrl;
  if(typeof url!=='string'||!url.trim())return null;
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!parsed.pathname.includes('/functions/v1/quotes'))return null;
  return parsed.href;
 }catch{return null;}
}
