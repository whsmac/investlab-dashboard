/** Isolated estimate of Korean resident foreign-stock capital gains tax.
 * All monetary amounts are KRW and must already use appropriate tax-purpose FX.
 * This is an estimate, not a broker tax statement or a tax filing.
 */
const nonnegative=(value,name)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(name+' must be a nonnegative finite number');
 return value;
};
const signed=(value,name)=>{
 if(typeof value!=='number'||!Number.isFinite(value))throw new Error(name+' must be a finite number');
 return value;
};
const roundWon=value=>Math.round(value);
/** Trades use KRW proceeds and tax-basis costs, not USD ledger average cost.
 * @param {{sales:Array<{proceedsKRW:number,costBasisKRW:number,sellingFeesKRW?:number}>,
 * priorRealizedGainKRW?:number,otherAnnualGainKRW?:number,
 * annualDeductionKRW?:number,taxRate?:number,alreadyPaidTaxKRW?:number}} input
 */
export function estimateForeignStockTax(input){
 if(!input||!Array.isArray(input.sales))throw new Error('sales array required');
 const prior=signed(input.priorRealizedGainKRW??0,'priorRealizedGainKRW');
 const other=signed(input.otherAnnualGainKRW??0,'otherAnnualGainKRW');
 const deduction=nonnegative(input.annualDeductionKRW??2500000,'annualDeductionKRW');
 const rate=nonnegative(input.taxRate??0.22,'taxRate');
 if(rate>1)throw new Error('taxRate must be <= 1');
 const paid=nonnegative(input.alreadyPaidTaxKRW??0,'alreadyPaidTaxKRW');
 const saleDetails=input.sales.map((sale,index)=>{
  if(!sale||typeof sale!=='object')throw new Error('invalid sale '+index);
  const proceeds=nonnegative(sale.proceedsKRW,'proceedsKRW');
  const basis=nonnegative(sale.costBasisKRW,'costBasisKRW');
  const fees=nonnegative(sale.sellingFeesKRW??0,'sellingFeesKRW');
  if(fees>proceeds)throw new Error('selling fees exceed proceeds');
  return {index:index+1,gainKRW:roundWon(proceeds-basis-fees)};
 });
 const simulatedGainKRW=saleDetails.reduce((sum,s)=>sum+s.gainKRW,0);
 const beforeGain=prior+other,afterGain=beforeGain+simulatedGainKRW;
 if(!Number.isFinite(beforeGain)||!Number.isFinite(afterGain))throw new Error('annual gains overflow');
 const taxFor=gain=>{const tax=Math.max(0,gain-deduction)*rate;if(!Number.isFinite(tax))throw new Error('estimated tax overflow');return roundWon(tax)};
 const beforeTaxKRW=taxFor(beforeGain),afterTaxKRW=taxFor(afterGain);
 return {saleDetails,simulatedGainKRW,annualGainBeforeKRW:beforeGain,annualGainAfterKRW:afterGain,
  annualDeductionKRW:deduction,taxRate:rate,estimatedAnnualTaxBeforeKRW:beforeTaxKRW,
  estimatedAnnualTaxAfterKRW:afterTaxKRW,incrementalTaxKRW:afterTaxKRW-beforeTaxKRW,
  estimatedUnpaidAnnualTaxKRW:Math.max(0,afterTaxKRW-paid),status:'estimate_only',
  warning:'KRW tax basis and FX must be supplied independently of trading-ledger USD average cost. Annual netting, deduction eligibility, and law must be verified for the tax year.'};
}
