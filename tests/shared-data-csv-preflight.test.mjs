import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,validatePriceCsv,validateFinancialCsv} from '../src/shared-data/csv-preflight.mjs';

test('CSV parser supports quoted commas and escaped quotes',()=>{
 assert.deepEqual(parseCsv('a,b\n"hello, world","a""b"\n'),[['a','b'],['hello, world','a"b']]);
});
test('price preflight validates dates, duplicate keys and SPCX listing boundary',()=>{
 assert.equal(validatePriceCsv('date,ticker,close\n2026-11-06,TSLA,123.45').valid,true);
 assert.equal(validatePriceCsv('date,ticker,close\n2026-02-30,TSLA,123').valid,false);
 assert.equal(validatePriceCsv('date,ticker,close\n2026-06-11,SPCX,123').valid,false);
 assert.equal(validatePriceCsv('date,ticker,close\n2026-11-06,TSLA,1\n2026-11-06,TSLA,2').valid,false);
});
test('financial preflight requires a metric and issuer-specific CAPEX definition',()=>{
 assert.equal(validateFinancialCsv('ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url\nTSLA,2026-Q3,28.046,4.732,"PP&E excluding finance leases",https://www.sec.gov/').valid,true);
 assert.equal(validateFinancialCsv('ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url\nTSLA,2026-Q3,,4.732,,https://www.sec.gov/').valid,false);
 assert.equal(validateFinancialCsv('ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url\nTSLA,2026-Q3,,,,').valid,false);
});
