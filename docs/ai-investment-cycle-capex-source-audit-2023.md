# 2023 CAPEX primary-filing audit — completed

Audit date: 2026-10-31  
Scope: 2023-Q1 through 2023-Q4 cash purchases/additions of property and equipment for Microsoft, Alphabet, Amazon, and Meta.  
Status: **All 16 company-quarter observations checked against primary issuer filings or issuer investor-relations cash-flow statements. All match the stored USD 0.01B display precision.** No CAPEX dataset value change is required.

## Method

- Compare the stored quarterly observation with the issuer's primary quarterly filing, annual filing, or official earnings-release cash-flow statement.
- Use gross cash purchases/additions of property and equipment, not net purchases after proceeds, and exclude finance-lease additions/repayments.
- For cumulative statements, derive standalone quarters as the current YTD amount less the immediately preceding YTD amount for the same issuer and same cash-flow line.
- For annual statements, derive Q4 as the annual gross amount less Q1–Q3 gross amounts where a standalone Q4 cash-flow line is not presented.
- Compare after rounding to the dataset's USD 0.01B precision. Small raw differences below that display precision are not corrections.
- Do not equate company-wide PP&E cash spending with AI-only CAPEX.

## Results

All amounts below are USD millions. “Primary-source calculation” is the independently derived standalone-quarter amount; “stored” is the dataset value.

| Quarter | Company | Primary-source calculation | Stored | Result |
|---|---|---:|---:|---|
| 2023-Q1 | Microsoft | 6,607 | 6,610 | Match at USD 0.01B |
| 2023-Q1 | Alphabet | 6,289 | 6,290 | Match at USD 0.01B |
| 2023-Q1 | Amazon | 14,207 | 14,210 | Match at USD 0.01B |
| 2023-Q1 | Meta | 6,842 | 6,840 | Match at USD 0.01B |
| 2023-Q2 | Microsoft | 8,943 | 8,940 | Match at USD 0.01B |
| 2023-Q2 | Alphabet | 6,888 | 6,890 | Match at USD 0.01B |
| 2023-Q2 | Amazon | 11,455 | 11,460 | Match at USD 0.01B |
| 2023-Q2 | Meta | 6,216 | 6,220 | Match at USD 0.01B |
| 2023-Q3 | Microsoft | 9,917 | 9,920 | Match at USD 0.01B |
| 2023-Q3 | Alphabet | 8,055 | 8,050 | Match at USD 0.01B |
| 2023-Q3 | Amazon | 12,479 | 12,480 | Match at USD 0.01B |
| 2023-Q3 | Meta | 6,543 | 6,540 | Match at USD 0.01B |
| 2023-Q4 | Microsoft | 9,735 | 9,730 | Match at USD 0.01B |
| 2023-Q4 | Alphabet | 11,019 | 11,020 | Match at USD 0.01B |
| 2023-Q4 | Amazon | 14,588 | 14,590 | Match at USD 0.01B |
| 2023-Q4 | Meta | 7,665 | 7,670 | Match at USD 0.01B |

## Calculation trail and primary sources

### Microsoft

- Q1 2023: USD 6,607M reported for the three months ended March 31, 2023.
- Q2 2023: FY2023 annual additions USD 28,107M less nine-month additions USD 19,164M = USD 8,943M.
- Q3 2023: USD 9,917M reported for the three months ended September 30, 2023.
- Q4 2023: USD 9,735M reported for the three months ended December 31, 2023.

Primary sources:
- [FY2023 Q3 cash flows (three and nine months ended March 31)](https://www.microsoft.com/en-us/Investor/earnings/FY-2023-Q3/cash-flows)
- [FY2023 Q4 cash flows (year ended June 30)](https://www.microsoft.com/en-us/investor/earnings/fy-2023-q4/cash-flows)
- [FY2024 Q1 cash flows (three months ended September 30)](https://www.microsoft.com/en-us/investor/earnings/fy-2024-q1/cash-flows)
- [FY2024 Q2 cash flows (three and six months ended December 31)](https://www.microsoft.com/en-us/investor/earnings/fy-2024-q2/cash-flows)

### Alphabet

- Q1: USD 6,289M directly reported.
- Q2: six-month USD 13,177M less Q1 USD 6,289M = USD 6,888M.
- Q3: nine-month USD 21,232M less six-month USD 13,177M = USD 8,055M.
- Q4: annual USD 32,251M less nine-month USD 21,232M = USD 11,019M.

Primary sources:
- [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1652044/000165204423000045/goog-20230331.htm)
- [2023 Q2 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1652044/000165204423000070/goog-20230630.htm)
- [2023 Q3 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1652044/000165204423000094/goog-20230930.htm)
- [2023 Form 10-K](https://www.sec.gov/Archives/edgar/data/1652044/000165204424000022/goog-20231231.htm)

### Amazon

- Q1: USD 14,207M directly reported.
- Q2: USD 11,455M directly reported for the three months ended June 30.
- Q3: USD 12,479M directly reported for the three months ended September 30.
- Q4: annual gross purchases USD 52,729M less Q1–Q3 gross purchases (USD 14,207M + USD 11,455M + USD 12,479M = USD 38,141M) = USD 14,588M.

Primary sources:
- [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1018724/000101872423000008/amzn-20230331.htm)
- [2023 Q2 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1018724/000101872423000012/amzn-20230630.htm)
- [2023 Q3 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1018724/000101872423000018/amzn-20230930.htm)
- [2023 Form 10-K](https://www.sec.gov/Archives/edgar/data/1018724/000101872424000008/amzn-20231231.htm)

Amazon definition note: The annual filing's cash-flow statement reports gross purchases of USD 52,729M and proceeds from property/equipment sales and incentives of USD 4,596M. The resulting net figure, USD 48,133M, is the FCF deduction and is not the gross cash-purchases series used here. The quarterly source records likewise use gross purchases. Do not substitute Amazon's USD 48,133M net measure for gross CAPEX.

### Meta

- Q1: USD 6,842M directly reported.
- Q2: six-month USD 13,058M less Q1 USD 6,842M = USD 6,216M.
- Q3: nine-month USD 19,601M less six-month USD 13,058M = USD 6,543M.
- Q4: annual gross purchases USD 27,266M less nine-month gross purchases USD 19,601M = USD 7,665M.

Primary sources:
- [2023 Q1 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1326801/000132680123000067/meta-20230331.htm)
- [2023 Q2 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1326801/000132680123000093/meta-20230630.htm)
- [2023 Q3 Form 10-Q](https://www.sec.gov/Archives/edgar/data/1326801/000132680123000103/meta-20230930.htm)
- [2023 Form 10-K](https://www.sec.gov/Archives/edgar/data/1326801/000132680124000012/meta-20231231.htm)

Meta definition note: The 2023 annual filing reports gross purchases of USD 27,266M and proceeds relating to property and equipment of USD 221M. The net figure USD 27,045M is not the gross series used here.

## Conclusion

All 16 2023 company-quarter observations are consistent with primary issuer source disclosures when rounded to the dataset's USD 0.01B precision. No changes were made to the CAPEX JSON values. The dataset may retain its provisional 2023-source flag as a provenance/vintage note, but the four-company 2023 values have now passed this primary-source cross-check.

This validation confirms the reported gross cash PP&E series only. It does not make these company-wide amounts AI-only CAPEX, does not make the companies' broader management CAPEX definitions identical, and does not establish an AI investment ROI.
