/** Illustrative Korean overseas-share capital-gains tax estimator.
 * Inputs must be tax-basis KRW realized gains/losses for the SAME tax year,
 * already converted with appropriate tax FX and deductible fees.
 * No broker lots, currency conversion, or legal eligibility is inferred.
 */
const valid=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new Error(label+' must be a finite number');return n};
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
export function estimateOverseasShareTax({
 priorRealizedKrw=0,scenarioRealizedKrw=0,otherRealizedKrw=0,
 annualDeductionKrw=2500000,rate=0.22,taxYear,
 eligibleForDeduction=true
}={}){
 for(const [name,value] of Object.entries({priorRealizedKrw,scenarioRealizedKrw,otherRealizedKrw,annualDeductionKrw,rate}))valid(value,name);
 if(annualDeductionKrw<0)throw new Error('annual deduction cannot be negative');
 if(rate<0||rate>1)throw new Error('tax rate out of range');
 if(taxYear!==undefined&&(!Number.isInteger(taxYear)||taxYear<2000||taxYear>2100))throw new Error('invalid tax year');
 if(typeof eligibleForDeduction!=='boolean')throw new Error('invalid deduction eligibility');
 const deduction=eligibleForDeduction?annualDeductionKrw:0;
 const before=priorRealizedKrw+otherRealizedKrw;
 const after=before+scenarioRealizedKrw;
 const taxableBefore=Math.max(0,before-deduction);
 const taxableAfter=Math.max(0,after-deduction);
 const estimatedBefore=money(taxableBefore*rate);
 const estimatedAfter=money(taxableAfter*rate);
 return {
  taxYear:taxYear??null,priorAndOtherGainsKrw:money(before),scenarioGainsKrw:money(scenarioRealizedKrw),
  totalAnnualGainsKrw:money(after),taxableBeforeKrw:money(taxableBefore),taxableAfterKrw:money(taxableAfter),
  estimatedTaxBeforeKrw:estimatedBefore,estimatedTaxAfterKrw:estimatedAfter,
  incrementalEstimatedTaxKrw:money(estimatedAfter-estimatedBefore),
  deductionKrw:deduction,assumedRate:rate,
  status:'illustrative_only',
  note:'Tax-basis KRW gains must be supplied separately; USD trading P&L cannot be substituted. Verify tax year, residence, asset classification, tax lots, FX and eligibility.'
 };
}
