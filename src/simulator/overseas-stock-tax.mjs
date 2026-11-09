/**
 * Illustrative Korean-resident overseas-share capital gains tax estimate.
 * All monetary inputs are KRW. This is NOT a tax filing or a conversion from
 * USD ledger PnL. Caller must supply tax-basis KRW gains/losses after fees,
 * based on actual acquisition/disposal FX and applicable tax-lot rules.
 * Default deduction and rate are configurable assumptions, not legal advice.
 */
const valid=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new Error(label+' must be a finite number');return n};
const roundWon=n=>Math.round(n);
export function estimateOverseasStockTax({
 priorRealizedKrw=0, hypotheticalGainsKrw=[], annualDeductionKrw=2500000,
 deductionUsedElsewhereKrw=0, taxRate=0.22
}={}){
 valid(priorRealizedKrw,'priorRealizedKrw');
 if(!Array.isArray(hypotheticalGainsKrw))throw new Error('hypotheticalGainsKrw must be an array');
 for(const n of hypotheticalGainsKrw)valid(n,'hypothetical gain');
 for(const [name,value] of Object.entries({annualDeductionKrw,deductionUsedElsewhereKrw,taxRate})){
  valid(value,name);if(value<0)throw new Error(name+' must not be negative');
 }
 if(taxRate>1)throw new Error('taxRate must not exceed 1');
 if(deductionUsedElsewhereKrw>annualDeductionKrw)throw new Error('deduction already used exceeds annual deduction');
 const availableDeduction=annualDeductionKrw-deductionUsedElsewhereKrw;
 const hypotheticalNetKrw=hypotheticalGainsKrw.reduce((a,b)=>a+b,0);
 const taxFor=net=>roundWon(Math.max(0,net-availableDeduction)*taxRate);
 const baselineTaxKrw=taxFor(priorRealizedKrw);
 const projectedAnnualNetKrw=priorRealizedKrw+hypotheticalNetKrw;
 const projectedTaxKrw=taxFor(projectedAnnualNetKrw);
 return {
  priorRealizedKrw,hypotheticalNetKrw,projectedAnnualNetKrw,
  availableDeductionKrw:availableDeduction,baselineTaxKrw,projectedTaxKrw,
  incrementalTaxKrw:projectedTaxKrw-baselineTaxKrw,
  taxRate,calculationBasis:'user_supplied_tax_basis_KRW',
  status:'estimate_only',
  warning:'Only tax-basis KRW realized gains/losses are accepted. Verify tax year, taxpayer eligibility, FX, acquisition basis, other gains and losses, and applicable rules before filing.'
 };
}
