/** Illustrative Korean overseas-stock capital-gains tax calculation.
 * All taxable amounts MUST be supplied in KRW from a separately validated tax basis.
 * This module never derives KRW tax gains from USD portfolio average cost.
 * Defaults are editable assumptions, not a determination of tax liability.
 */
function amount(value,name){if(typeof value!=='number'||!Number.isFinite(value))throw new Error(name+' must be a finite number');return value}
function nonnegative(value,name){amount(value,name);if(value<0)throw new Error(name+' must be nonnegative');return value}
const round=n=>Math.round(n);
export function estimateOverseasStockTax({
  previousRealizedGainKRW=0,
  proposedSales=[],
  otherAnnualGainKRW=0,
  deductionKRW=2500000,
  taxRate=0.22
}={}){
  amount(previousRealizedGainKRW,'previous realized gain');
  amount(otherAnnualGainKRW,'other annual gain');
  nonnegative(deductionKRW,'deduction');
  if(nonnegative(taxRate,'tax rate')>1)throw new Error('tax rate must be <= 1');
  if(!Array.isArray(proposedSales))throw new Error('proposed sales must be an array');
  const sales=proposedSales.map((sale,index)=>{
    if(!sale||typeof sale!=='object')throw new Error('invalid sale '+index);
    const proceedsKRW=nonnegative(sale.proceedsKRW,'sale proceeds');
    const acquisitionKRW=nonnegative(sale.acquisitionKRW,'acquisition cost');
    const allowableFeesKRW=nonnegative(sale.allowableFeesKRW??0,'allowable fees');
    return {proceedsKRW,acquisitionKRW,allowableFeesKRW,gainKRW:round(proceedsKRW-acquisitionKRW-allowableFeesKRW)};
  });
  const beforeGainKRW=round(previousRealizedGainKRW+otherAnnualGainKRW);
  const proposedGainKRW=round(sales.reduce((sum,s)=>sum+s.gainKRW,0));
  const afterGainKRW=beforeGainKRW+proposedGainKRW;
  const taxable=total=>Math.max(0,total-deductionKRW);
  const estimatedTaxBeforeKRW=round(taxable(beforeGainKRW)*taxRate);
  const estimatedTaxAfterKRW=round(taxable(afterGainKRW)*taxRate);
  return {
    sales,previousAnnualGainKRW:beforeGainKRW,proposedGainKRW,projectedAnnualGainKRW:afterGainKRW,
    deductionKRW,taxRate,estimatedTaxBeforeKRW,estimatedTaxAfterKRW,
    incrementalEstimatedTaxKRW:estimatedTaxAfterKRW-estimatedTaxBeforeKRW,
    status:'illustrative_only',
    warnings:[
      'Amounts must be supplied in KRW using the applicable tax acquisition and sale rules; USD average-cost PnL is not a tax basis.',
      'Verify tax year, residency, eligible instruments, deduction eligibility, cost-basis method, exchange rates and applicable local income tax.',
      'Annual aggregation and negative gains may reduce previously estimated tax; this is not a tax filing calculation.'
    ]
  };
}
