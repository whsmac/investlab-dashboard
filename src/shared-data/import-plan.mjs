// Build a deterministic, read-only import plan from validated CSV records.
// No Supabase client, credentials, network requests or database writes.
import {validatePriceCsv,validateFinancialCsv} from './csv-preflight.mjs';

const DATASETS = Object.freeze({
  market_price: {table:'market_price_observations',key:'date'},
  quarterly_financial: {table:'quarterly_financial_observations',key:'period'}
});

export function planSharedImport({datasetType,csvText,companies,existingKeys=[]}) {
  if(!Object.hasOwn(DATASETS,datasetType)) throw new Error('Unsupported shared dataset');
  if(!Array.isArray(companies)||!Array.isArray(existingKeys)) throw new TypeError('Expected company and existing-key arrays');
  const validation=datasetType==='market_price'?validatePriceCsv(csvText):validateFinancialCsv(csvText);
  const errors=[...validation.errors], companyIds=new Map();
  for(const company of companies) {
    if(!company||typeof company.ticker!=='string'||!Number.isSafeInteger(company.id)||company.id<=0) {
      errors.push('Invalid company catalog record'); continue;
    }
    if(companyIds.has(company.ticker)) errors.push('Duplicate company ticker in catalog: '+company.ticker);
    companyIds.set(company.ticker,company.id);
  }
  const seenExisting=new Set(existingKeys);
  const accepted=[],skipped=[];
  for(const record of validation.records) {
    const id=companyIds.get(record.ticker);
    if(!id) {errors.push('Unknown ticker in company catalog: '+record.ticker);continue;}
    const key=datasetType==='market_price'
      ? id+'|'+record.date+'|adjusted_close'
      : id+'|'+record.period;
    if(seenExisting.has(key)) {skipped.push({key,reason:'already_exists'});continue;}
    const payload=datasetType==='market_price'
      ? {company_id:id,trading_date:record.date,price_basis:'adjusted_close',close_price:record.close,currency:'USD'}
      : {company_id:id,fiscal_period:record.period,revenue_usd_bn:record.revenue_usd_bn||null,capex_usd_bn:record.capex_usd_bn||null,capex_definition:record.capex_definition||null,source_url:record.source_url||null};
    accepted.push({key,payload});
  }
  // A plan containing any errors must never be passed to a future writer.
  return {
    valid:validation.valid&&errors.length===0,
    datasetType,
    targetTable:DATASETS[datasetType].table,
    totalRows:validation.records.length+validation.errors.length,
    accepted:errors.length?[]:accepted,
    skipped,
    errors,
    writeEnabled:false
  };
}
