import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
test('virtual trade page has one module script and closes document once',()=>{
 assert.equal((html.match(/<script type="module">/g)||[]).length,1);
 assert.equal((html.match(/<\/script>/g)||[]).length,1);
 assert.equal((html.match(/<\/html>/g)||[]).length,1);
});
test('virtual trade page script is syntactically valid after removing module imports',()=>{
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert.ok(match,'module script exists');
 const script=match[1].replace(/^import\s+.*?;\s*$/gm,'');
 assert.doesNotThrow(()=>new Function(script));
});
test('staged-sale comparison output is intact and tax status is disclosed',()=>{
 assert.match(html,/보유 유지 평가액/);
 assert.match(html,/분할 매도 후 평가액/);
 assert.match(html,/fmt\(finalValue-initialValue\)/);
 assert.match(html,/세금 계산은 아직 제공하지 않습니다/);
});
