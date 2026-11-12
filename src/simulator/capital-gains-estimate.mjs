/**
 * Indicative KRW tax estimate, independent from the trade ledger.
 * Caller supplies KRW taxable gains/losses computed with tax-specific FX and basis.
 * No conversion from USD trading P&L is performed here.
 * Tax rates/deductions are explicit inputs, not hard-coded legal advice.
 */
const finite=(value,name)=>{if(typeof value!=='number'||!Number.isFinite(value))throw new Error(name+' must be finite');return value};
export function estimateCapitalGainsTax({priorTaxableGainsKRW=0,scenarioTaxableGainsKRW=0,annualDeductionKRW,taxRate,otherDeductionUsedKRW=0}){
 for(const [name,value] of Object.entries({priorTaxableGainsKRW,scenarioTaxableGainsKRW,annualDeductionKRW,taxRate,otherDeductionUsedKRW}))finite(value,name);
 if(annualDeductionKRW<0||otherDeductionUsedKRW<0||taxRate<0||taxRate>1)throw new Error('invalid deduction or rate');
 const deductionAvailable=Math.max(0,annualDeductionKRW-otherDeductionUsedKRW);
 const taxable=(gain)=>Math.max(0,gain-deductionAvailable);
 const beforeBase=taxable(priorTaxableGainsKRW);
 const afterBase=taxable(priorTaxableGainsKRW+scenarioTaxableGainsKRW);
 const taxBefore=Math.round(beforeBase*taxRate);
 const taxAfter=Math.round(afterBase*taxRate);
 return {currency:'KRW',priorTaxableGainsKRW,scenarioTaxableGainsKRW,deductionAvailableKRW:deductionAvailable,
  taxableBaseBeforeKRW:beforeBase,taxableBaseAfterKRW:afterBase,
  estimatedTaxBeforeKRW:taxBefore,estimatedTaxAfterKRW:taxAfter,
  incrementalTaxKRW:taxAfter-taxBefore,
  assumptions:'Caller supplied tax-specific KRW gains, deduction and rate; verify year, taxpayer, tax lots and FX. Estimate only.'};
}
