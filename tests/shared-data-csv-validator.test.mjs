import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, validateSharedCsv } from '../src/shared-data/csv-validator.mjs';
const tickers = ['MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPCX'];
test('quoted CSV and CRLF', () => assert.deepEqual(parseCsv('a,b\r\n"x,y","say ""hi"""\r\n'), [['a','b'], ['x,y','say "hi"']]));
test('market prices validate and reject duplicate or invalid rows', () => {
 const data = 'date,ticker,close\n2026-11-06,TSLA,450.25\n2026-11-06,TSLA,451\n2026-02-30,MSFT,100\n2026-11-06,UNKNOWN,1\n';
 const result = validateSharedCsv(data, 'market_price', tickers);
 assert.equal(result.accepted.length, 1); assert.equal(result.rejected.length, 3); assert.equal(result.valid, false);
});
test('quarterly financials preserve CAPEX definition and reject missing definition', () => {
 const data = 'ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url\nMSFT,2026-Q3,92.279,39.367,"Cash PP&E, gross",https://www.sec.gov/\nTSLA,2026-Q3,28.046,4.732,,https://www.sec.gov/\n';
 const result = validateSharedCsv(data, 'quarterly_financial', tickers);
 assert.equal(result.accepted.length, 1); assert.equal(result.rejected[0].reason, 'CAPEX definition required');
});
test('reject malformed header and broken quote', () => {
 assert.throws(() => validateSharedCsv('ticker,date,close\nTSLA,2026-11-06,1', 'market_price', tickers));
 assert.throws(() => parseCsv('a,b\n"oops,b'));
});
