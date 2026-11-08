// Pure, read-only virtual trade engine. All values are in one selected cash currency.
// Tax is deliberately excluded: KRW tax-basis accounting requires separate FX and tax-lot inputs.
const finite = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(name + ' must be a finite number');
  return v;
};
const nonnegative = (v, name) => {
  finite(v, name);
  if (v < 0) throw new Error(name + ' must be nonnegative');
  return v;
};
const positive = (v, name) => {
  nonnegative(v, name);
  if (v === 0) throw new Error(name + ' must be positive');
  return v;
};
const cleanTicker = (ticker) => {
  if (typeof ticker !== 'string' || !/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(ticker)) throw new Error('invalid ticker');
  return ticker;
};
const money = (n) => Math.round((n + Number.EPSILON) * 1e8) / 1e8;

/**
 * @param {{cash:number,positions:Record<string,{quantity:number,averageCost:number}>}} portfolio
 * @param {Array<{side:'buy'|'sell',ticker:string,quantity:number,price:number,fee?:number}>} trades
 * @returns {{initial:object,steps:Array<object>,final:object}}
 */
export function simulateTrades(portfolio, trades) {
  if (!portfolio || typeof portfolio !== 'object' || Array.isArray(portfolio)) throw new Error('invalid portfolio');
  if (!Array.isArray(trades)) throw new Error('trades must be an array');
  let cash = nonnegative(portfolio.cash, 'cash');
  if (!portfolio.positions || typeof portfolio.positions !== 'object' || Array.isArray(portfolio.positions)) throw new Error('invalid positions');
  const positions = {};
  for (const [ticker, item] of Object.entries(portfolio.positions)) {
    cleanTicker(ticker);
    if (!item || typeof item !== 'object') throw new Error('invalid position');
    const quantity = nonnegative(item.quantity, 'quantity');
    const averageCost = nonnegative(item.averageCost, 'averageCost');
    positions[ticker] = {quantity, averageCost};
  }
  const snapshot = () => ({cash: money(cash), positions: structuredClone(positions)});
  const initial = snapshot();
  const steps = [];
  let realizedPnL = 0;
  for (const [index, trade] of trades.entries()) {
    if (!trade || (trade.side !== 'buy' && trade.side !== 'sell')) throw new Error('invalid trade side at ' + index);
    const ticker = cleanTicker(trade.ticker);
    const quantity = positive(trade.quantity, 'trade quantity');
    const price = positive(trade.price, 'trade price');
    const fee = nonnegative(trade.fee ?? 0, 'fee');
    const gross = quantity * price;
    if (!Number.isFinite(gross)) throw new Error('trade value overflow');
    const position = positions[ticker] ?? {quantity: 0, averageCost: 0};
    let tradePnL = 0;
    if (trade.side === 'buy') {
      const total = gross + fee;
      if (!Number.isFinite(total) || total > cash + 1e-9) throw new Error('insufficient cash at ' + index);
      const nextQty = position.quantity + quantity;
      if (!Number.isFinite(nextQty)) throw new Error('quantity overflow');
      position.averageCost = money((position.quantity * position.averageCost + total) / nextQty);
      position.quantity = money(nextQty);
      cash = money(cash - total);
    } else {
      if (quantity > position.quantity + 1e-9) throw new Error('insufficient shares at ' + index);
      const proceeds = gross - fee;
      if (proceeds < 0) throw new Error('fee exceeds proceeds at ' + index);
      tradePnL = money(proceeds - quantity * position.averageCost);
      realizedPnL = money(realizedPnL + tradePnL);
      cash = money(cash + proceeds);
      position.quantity = money(position.quantity - quantity);
      if (position.quantity === 0) position.averageCost = 0;
    }
    positions[ticker] = position;
    steps.push({index, side: trade.side, ticker, quantity, price, fee, gross: money(gross), tradePnL, cumulativeRealizedPnL: realizedPnL, ...snapshot()});
  }
  return {initial, steps, final: {...snapshot(), realizedPnL}, taxStatus: 'not_calculated', disclaimer: 'Scenario only; no ledger writes. Tax requires separate KRW tax-basis calculation.'};
}
