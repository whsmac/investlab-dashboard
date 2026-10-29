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
  assert.deepEqual(result.positions.XYZ, { quantity: 0, costBasis: 0, averageCost: 0 });
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
