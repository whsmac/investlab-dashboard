import test from "node:test";
import assert from "node:assert/strict";
import { calculateLedger } from "../src/ledger/ledger-calculator.mjs";

const tx = (transaction_type, fields = {}) => ({
  transaction_date: "2026-01-01",
  sequence_no: 1,
  transaction_type,
  currency: "USD",
  fees: 0,
  ...fields
});

test("average cost uses weighted average and includes buy fees", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 10, unit_price: 100 }),
    tx("BUY", { sequence_no: 2, symbol: "XYZ", quantity: 10, unit_price: 120 })
  ]);
  assert.equal(result.positions.XYZ.quantity, 20);
  assert.equal(result.positions.XYZ.averageCost, 110);
  assert.equal(result.cash.USD, -2200);
});

test("sell realizes profit at average cost and full sale resets position", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 10, unit_price: 100 }),
    tx("BUY", { sequence_no: 2, symbol: "XYZ", quantity: 10, unit_price: 120 }),
    tx("SELL", { sequence_no: 3, symbol: "XYZ", quantity: 20, unit_price: 130 })
  ]);
  assert.deepEqual(result.positions.XYZ, { quantity: 0, costBasis: 0, averageCost: 0, currency: null });
  assert.equal(result.realizedBySymbol.XYZ, 400);
  assert.equal(result.cash.USD, 400);
});

test("full sale followed by rebuy starts a new average-cost position", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 5, unit_price: 100 }),
    tx("SELL", { sequence_no: 2, symbol: "XYZ", quantity: 5, unit_price: 110 }),
    tx("BUY", { sequence_no: 3, symbol: "XYZ", quantity: 2, unit_price: 80 })
  ]);
  assert.equal(result.positions.XYZ.quantity, 2);
  assert.equal(result.positions.XYZ.averageCost, 80);
  assert.equal(result.realizedBySymbol.XYZ, 50);
});

test("overselling is rejected", () => {
  assert.throws(() => calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 2, unit_price: 10 }),
    tx("SELL", { sequence_no: 2, symbol: "XYZ", quantity: 3, unit_price: 12 })
  ]), /Oversell blocked/);
});

test("dividend records gross income, withholding tax, fees, and net cash separately", () => {
  const result = calculateLedger([
    tx("DIVIDEND", {
      symbol: "ABC", gross_amount: 100, withholding_tax: 15, fees: 1
    })
  ]);
  assert.equal(result.dividends.gross.USD, 100);
  assert.equal(result.dividends.withholdingTax.USD, 15);
  assert.equal(result.dividends.net.USD, 84);
  assert.equal(result.cash.USD, 84);
});

test("cash deposits, withdrawals, and FX conversions update each currency balance", () => {
  const result = calculateLedger([
    tx("CASH_DEPOSIT", { sequence_no: 1, gross_amount: 1000 }),
    tx("CASH_WITHDRAWAL", { sequence_no: 2, gross_amount: 100 }),
    tx("FX_CONVERSION", {
      sequence_no: 3, currency: "KRW",
      from_currency: "USD", from_amount: 200,
      to_currency: "KRW", to_amount: 270000
    })
  ]);
  assert.equal(result.cash.USD, 700);
  assert.equal(result.cash.KRW, 270000);
});

test("opening cash and opening position establish a starting state without a cash movement for the position", () => {
  const result = calculateLedger([
    tx("OPENING_CASH", { sequence_no: 1, gross_amount: 500 }),
    tx("OPENING_POSITION", { sequence_no: 2, symbol: "XYZ", quantity: 3, unit_price: 50 })
  ]);
  assert.equal(result.cash.USD, 500);
  assert.equal(result.positions.XYZ.quantity, 3);
  assert.equal(result.positions.XYZ.averageCost, 50);
});

test("editing or deleting a transaction is represented by replaying the remaining ledger", () => {
  const all = [
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 2, unit_price: 10 }),
    tx("BUY", { sequence_no: 2, symbol: "XYZ", quantity: 2, unit_price: 20 })
  ];
  assert.equal(calculateLedger(all).positions.XYZ.averageCost, 15);
  assert.equal(calculateLedger([all[0]]).positions.XYZ.averageCost, 10);
});


test("transactions are replayed in date and sequence order regardless of input order", () => {
  const result = calculateLedger([
    tx("SELL", { transaction_date: "2026-01-02", sequence_no: 1, symbol: "XYZ", quantity: 1, unit_price: 15 }),
    tx("BUY", { transaction_date: "2026-01-01", sequence_no: 1, symbol: "XYZ", quantity: 1, unit_price: 10 })
  ]);
  assert.equal(result.positions.XYZ.quantity, 0);
  assert.equal(result.realizedBySymbol.XYZ, 5);
});

test("dividend does not change stock quantity or average cost", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "ABC", quantity: 4, unit_price: 25 }),
    tx("DIVIDEND", { sequence_no: 2, symbol: "ABC", gross_amount: 8, withholding_tax: 1 })
  ]);
  assert.deepEqual(result.positions.ABC, { quantity: 4, costBasis: 100, averageCost: 25, currency: "USD" });
  assert.equal(result.cash.USD, -93);
});

test("dividend rejects tax plus fees greater than gross amount", () => {
  assert.throws(() => calculateLedger([
    tx("DIVIDEND", { symbol: "ABC", gross_amount: 10, withholding_tax: 9, fees: 2 })
  ]), /cannot exceed gross amount/);
});

