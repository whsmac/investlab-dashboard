# AI Investment Cycle Analysis — Data & Metric Design

## Purpose
Provide a quarterly view of hyperscaler capital expenditure, disclosed AI business results, and cycle-risk signals. This module is analytical support, not a buy/sell signal.

## Initial company universe
- Alphabet (Google)
- Amazon
- Microsoft
- Meta Platforms
- Oracle (optional comparison group; keep separate from the initial hyperscaler aggregate until coverage is consistent)

The universe must be configurable. Do not silently treat missing company quarters as zero.

## What the CAPEX series means
The primary comparable series is **company-reported total capital expenditure** from quarterly filings, earnings releases, and investor materials. It is not AI-only CAPEX. Cloud/AI infrastructure is a major driver for some companies, but disclosures differ and company-wide CAPEX includes other assets. The dashboard must label the series “reported total CAPEX” and show company-level lines as well as a coverage-aware aggregate.

AI-specific infrastructure CAPEX may be displayed only as a separate series when the company explicitly discloses it. Estimates must never be mixed into reported totals.

## AI business performance
Capture quarterly AI revenue only when the company explicitly discloses a value and definition. Examples of non-equivalent disclosures include AI product revenue, AI services revenue, AI annualized revenue run rate, cloud AI revenue growth, and AI-related bookings. These must retain their original metric name, period basis, currency, and source. Do not convert growth rates or bookings into revenue.

When no comparable quarterly AI revenue is disclosed, store null and show “not separately disclosed”; do not estimate it from total cloud revenue.

## Metrics
All stored financial amounts use USD millions and fiscal-quarter labels (YYYY-Qn), with fiscal-calendar metadata retained per company.

1. Quarterly CAPEX and trailing-four-quarter CAPEX.
2. CAPEX QoQ and YoY growth.
3. YoY growth acceleration (percentage-point change in YoY growth).
4. Disclosed AI revenue / AI business metric and YoY growth, only for comparable definitions.
5. Trailing-four-quarter disclosed AI revenue divided by trailing-four-quarter CAPEX, labelled **AI revenue-to-total-CAPEX proxy**, never “ROI” or “investment return”. It is not profit, cash flow, or attributable return on AI CAPEX.
6. Market response: adjusted-close total return over selected horizons and excess return versus a benchmark (initially S&P 500), shown separately from operating results and CAPEX. This measures shareholder market performance, not the return earned directly on AI CAPEX.

## CAPEX-to-business performance lead/lag analysis

The isolated helper `src/ai-investment-cycle/cycle-linkage.mjs` compares company-level CAPEX YoY growth with a separately defined business-performance YoY growth series.

For each lag from 0 to the configured maximum:
- Lag 0 pairs CAPEX growth and business growth in the same calendar quarter.
- Lag 1 pairs CAPEX growth in quarter t with business growth in t+1.
- Lag 2 pairs CAPEX growth in quarter t with business growth in t+2, and so on.
- Only exact company and quarter-index matches are included. Missing quarters are not interpolated.
- Pearson correlation is returned only when the configured minimum number of aligned observations is met and both series have non-zero variance.

The output labels every result as descriptive-only. A positive correlation at a positive lag does not prove CAPEX caused later business growth: cloud demand, pricing, product cycles, capacity availability, acquisitions, foreign exchange, and broader economic conditions may affect both variables. It is not a forecast or a trading signal.

### Input and comparability requirements

- Use one company at a time; do not correlate aggregate CAPEX with an unrelated business metric.
- Keep business metric identity stable across the full sample (for example, AWS segment revenue growth only with AWS segment revenue growth).
- Preserve fiscal-to-calendar quarter mapping, and do not mix Microsoft's fiscal quarter labels with calendar quarter labels without an explicit mapping.
- Segment reorganizations, definition changes, and restated comparatives must be marked; break the series or create a separately identified metric version when definitions change.
- Do not combine AI-specific disclosed revenue with broad cloud revenue or advertising proxies.
- A minimum of six aligned observations is the default analytical floor, not a guarantee of statistical reliability. Longer history is preferred; results with fewer observations remain null.
- Market returns remain a separate outcome series. Correlation between CAPEX and stock returns must account for market benchmark returns and must not be described as the return on AI investment.

