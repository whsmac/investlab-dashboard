import {simulateTrades} from './virtual-trade-engine.mjs';

/**
 * Build sequential target-price partial sales, then calculate cash and share changes.
 * Each stage quantity is an absolute share count, not a percentage of remaining shares.
 * Values are in the portfolio's chosen currency. No tax estimate is implied.
 */
export function simulateStagedSales(portfolio, {ticker,stages,targetCash=null,valuationPrices=null,targetCashWeight=null}) {
  if (targetCashWeight!==null && (typeof targetCashWeight!=='number' || !Number.isFinite(targetCashWeight) || targetCashWeight<0 || targetCashWeight>1)) throw new Error('invalid target cash weight');
  if (targetCashWeight!==null && valuationPrices===null) throw new Error('valuation prices required for cash weight');
  if (valuationPrices!==null && (!valuationPrices || typeof valuationPrices!=='object' || Array.isArray(valuationPrices))) throw new Error('invalid valuation prices');
  if (typeof ticker!=='string' || !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker)) throw new Error('invalid ticker');
  if (!Array.isArray(stages) || stages.length===0) throw new Error('at least one sale stage required');
  if (targetCash!==null && (typeof targetCash!=='number' || !Number.isFinite(targetCash) || targetCash<0)) throw new Error('invalid target cash');
  let previousPrice=-Infinity;
  const trades=stages.map((s,i)=>{
    if (!s || typeof s.price!=='number' || !Number.isFinite(s.price) || s.price<=0) throw new Error('invalid stage price');
    if (s.price<=previousPrice) throw new Error('sale target prices must increase');
    previousPrice=s.price;
    if (typeof s.quantity!=='number' || !Number.isFinite(s.quantity) || s.quantity<=0) throw new Error('invalid stage quantity');
    const fee=s.fee??0;
    if (typeof fee!=='number' || !Number.isFinite(fee) || fee<0) throw new Error('invalid stage fee');
    return {side:'sell',ticker,price:s.price,quantity:s.quantity,fee};
  });
  const result=simulateTrades(portfolio,trades);
  const startingCash=result.initial.cash;
  const rows=result.steps.map((step,i)=>({
    stage:i+1,targetPrice:step.price,soldShares:step.quantity,
    saleProceeds:step.gross-step.fee,
    accumulatedSaleCash:step.cash-startingCash,
    cash:step.cash,remainingShares:step.positions[ticker]?.quantity??0,
    realizedPnL:step.tradePnL,cumulativeRealizedPnL:step.cumulativeRealizedPnL,
    targetCashReached:targetCash===null?null:step.cash>=targetCash
  }));
  const valuedRows=rows.map((row,i)=>{
    if (valuationPrices===null) return {...row,cashWeight:null,targetCashWeightReached:null};
    let stockValue=0;
    for (const [symbol,position] of Object.entries(result.steps[i].positions)) {
      if (position.quantity===0) continue;
      const price=valuationPrices[symbol];
      if (typeof price!=='number' || !Number.isFinite(price) || price<0) throw new Error('missing or invalid valuation price: '+symbol);
      stockValue+=position.quantity*price;
    }
    const total=row.cash+stockValue;
    if (!Number.isFinite(total)) throw new Error('valuation overflow');
    const cashWeight=total===0?0:row.cash/total;
    return {...row,stockValue,cashWeight,targetCashWeightReached:targetCashWeight===null?null:cashWeight>=targetCashWeight};
  });
  return {...result,ticker,targetCash,targetCashWeight,rows:valuedRows,firstTargetReached:targetCash===null?null:(valuedRows.find(r=>r.targetCashReached)?.stage??null),firstCashWeightReached:targetCashWeight===null?null:(valuedRows.find(r=>r.targetCashWeightReached)?.stage??null),taxStatus:'not_calculated'};
}
