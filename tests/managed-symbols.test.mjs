import test from 'node:test';
import assert from 'node:assert/strict';
import {collectManagedSymbols,readManagedSymbols} from '../src/simulator/managed-symbols.mjs';

test('deduplicates portfolio, watchlist and historical trade symbols without mutation',()=>{
 const portfolio={holdings:['tsla',{symbol:'MSFT'}],watchlist:['TSLA','SOXL'],past:['AMZN']};
 const watchlist=['SOXL','GOOGL'],trades=[{symbol:'TSLA'},{symbol:'META'}];
 const before=JSON.stringify({portfolio,watchlist,trades});
 const result=collectManagedSymbols({portfolio,watchlist,trades});
 assert.deepEqual(result.map(x=>x.ticker),['AMZN','GOOGL','META','MSFT','SOXL','TSLA']);
 assert.deepEqual(result.find(x=>x.ticker==='TSLA').categories,['보유','관심','거래이력']);
 assert.equal(JSON.stringify({portfolio,watchlist,trades}),before);
});
test('reads only existing keys and handles corrupted storage',()=>{
 const values=new Map([['investlab-pilot-portfolio-symbols-v1',JSON.stringify({holdings:['TSLA']})],['investlab-pilot-watchlist-v1','broken'],['investlab-pilot-trades-v1',JSON.stringify([{symbol:'NVDA'}])]]);
 const storage={getItem:key=>values.get(key)||null,setItem:()=>{throw Error('must not write');}};
 assert.deepEqual(readManagedSymbols(storage).map(x=>x.ticker),['NVDA','TSLA']);
 assert.deepEqual(readManagedSymbols(null),[]);
});