test("buy fees are included in cost basis and sell fees reduce proceeds", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "XYZ", quantity: 2, unit_price: 10, fees: 2 }),
    tx("SELL", { sequence_no: 2, symbol: "XYZ", quantity: 1, unit_price: 15, fees: 1 })
  ]);
  assert.equal(result.positions.XYZ.costBasis, 11);
  assert.equal(result.positions.XYZ.averageCost, 11);
  assert.equal(result.realizedBySymbol.XYZ, 3);
  assert.equal(result.cash.USD, -8);
});

test("fractional quantities and prices are retained without premature rounding", () => {
  const result = calculateLedger([
    tx("BUY", { symbol: "XYZ", quantity: 0.125, unit_price: 80.1234 })
  ]);
  assert.equal(result.positions.XYZ.quantity, 0.125);
  assert.ok(Math.abs(result.positions.XYZ.costBasis - 10.015425) < 1e-10);
});

test("negative amounts and unsupported currencies are rejected", () => {
  assert.throws(() => calculateLedger([
    tx("CASH_DEPOSIT", { gross_amount: -1 })
  ]), /Invalid gross_amount/);
  assert.throws(() => calculateLedger([
    tx("CASH_DEPOSIT", { currency: "EUR", gross_amount: 10 })
  ]), /Unsupported currency/);
});


test("opening-balance reconciliation reproduces supplied non-TQQQ holdings and USD cash snapshot", () => {
  // TQQQ is intentionally excluded from this fixture because its snapshot is stale.
  const snapshot = [
    tx("OPENING_POSITION", { sequence_no: 1, symbol: "BITU", quantity: 160, unit_price: 14 }),
    tx("OPENING_POSITION", { sequence_no: 2, symbol: "SOXL", quantity: 13, unit_price: 106.97 }),
    tx("OPENING_POSITION", { sequence_no: 3, symbol: "TSLA", quantity: 222, unit_price: 385.2 }),
    tx("OPENING_POSITION", { sequence_no: 4, symbol: "USD", quantity: 107, unit_price: 83.6 }),
    tx("OPENING_CASH", { sequence_no: 5, symbol: undefined, gross_amount: 3641, currency: "USD" })
  ];
  const result = calculateLedger(snapshot);
  assert.deepEqual(
    Object.fromEntries(["BITU", "SOXL", "TSLA", "USD"].map(symbol => [
      symbol,
      { quantity: result.positions[symbol].quantity, averageCost: result.positions[symbol].averageCost }
    ])),
    {
      BITU: { quantity: 160, averageCost: 14 },
      SOXL: { quantity: 13, averageCost: 106.97 },
      TSLA: { quantity: 222, averageCost: 385.2 },
      USD: { quantity: 107, averageCost: 83.6 }
    }
  );
  assert.equal(result.positions.BITU.costBasis, 2240);
  assert.equal(result.positions.SOXL.costBasis, 1390.61);
  assert.equal(result.positions.TSLA.costBasis, 85514.4);
  assert.ok(Math.abs(result.positions.USD.costBasis - 8945.2) < 1e-8);
  assert.equal(result.cash.USD, 3641);
});


test("a position cannot be bought or sold in a different currency while open", () => {
  const opening = tx("BUY", { symbol: "XYZ", quantity: 2, unit_price: 10, currency: "USD" });
  assert.throws(() => calculateLedger([
    opening,
    tx("BUY", { sequence_no: 2, symbol: "XYZ", quantity: 1, unit_price: 13000, currency: "KRW" })
  ]), /Currency mismatch for XYZ/);
  assert.throws(() => calculateLedger([
    opening,
    tx("SELL", { sequence_no: 2, symbol: "XYZ", quantity: 1, unit_price: 13000, currency: "KRW" })
  ]), /Currency mismatch for XYZ/);
});

test("different positions may use different currencies and full sale clears position currency", () => {
  const result = calculateLedger([
    tx("BUY", { sequence_no: 1, symbol: "USX", quantity: 1, unit_price: 10, currency: "USD" }),
    tx("BUY", { sequence_no: 2, symbol: "KRX", quantity: 1, unit_price: 13000, currency: "KRW" }),
    tx("SELL", { sequence_no: 3, symbol: "USX", quantity: 1, unit_price: 12, currency: "USD" })
  ]);
  assert.equal(result.positions.USX.currency, null);
  assert.equal(result.positions.KRX.currency, "KRW");
  assert.equal(result.realizedByCurrency.USD, 2);
  assert.equal(result.cash.KRW, -13000);
});


test("invalid transaction dates and sequence numbers are rejected", () => {
  assert.throws(() => calculateLedger([
    tx("CASH_DEPOSIT", { transaction_date: "2026-13-40", gross_amount: 10 })
  ]), /Invalid transaction_date/);
  assert.throws(() => calculateLedger([
    tx("CASH_DEPOSIT", { sequence_no: 0, gross_amount: 10 })
  ]), /Invalid sequence_no/);
  assert.throws(() => calculateLedger([
    tx("CASH_DEPOSIT", { sequence_no: 1.5, gross_amount: 10 })
  ]), /Invalid sequence_no/);
});

test("invalid applied FX rates are rejected while positive rates are accepted", () => {
  assert.throws(() => calculateLedger([
    tx("FX_CONVERSION", {
      currency: "KRW", from_currency: "USD", from_amount: 1,
      to_currency: "KRW", to_amount: 1300, applied_fx_rate: 0
    })
  ]), /Invalid applied_fx_rate/);
  const result = calculateLedger([
    tx("FX_CONVERSION", {
      currency: "KRW", from_currency: "USD", from_amount: 1,
      to_currency: "KRW", to_amount: 1300, applied_fx_rate: 1300
    })
  ]);
  assert.equal(result.cash.KRW, 1300);
});
