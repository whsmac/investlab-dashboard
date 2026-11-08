// Offline, pure scenario calculator. No network, storage, or ledger writes.
// Monetary amounts use USD and must be supplied in USD; tax estimation is a separate module.
const finite=(n,label,min=0)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<min)throw new Error(label+' must be a finite number >= '+min);return n;};
const quantity=(n,label)=>{finite(n,label,0);if(n<=0)throw new Error(label+' must be positive');return n;};
const money=n=>Math.round((n+Number.EPSILON)*1e8)/1e8;
const clone=positions=>Object.fromEntries(Object.entries(positions).map(([symbol,p])=>[symbol,{quantity:p.quantity,averageCost:p.averageCost}]));
function snapshot(cash,positions){return {cash:money(cash),positions:clone(positions)};}
export function simulateTrades({cash,positions={},trades=[]}) {
  finite(cash,'cash');if(!positions||typeof positions!=='object'||Array.isArray(positions))throw new Error('positions must be an object');
  if(!Array.isArray(trades))throw new Error('trades must be an array');
  const holdings={};
  for(const [symbol,p] of Object.entries(positions)){
    if(!/^[A-Z][A-Z0-9.]{0,14}$/.test(symbol))throw new Error('Invalid ticker');
    if(!p||typeof p!=='object')throw new Error('Invalid position');
    finite(p.quantity,'position quantity');finite(p.averageCost,'average cost');
    holdings[symbol]={quantity:p.quantity,averageCost:p.averageCost};
  }
  const initial=snapshot(cash,holdings),steps=[];let available=cash,lastDate='',realized=0;
  for(const [index,trade] of trades.entries()){
    if(!trade||typeof trade!=='object')throw new Error('Invalid trade at step '+(index+1));
    const {date,symbol,side,price,quantity:qty,fee=0}=trade;
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Invalid date at step '+(index+1));
    if(date<lastDate)throw new Error('Trades must be chronological');lastDate=date;
    if(!/^[A-Z][A-Z0-9.]{0,14}$/.test(symbol||''))throw new Error('Invalid ticker');
    if(side!=='buy'&&side!=='sell')throw new Error('Invalid trade side');
    finite(price,'price');if(price===0)throw new Error('price must be positive');
    quantity(qty,'quantity');finite(fee,'fee');
    const before=snapshot(available,holdings);
    const current=holdings[symbol]||{quantity:0,averageCost:0};
    let cashFlow,stepRealized=0;
    if(side==='buy'){
      const cost=money(price*qty+fee);
      if(cost>available+1e-8)throw new Error('Insufficient simulated cash at step '+(index+1));
      const newQuantity=current.quantity+qty;
      holdings[symbol]={quantity:newQuantity,averageCost:money((current.quantity*current.averageCost+cost)/newQuantity)};
      cashFlow=-cost;
    }else{
      if(qty>current.quantity+1e-8)throw new Error('Cannot sell more shares than held at step '+(index+1));
      const proceeds=money(price*qty-fee);
      if(proceeds<0)throw new Error('Sale fee exceeds proceeds');
      stepRealized=money(proceeds-current.averageCost*qty);
      const remaining=money(current.quantity-qty);
      holdings[symbol]={quantity:remaining,averageCost:remaining===0?0:current.averageCost};
      cashFlow=proceeds;
    }
    available=money(available+cashFlow);realized=money(realized+stepRealized);
    steps.push({index:index+1,date,symbol,side,price,quantity:qty,fee,cashFlow,realizedPnL:stepRealized,cumulativeRealizedPnL:realized,before,after:snapshot(available,holdings)});
  }
  return {currency:'USD',initial,steps,final:snapshot(available,holdings),realizedPnL:realized,taxEstimate:null,taxStatus:'not_calculated'};
}
export function compareHoldVsScenario(input,prices) {
  const result=simulateTrades(input);
  if(!prices||typeof prices!=='object')throw new Error('Final prices required');
  const value=state=>money(state.cash+Object.entries(state.positions).reduce((sum,[symbol,p])=>{
    if(p.quantity===0)return sum;
    finite(prices[symbol],'final price for '+symbol);
    if(prices[symbol]===0)throw new Error('Final price must be positive');
    return sum+p.quantity*prices[symbol];
  },0));
  const holdValue=value(result.initial),scenarioValue=value(result.final);
  return {...result,holdValue,scenarioValue,difference:money(scenarioValue-holdValue)};
}
