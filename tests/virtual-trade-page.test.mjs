import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'virtual-trade.html'),'utf8');
test('virtual trade page contains one module script and imports valid local modules',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 assert.match(scripts[0][1],/type="module"/);
 for(const [,relative] of scripts[0][2].matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)){
  assert.doesNotThrow(()=>readFileSync(resolve(root,relative),'utf8'));
 }
});
test('browser page keeps simulated trades local and does not call remote persistence',()=>{
 assert.doesNotMatch(html,/\bsupabase\b\s*\.|\.from\s*\(|fetch\s*\(|XMLHttpRequest\s*\(/);
 assert.match(html,/simulateTrades\(portfolio,trades\)/);
 assert.match(html,/compareScenarios\(portfolio,/);
 assert.match(html,/planStagedSales\(portfolio,/);
});
test('example scenario buttons and output elements exist',()=>{
 for(const id of ['cash','ticker','shares','basis','trades','dip','staged','rotate','run','results','summary','hold','error']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
});
test('inline module JavaScript parses',async()=>{
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const {writeFileSync,mkdtempSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'investlab-script-'));
 try{const file=join(dir,'script.mjs');writeFileSync(file,script);const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)}finally{rmSync(dir,{recursive:true,force:true})}
});