### Current data sufficiency

The Q3 2026 snapshot remains a point-in-time comparison. A new source-backed AWS quarterly series now covers 12 consecutive quarters from 2023-Q4 through 2026-Q3, with quarterly segment revenue and operating income. It is a broad AWS segment indicator, not AI-only revenue or profit. This gives one company a historical operating series, but the current CAPEX dataset begins in 2024-Q1 and does not yet provide the full prior-year CAPEX history needed for 12 aligned CAPEX-growth/business-growth observations. The lag helper remains descriptive-only; a production company-level linkage should wait for expanded, source-validated CAPEX and business history. Alphabet now also has 12 consecutive quarters of source-backed Google Cloud segment revenue and operating income (2023-Q4 through 2026-Q3), stored in `data/ai-investment-cycle/business-performance-alphabet-quarterly-2023-2026.json`. Google Cloud includes core cloud services and AI infrastructure/solutions, so it is not AI-only revenue or profit. Microsoft now has 12 calendar quarters (2023-Q2 through 2026-Q1) of Intelligent Cloud segment revenue and operating income, mapped from its June fiscal year and stored in `data/ai-investment-cycle/business-performance-microsoft-quarterly-2023-2026.json`. Its fiscal Q4 quarterly values are derived from annual totals less nine-month cumulative values, with both source links retained. Intelligent Cloud includes Azure and other cloud services plus server and enterprise services; it is not Azure-only or AI-only. Meta now has 12 calendar quarters (2023-Q4 through 2026-Q3) of consolidated revenue and operating income in `data/ai-investment-cycle/business-performance-meta-quarterly-2023-2026.json`. Meta's consolidated metrics are not AI-only and are not directly comparable to cloud segments. Meta Q3 2026 operating income includes a USD 9.89B litigation-related charge.


## First source-backed historical lead/lag run — 2026-10-31

`deriveHistoricalCycleLinkage()` in `src/ai-investment-cycle/historical-linkage.mjs` now connects the CAPEX and business datasets company by company. It calculates CAPEX YoY growth and business-revenue YoY growth, then pairs them at lags 0–4 quarters. It refuses multiple business metric series for the same company rather than silently choosing or pooling them.

Exploratory Pearson correlations from the current snapshot:

| Company | Business metric | Lag 0 | Lag 1 | Lag 2 | Lag 3 | Lag 4 |
|---|---|---:|---:|---:|---:|---:|
| Alphabet | Google Cloud revenue | +0.79 (n=8) | +0.84 (n=8) | +0.73 (n=8) | +0.36 (n=8) | -0.05 (n=7) |
| Amazon | AWS revenue | +0.57 (n=6) | -0.10 (n=6) | +0.09 (n=6) | +0.20 (n=6) | +0.46 (n=6) |
| Microsoft | Intelligent Cloud revenue | +0.40 (n=8) | -0.12 (n=8) | -0.77 (n=7) | -0.48 (n=6) | insufficient (n=5) |
| Meta | Consolidated revenue | -0.45 (n=8) | -0.24 (n=8) | +0.65 (n=8) | +0.71 (n=8) | +0.73 (n=7) |

These are **exploratory descriptive correlations only**, not statistically reliable estimates or forecasts. The sample sizes are only 6–8 observations; 2023 CAPEX values are rounded and awaiting primary-filing cross-check; 2024–2026 CAPEX values are also rounded in the source compilation; Amazon has missing Q4 CAPEX observations in 2024 and 2025; and the business metrics are not AI-only. Microsoft Intelligent Cloud includes server/enterprise activity, while Meta consolidated revenue is largely driven by its core apps and advertising business. The changing sign and magnitude across companies and lags do not support a single universal CAPEX-to-revenue timing rule.

