import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateForeignStockTax} from '../src/simulator/foreign-stock-tax-estimator.mjs';
const sale={quantity:10,salePrice:200,saleFxKRW:1400,taxBasisKRWPerShare:100000,saleFeeKRW:1000};
test('KRW tax basis and sale FX, annual deduction applied',()=>{
 const r=estimateForeignStockTax({sales:[sale]});
 assert.equal(r.simulatedGainKRW,1799000);
 assert.equal(r.incrementalTaxKRW,0);
});
test('incremental tax includes previously realized annual gains',()=>{
 const r=estimateForeignStockTax({sales:[sale],annualOtherGainsKRW:2000000});
 assert.equal(r.taxBeforeKRW,0);
 assert.equal(r.taxAfterKRW,285780);
 assert.equal(r.incrementalTaxKRW,285780);
});
test('loss can reduce estimated annual tax',()=>{
 const r=estimateForeignStockTax({sales:[{...sale,taxBasisKRWPerShare:400000}],annualOtherGainsKRW:5000000});
 assert.equal(r.simulatedGainKRW,-1201000);
 assert.equal(r.taxBeforeKRW,550000);
 assert.equal(r.taxAfterKRW,285780);
 assert.equal(r.incrementalTaxKRW,-264220);
});
test('reject missing tax basis, invalid FX, invalid rate',()=>{
 assert.throws(()=>estimateForeignStockTax({sales:[{...sale,taxBasisKRWPerShare:undefined}]}),/taxBasisKRWPerShare/);
 assert.throws(()=>estimateForeignStockTax({sales:[{...sale,saleFxKRW:0}]}),/positive/);
 assert.throws(()=>estimateForeignStockTax({sales:[],taxRate:2}),/cannot exceed/);
});
