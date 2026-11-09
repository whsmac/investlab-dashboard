/** Tax estimate only: explicit KRW tax basis, no inference from USD average cost.
 * annualOtherGainsKRW: net realized taxable gains/losses for the same tax year
 * excluding these simulated sales. Assumes one shared annual deduction pool.
 * No brokerage or ledger writes. Rates/deduction must be verified by tax year.
 */
const amount=(value,name,{allowNegative=false}={})=>{
 if(typeof value!=='number'||!Number.isFinite(value)||(!allowNegative&&value<0))throw new Error('invalid '+name);
 return value;
};
const won=n=>Math.round(n);
export function estimateForeignStockTax({sales,annualOtherGainsKRW=0,deductionKRW=2500000,taxRate=0.22}){
 if(!Array.isArray(sales))throw new Error('sales must be an array');
 amount(annualOtherGainsKRW,'annualOtherGainsKRW',{allowNegative:true});
 amount(deductionKRW,'deductionKRW');amount(taxRate,'taxRate');
 if(taxRate>1)throw new Error('taxRate cannot exceed 1');
 let simulatedGainKRW=0;
 const details=sales.map((s,index)=>{
  if(!s||typeof s!=='object')throw new Error('invalid sale '+index);
  for(const field of ['quantity','salePrice','saleFxKRW','taxBasisKRWPerShare','saleFeeKRW'])amount(s[field]??(field==='saleFeeKRW'?0:undefined),field);
  if(s.quantity<=0||s.saleFxKRW<=0||s.salePrice<=0)throw new Error('quantity, sale price and FX must be positive');
  // taxBasisKRWPerShare is the already-determined tax acquisition cost per share,
  // not the investment-ledger average price converted at sale FX.
  const proceedsKRW=won(s.quantity*s.salePrice*s.saleFxKRW);
  const basisKRW=won(s.quantity*s.taxBasisKRWPerShare);
  const feeKRW=won(s.saleFeeKRW??0);
  const gainKRW=proceedsKRW-basisKRW-feeKRW;
  simulatedGainKRW+=gainKRW;
  return {index:index+1,proceedsKRW,basisKRW,feeKRW,gainKRW};
 });
 const beforeTaxableKRW=Math.max(0,won(annualOtherGainsKRW)-deductionKRW);
 const afterTaxableKRW=Math.max(0,won(annualOtherGainsKRW)+simulatedGainKRW-deductionKRW);
 const taxBeforeKRW=won(beforeTaxableKRW*taxRate);
 const taxAfterKRW=won(afterTaxableKRW*taxRate);
 return {details,simulatedGainKRW,annualOtherGainsKRW,deductionKRW,taxRate,taxBeforeKRW,taxAfterKRW,incrementalTaxKRW:taxAfterKRW-taxBeforeKRW,assumptions:'Tax-year rules, acquisition method, FX, other gains, deduction eligibility and actual fees must be verified. Estimate only.'};
}