Do not use these correlations as dashboard buy/sell signals. The next analytical work is to validate every 2023 CAPEX filing input, improve business metric consistency, and expand the historical sample before considering any cycle-warning calibration.

## Cycle signal
Initial transparent rules:
- Accelerating: CAPEX YoY >= 25% and YoY growth acceleration >= +10 percentage points.
- Decelerating: CAPEX YoY < 0% or YoY growth acceleration <= -10 percentage points.
- Steady: sufficient data, neither condition.
- Insufficient data: no same-quarter-prior-year CAPEX or prior YoY comparison.

These are review flags, not forecasts. Thresholds are configurable and must be reviewed against history before being used as alerts.

## Data contract
Each company-quarter record:
- company, ticker, fiscalQuarter, fiscalYearEnd
- capexUsdM, capexScope (company_total | explicitly_ai_only), capexDefinition
- aiMetricValueUsdM (nullable), aiMetricName, aiMetricBasis (quarterly_revenue | annualized_run_rate | bookings | growth_rate | other)
- currency, sourceName, sourceUrl, sourcePublishedAt, retrievedAt
- reported | estimated, confidence, notes

The calculation module in `src/ai-investment-cycle/metrics.mjs` accepts normalized company-quarter records with `company`, `quarter`, `capexUsdM`, and nullable `aiRevenueUsdM`; it also calculates adjusted-close market return against an aligned benchmark series. It intentionally does not fetch or invent source data.

## Data source hierarchy
1. Company quarterly earnings releases and investor-relations materials.
2. SEC 10-Q / 10-K filings (including cash-flow statement purchases of property and equipment).
3. Earnings-call transcripts only for supplementary AI business metrics; retain exact wording and basis.
4. Third-party estimates only in a separately labelled estimate layer with provider, date, methodology, and confidence.

CAPEX definition differences must be documented. Where the filing reports “purchases of property and equipment” in cash flow, reconcile it to management's stated CAPEX definition; do not assume every company uses an identical definition.

## Historical CAPEX dataset — calendar 2024-Q1 to 2026-Q3

The 15-quarter dataset is stored in `data/ai-investment-cycle/hyperscaler-capex-quarterly-2023-2026.json`. It now covers 2023-Q1 through 2026-Q3 for Microsoft, Alphabet, Amazon and Meta, aligned to calendar quarters. The 2023 observations were originally sourced from a dated SEC Companyfacts/filing compilation and retain SEC accession IDs; they are rounded to USD 0.01B. All 16 company-quarter observations (four companies × four quarters) were independently cross-checked against primary issuer quarterly/annual filings or official investor-relations cash-flow statements on 2026-10-31. Each 2023 row now carries `primarySourceAudit: verified_2026-10-31` and `primarySourceUrls`, while preserving the original compiler provenance and direct/cumulative-difference method. The audit trail and exact quarter calculations are in `docs/ai-investment-cycle-capex-source-audit-2023.md`. 2024-Q1 onward retains the earlier source compilation and its USD 0.1B precision in most observations.

This uses one consistent cash-flow line item: **cash purchases of PP&E (gross)**. It is intentionally narrower than some management CAPEX definitions that include finance-lease principal. It is also company-wide investment, not AI-only CAPEX.

