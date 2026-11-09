import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
test('virtual simulator exposes leveraged rotation preset and wires handler',()=>{
 assert.match(html,/id="rotate"/);
 assert.match(html,/addRow\('buy','SOXL',20,50\)/);
 assert.match(html,/addRow\('sell','SOXL',20,60\)/);
 assert.match(html,/\$\('rotate'\)\.addEventListener/);
});
test('virtual simulator rejects blank numeric fields and keeps tax disclaimer',()=>{
 assert.match(html,/value\.trim\(\)===''\)/);
 assert.match(html,/tradeNumber\(row,'\.qty'\)/);
 assert.match(html,/tradeNumber\(row,'\.price'\)/);
 assert.match(html,/세금 계산은 아직 제공하지 않습니다/);
 assert.doesNotMatch(html,/\.insert\(|\.update\(|\.delete\(/);
});
