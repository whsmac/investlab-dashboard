import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSharedCsv, PRICE_HEADERS, FINANCIAL_HEADERS} from '../src/shared-data/csv-import-validator.mjs';
const price = PRICE_HEADERS.join(',')+'
2026-11-06,TSLA,299.12
';
const financial = FINANCIAL_HEADERS.join(',')+'
TSLA,2026-Q3,28.046,4.732,"Net of sales, excludes finance leases",https://www.sec.gov/
';
test('price adjusted close accepted',()=>assert.equal(validateSharedCsv(price,'price').observations[0].price_basis,'adjusted_close'));
test('financial CSV quoted field accepted',()=>assert.equal(validateSharedCsv(financial,'financial').observations[0].capex_usd_bn,4.732));
test('duplicate price date rejected',()=>assert.throws(()=>validateSharedCsv(price+'2026-11-06,TSLA,300
','price'),/Duplicate/));
test('invalid calendar date rejected',()=>assert.throws(()=>validateSharedCsv(price.replace('2026-11-06','2026-02-30'),'price'),/Invalid trading date/));
test('SPCX data before 2026-06-12 is rejected',()=>assert.throws(()=>validateSharedCsv(price.replace('TSLA','SPCX').replace('2026-11-06','2026-06-11'),'price'),/predates/));
test('SPCX first trading date 2026-06-12 is accepted',()=>assert.equal(validateSharedCsv(price.replace('TSLA','SPCX').replace('2026-11-06','2026-06-12'),'price').rows,1));
test('invalid negative close rejected',()=>assert.throws(()=>validateSharedCsv(price.replace('299.12','-1'),'price'),/nonnegative/));
test('missing CAPEX definition rejected',()=>assert.throws(()=>validateSharedCsv(financial.replace('Net of sales, excludes finance leases',''),'financial'),/CAPEX definition/));
test('non-HTTPS financial source rejected',()=>assert.throws(()=>validateSharedCsv(financial.replace('https://','http://'),'financial'),/HTTPS/));
test('missing metrics rejected',()=>assert.throws(()=>validateSharedCsv(financial.replace('28.046,4.732',','),'financial'),/Both financial/));
test('unexpected headers rejected',()=>assert.throws(()=>validateSharedCsv(price.replace('date,ticker,close','ticker,date,close'),'price'),/headers/));
test('quoted newline accepted',()=>assert.equal(validateSharedCsv(financial.replace('Net of sales, excludes finance leases','Net of sales,
excludes finance leases'),'financial').rows,1));
