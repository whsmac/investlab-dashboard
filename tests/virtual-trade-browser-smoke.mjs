import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(process.cwd());
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep))throw Error('Forbidden');
  if(!(await stat(file)).isFile())throw Error('Not found');
  res.writeHead(200,{'content-type':extname(file)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const url='http://127.0.0.1:'+server.address().port;
try{
 await page.goto(url+'/virtual-trade.html');
 await page.locator('#dip').click();
 await page.locator('#run').click();
 await page.locator('#output').waitFor({state:'visible'});
 assert.match(await page.locator('#summary').innerText(),/TSLA 15주/);
 assert.match(await page.locator('#summary').innerText(),/최종 현금: \$0/);
 assert.equal(await page.locator('#results tr').count(),2);
 assert.match(await page.locator('#hold').innerText(),/보유 유지/);
 await page.locator('#staged').click();
 await page.locator('#run').click();
 assert.match(await page.locator('#hold').innerText(),/단계별 현금 비중/);
 assert.equal(await page.locator('#results tr').count(),3);
 await page.locator('#rotate').click();
 await page.locator('#run').click();
 assert.match(await page.locator('#summary').innerText(),/TSLA 17주/);
 assert.match(await page.locator('#summary').innerText(),/SOXL 0주/);
 await page.locator('#cash').fill('0');
 await page.locator('#dip').click();
 await page.locator('#trades tr').nth(0).locator('select').selectOption('buy');
 await page.locator('#run').click();
 assert.match(await page.locator('#error').innerText(),/insufficient cash/);
 assert.equal(await page.locator('#output').isHidden(),true);
 // Tax UI is not implemented yet; do not assert imaginary controls.
 assert.match(await page.locator('body').innerText(),/양도소득세/);
 // Standalone staged-sale screen: three levels and cash reserve status.
 await page.goto(url+'/virtual-staged-sale.html');
 await page.locator('#run').click();
 assert.match(await page.locator('#output').innerText(),/최종 보유/);
 assert.match(await page.locator('#output').innerText(),/현금 비중/);
 assert.equal(await page.locator('#output table tbody tr').count(),3);
 await page.locator('#reserve').fill('999999');
 await page.locator('#run').click();
 assert.match(await page.locator('#output').innerText(),/목표 미달/);
 await page.locator('#quantity').fill('-1');
 await page.locator('#run').click();
 assert.match(await page.locator('#error').innerText(),/입력 오류/);
 assert.deepEqual(errors,[]);
 console.log('Virtual trade browser smoke passed: dip, staged, rotation, unfunded trade; no JS errors.');
}finally{
 await browser.close();
 await new Promise(done=>server.close(done));
}
