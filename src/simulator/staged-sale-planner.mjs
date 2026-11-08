import {simulateTrades} from './virtual-trade-engine.mjs';

/** Model sequential bull-market target-price sales. All amounts share one currency.
 * Tax and FX are deliberately NOT calculated by this module.
 */
export function planStagedSales(portfolio,{ticker,targets,terminalPrices}) {
  if (!portfolio || !portfolio.positions || !Object.hasOwn(portfolio.positions,ticker)) throw new Error('ticker must be held');
  if (!Array.isArray(targets) || targets.length===0) throw new Error('at least one sale target required');
  if (!terminalPrices || typeof terminalPrices!=='object') throw new Error('terminal prices required');
  const initialShares=portfolio.positions[ticker].quantity;
  if (typeof initialShares!=='number' || !Number.isFinite(initialShares) || initialShares<=0) throw new Error('positive initial shares required');
  const trades=[];
  let previousPrice=-Infinity;
  for (const [i,t] of targets.entries()) {
    if (!t || typeof t.price!=='number' || !Number.isFinite(t.price) || t.price<=0) throw new Error('invalid target price at '+(i+1));
    if (t.price<=previousPrice) throw new Error('sale target prices must strictly increase');
    previousPrice=t.price;
    if (typeof t.quantity!=='number' || !Number.isFinite(t.quantity) || t.quantity<=0) throw new Error('invalid sale quantity at '+(i+1));
    const fee=t.fee??0;
    if (typeof fee!=='number' || !Number.isFinite(fee) || fee<0) throw new Error('invalid sale fee at '+(i+1));
    trades.push({side:'sell',ticker,quantity:t.quantity,price:t.price,fee});
  }
  const simulation=simulateTrades(portfolio,trades);
  const value=(snapshot)=>{
    let total=snapshot.cash;
    for (const [symbol,p] of Object.entries(snapshot.positions)) {
      if (!p.quantity) continue;
      const price=terminalPrices[symbol];
      if (typeof price!=='number' || !Number.isFinite(price) || price<0) throw new Error('missing or invalid terminal price: '+symbol);
      total+=p.quantity*price;
    }
    if (!Number.isFinite(total)) throw new Error('valuation overflow');
    return Math.round((total+Number.EPSILON)*1e8)/1e8;
  };
  const baseline=simulateTrades(portfolio,[]);
  const baselineValue=value(baseline.final), terminalValue=value(simulation.final);
  const initialCash=baseline.initial.cash;
  const steps=simulation.steps.map((s,i)=>({
    stage:i+1,targetPrice:targets[i].price,soldShares:s.quantity,
    cumulativeSoldShares:Math.round((initialShares-s.positions[ticker].quantity)*1e8)/1e8,
    remainingShares:s.positions[ticker].quantity,
    cash:s.cash,raisedCash:Math.round((s.cash-initialCash)*1e8)/1e8,
    realizedPnL:s.tradePnL,cumulativeRealizedPnL:s.cumulativeRealizedPnL
  }));
  return {ticker,initialShares,initialCash,steps,final:simulation.final,
    totalRaisedCash:Math.round((simulation.final.cash-initialCash)*1e8)/1e8,
    baselineValue,terminalValue,deltaVsHold:Math.round((terminalValue-baselineValue+Number.EPSILON)*1e8)/1e8,
    taxStatus:'not_calculated',currencyStatus:'single_currency_assumed'};
}
