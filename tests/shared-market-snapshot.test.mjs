import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedPortfolioQuotes,readQuoteEndpointConfig} from '../src/simulator/shared-market-snapshot.mjs';
const storage=items=>({getItem:key=>items[key]??null});
test('reads existing saved prices without inventing quote freshness',()=>{
 const rows=[{symbol:'TSLA',price:400},{symbol:'SOXL',price:'25.5'},{symbol:'USD-CASH',price:1},{symbol:'BAD',price:-2},{symbol:'NO',price:null}];
 const result=readSavedPortfolioQuotes(storage({investlab_holdings:JSON.stringify(rows)}));
 assert.deepEqual(result.map(x=>[x.ticker,x.price]),[['SOXL',25.5],['TSLA',400]]);
 assert.ok(result.every(x=>x.kind==='saved'&&x.observedAt===null));
});
test('invalid or absent portfolio data does not become a quote',()=>{
 assert.deepEqual(readSavedPortfolioQuotes(storage({investlab_holdings:'broken'})),[]);
 assert.deepEqual(readSavedPortfolioQuotes(storage({})),[]);
});
test('only existing HTTPS quotes function config is exposed, never keys',()=>{
 assert.equal(readQuoteEndpointConfig(storage({investlab_config:JSON.stringify({quoteUrl:'https://example.supabase.co/functions/v1/quotes',key:'secret'})})),'https://example.supabase.co/functions/v1/quotes');
 assert.equal(readQuoteEndpointConfig(storage({investlab_config:JSON.stringify({quoteUrl:'http://example.supabase.co/functions/v1/quotes'})})),null);
 assert.equal(readQuoteEndpointConfig(storage({})),null);
});
