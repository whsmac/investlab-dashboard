# XBRL tag verification log — 2026-11-01

## Purpose

Record what was and was not verified while reviewing the six issuers' Q3 2026 SEC filings. This is an evidence log, not an approved production mapping.

## Current conclusion

No issuer's revenue and CAPEX pair is promoted to a production-ready XBRL mapping in this pass. The filing-level statement captions and values documented in `six-company-sec-ingestion.md` remain valid source-review work, but statement captions alone do not prove the underlying XBRL concept QName, unit, context duration, or accession-level fact.

The SEC extracted XBRL instance documents are present in the official filing packages for all six issuers. The available inspection path in this pass could discover the instance documents but could not reliably parse their XML contents to enumerate fact QNames and contexts. Therefore, do not infer that a candidate tag is confirmed merely because it is a standard US-GAAP concept or matches the statement caption.

## Per-issuer disposition

| Issuer | Q3 filing instance located | Revenue QName verified | CAPEX QName verified | Decision |
|---|---:|---:|---:|---|
| MSFT | Yes | No | No | Keep existing candidates as discovery-only |
| GOOGL | Yes | No | No | Keep existing candidates as discovery-only |
| AMZN | Yes | No | No | Keep PP&E-only candidate; do not use productive-assets candidate |
| META | Yes | No | No | Existing candidate remains unapproved despite statement-caption review |
| TSLA | Yes | No | No | Existing candidate remains unapproved; preserve net-of-sales / finance-lease exclusion |
| SPCX | Yes | No | No | Do not assign a custom or US-GAAP QName based on secondary sources |

## SpaceX-specific evidence

The official SEC Q3 2026 filing package includes the extracted XBRL instance `spcx-20260930_htm.xml` and company taxonomy schema `spcx-20260930.xsd`. The filing's consolidated income statement reports Q3 revenue of USD 14,575 million and nine-month revenue of USD 27,083 million. Its consolidated cash-flow statement reports nine-month cash purchases of PP&E of USD 48,069 million; the Q2 2026 filing reports six-month cumulative cash PP&E purchases of USD 28,476 million. The filing-review Q3 CAPEX delta is therefore USD 19,593 million.

These statement values do not, by themselves, identify the XBRL fact QName. A secondary data source suggested `RevenueFromContractWithCustomerExcludingAssessedTax`, but that is not accepted as official tag verification. The official XML's fact elements and contexts must be parsed before assigning either a standard or `spcx:` extension concept.

Official SEC Q3 filing index:
https://www.sec.gov/Archives/edgar/data/1181412/000162828026066880/0001628280-26-066880-index.htm

Official SEC Q3 extracted instance:
https://www.sec.gov/Archives/edgar/data/1181412/000162828026066880/spcx-20260930_htm.xml

Official SEC Q2 filing used for the cumulative comparator:
https://www.sec.gov/Archives/edgar/data/1181412/000162828026052535/spcx-20260630.htm

## SEC request identity and access limitation

The user has now supplied a contact email for a descriptive SEC User-Agent. That removes the previously documented missing-contact-identity blocker. However, no SEC Company Facts API request was made in this pass: the available inspection tools did not provide a reliable way to issue the request with the required custom User-Agent header, and the XML inspection path did not expose parsed fact elements. Do not claim a live Company Facts response was downloaded.

When an approved execution path is available, make low-cadence sequential requests for the six CIKs, cache each response, and preserve the User-Agent requirement. Do not place the contact email in source code, repository files, logs, or commits.

## Promotion criteria

A mapping may be promoted only after the official filing instance or Company Facts payload confirms all of the following:

1. Exact taxonomy namespace and local concept name (QName).
2. Exact unit (normally USD, but inspect rather than assume).
3. Context start/end dates and duration type for the reported quarter or YTD period.
4. Fact value and scale/decimals consistent with the filing statement.
5. Filing accession and source URL.
6. For CAPEX, cash-flow line definition and whether the measure is gross, net of proceeds, or excludes finance leases.
7. A test fixture based on the verified fact shape, plus reconciliation to the published statement.

Until then, keep the mapping status as pending and display no fabricated normalized values.
