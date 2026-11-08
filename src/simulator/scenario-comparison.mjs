import {simulateTrades} from './virtual-trade-engine.mjs';

/** Compare planned trades with unchanged holdings using user-supplied terminal prices.
 * All amounts must share a single currency; tax is not yet calculated.
 */
export function compareScenarios(portfolio, scenarios, terminalPrices) {
  if (!Array.isArray(scenarios) || scenarios.length===0) throw new Error('scenarios required');
  if (!terminalPrices || typeof terminalPrices!=='object' || Array.isArray(terminalPrices)) throw new Error('terminal prices required');
  const valueOf = result => {
    let value=result.final.cash;
    for (const [ticker,p] of Object.entries(result.final.positions)) {
      if (!p.quantity) continue;
      const price=terminalPrices[ticker];
      if (typeof price!=='number' || !Number.isFinite(price) || price<0) throw new Error(`missing or invalid terminal price: ${ticker}`);
      value+=p.quantity*price;
    }
    if (!Number.isFinite(value)) throw new Error('valuation overflow');
    return Math.round((value+Number.EPSILON)*1e8)/1e8;
  };
  const baseline=simulateTrades(portfolio,[]);
  const baselineValue=valueOf(baseline);
  const seen=new Set();
  return {baseline:{...baseline,terminalValue:baselineValue},scenarios:scenarios.map(s=>{
    if (!s || typeof s.name!=='string' || !s.name.trim() || seen.has(s.name)) throw new Error('scenario name must be unique');
    seen.add(s.name);
    const result=simulateTrades(portfolio,s.trades);
    const terminalValue=valueOf(result);
    return {name:s.name,...result,terminalValue,deltaVsHold:Math.round((terminalValue-baselineValue+Number.EPSILON)*1e8)/1e8};
  }),taxStatus:'not_calculated'};
}
