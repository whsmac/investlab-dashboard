import {simulateTrades} from './virtual-trade-engine.mjs';

/** Compare staged dip repurchases with holding the original position.
 * Prices are hypothetical, one currency; no tax, leverage-price forecasting or ledger writes.
 */
export function planDipBuyback(portfolio,{ticker,sellStages,buyStages,terminalPrices}) {
  if (!portfolio?.positions || !Object.hasOwn(portfolio.positions,ticker)) throw new Error('ticker must be held');
  if (!Array.isArray(sellStages)||!sellStages.length||!Array.isArray(buyStages)||!buyStages.length) throw new Error('sale and repurchase stages required');
  if (!terminalPrices || typeof terminalPrices!=='object'||Array.isArray(terminalPrices)) throw new Error('terminal prices required');
  const make=(side,stages)=>stages.map((s,i)=>{
    if (!s || typeof s.price!=='number'||!Number.isFinite(s.price)||s.price<=0||typeof s.quantity!=='number'||!Number.isFinite(s.quantity)||s.quantity<=0) throw new Error('invalid '+side+' stage '+(i+1));
    return {side,ticker,price:s.price,quantity:s.quantity,fee:s.fee??0};
  });
  const sales=make('sell',sellStages),buys=make('buy',buyStages);
  for(let i=1;i<sales.length;i++) if(sales[i].price>sales[i-1].price) throw new Error('sell prices must be non-increasing in dip scenario');
  for(let i=1;i<buys.length;i++) if(buys[i].price>=buys[i-1].price) throw new Error('buy prices must strictly decrease');
  const baseline=simulateTrades(portfolio,[]);
  const result=simulateTrades(portfolio,[...sales,...buys]);
  const value=positions=>{
    let total=positions.cash;
    for(const [symbol,p] of Object.entries(positions.positions)){
      if(!p.quantity)continue;
      const price=terminalPrices[symbol];
      if(typeof price!=='number'||!Number.isFinite(price)||price<0)throw new Error('missing or invalid terminal price: '+symbol);
      total+=p.quantity*price;
    }
    if(!Number.isFinite(total))throw new Error('valuation overflow');
    return Math.round((total+Number.EPSILON)*1e8)/1e8;
  };
  const initialShares=baseline.final.positions[ticker].quantity;
  const finalShares=result.final.positions[ticker].quantity;
  return {ticker,initialShares,finalShares,shareChange:Math.round((finalShares-initialShares)*1e8)/1e8,
    steps:result.steps.map(s=>({stage:s.index+1,side:s.side,price:s.price,quantity:s.quantity,cash:s.cash,shares:s.positions[ticker].quantity,cumulativeRealizedPnL:s.cumulativeRealizedPnL})),
    final:result.final,baselineValue:value(baseline.final),terminalValue:value(result.final),
    deltaVsHold:Math.round((value(result.final)-value(baseline.final)+Number.EPSILON)*1e8)/1e8,
    taxStatus:'not_calculated',note:'Hypothetical prices only; transaction order assumes fills and excludes tax.'};
}
