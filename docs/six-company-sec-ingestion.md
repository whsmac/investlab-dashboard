# Six-company SEC financial ingestion — implementation notes

Updated: 2026-11-01

## Scope of this development branch

This branch is based on PR #26's head and is intended to remain a Draft PR targeting PR #26. It does not merge or rewrite PR #24, #25, or #26.

The first implementation adds a server-side SEC Company Facts adapter that retrieves and preserves filing-level facts. It deliberately does not yet publish normalized quarterly values. The next implementation step is issuer-specific mapping and reconciliation against 10-Q/10-K cash-flow and income statements.

## Issuer identifiers

| Ticker | Issuer | SEC CIK |
|---|---|---|
| MSFT | Microsoft | 0000789019 |
| GOOGL | Alphabet | 0001652044 |
| AMZN | Amazon | 0001018724 |
| META | Meta Platforms | 0001326801 |
| TSLA | Tesla | 0001318605 |
| SPCX | SpaceX | 0001181412 |

SpaceX price history must never predate its confirmed 2026-06-12 listing date. This boundary is independent of the financial reporting periods available in SEC filings.

## SEC ingestion boundary

- Use `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` from Node/server-side code only. SEC Company Facts does not support browser CORS.
- Require a descriptive User-Agent including a contact address.
- Respect SEC fair-access guidance: no more than 10 requests per second; this project should use a much lower sequential cadence and cache responses.
- Retrieve only the six required issuer documents; do not crawl the entire EDGAR archive.
- Keep raw source values, unit, XBRL tag, start/end dates, form, fiscal year/period, filing date, accession number, and source URL.
- Preserve amendments and restatements as separate versions. Select the latest valid filing for current display only after validation.
- Never silently invert CAPEX signs, turn year-to-date cash flow into quarterly values, or assume every issuer uses the same XBRL tag.
- Revenue is consolidated company revenue. Segment revenue is not an acceptable substitute.
- CAPEX is cash purchases/additions of PP&E using issuer-specific, source-reviewed tags and definitions. Do not silently mix PP&E purchases, lease additions, gross additions, or net CAPEX.

## Current tag candidates (discovery only)

- Revenue: `RevenueFromContractWithCustomerExcludingAssessedTax`, `SalesRevenueNet`, `Revenues`.
- CAPEX: `PaymentsToAcquirePropertyPlantAndEquipment`, `PaymentsToAcquireProductiveAssets`.

These are candidate tags, not an approved universal mapping. Each issuer's filings must be checked before values are promoted into the normalized dataset. If a company uses a custom extension or a different presentation, record that mapping and its source evidence explicitly.

## Quarterly derivation rules — not yet enabled

- Revenue: select facts representing the standalone fiscal quarter (typically a 3-month duration); do not mistake YTD or annual values for quarterly values.
- CAPEX cash-flow facts in 10-Q filings are often year-to-date. Derive a standalone quarter only by subtracting the prior cumulative period within the same fiscal year, using matching tags, units, and filing versions.
- Q4 CAPEX may be derived from the annual 10-K value less the nine-month cumulative value, with both accessions retained.
- If matching periods, tags, units, or versions are unavailable, leave the quarter missing and explain why.
- Keep fiscal quarter labels and fiscal year boundaries; do not relabel fiscal periods as calendar quarters without an explicit period mapping.

## Market-price provider gate

As of this review, no free source has been verified to provide all six tickers, suitable daily historical coverage (including SPCX from listing), and explicit rights for automated retrieval, cloud retention, and display in the private dashboard. Yahoo Finance and Stooq are not approved for automated scraping. Free tiers that require registration or restrict display/retention are not assumed to satisfy the user's free-public-data requirement.

No market-price provider is selected in this branch. The UI must show an explicit coverage-unavailable state until a permitted source is verified. Do not use a paid API or undocumented endpoint.

## Test boundary

Unit tests validate extraction and provenance retention only. They do not claim that issuer tags or quarterly calculations are approved. No live SEC requests are made during tests. No credentials, Supabase, production dashboard, or holdings are touched.
