import {simulateTrades} from './virtual-trade-engine.mjs';

/** Determine whole-share staged sales to reach user-specified cash weights.
 * Prices are hypothetical and in one currency. No tax is calculated.
 */
export function planCashWeightSales(portfolio,{ticker,targets,referencePrices={},feePerTrade=0}) {
  if (!portfolio?.positions?.[ticker]) throw new Error('ticker must be held');
  if (!Array.isArray(targets) || !targets.length) throw new Error('targets required');
  if (!Number.isFinite(feePerTrade) || feePerTrade<0) throw new Error('invalid fee');
  let state=simulateTrades(portfolio,[]).final;
  const trades=[],steps=[];
  let lastPrice=0,lastWeight=-1;
  for (const [i,target] of targets.entries()) {
    const price=target?.price,weight=target?.cashWeightPct;
    if (!Number.isFinite(price)||price<=lastPrice) throw new Error('target prices must increase');
    if (!Number.isFinite(weight)||weight<0||weight>100||weight<lastWeight) throw new Error('cash targets must be nondecreasing percentages 0..100');
    lastPrice=price;lastWeight=weight;
    let holdingsValue=0;
    for(const [symbol,p] of Object.entries(state.positions)) {
      if (!p.quantity) continue;
      const px=symbol===ticker?price:referencePrices[symbol];
      if(!Number.isFinite(px)||px<0)throw new Error('missing reference price: '+symbol);
      holdingsValue+=p.quantity*px;
    }
    const total=state.cash+holdingsValue;
    if(!Number.isFinite(total)||total<=0)throw new Error('invalid portfolio value');
    const shares=state.positions[ticker].quantity;
    if (!Number.isSafeInteger(shares)||shares<0) throw new Error('whole-share positions required');
    const desired=weight/100;
    const needed=(desired*total-state.cash+feePerTrade*(1-desired))/price;
    let quantity=Math.max(0,Math.ceil(needed-1e-10));
    quantity=Math.min(quantity,shares);
    if(quantity>0 && quantity*price<=feePerTrade)throw new Error('sale proceeds do not cover fee');
    if(quantity>0){
      const trade={side:'sell',ticker,quantity,price,fee:feePerTrade};
      state=simulateTrades({cash:state.cash,positions:state.positions},[trade]).final;
      trades.push(trade);
    }
    const afterTotal=total-(quantity?feePerTrade:0);
    const actualPct=state.cash/afterTotal*100;
    steps.push({stage:i+1,price,targetCashWeightPct:weight,soldShares:quantity,remainingShares:state.positions[ticker].quantity,cash:state.cash,actualCashWeightPct:Math.round(actualPct*100)/100,metTarget:actualPct+1e-8>=weight});
  }
  return {trades,steps,final:state,taxStatus:'not_calculated',currencyStatus:'single_currency_assumed'};
}
