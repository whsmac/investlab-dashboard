import test from 'node:test';
import assert from 'node:assert/strict';
import {planSharedImport} from '../src/shared-data/import-plan.mjs';
const companies=[{id:5,ticker:'TSLA'},{id:6,ticker:'MSFT'}];
test('price CSV maps ticker to company id without writing',()=>{
 const p=planSharedImport({datasetType:'market_price',csvText:'date,ticker,close\n2026-11-06,TSLA,456.78',companies});
 assert.equal(p.valid,true);
 assert.equal(p.writeEnabled,false);
 assert.deepEqual(p.accepted[0],{key:'5|2026-11-06|adjusted_close',payload:{company_id:5,trading_date:'2026-11-06',price_basis:'adjusted_close',close_price:'456.78',currency:'USD'}});
});
test('known database keys are skipped',()=>{
 const p=planSharedImport({datasetType:'market_price',csvText:'date,ticker,close\n2026-11-06,TSLA,456.78',companies,existingKeys:['5|2026-11-06|adjusted_close']});
 assert.equal(p.valid,true);assert.equal(p.accepted.length,0);assert.equal(p.skipped.length,1);
});
test('unknown ticker blocks all planned rows',()=>{
 const p=planSharedImport({datasetType:'market_price',csvText:'date,ticker,close\n2026-11-06,TSLA,456.78\n2026-11-06,GOOGL,100',companies});
 assert.equal(p.valid,false);assert.equal(p.accepted.length,0);
});
test('financial plan maps periods and preserves provenance',()=>{
 const p=planSharedImport({datasetType:'quarterly_financial',csvText:'ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url\nMSFT,2026-Q3,77.7,20.0,PP&E,https://www.sec.gov/',companies});
 assert.equal(p.valid,true);assert.equal(p.accepted[0].payload.company_id,6);assert.equal(p.accepted[0].payload.source_url,'https://www.sec.gov/');
});