Source compilation for 2024-Q1 onward: [tradmap — Big Tech Capital Expenditures](https://tradmap.com/stats/big-tech-capex), updated 2026-10-30, which attributes its quarterly figures to SEC EDGAR/XBRL cash-flow statements. Most observations are rounded to USD 0.1B. The 2023-Q1 through 2023-Q4 extension uses [AhaSignals' dated cash-capex history](https://ahasignals.com/capital-spending-cash-coverage/history/2023-12-31/), a SEC Companyfacts/filing compilation published as a 2026-09-08 v1.0.0 snapshot; the accession IDs and direct-vs-cumulative-difference method are retained on each observation. This extension is provisional until independently checked against each underlying SEC filing. Amazon Q3 2026 is taken from its earnings-release cash-flow statement: gross PP&E purchases USD 77.259B; proceeds and incentives USD 1.381B. Alphabet Q3 2026 cash PP&E purchases are USD 51.355B. Microsoft Q3 2026 cash PP&E purchases are USD 39.4B, distinct from management CAPEX including leases of USD 45.2B. Meta Q3 2026 is approximately USD 33.9B on the cash PP&E series, distinct from lease-inclusive management CAPEX.

The four-company Q3 2026 gross cash PP&E total is approximately USD 201.96B. This is a common cash-flow metric, not a claim that every company's broader management CAPEX definition is identical. The dataset preserves missing Amazon Q4 observations as missing; it does not interpolate or treat them as zero.

### First trend observations

- The four-company cash PP&E series rose from approximately USD 44.3B in 2024-Q1 to USD 201.96B in 2026-Q3.
- This is a steep increase in reported infrastructure and other PP&E cash spending, but not proof that all spending is AI-related.
- The historical dataset now has 15 calendar quarters. It supports YoY CAPEX growth calculations from 2024-Q1 where the exact prior-year observation exists, but the older 2023 source vintage has a different precision and still needs primary-filing validation. This history is not enough to treat cycle-warning thresholds as statistically calibrated.
- Company-specific lines and a combined series should both be displayed. Aggregate quarters with missing company data must show coverage and must not be presented as a full-universe total.

### Business performance data remains separate

For Q3 2026, Google Cloud revenue (USD 30.709B, +103% YoY) and AWS revenue (USD 46.0B, +39.3% YoY) are stored as broad cloud-segment indicators, not AI-only revenue. Microsoft's Agents and Infra segment is similarly not pure AI revenue. These should appear in a separate operating-indicator panel with explicit labels; they must not be divided by CAPEX and presented as an AI investment ROI.

Sources for the Q3 2026 disclosures:
- [Amazon Q3 2026 earnings release](https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Third-Quarter-Results/default.aspx)
- [Alphabet Q3 2026 earnings release / SEC filing](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm)
- [Microsoft FY2027 Q1 earnings release](https://www.microsoft.com/en-us/Investor/earnings/FY-2027-Q1/press-release-webcast)
- [Meta Q3 2026 earnings release](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/default.aspx)

## Historical AWS operating-performance series\n\nThe file `data/ai-investment-cycle/business-performance-aws-quarterly-2023-2026.json` adds 12 consecutive calendar quarters of AWS segment revenue and operating income, from 2023-Q4 through 2026-Q3. Parallel files provide 12-quarter histories for Google Cloud, Microsoft Intelligent Cloud, and Meta consolidated results. Values are in USD millions and were transcribed from Amazon's quarterly earnings-release supplemental financial information. The metric is stable AWS segment revenue; operating income is retained as a profitability companion. This is a combined AI-and-core-cloud measure and must not be labelled AI revenue or AI profit.\n\nThe AWS source releases are [Amazon Q3 2024](https://ir.aboutamazon.com/news-release/news-release-details/2024/Amazon-com-Announces-Third-Quarter-Results/), [Amazon Q1 2025](https://ir.aboutamazon.com/news-release/news-release-details/2025/Amazon-com-Announces-First-Quarter-Results/default.aspx), [Amazon Q3 2025](https://ir.aboutamazon.com/news-release/news-release-details/2025/Amazon-com-Announces-Third-Quarter-Results/), and [Amazon Q3 2026](https://ir.aboutamazon.com/news-release/news-release-details/2026/Amazon-com-Announces-Third-Quarter-Results/default.aspx). The Google Cloud series is sourced from Alphabet's quarterly earnings exhibits: [Q1 2024](https://www.sec.gov/Archives/edgar/data/1652044/000165204424000047/googexhibit991q12024.htm), [Q4 2024](https://www.sec.gov/Archives/edgar/data/1652044/000165204425000010/googexhibit991q42024.htm), [Q1 2025](https://www.sec.gov/Archives/edgar/data/1652044/000165204425000040/googexhibit991q12025.htm), [Q3 2025](https://www.sec.gov/Archives/edgar/data/1652044/000165204425000087/googexhibit991q32025.htm), [Q4 2025](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000012/googexhibit991q42025.htm), [Q1 2026](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000043/googexhibit991q12026.htm), [Q2 2026](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000066/googexhibit991q22026.htm), and [Q3 2026](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm); Q2 2024 and Q2 2025 use Alphabet's official earnings-release PDFs.\n\n`deriveQuarterlyBusinessSeries()` in `src/ai-investment-cycle/business-performance.mjs` calculates YoY growth only when the exact prior-year quarter exists, plus same-period segment operating margin. It rejects duplicate quarters and records without HTTPS provenance. Missing quarters are not interpolated.\n\n## Q3 2026 business performance snapshot

The separately stored `data/ai-investment-cycle/business-performance-q3-2026.json` adds reported cloud and AI-adjacent business indicators. It deliberately keeps directly disclosed AI revenue separate from broad cloud-segment revenue and operational proxies.

| Company | Reported Q3 2026 indicator | YoY | Profitability / caveat |
|---|---|---:|---|
| Alphabet | Google Cloud revenue USD 30.709B | +103% | Cloud operating income USD 11.121B; 36.2% segment margin versus 23.7% a year earlier. Includes AI infrastructure/solutions and core GCP. |
| Amazon | AWS revenue USD 46.0B | +39.3% | AWS operating income USD 17.8B; 38.7% segment margin versus 34.6% a year earlier. Includes AI and core cloud workloads. |
| Microsoft | Azure revenue USD 33.165B | +48% | Azure-only operating income not separately disclosed. |
| Microsoft | Agents and Infra segment revenue USD 76.795B | +25% | Segment operating income USD 40.558B; 52.8% margin. FY2027 recast segment, not AI-only. |
| Meta | Ad impressions +10%; average price per ad +14% | reported | Management says AI contributes to improved engagement, recommendations and monetization, but does not quantify AI-attributable revenue. |
| Meta | Company revenue USD 64.601B | +26% | GAAP operating income fell 37%, including a USD 9.89B litigation-related charge; the company also provided a non-GAAP-style exclusion illustration. |

Sources:
- Alphabet Q3 2026 earnings release: https://www.sec.gov/Archives/edgar/data/1652044/000165204426000080/googexhibit991q32026.htm
- Amazon Q3 2026 earnings release: https://press.aboutamazon.com/2026/10/amazon-com-announces-third-quarter-results
- Microsoft FY2027 Q1 earnings release: https://www.microsoft.com/en-us/Investor/earnings/FY-2027-Q1/press-release-webcast
- Meta Q3 2026 earnings release: https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/default.aspx

### Interpretation rules

- Direct quarterly AI revenue is null for all four companies in this snapshot: no comparable, separately quantified figure was identified.
- Cloud revenue is an AI-and-core-cloud mixed indicator, not AI revenue.
- Microsoft's Azure revenue and Agents and Infra segment are separate metrics. Do not add them together; the reporting segment was recast for FY2027.
- Meta's ad impressions and price-per-ad growth are operational proxies, not direct revenue attribution.
- Meta's GAAP operating income trend must be annotated with the USD 9.89B litigation charge.
- Operating margin is calculated only where both revenue and operating income belong to the same reported segment and period.

The new `src/ai-investment-cycle/business-performance.mjs` helpers calculate YoY changes and segment operating margins while preserving disclosure labels and null direct-AI-revenue values. They do not estimate AI revenue or attribute broad segment profits to AI.

## Next implementation stages
1. Build source-backed quarterly dataset and company fiscal-calendar mapping.
2. Validate CAPEX figures against filings and calculate a consistent reported series.
3. Add disclosed AI revenue/business metric panel with comparability labels.
4. Add share-price performance panel for operating-results-versus-market-response comparison.
5. Add cycle warning panel with missing-data and definition caveats.
6. Integrate as a separate dashboard section only after isolated tests and source validation.

## Safety boundary
No production Supabase schema, Edge Function, or dashboard UI is changed in this first implementation step. No production data is read or modified.
