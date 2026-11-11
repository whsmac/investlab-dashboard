import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(process.cwd());
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('Forbidden');
  if(!(await stat(path)).isFile())throw Error('Not found');
  res.writeHead(200,{'content-type':extname(path)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  res.end(await readFile(path));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/virtual-trade-simulator.html');
 await page.evaluate(()=>{
  localStorage.setItem('investlab_holdings',JSON.stringify([
   {symbol:'TSLA',shares:10,avg_cost:100,price:150},
   {symbol:'USD-CASH',shares:100,avg_cost:1,price:1}
  ]));
  localStorage.setItem('investlab_watchlist',JSON.stringify(['SOXL']));
 });
 await page.reload();
 assert.equal(await page.locator('#cash').inputValue(),'100');
 // Missing market price must not break import; user supplies the terminal assumption.
 await page.evaluate(()=>{
  localStorage.setItem('investlab_holdings',JSON.stringify([
   {symbol:'TSLA',shares:10,avg_cost:100},
   {symbol:'USD-CASH',shares:100,avg_cost:1}
  ]));
 });
 await page.reload();
 assert.match(await page.locator('#positionLoadStatus').innerText(),/1개 종목/);
 assert.equal(await page.locator('#priceEditor input[aria-label="최종가격"]').first().inputValue(),'');
 assert.match(await page.locator('#initialValuation').innerText(),/합계 계산 대기/);
 await page.locator('#priceEditor input[aria-label="최종가격"]').first().fill('150');

 assert.match(await page.locator('#positionLoadStatus').innerText(),/1개 종목/);
 assert.equal(await page.locator('#positionEditor input[aria-label="수량"]').first().inputValue(),'10');
 await page.locator('#strategyEditor .strategy-card button').last().click();
 const trade=page.locator('#strategyEditor .trade-grid').first();
 await trade.locator('[data-field="side"]').selectOption('sell');
 await trade.locator('[data-field="ticker"]').fill('TSLA');
 await trade.locator('[data-field="quantity"]').fill('2');
 await trade.locator('[data-field="price"]').fill('200');
 await page.locator('#calculate').click();
 assert.match(await page.locator('#status').innerText(),/계산 완료/);
 assert.match(await page.locator('#finalValuation').innerText(),/TSLA/);
 assert.match(await page.locator('#finalValuation').innerText(),/8/);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('investlab_holdings')));
 assert.equal(stored[0].shares,10,'Virtual trades must not mutate actual holdings');
 assert.deepEqual(errors,[]);
 console.log('Simulator browser smoke passed: real holdings, cash, sell, valuation, no writes.');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
