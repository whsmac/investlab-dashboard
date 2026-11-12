/** Calculate a hypothetical disposal's KRW gain using EXPLICIT tax-basis inputs.
 * The acquisition unit cost and FX must be supplied under the taxpayer's
 * applicable tax-lot accounting method; never infer these from USD ledger PnL.
 * FX rates are KRW per unit of the foreign currency.
 */
const finite=(value,label,allowZero=false)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||(!allowZero&&value===0))throw new Error(label+' must be a '+(allowZero?'nonnegative':'positive')+' finite number');
 return value;
};
const won=n=>Math.round(n);
export function calculateKrwDisposalGain({
 quantity,acquisitionPrice,disposalPrice,acquisitionFx,disposalFx,
 acquisitionFeeKrw=0,disposalFeeKrw=0
}={}){
 for(const [key,value] of Object.entries({quantity,acquisitionPrice,disposalPrice,acquisitionFx,disposalFx}))finite(value,key);
 finite(acquisitionFeeKrw,'acquisitionFeeKrw',true);
 finite(disposalFeeKrw,'disposalFeeKrw',true);
 const acquisitionKrw=quantity*acquisitionPrice*acquisitionFx+acquisitionFeeKrw;
 const disposalKrw=quantity*disposalPrice*disposalFx-disposalFeeKrw;
 if(!Number.isFinite(acquisitionKrw)||!Number.isFinite(disposalKrw))throw new Error('KRW value overflow');
 if(disposalKrw<0)throw new Error('disposal fees exceed proceeds');
 const acquisitionCostKrw=won(acquisitionKrw);
 const disposalProceedsKrw=won(disposalKrw);
 return {acquisitionCostKrw,disposalProceedsKrw,gainKrw:disposalProceedsKrw-acquisitionCostKrw,
  status:'tax_basis_assumption',warning:'Acquisition lots, FX dates, broker records, annual netting and applicable tax rules must be verified. This is not a tax filing.'};
}
