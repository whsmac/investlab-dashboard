/**
 * Pure, replayable ledger calculator.
 * Run tests with: node --test tests/ledger-calculator.test.mjs
 * Amounts are calculated in transaction currency; cross-currency portfolio valuation
 * is intentionally outside this module.
 */
export function calculateLedger(inputTransactions) {
  const txs = [...inputTransactions].sort((a, b) =>
    String(a.transaction_date).localeCompare(String(b.transaction_date)) ||
    Number(a.sequence_no) - Number(b.sequence_no) ||
    String(a.id ?? "").localeCompare(String(b.id ?? ""))
  );

  const positions = new Map();
  const cash = { USD: 0, KRW: 0 };
  const dividends = { gross: { USD: 0, KRW: 0 }, withholdingTax: { USD: 0, KRW: 0 }, net: { USD: 0, KRW: 0 } };
  const realizedByCurrency = { USD: 0, KRW: 0 };
  const realizedBySymbol = {};
  const applied = [];

  const amount = (value, label) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${label}`);
    return n;
  };
  const getPosition = symbol => positions.get(symbol) ?? { quantity: 0, averageCost: 0, costBasis: 0 };

  for (const tx of txs) {
    const type = tx.transaction_type;
    const currency = tx.currency ?? "USD";
    if (!Object.hasOwn(cash, currency)) throw new Error(`Unsupported currency: ${currency}`);
    const fees = amount(tx.fees ?? 0, "fees");
    const gross = tx.gross_amount == null ? null : amount(tx.gross_amount, "gross_amount");

    if (["BUY", "OPENING_POSITION"].includes(type)) {
      if (!tx.symbol) throw new Error("symbol is required");
      const qty = Number(tx.quantity), price = Number(tx.unit_price);
      if (!(qty > 0) || !Number.isFinite(qty) || !(price >= 0) || !Number.isFinite(price)) throw new Error("Invalid buy quantity or unit price");
      const p = getPosition(tx.symbol);
      const cost = type === "OPENING_POSITION" ? (gross ?? qty * price) : qty * price + fees;
      const newQty = p.quantity + qty;
      positions.set(tx.symbol, { quantity: newQty, costBasis: p.costBasis + cost, averageCost: (p.costBasis + cost) / newQty });
      if (type === "BUY") cash[currency] -= qty * price + fees;
      applied.push(tx);
    } else if (type === "SELL") {
      if (!tx.symbol) throw new Error("symbol is required");
      const qty = Number(tx.quantity), price = Number(tx.unit_price);
      if (!(qty > 0) || !Number.isFinite(qty) || !(price >= 0) || !Number.isFinite(price)) throw new Error("Invalid sell quantity or unit price");
      const p = getPosition(tx.symbol);
      if (qty > p.quantity + 1e-8) throw new Error(`Oversell blocked for ${tx.symbol}: have ${p.quantity}, requested ${qty}`);
      const soldCost = p.averageCost * qty;
      const proceeds = qty * price - fees;
      const realized = proceeds - soldCost;
      const leftQty = Math.max(0, p.quantity - qty);
      const leftCost = leftQty === 0 ? 0 : Math.max(0, p.costBasis - soldCost);
      positions.set(tx.symbol, { quantity: leftQty, costBasis: leftCost, averageCost: leftQty === 0 ? 0 : leftCost / leftQty });
      cash[currency] += qty * price - fees;
      realizedByCurrency[currency] += realized;
      realizedBySymbol[tx.symbol] = (realizedBySymbol[tx.symbol] ?? 0) + realized;
      applied.push(tx);
    } else if (["CASH_DEPOSIT", "OPENING_CASH"].includes(type)) {
      if (gross == null) throw new Error("gross_amount is required");
      cash[currency] += gross;
      applied.push(tx);
    } else if (type === "CASH_WITHDRAWAL") {
      if (gross == null) throw new Error("gross_amount is required");
      cash[currency] -= gross;
      applied.push(tx);
    } else if (type === "DIVIDEND") {
      if (!tx.symbol || gross == null || gross <= 0) throw new Error("Dividend requires symbol and positive gross_amount");
      const tax = amount(tx.withholding_tax ?? 0, "withholding_tax");
      if (tax > gross || fees + tax > gross) throw new Error("Dividend tax and fees cannot exceed gross amount");
      const net = gross - tax - fees;
      dividends.gross[currency] += gross;
      dividends.withholdingTax[currency] += tax;
      dividends.net[currency] += net;
      cash[currency] += net;
      applied.push(tx);
    } else if (type === "FX_CONVERSION") {
      const fromCurrency = tx.from_currency, toCurrency = tx.to_currency;
      const fromAmount = amount(tx.from_amount, "from_amount");
      const toAmount = amount(tx.to_amount, "to_amount");
      if (!Object.hasOwn(cash, fromCurrency) || !Object.hasOwn(cash, toCurrency) || fromCurrency === toCurrency || fromAmount <= 0 || toAmount <= 0) throw new Error("Invalid FX conversion");
      cash[fromCurrency] -= fromAmount;
      cash[toCurrency] += toAmount;
      applied.push(tx);
    } else {
      throw new Error(`Unsupported transaction type: ${type}`);
    }
  }

  return {
    positions: Object.fromEntries([...positions.entries()].map(([symbol, p]) => [symbol, { ...p }])),
    cash: { ...cash },
    dividends: structuredClone(dividends),
    realizedByCurrency: { ...realizedByCurrency },
    realizedBySymbol: { ...realizedBySymbol },
    appliedTransactionCount: applied.length
  };
}
