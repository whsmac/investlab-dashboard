// Snapshot the original INVESTLAB portfolio for simulation; never write to storage.
const validTicker=t=>/^[A-Z0-9.^_-]{1,20}$/.test(t)&&t!=='USD'&&t!=='USD-CASH';
export function extractPortfolioPositions(holdings){
 if(!Array.isArray(holdings))return [];
 const positions=new Map();
 for(const row of holdings){
  if(!row||typeof row!=='object')continue;
  const ticker=String(row.symbol??'').trim().toUpperCase();
  const quantity=Number(row.shares),averageCost=Number(row.avg_cost);
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
