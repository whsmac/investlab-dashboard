// Snapshot the original INVESTLAB portfolio for simulation; never write to storage.
const validTicker=t=>/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(t)&&t!=='USD'&&t!=='USD-CASH';
export function extractPortfolioPositions(holdings){
 if(!Array.isArray(holdings))return [];
 const positions=new Map();
 for(const row of holdings){
  if(!row||typeof row!=='object')continue;
  const ticker=String(row.symbol??'').trim().toUpperCase();
  const quantity=row.shares==null||row.shares===''?NaN:Number(row.shares),averageCost=row.avg_cost==null||row.avg_cost===''?NaN:Number(row.avg_cost);
  if(!validTicker(ticker)||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(averageCost)||averageCost<0)continue;
  if(positions.has(ticker)){
   const prev=positions.get(ticker);
   const total=prev.quantity+quantity;
   positions.set(ticker,{ticker,quantity:total,averageCost:(prev.quantity*prev.averageCost+quantity*averageCost)/total});
  }else positions.set(ticker,{ticker,quantity,averageCost});
 }
 return [...positions.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
}
export function readPortfolioPositions(storage){
 if(!storage)return [];
 try{return extractPortfolioPositions(JSON.parse(storage.getItem('investlab_holdings')||'[]'));}
 catch{return [];}
}

/** Only USD-CASH is an explicit dollar-cash balance in the source portfolio.
 * Legacy ticker USD is not assumed to be cash: its meaning is ambiguous.
 */
export function readPortfolioUsdCash(storage){
 if(!storage)return null;
 try{
  const rows=JSON.parse(storage.getItem('investlab_holdings')||'[]');
  if(!Array.isArray(rows))return null;
  const cash=rows.filter(r=>r&&String(r.symbol).trim().toUpperCase()==='USD-CASH');
  if(!cash.length)return null;
  const values=cash.map(r=>r.shares==null||r.shares===''?NaN:Number(r.shares));
  if(values.some(n=>!Number.isFinite(n)||n<0))return null;
  return values.reduce((a,b)=>a+b,0);
 }catch{return null;}
}
