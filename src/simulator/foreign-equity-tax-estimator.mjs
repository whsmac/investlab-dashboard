/**
 * Indicative Korean resident foreign-equity capital gains tax scenario.
 * Inputs MUST be independently calculated KRW taxable gains/losses, not USD ledger P&L.
 * Default allowance/rate are editable assumptions, NOT a tax filing determination.
 * The same annual allowance is applied only once to the combined annual net gain.
 */
const numeric=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new Error(label+' must be a finite number');return n};
const won=n=>Math.round(n);
export function estimateForeignEquityTax({
 existingAnnualGainsKRW=0,scenarioGainsKRW=[],annualDeductionKRW=2500000,
 taxRate=0.22,otherDeductionUsedKRW=0, taxYear=null
}={}){
 numeric(existingAnnualGainsKRW,'existingAnnualGainsKRW');
 if(!Array.isArray(scenarioGainsKRW))throw new Error('scenarioGainsKRW must be an array');
 for(const n of scenarioGainsKRW)numeric(n,'scenario gain');
 numeric(annualDeductionKRW,'annualDeductionKRW');
 numeric(otherDeductionUsedKRW,'otherDeductionUsedKRW');
 numeric(taxRate,'taxRate');
 if(annualDeductionKRW<0||otherDeductionUsedKRW<0||taxRate<0||taxRate>1)throw new Error('invalid deduction or tax rate');
 if(taxYear!==null&&(!Number.isInteger(taxYear)||taxYear<1900||taxYear>9999))throw new Error('invalid taxYear');
 const allowance=Math.max(0,annualDeductionKRW-otherDeductionUsedKRW);
 const netScenario=scenarioGainsKRW.reduce((sum,n)=>sum+n,0);
 if(!Number.isFinite(netScenario))throw new Error('scenario gain overflow');
 const combined=existingAnnualGainsKRW+netScenario;
 if(!Number.isFinite(combined))throw new Error('annual gain overflow');
 const taxable=gain=>Math.max(0,gain-allowance);
 const baseTax=won(taxable(existingAnnualGainsKRW)*taxRate);
 const combinedTax=won(taxable(combined)*taxRate);
 return {
  taxYear,existingAnnualGainsKRW,scenarioNetGainsKRW:netScenario,
  combinedAnnualGainsKRW:combined,remainingDeductionKRW:allowance,
  baselineEstimatedTaxKRW:baseTax,combinedEstimatedTaxKRW:combinedTax,
  incrementalEstimatedTaxKRW:combinedTax-baseTax,
  scenarioAfterIncrementalTaxKRW:netScenario-(combinedTax-baseTax),
  status:'estimate_only',taxRate,assumptions:'User-supplied KRW tax gains; annual deduction and tax rate are editable assumptions. Eligibility, FX dates, lot methods, other taxable trades and applicable law must be verified.'
 };
}
/** Convert an independently established taxable USD amount at its applicable tax FX.
 * A single conversion rate does NOT replace transaction-by-transaction tax accounting.
 */
export function convertTaxAmountToKRW(amountUSD,krwPerUSD){
 numeric(amountUSD,'amountUSD');numeric(krwPerUSD,'krwPerUSD');
 if(krwPerUSD<=0)throw new Error('krwPerUSD must be positive');
 const value=amountUSD*krwPerUSD;
 if(!Number.isFinite(value))throw new Error('KRW conversion overflow');
 return value;
}
