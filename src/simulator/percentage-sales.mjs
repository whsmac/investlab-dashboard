import {simulateStagedSales} from './staged-sales.mjs';

/** Generate staged sales from percentages of ORIGINAL shares (not remaining shares).
 * The generated plan uses the existing validated simulation engine and never writes a ledger.
 */
export function simulatePercentageSales(portfolio,{ticker,stages,targetCash=null}) {
  if (!portfolio?.positions || !Object.hasOwn(portfolio.positions,ticker)) throw new Error('ticker not held');
  if (!Array.isArray(stages) || !stages.length) throw new Error('stages required');
  const initialShares=portfolio.positions[ticker].quantity;
  if (typeof initialShares!=='number' || !Number.isFinite(initialShares) || initialShares<=0) throw new Error('no shares to sell');
  let sum=0;
  const quantityStages=stages.map(s=>{
    if (!s || typeof s.percent!=='number' || !Number.isFinite(s.percent) || s.percent<=0 || s.percent>100) throw new Error('invalid sale percentage');
    sum+=s.percent;
    if (sum>100+1e-9) throw new Error('sale percentages exceed 100');
    return {price:s.price,quantity:initialShares*s.percent/100,fee:s.fee??0};
  });
  const result=simulateStagedSales(portfolio,{ticker,stages:quantityStages,targetCash});
  return {...result,rows:result.rows.map((row,i)=>({...row,percentOfInitial:stages[i].percent})),percentSold:sum};
}
