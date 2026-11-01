# Six-company SEC financial ingestion — implementation notes

Updated: 2026-11-01 (normalizer date-boundary correction)

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


## Quarterly normalizer added (2026-11-01)

The branch now includes `src/ai-investment-cycle/quarterly-normalizer.mjs`. It converts filing-level facts to standalone fiscal quarters only when the caller supplies an explicit issuer-reviewed XBRL tag and source unit.

- Direct 3-month facts are retained as reported quarters.
- YTD Q2/Q3 cash-flow facts are differenced against the prior cumulative period from the same fiscal-year start, tag, and unit.
- Q4 can be derived as the annual 10-K value less the nine-month cumulative value.
- CAPEX is presented as a positive spend amount while the original signed fact and both source accessions are retained.
- Different XBRL tags and units are never combined.
- If the comparison period is missing, the quarter is omitted rather than estimated.
- When both direct-quarter and YTD-derived facts exist for the same fiscal quarter, the directly reported quarter takes precedence.
- Normalized date ranges represent the standalone quarter: Q2/Q3/Q4 start on the day after the prior cumulative period ends, rather than reusing the fiscal-year-to-date start date.

The normalizer is intentionally not a six-company mapping approval. The caller must choose the reviewed tag per issuer. The current broad candidate list must not be passed through as if all candidates were interchangeable.

## Initial issuer review notes

- Meta's SEC Form 10-Q for the quarter ended 2026-09-30 reports consolidated revenue using `RevenueFromContractWithCustomerExcludingAssessedTax` and cash PP&E purchases using `PaymentsToAcquirePropertyPlantAndEquipment`. Its CAPEX figure is presented for both the three-month and nine-month periods, demonstrating why duration-aware selection is required.
- Amazon's Q3 2026 consolidated cash-flow statement labels the cash outflow as “Purchases of property and equipment”; proceeds from sales and incentives are shown separately. The current candidate is therefore `PaymentsToAcquirePropertyPlantAndEquipment`, not `PaymentsToAcquireProductiveAssets`. Statement-level definition reviewed; exact XBRL tag remains unverified.
- Microsoft, Alphabet, Meta, Tesla, and SpaceX now have Q3 2026 statement-level source captions reviewed. Exact XBRL tags are still unverified for every issuer. SpaceX requires special handling because its filing may use company-specific taxonomy tags not included in the standard `us-gaap` Company Facts namespace.
- The 2026-11-01 development pass did not retrieve live SEC Company Facts payloads. No actual quarterly values have been loaded into the application.

References checked:
- Meta 2026 Q3 Form 10-Q, SEC accession 0001628280-26-066773: https://www.sec.gov/Archives/edgar/data/1326801/000162828026066773/meta-20260930.htm
- Tesla 2026 Q2 Form 10-Q: https://www.sec.gov/Archives/edgar/data/1318605/000162828026049270/tsla-20260630.htm
- SEC EDGAR filing index for Alphabet 2026 Q3: https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/


## Per-issuer tag discovery status

The code now exposes `SEC_ISSUER_FACT_CANDIDATES` with an explicit status for each issuer. It is a review checklist, not a production-ready mapping:

| Issuer | Revenue candidate | CAPEX candidate | Status |
|---|---|---|---|
| Microsoft | `RevenueFromContractWithCustomerExcludingAssessedTax` | `PaymentsToAcquirePropertyPlantAndEquipment` | Statement reviewed; exact tag/unit pending |
| Alphabet | `RevenueFromContractWithCustomerExcludingAssessedTax` | `PaymentsToAcquirePropertyPlantAndEquipment` | Statement reviewed; exact tag/unit pending |
| Amazon | `SalesRevenueNet` | `PaymentsToAcquirePropertyPlantAndEquipment` | Statement reviewed; exact tag/unit pending |
| Meta | `RevenueFromContractWithCustomerExcludingAssessedTax` | `PaymentsToAcquirePropertyPlantAndEquipment` | Statement reviewed; exact tag/unit pending |
| Tesla | `RevenueFromContractWithCustomerExcludingAssessedTax` | `PaymentsToAcquirePropertyPlantAndEquipment` | Statement reviewed; exact tag/unit pending |
| SpaceX | Not assigned | Not assigned | Company-specific XBRL mapping required |

