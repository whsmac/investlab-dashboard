/** Indicative Korean resident overseas-share capital gains tax scenario.
 * Inputs are KRW tax-basis gains, NOT USD trading-engine PnL.
 * Assumptions are explicit and user-adjustable; no tax-lot inference.
 */
function finite(value,name){if(typeof value!=='number'||!Number.isFinite(value))throw new Error(name+' must be finite');return value}
function nonnegative(value,name){finite(value,name);if(value<0)throw new Error(name+' must be nonnegative');return value}
const won=value=>Math.round(value);
/**
 * @param {{year:number,priorRealizedKrw:number,scenarioRealizedKrw:number,
 * deductionKrw?:number,rate?:number,otherDeductionUsedKrw?:number}} input
 * @returns {object} incremental tax from this scenario vs unchanged annual realized gains
 */
export function estimateOverseasShareTax(input){
 if(!input||typeof input!=='object')throw new Error('tax input required');
 const {year,priorRealizedKrw,scenarioRealizedKrw,deductionKrw=2500000,rate=0.22,otherDeductionUsedKrw=0}=input;
 if(!Number.isInteger(year)||year<2000||year>2100)throw new Error('invalid tax year');
 finite(priorRealizedKrw,'prior realized KRW');
 finite(scenarioRealizedKrw,'scenario realized KRW');
 nonnegative(deductionKrw,'deduction KRW');
 nonnegative(otherDeductionUsedKrw,'other deduction used KRW');
 if(otherDeductionUsedKrw>deductionKrw)throw new Error('used deduction exceeds deduction');
 if(typeof rate!=='number'||!Number.isFinite(rate)||rate<0||rate>1)throw new Error('invalid tax rate');
 const availableDeduction=deductionKrw-otherDeductionUsedKrw;
 const taxable=gain=>Math.max(0,won(gain)-availableDeduction);
 const priorTaxable=taxable(priorRealizedKrw);
 const combinedTaxable=taxable(priorRealizedKrw+scenarioRealizedKrw);
 const priorTax=won(priorTaxable*rate);
 const combinedTax=won(combinedTaxable*rate);
 return {year,currency:'KRW',priorRealizedKrw:won(priorRealizedKrw),scenarioRealizedKrw:won(scenarioRealizedKrw),
 combinedRealizedKrw:won(priorRealizedKrw+scenarioRealizedKrw),availableDeductionKrw:availableDeduction,
 priorTaxableKrw:priorTaxable,combinedTaxableKrw:combinedTaxable,priorEstimatedTaxKrw:priorTax,
 combinedEstimatedTaxKrw:combinedTax,incrementalEstimatedTaxKrw:combinedTax-priorTax,
 effectiveRate:rate,taxStatus:'estimate_only',
 caveat:'KRW tax-basis gains must be supplied separately. Annual netting, eligibility, deductions, rate and tax law must be verified for the chosen year; not a filing calculation.'};
}
/** Estimate KRW taxable proceeds-minus-cost from user-supplied tax-lot basis.
 * Purchase FX and disposal FX are independent. Fees use KRW values supplied by user.
 */
export function estimateTaxableDisposalKrw({quantity,acquisitionPrice,disposalPrice,acquisitionFx,disposalFx,acquisitionFeeKrw=0,disposalFeeKrw=0}){
 for(const [key,value] of Object.entries({quantity,acquisitionPrice,disposalPrice,acquisitionFx,disposalFx}))if(!Number.isFinite(value)||value<=0)throw new Error('invalid '+key);
 nonnegative(acquisitionFeeKrw,'acquisition fee KRW');nonnegative(disposalFeeKrw,'disposal fee KRW');
 const acquisitionKrw=won(quantity*acquisitionPrice*acquisitionFx+acquisitionFeeKrw);
 const disposalKrw=won(quantity*disposalPrice*disposalFx-disposalFeeKrw);
 if(!Number.isSafeInteger(acquisitionKrw)||!Number.isSafeInteger(disposalKrw))throw new Error('KRW amount overflow');
 return {acquisitionKrw,disposalKrw,realizedKrw:disposalKrw-acquisitionKrw,currency:'KRW',taxStatus:'estimate_only'};
}
