import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPortfolioPositions,readPortfolioPositions,readPortfolioUsdCash} from '../src/simulator/portfolio-positions.mjs';

test('loads real portfolio quantity and average cost, excluding USD cash',()=>{
 const holdings=[{symbol:'TSLA',shares:222,avg_cost:385.2},{symbol:'BITU',shares:160,avg_cost:14},{symbol:'TQQQ',shares:283,avg_cost:72.3},{symbol:'USD',shares:107,avg_cost:83.6}];
 const snapshot=extractPortfolioPositions(holdings);
 assert.deepEqual(snapshot,[{ticker:'BITU',quantity:160,averageCost:14},{ticker:'TQQQ',quantity:283,averageCost:72.3},{ticker:'TSLA',quantity:222,averageCost:385.2}]);
 assert.equal(holdings.length,4);
});
test('merges duplicate ticker lots using weighted average cost',()=>{
 assert.deepEqual(extractPortfolioPositions([{symbol:'TSLA',shares:2,avg_cost:100},{symbol:'tsla',shares:3,avg_cost:200}]),[{ticker:'TSLA',quantity:5,averageCost:160}]);
});
test('read-only adapter handles missing or invalid data',()=>{
 const storage={getItem:()=>JSON.stringify([{symbol:'TSLA',shares:10,avg_cost:100}]),setItem:()=>{throw Error('must not write')}};
 assert.equal(readPortfolioPositions(storage)[0].quantity,10);
 assert.deepEqual(readPortfolioPositions({getItem:()=>'{'}),[]);
 assert.deepEqual(readPortfolioPositions(null),[]);
});

test('USD-CASH is read as cash; legacy USD is not guessed',()=>{
 const storage=rows=>({getItem:()=>JSON.stringify(rows)});
 assert.equal(readPortfolioUsdCash(storage([{symbol:'USD-CASH',shares:2500,avg_cost:1}])),2500);
 assert.equal(readPortfolioUsdCash(storage([{symbol:'USD',shares:107,avg_cost:83.6}])),null);
 assert.equal(readPortfolioUsdCash(storage([{symbol:'USD-CASH',shares:-10}])),null);
 assert.equal(readPortfolioUsdCash(null),null);
});
