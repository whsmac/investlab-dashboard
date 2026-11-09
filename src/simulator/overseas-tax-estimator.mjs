/**
 * Scenario-only KRW capital-gains tax estimator for a Korean-resident individual.
 * Does NOT derive tax basis from portfolio averageCost: supply separately verified
 * KRW taxable proceeds and cost for each hypothetical disposal.
 * All rates/deductions are caller-configurable, not a tax-law determination.
 * No database access or writes.
 */
const amount=(value,label)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(label+' must be a finite nonnegative number');
 return value;
};
const signed=(value,label)=>{
 if(typeof value!=='number'||!Number.isFinite(value))throw new Error(label+' must be a finite number');
 return value;
};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function estimateOverseasStockTax({
 disposals=[],annualRealizedGainKrw=0,otherAnnualGainKrw=0,
 annualDeductionKrw=2500000,deductionAlreadyUsedKrw=0,
 taxRate=0.22
}={}){
 if(!Array.isArray(disposals))throw new Error('disposals must be an array');
 signed(annualRealizedGainKrw,'annual realized gain');
 signed(otherAnnualGainKrw,'other annual gain');
 amount(annualDeductionKrw,'annual deduction');
 amount(deductionAlreadyUsedKrw,'deduction already used');
 if(deductionAlreadyUsedKrw>annualDeductionKrw)throw new Error('deduction already used exceeds annual deduction');
 if(typeof taxRate!=='number'||!Number.isFinite(taxRate)||taxRate<0||taxRate>1)throw new Error('invalid tax rate');
 const detail=disposals.map((d,index)=>{
  if(!d||typeof d!=='object')throw new Error('invalid disposal at '+(index+1));
  const proceeds=amount(d.proceedsKrw,'taxable proceeds');
  const acquisition=amount(d.acquisitionCostKrw,'tax acquisition cost');
  const expenses=amount(d.deductibleExpensesKrw??0,'deductible expenses');
  return {index:index+1,gainKrw:round(proceeds-acquisition-expenses)};
 });
 const hypotheticalGainKrw=round(detail.reduce((sum,d)=>sum+d.gainKrw,0));
 const priorGainKrw=round(annualRealizedGainKrw+otherAnnualGainKrw);
 const remainingDeductionKrw=round(annualDeductionKrw-deductionAlreadyUsedKrw);
 const taxableBeforeKrw=round(Math.max(0,priorGainKrw-remainingDeductionKrw));
 const taxableAfterKrw=round(Math.max(0,priorGainKrw+hypotheticalGainKrw-remainingDeductionKrw));
 const estimatedTaxBeforeKrw=round(taxableBeforeKrw*taxRate);
 const estimatedTaxAfterKrw=round(taxableAfterKrw*taxRate);
 return {detail,hypotheticalGainKrw,priorGainKrw,remainingDeductionKrw,
  taxableBeforeKrw,taxableAfterKrw,estimatedTaxBeforeKrw,estimatedTaxAfterKrw,
  incrementalTaxKrw:round(estimatedTaxAfterKrw-estimatedTaxBeforeKrw),
  taxRate,annualDeductionKrw,
  status:'illustrative_only',
  assumptions:'Taxable proceeds, acquisition costs and deductible expenses must already be determined in KRW using applicable tax rules and verified broker records. Annual gains and deduction usage must be complete. This is not a filing calculation.'};
}
