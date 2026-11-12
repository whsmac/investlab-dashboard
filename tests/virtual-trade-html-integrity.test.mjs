import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
for(const page of ['virtual-trade.html','virtual-staged-sale.html']){
 test(page+' contains one valid inline module and no duplicated closing markup',()=>{
  const html=readFileSync(new URL(page,root),'utf8');
  const scripts=[...html.matchAll(/<script\s+type="module"\s*>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,1,'expected one module script');
  assert.equal((html.match(/<\/html>/g)||[]).length,1,'duplicate closing html');
  assert.equal(html.slice(html.lastIndexOf('</html>')+7).trim(),'','trailing script fragments');
  const source=scripts[0][1].replace(/^import\s+[^;]+;\s*$/gm,'');
  assert.doesNotThrow(()=>new vm.Script(source,{filename:page}),'inline JS must parse');
  assert.match(html,/실제 거래|실제 투자원장|DB 저장/);
 });
}
