import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const pages=['virtual-trade.html','virtual-staged-sale.html','virtual-trade-simulator.html'];
test('all virtual trading pages have exactly one complete module script with valid syntax',()=>{
 for(const page of pages){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length,1,page+' should contain one module script');
  assert.equal((html.match(/<\/html>/gi)||[]).length,1,page+' should close HTML once');
  assert.equal(html.trim().endsWith('</html>'),true,page+' must not contain trailing corruption');
  const dir=mkdtempSync(join(tmpdir(),'investlab-ui-'));
  try{
   const file=join(dir,'inline.mjs');writeFileSync(file,scripts[0][1]);
   execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
  }finally{rmSync(dir,{recursive:true,force:true})}
 }
});
test('multi-trade UI uses local engines and does not access Supabase',()=>{
 const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
 for(const path of ['virtual-trade-engine.mjs','scenario-comparison.mjs','staged-sale-planner.mjs'])assert.ok(html.includes(path),path);
 for(const label of ['하락장 재매수','상승장 분할 매도','종목 전환','현금 목표'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/supabase\.co|\.from\(|\.insert\(|\.update\(|\.delete\(/);
 assert.match(html,/양도소득세/);
});

test('tax estimate remains isolated from the virtual trade page until UI integration',()=>{
 const html=readFileSync(new URL('../virtual-trade.html',import.meta.url),'utf8');
 assert.match(html,/양도소득세/);
 assert.doesNotMatch(html,/estimateOverseasStockTax\\(/);
 assert.doesNotMatch(html,/supabase\\.from\\(/);
});