These are issuer-specific candidates, not approved ingestion mappings. The Amazon candidate was corrected to the PP&E-only cash-flow concept; do not use the broader productive-assets candidate for this monitor. SpaceX remains unmapped until its filing's XBRL instance and any company-specific taxonomy are inspected. No issuer's missing value should be inferred from another issuer's tag.


## Q3 2026 filing-level source review (2026-11-01)

All six issuers' Q3 2026 Form 10-Q statements were reviewed for consolidated revenue and cash PP&E captions. This is a statement-level review, not final XBRL tag approval.

| Ticker | Consolidated revenue caption | Cash PP&E caption | Important definition note |
|---|---|---|---|
| MSFT | Total revenue | Additions to property and equipment | Cash additions shown in investing activities |
| GOOGL | Total revenues | Purchases of property and equipment | Gross cash purchases |
| AMZN | Total net sales | Purchases of property and equipment | Gross purchases and proceeds from sales/incentives are separate; do not substitute non-GAAP net cash capex or finance-lease-inclusive net additions |
| META | Total revenue | Purchases of property and equipment | Do not substitute earnings-release capex including finance lease principal |
| TSLA | Total revenues | Purchases of property and equipment excluding finance leases, net of sales | Net-of-sales definition; not directly comparable with gross purchase lines |
| SPCX | Revenue | Purchases of property, plant, and equipment | Company-specific XBRL namespace/tag verification required; cash flow statement provides nine-month values |

### Q3 2026 standalone filing values (USD billions)

The following values were read from Q3 2026 Form 10-Q consolidated statements. Where the cash-flow statement reports only year-to-date values, Q3 is derived by subtracting the matching Q2 YTD figure. These are source-review calculations, not yet an automated production ingestion.

| Ticker | Q3 consolidated revenue | Q3 cash PP&E CAPEX | Calculation / definition |
|---|---:|---:|---|
| MSFT | 92.279 | 39.367 | Both directly shown for the three months ended September 30 |
| GOOGL | 127.577 | 51.355 | CAPEX: 131.953 nine-month less 80.598 six-month |
| AMZN | 201.944 | 77.259 | Gross Q3 cash purchases; proceeds from sales/incentives of 1.381 are separate |
| META | 64.601 | 33.942 | CAPEX: 83.055 nine-month less 49.113 six-month |
| TSLA | 28.046 | 4.732 | CAPEX: 13.014 nine-month less 8.282 six-month; net of sales, excludes finance leases |
| SPCX | 14.575 | 19.593 | CAPEX: 48.069 nine-month less 28.476 six-month |

Important comparability limits:
- Microsoft, Alphabet, Amazon, Meta, and SpaceX figures above use gross cash additions/purchases of PP&E; Amazon separately reports proceeds from sales and incentives.
- Tesla's cash-flow definition is net of sales and excludes finance leases. It is not identical to the gross-purchase measure used by the other five issuers.
- Alphabet's Q3 narrative CAPEX of approximately 51.4 billion agrees with the YTD cash-flow delta rounded to one decimal place; use the actual calculated 51.355 billion if using the cash-flow definition.
- SpaceX Q3 cash CAPEX was derived from the consolidated cash-flow statement, not segment capital expenditure disclosures.

Q2 comparator filings used:
- Alphabet Q2 2026 10-Q: https://www.sec.gov/Archives/edgar/data/1652044/000165204426000071/goog-20260630.htm
- Meta Q2 2026 10-Q: https://www.sec.gov/Archives/edgar/data/1326801/000162828026050705/meta-20260630.htm
- Tesla Q2 2026 10-Q: https://www.sec.gov/Archives/edgar/data/1318605/000162828026049270/tsla-20260630.htm
- SpaceX Q2 2026 10-Q: https://www.sec.gov/Archives/edgar/data/1181412/000162828026052535/spcx-20260630.htm

### Remaining technical gate

- Exact XBRL tag and unit validation remains pending for all six, especially SpaceX.
- SEC Company Facts responses were not downloaded in this pass; no real contact identity was available to construct a descriptive SEC User-Agent. Do not make live SEC requests with placeholder contact details.
- SpaceX Q3 cash-flow PP&E is presented YTD in the Q3 filing. The Q2 10-Q cumulative comparator was reviewed (USD 28.476bn), so the source-review Q3 delta is USD 19.593bn (48.069bn less 28.476bn). This calculation is documented for review only; it is not an automated ingestion. Do not substitute segment CAPEX for consolidated cash purchases.
- No financial values are committed to the production dataset. The values above are a filing review record only.
