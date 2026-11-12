/**
 * Estimate tax-basis KRW gains for one hypothetical overseas-share disposal.
 * Caller must supply the acquisition cost basis selected under the applicable
 * broker/tax-lot rule; USD average cost from the ledger is NOT a substitute.
 * Rates are KRW per USD. Fees are assumed paid in USD at their respective dates.
 * No tax, annual deduction, or FX rate is fetched automatically.
 */
const finite=(value,name,min=0)=>{
 if(typeof value!=='number'||!Number.isFinite(value)||value<min)
  throw new Error(name+' must be a finite number >= '+min);
 return value;
};
const won=n=>Math.round(n);
export function estimateTaxBasisKrw({
 quantity,acquisitionPriceUsd,disposalPriceUsd,
 acquisitionFxKrwPerUsd,disposalFxKrwPerUsd,
 acquisitionFeeUsd=0,disposalFeeUsd=0
}={}){
 finite(quantity,'quantity',Number.MIN_VALUE);
 finite(acquisitionPriceUsd,'acquisitionPriceUsd');
 finite(disposalPriceUsd,'disposalPriceUsd');
 finite(acquisitionFxKrwPerUsd,'acquisitionFxKrwPerUsd',Number.MIN_VALUE);
 finite(disposalFxKrwPerUsd,'disposalFxKrwPerUsd',Number.MIN_VALUE);
 finite(acquisitionFeeUsd,'acquisitionFeeUsd');
 finite(disposalFeeUsd,'disposalFeeUsd');
 const acquisitionUsd=quantity*acquisitionPriceUsd+acquisitionFeeUsd;
 const disposalUsd=quantity*disposalPriceUsd-disposalFeeUsd;
 if(disposalUsd<0)throw new Error('disposal fee exceeds proceeds');
 const acquisitionKrw=won(acquisitionUsd*acquisitionFxKrwPerUsd);
 const disposalKrw=won(disposalUsd*disposalFxKrwPerUsd);
 if(!Number.isSafeInteger(acquisitionKrw)||!Number.isSafeInteger(disposalKrw))throw new Error('KRW amount exceeds safe precision');
 return {acquisitionKrw,disposalKrw,gainKrw:disposalKrw-acquisitionKrw,
  acquisitionFxKrwPerUsd,disposalFxKrwPerUsd,
  status:'illustrative_tax_basis',
  warning:'Acquisition basis, FX application dates, fees and tax-lot selection must be verified against the applicable tax-year and broker records.'};
}
