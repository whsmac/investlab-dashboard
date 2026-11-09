/** Indicative Korean foreign-stock capital-gains tax calculator.
 * All gains are already converted to KRW using independently verified tax FX and tax-basis rules.
 * This module does NOT infer taxable gains from USD average-cost ledger values.
 * Default deduction/rate are editable assumptions, NOT a tax filing determination.
 */
const amount=(n,name)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new Error(name+' must be a finite number');return n};
const nonnegative=(n,name)=>{amount(n,name);if(n<0)throw new Error(name+' must be nonnegative');return n};
export function estimateForeignStockTax({
 priorRealizedGainKrw=0,scenarioRealizedGainKrw=0,
 annualDeductionKrw=2500000,combinedTaxRate=0.22,
 otherDeductionUsedKrw=0
}={}){
 amount(priorRealizedGainKrw,'prior gain');amount(scenarioRealizedGainKrw,'scenario gain');
 nonnegative(annualDeductionKrw,'deduction');nonnegative(otherDeductionUsedKrw,'deduction used');
 const rate=nonnegative(combinedTaxRate,'tax rate');if(rate>1)throw new Error('tax rate cannot exceed 1');
 const availableDeduction=Math.max(0,annualDeductionKrw-otherDeductionUsedKrw);
 const taxable=gain=>Math.max(0,gain-availableDeduction);
 const baselineTax=taxable(priorRealizedGainKrw)*rate;
 const combinedGain=priorRealizedGainKrw+scenarioRealizedGainKrw;
 const scenarioTax=taxable(combinedGain)*rate;
 return {
  priorRealizedGainKrw,scenarioRealizedGainKrw,combinedGainKrw:combinedGain,
  availableDeductionKrw:availableDeduction,baselineEstimatedTaxKrw:Math.round(baselineTax),
  totalEstimatedTaxKrw:Math.round(scenarioTax),
  incrementalEstimatedTaxKrw:Math.round(scenarioTax)-Math.round(baselineTax),
  taxAssumption:{annualDeductionKrw,combinedTaxRate,otherDeductionUsedKrw},
  status:'illustrative_only',
  warning:'KRW tax gains must be independently computed from tax-basis records, tax FX, and eligible annual gains/losses. Confirm tax-year law and individual eligibility; this is not a tax filing figure.'
 };
}
