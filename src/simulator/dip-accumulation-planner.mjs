import {simulateTrades} from './virtual-trade-engine.mjs';

/** Plan staged dip purchases funded by available cash or earlier virtual sales.
 * Prices are user assumptions, not forecasts. Tax is not calculated.
 */
export function planDipAccumulation(portfolio,{ticker,targets,terminalPrices,reserveCash=0}) {
  if (!portfolio || !portfolio.positions || typeof portfolio.positions!=='object') throw new Error('invalid portfolio');
  if (typeof ticker!=='string' || !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker)) throw new Error('invalid ticker');
  if (!Array.isArray(targets) || !targets.length) throw new Error('at least one buy target required');
  if (typeof reserveCash!=='number' || !Number.isFinite(reserveCash) || reserveCash<0) throw new Error('invalid reserve cash');
  if (!terminalPrices || typeof terminalPrices!=='object' || Array.isArray(terminalPrices)) throw new Error('terminal prices required');
  let prior=Infinity;
  const trades=targets.map((t,i)=>{
    if (!t || typeof t.price!=='number' || !Number.isFinite(t.price) || t.price<=0) throw new Error('invalid buy price at '+(i+1));
    if (t.price>=prior) throw new Error('buy target prices must strictly decrease');
    prior=t.price;
    if (typeof t.quantity!=='number' || !Number.isFinite(t.quantity) || t.quantity<=0) throw new Error('invalid buy quantity at '+(i+1));
    if (typeof (t.fee??0)!=='number' || !Number.isFinite(t.fee??0) || (t.fee??0)<0) throw new Error('invalid fee at '+(i+1));
    return {side:'buy',ticker,price:t.price,quantity:t.quantity,fee:t.fee??0};
  });
  // Reserve is checked at each step, not merely at the end.
  const simulation=simulateTrades(portfolio,trades);
  for (const s of simulation.steps) if (s.cash+1e-8<reserveCash) throw new Error('cash reserve breached at '+(s.index+1));
  const baseline=simulateTrades(portfolio,[]);
  const valueOf=positionsAndCash=>{
    let v=positionsAndCash.cash;
    for(const [symbol,p] of Object.entries(positionsAndCash.positions)){
      if(!p.quantity)continue;
      const price=terminalPrices[symbol];
      if(typeof price!=='number'||!Number.isFinite(price)||price<0)throw new Error('missing or invalid terminal price: '+symbol);
      v+=p.quantity*price;
    }
    if(!Number.isFinite(v))throw new Error('valuation overflow');
    return Math.round((v+Number.EPSILON)*1e8)/1e8;
  };
  const initialShares=baseline.final.positions[ticker]?.quantity??0;
  const steps=simulation.steps.map((s,i)=>({
    stage:i+1,targetPrice:targets[i].price,boughtShares:s.quantity,
    cumulativeBoughtShares:Math.round((s.positions[ticker].quantity-initialShares)*1e8)/1e8,
    totalShares:s.positions[ticker].quantity,cash:s.cash,
    cashSpent:Math.round((baseline.final.cash-s.cash)*1e8)/1e8,
    averageCost:s.positions[ticker].averageCost
  }));
  const baselineValue=valueOf(baseline.final),terminalValue=valueOf(simulation.final);
  return {ticker,initialShares,steps,final:simulation.final,baselineValue,terminalValue,
    deltaVsHold:Math.round((terminalValue-baselineValue+Number.EPSILON)*1e8)/1e8,
    reserveCash,taxStatus:'not_calculated',currencyStatus:'single_currency_assumed'};
}
