import {simulateTrades} from './virtual-trade-engine.mjs';
import {estimateOverseasStockTax} from './overseas-stock-tax.mjs';

/**
 * Connect a hypothetical trading sequence to a separate KRW tax estimate.
 * Each sell must have an explicit tax-basis KRW gain supplied by the caller.
 * USD ledger realized PnL is NEVER converted or substituted automatically.
 */
export function simulateWithTax(portfolio,trades,{taxableGainKrwByTrade,priorRealizedKrw=0,annualDeductionKrw=2500000,deductionUsedElsewhereKrw=0,taxRate=0.22}={}){
 if(!Array.isArray(trades))throw new Error('trades must be an array');
 if(!Array.isArray(taxableGainKrwByTrade)||taxableGainKrwByTrade.length!==trades.length)
  throw new Error('taxableGainKrwByTrade must match every trade');
 const taxGains=[];
 for(let i=0;i<trades.length;i++){
  const gain=taxableGainKrwByTrade[i];
  if(trades[i]?.side==='sell'){
   if(typeof gain!=='number'||!Number.isFinite(gain))throw new Error('missing tax-basis KRW gain for sell at '+(i+1));
   taxGains.push(gain);
  }else if(gain!==null){
   throw new Error('buy trades require null tax gain at '+(i+1));
  }
 }
 const simulation=simulateTrades(portfolio,trades);
 const tax=estimateOverseasStockTax({priorRealizedKrw,hypotheticalGainsKrw:taxGains,annualDeductionKrw,deductionUsedElsewhereKrw,taxRate});
 return {simulation,tax,netTaxChangeKrw:tax.incrementalTaxKrw,taxStatus:'estimate_only',
  warning:'Tax values use caller-provided tax-basis KRW gains. USD cash is not reduced by estimated KRW tax; FX conversion and tax payment timing are not assumed.'};
}
