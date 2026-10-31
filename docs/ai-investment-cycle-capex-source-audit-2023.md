# 2023 CAPEX primary-filing audit — initial pass

Audit date: 2026-10-31  
Scope: 2023-Q1 cash purchases/additions of property and equipment for Microsoft, Alphabet, Amazon, and Meta.  
Status: **Q1 primary-source checks complete; Q2–Q4 remain pending.** This is an audit record only. The historical CAPEX dataset has not been changed.

## Method

- Compare the stored quarterly observation with the issuer's primary quarterly filing or earnings-release cash-flow statement.
- Use gross cash purchases/additions of property and equipment, not net purchases after proceeds, and exclude finance-lease additions/repayments.
- Preserve the dataset's rounded display precision (USD 0.01B). Differences below that precision are not corrections.
- Do not equate company-wide PP&E cash spending with AI-only CAPEX.

## Q1 2023 results

| Company | Stored value (USD M) | Primary filing value (USD M) | Primary source | Result |
|---|---:|---:|---|---|
| Microsoft | 6,610 | 6,607 | [FY23 Q3 earnings release — cash flows](https://www.microsoft.com/en-us/investor/earnings/fy-2023-q3/press-release-webcast) | Matches at stored precision |
| Alphabet | 6,290 | 6,289 | [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1652044/000165204423000045/goog-20230331.htm) | Matches at stored precision |
| Amazon | 14,210 | 14,207 | [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1018724/000101872423000008/amzn-20230331.htm) | Matches at stored precision |
| Meta | 6,840 | 6,842 | [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1326801/000132680123000067/meta-20230331.htm) | Matches at stored precision |

All four values agree with their primary-source gross cash PP&E line after rounding to the dataset's nearest USD 10 million. No Q1 value change is warranted.

### Source-definition observations

- Microsoft labels the cash-flow line **“Additions to property and equipment”**; Q1 2023 reports USD 6,607M.
- Alphabet, Amazon, and Meta label the cash-flow line **“Purchases of property and equipment”**; Q1 2023 reports USD 6,289M, USD 14,207M, and USD 6,842M respectively.
- Amazon separately reports proceeds from property/equipment sales and incentives. The stored series uses gross purchases (USD 14,207M), not the net-of-proceeds free-cash-flow deduction.
- Meta likewise reports purchases (USD 6,842M) and proceeds relating to PP&E (USD 19M) separately. The stored series uses gross purchases.

The labels are close enough for a common *gross cash PP&E purchases/additions* analytical series, but the underlying reported label and company must remain available. This does not establish that management-defined CAPEX is identical across issuers.

## Remaining audit work

The following 12 observations still require independent primary-filing verification:

- 2023-Q2: Microsoft, Alphabet, Amazon, Meta
- 2023-Q3: Microsoft, Alphabet, Amazon, Meta
- 2023-Q4: Microsoft, Alphabet, Amazon, Meta

For cumulative cash-flow statements, calculate standalone quarters only as the difference between the current year-to-date amount and the preceding year-to-date amount for the same issuer and same cash-flow line. For annual statements, reconcile the Q4 residual against the annual amount. Retain both source accessions and the derivation formula.

Do not promote the 2023 historical series to production-ready until all 16 company-quarter observations have passed primary-source checks and the Amazon concept/line-item continuity has been reviewed against the 2024–2026 series.

## References

- Microsoft FY23 Q3 cash-flow statement: https://www.microsoft.com/en-us/investor/earnings/fy-2023-q3/press-release-webcast
- Alphabet Q1 2023 Form 10-Q: https://www.sec.gov/Archives/edgar/data/1652044/000165204423000045/goog-20230331.htm
- Amazon Q1 2023 Form 10-Q: https://www.sec.gov/Archives/edgar/data/1018724/000101872423000008/amzn-20230331.htm
- Meta Q1 2023 Form 10-Q: https://www.sec.gov/Archives/edgar/data/1326801/000132680123000067/meta-20230331.htm
