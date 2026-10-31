/**
 * Pure, replayable ledger calculator.
 * Run tests with: node --test tests/ledger-calculator.test.mjs
 * Amounts are calculated in transaction currency; cross-currency portfolio valuation
 * is intentionally outside this module.
 */
export function calculateLedger(inputTransactions) {
  if (!Array.isArray(inputTransactions)) throw new Error("Transactions must be an array");
  const seenSequences = new Set();
  for (const tx of inputTransactions) {
    const dateText = String(tx.transaction_date ?? "");
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!dateMatch) throw new Error("Invalid transaction_date; expected YYYY-MM-DD");
    const [, year, month, day] = dateMatch.map((part, index) => index === 0 ? part : Number(part));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error("Invalid transaction_date; expected a real calendar date");
    }
    if (!Number.isInteger(Number(tx.sequence_no)) || Number(tx.sequence_no) <= 0) {
      throw new Error("Invalid sequence_no; expected a positive integer");
    }
    const sequenceKey = `${dateText}:${tx.sequence_no}`;
    if (seenSequences.has(sequenceKey)) throw new Error("Duplicate sequence_no for transaction_date");
    seenSequences.add(sequenceKey);
  }
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
  const getPosition = symbol => positions.get(symbol) ?? {
    quantity: 0, averageCost: 0, costBasis: 0, currency: null
  };
  const assertPositionCurrency = (position, currency, symbol) => {
    if (position.quantity > 0 && position.currency !== currency) {
      throw new Error(`Currency mismatch for ${symbol}: position is ${position.currency}, transaction is ${currency}`);
    }
  };

  for (const tx of txs) {
    const type = tx.transaction_type;
    const currency = tx.currency ?? "USD";
    if (!Object.hasOwn(cash, currency)) throw new Error(`Unsupported currency: ${currency}`);
    const fees = amount(tx.fees ?? 0, "fees");
    if (tx.applied_fx_rate != null && !(Number(tx.applied_fx_rate) > 0 && Number.isFinite(Number(tx.applied_fx_rate)))) {
      throw new Error("Invalid applied_fx_rate");
    }
    const gross = tx.gross_amount == null ? null : amount(tx.gross_amount, "gross_amount");

    if (["BUY", "OPENING_POSITION"].includes(type)) {
      if (!tx.symbol) throw new Error("symbol is required");
      const qty = Number(tx.quantity), price = Number(tx.unit_price);
      if (!(qty > 0) || !Number.isFinite(qty) || !(price >= 0) || !Number.isFinite(price)) throw new Error("Invalid buy quantity or unit price");
      if (type === "OPENING_POSITION" && fees !== 0) {
        throw new Error("OPENING_POSITION fees must be zero; snapshot unit_price must include acquisition costs");
      }
      const p = getPosition(tx.symbol);
      assertPositionCurrency(p, currency, tx.symbol);
      const cost = type === "OPENING_POSITION" ? qty * price : qty * price + fees;
      const newQty = p.quantity + qty;
      positions.set(tx.symbol, {
        quantity: newQty,
        costBasis: p.costBasis + cost,
        averageCost: (p.costBasis + cost) / newQty,
        currency
      });
      if (type === "BUY") cash[currency] -= qty * price + fees;
      applied.push(tx);
    } else if (type === "SELL") {
      if (!tx.symbol) throw new Error("symbol is required");
      const qty = Number(tx.quantity), price = Number(tx.unit_price);
      if (!(qty > 0) || !Number.isFinite(qty) || !(price >= 0) || !Number.isFinite(price)) throw new Error("Invalid sell quantity or unit price");
      const p = getPosition(tx.symbol);
      assertPositionCurrency(p, currency, tx.symbol);
      if (qty > p.quantity + 1e-8) throw new Error(`Oversell blocked for ${tx.symbol}: have ${p.quantity}, requested ${qty}`);
      const soldCost = p.averageCost * qty;
      const proceeds = qty * price - fees;
      const realized = proceeds - soldCost;
      const leftQty = Math.max(0, p.quantity - qty);
      const leftCost = leftQty === 0 ? 0 : Math.max(0, p.costBasis - soldCost);
      positions.set(tx.symbol, {
        quantity: leftQty,
        costBasis: leftCost,
        averageCost: leftQty === 0 ? 0 : leftCost / leftQty,
        currency: leftQty === 0 ? null : p.currency
      });
      cash[currency] += qty * price - fees;
      realizedByCurrency[currency] += realized;
      realizedBySymbol[tx.symbol] = (realizedBySymbol[tx.symbol] ?? 0) + realized;
      applied.push(tx);
    } else if (type === "CASH_DEPOSIT") {
      if (gross == null || gross <= 0) throw new Error("CASH_DEPOSIT requires positive gross_amount");
      if (fees > gross) throw new Error("CASH_DEPOSIT fees cannot exceed gross_amount");
      cash[currency] += gross - fees;
      applied.push(tx);
    } else if (type === "OPENING_CASH") {
      if (gross == null) throw new Error("gross_amount is required");
      if (fees !== 0) throw new Error("OPENING_CASH fees must be zero; opening balance is already net");
      cash[currency] += gross;
      applied.push(tx);
    } else if (type === "CASH_WITHDRAWAL") {
      if (gross == null || gross <= 0) throw new Error("CASH_WITHDRAWAL requires positive gross_amount");
      cash[currency] -= gross + fees;
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
      if (currency !== toCurrency) throw new Error("FX transaction currency must match to_currency");
      if (tx.applied_fx_rate == null) throw new Error("FX_CONVERSION requires applied_fx_rate");
      const appliedRate = Number(tx.applied_fx_rate);
      const impliedRate = toAmount / fromAmount;
      const rateTolerance = Math.max(1e-8, Math.abs(impliedRate) * 1e-8);
      if (Math.abs(appliedRate - impliedRate) > rateTolerance) {
        throw new Error("FX applied_fx_rate must equal to_amount / from_amount (to-currency units per one from-currency unit)");
      }
      if (fees > toAmount) throw new Error("FX conversion fees cannot exceed to_amount");
      cash[fromCurrency] -= fromAmount;
      cash[toCurrency] += toAmount - fees;
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
