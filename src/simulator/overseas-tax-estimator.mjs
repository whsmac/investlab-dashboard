/**
 * KR overseas-stock capital-gains tax scenario estimator (illustrative).
 * Inputs MUST be KRW tax-basis gains/losses, not USD trading-engine P&L.
 * Annual aggregation, tax-basis FX, taxable classification and exemptions
 * are caller responsibilities. Defaults are editable assumptions, not tax advice.
 */
const check=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(name+' must be a finite number');return v};
const nonnegative=(v,name)=>{check(v,name);if(v<0)throw new Error(name+' must be nonnegative');return v};
const won=v=>Math.round(v);
export function estimateOverseasCapitalGainsTax({
  realizedGainsKrw=0,realizedLossesKrw=0,
  hypotheticalGainsKrw=0,hypotheticalLossesKrw=0,
  annualDeductionKrw=2500000,taxRate=0.22,
  otherEligibleGainsKrw=0,otherEligibleLossesKrw=0
}={}){
  const gains=nonnegative(realizedGainsKrw,'realized gains')+nonnegative(hypotheticalGainsKrw,'hypothetical gains')+nonnegative(otherEligibleGainsKrw,'other eligible gains');
  const losses=nonnegative(realizedLossesKrw,'realized losses')+nonnegative(hypotheticalLossesKrw,'hypothetical losses')+nonnegative(otherEligibleLossesKrw,'other eligible losses');
  const deduction=nonnegative(annualDeductionKrw,'annual deduction');
  const rate=nonnegative(taxRate,'tax rate');
  if(rate>1)throw new Error('tax rate must not exceed 1');
  const netKrw=won(gains-losses);
  const taxableKrw=Math.max(0,netKrw-deduction);
  const estimatedTaxKrw=won(taxableKrw*rate);
  const beforeNet=won(realizedGainsKrw+otherEligibleGainsKrw-realizedLossesKrw-otherEligibleLossesKrw);
  const beforeTaxable=Math.max(0,beforeNet-deduction);
  const beforeTaxKrw=won(beforeTaxable*rate);
  return {netKrw,taxableKrw,estimatedTaxKrw,beforeTaxKrw,
    incrementalTaxKrw:estimatedTaxKrw-beforeTaxKrw,
    annualDeductionKrw:deduction,taxRate:rate,
    taxStatus:'estimate_assumptions_only',
    notice:'Tax-basis KRW figures, eligibility, tax year and applicable law must be verified. Not a tax filing calculation.'};
}
/** Estimate one disposal's KRW tax-basis gain from explicitly supplied
 * KRW acquisition cost allocated to sold shares and KRW proceeds/fees.
 * No FX is inferred; tax basis must be determined externally.
 */
export function taxBasisSaleGainKrw({proceedsKrw,acquisitionCostKrw,sellingFeesKrw=0}){
 const proceeds=nonnegative(proceedsKrw,'proceeds');
 const cost=nonnegative(acquisitionCostKrw,'acquisition cost');
 const fee=nonnegative(sellingFeesKrw,'selling fees');
 if(fee>proceeds)throw new Error('selling fees exceed proceeds');
 return won(proceeds-cost-fee);
}
