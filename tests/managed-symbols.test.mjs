import test from 'node:test';
import assert from 'node:assert/strict';
import {collectManagedSymbols,readManagedSymbols} from '../src/simulator/managed-symbols.mjs';

test('deduplicates original portfolio managed symbols without mutation',()=>{
 const holdings=[{symbol:'tsla',shares:10},{symbol:'MSFT',shares:2},{symbol:'USD',shares:100}];
 const watchlist=[{symbol:'TSLA'},'SOXL'];
 const past=[{symbol:'AMZN'},'SOXL'];
 const before=JSON.stringify({holdings,watchlist,past});
 const result=collectManagedSymbols({holdings,watchlist,past});
 assert.deepEqual(result.map(x=>x.ticker),['AMZN','MSFT','SOXL','TSLA']);
 assert.deepEqual(result.find(x=>x.ticker==='TSLA').categories,['보유','관심']);
 assert.equal(JSON.stringify({holdings,watchlist,past}),before);
});
test('reads only original portfolio keys and handles corrupted storage',()=>{
 const values=new Map([['investlab_holdings',JSON.stringify([{symbol:'TSLA'}])],['investlab_watchlist','broken'],['investlab_past_symbols',JSON.stringify([{symbol:'NVDA'}])]]);
 const storage={getItem:key=>values.get(key)||null,setItem:()=>{throw Error('must not write');}};
 assert.deepEqual(readManagedSymbols(storage).map(x=>x.ticker),['NVDA','TSLA']);
 assert.deepEqual(readManagedSymbols(null),[]);
});
