import test from "node:test";
import assert from "node:assert/strict";
import { SEC_ISSUER_STATEMENT_MAP, SEC_STATEMENT_REVIEW_STATUS } from "../src/ai-investment-cycle/sec-issuer-statement-map.mjs";

test("has issuer-specific Q3 2026 filing sources for all six companies", () => {
  assert.deepEqual(Object.keys(SEC_ISSUER_STATEMENT_MAP), ["MSFT", "GOOGL", "AMZN", "META", "TSLA", "SPCX"]);
  for (const [ticker, mapping] of Object.entries(SEC_ISSUER_STATEMENT_MAP)) {
    assert.equal(mapping.filingPeriod, "2026-Q3", ticker);
    assert.match(mapping.filingUrl, /^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\//, ticker);
    assert.ok(mapping.revenue.statementCaption, ticker);
    assert.equal(mapping.revenue.scope, "consolidated", ticker);
    assert.ok(mapping.capex.statementCaption, ticker);
    assert.ok(mapping.capex.definition, ticker);
  }
  assert.equal(SEC_STATEMENT_REVIEW_STATUS, "statement_reviewed_xbrl_tags_pending");
});

test("flags company-specific CAPEX definitions that are not directly interchangeable", () => {
  assert.match(SEC_ISSUER_STATEMENT_MAP.AMZN.comparabilityNote, /gross cash purchases/);
  assert.match(SEC_ISSUER_STATEMENT_MAP.META.comparabilityNote, /finance lease principal/);
  assert.match(SEC_ISSUER_STATEMENT_MAP.TSLA.comparabilityNote, /net of sales/);
  assert.equal(SEC_ISSUER_STATEMENT_MAP.SPCX.capex.xbrlTagCandidate, null);
  assert.equal(SEC_ISSUER_STATEMENT_MAP.SPCX.revenue.xbrlTagCandidate, null);
});
