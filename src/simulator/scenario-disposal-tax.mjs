import {calculateKrwDisposalGain} from './krw-tax-gain.mjs';
import {estimateOverseasStockTax} from './overseas-stock-tax.mjs';

/**
 * Aggregate explicit KRW tax-basis inputs for several hypothetical disposals.
 * Does not infer tax lots from USD average-cost positions. Each disposal line
 * must be independently verified against the user's broker/tax records.
 * No persistence or portfolio mutation.
 */
export function estimateScenarioDisposalTax(disposals,annualOptions={}){
 if(!Array.isArray(disposals))throw new Error('disposals must be an array');
 const lines=disposals.map((line,index)=>{
  if(!line||typeof line!=='object'||Array.isArray(line))throw new Error('invalid disposal at '+(index+1));
  const result=calculateKrwDisposalGain(line);
  return {index:index+1,ticker:line.ticker??null,...result};
 });
 const estimate=estimateOverseasStockTax({...annualOptions,hypotheticalGainsKrw:lines.map(x=>x.gainKrw)});
 return {lines,estimate,disposalCount:lines.length,netDisposalGainKrw:estimate.hypotheticalNetKrw,
  status:'estimate_only',warning:'Each disposal requires verified tax acquisition basis and FX. A negative incremental estimate does not guarantee a refund.'};
}
