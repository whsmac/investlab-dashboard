# Daily stock-price provider review — 2026-11-01

## Decision (supersedes the automated-provider review)

The user selected manual CSV uploads instead of automated stock-price collection. Do not implement an API provider, scheduled price retrieval, scraping, or provider credentials. Keep the daily-price charts and populate them from user-uploaded CSV observations. The provider screening below is retained only as historical research; it is no longer an implementation gate.

## Manual CSV contract

Use one combined UTF-8 CSV file with exactly these columns, in this order:

```csv
date,ticker,close
2026-10-01,MSFT,521.40
2026-10-01,GOOGL,248.30
2026-10-01,AMZN,228.10
2026-10-01,META,745.20
2026-10-01,TSLA,452.60
2026-10-01,SPCX,185.40
```

The values above are illustrative only. `date` is the US market trading date (`YYYY-MM-DD`); `ticker` is one of MSFT, GOOGL, AMZN, META, TSLA, SPCX; `close` is a positive USD daily adjusted closing price (Adjusted Close), reflecting dividends and stock splits. The file may contain one or more tickers and partial date ranges. Rows for weekends and exchange holidays are omitted. The parser rejects duplicate `(ticker, date)` keys, invalid dates, unsupported tickers, non-positive prices, malformed rows, and SPCX dates before 2026-06-12.

`close` means the provider-supplied adjusted close (Adjusted Close), reflecting dividends and stock splits. The parser and import metadata identify this series as `adjusted-close`; do not mix it with unadjusted official closes. Adjusted Close is the source provider’s adjusted-price field and should not be described as a separately reconstructed total-return index unless its methodology explicitly supports that interpretation. Upload metadata should separately record source name, source URL, retrieval timestamp, and the source's permitted use. Those fields are not repeated in every CSV row.

Monthly uploads are the default operating cadence. A file may contain all six tickers or only the newly available rows for selected tickers. On import, merge by `(ticker, date)`, skip exact duplicates, and require explicit review before replacing an existing observation with a different close. Preserve the original uploaded file and import metadata as an audit record. No user-uploaded data is included in this code change.

The required universe is MSFT, GOOGL, AMZN, META, TSLA, and SPCX. A provider must demonstrate daily historical OHLCV coverage for all six, including SPCX only from its listing date (2026-06-12), API access suitable for unattended server-side retrieval, corporate-action treatment, rate limits, and rights for the intended private-dashboard display and storage.

## Provider screening

| Provider | Free access / coverage | Daily history | Display / storage rights | Current disposition |
|---|---|---|---|---|
| Alpaca Market Data Basic | Free; US stocks and ETFs; requires API authentication. Basic real-time coverage is IEX only | Historical data since 2016; Basic API limits historical access to the latest 15 minutes | Public docs reviewed here do not conclusively establish the exact rights for this specific private cloud dashboard use | Best technical candidate to test, but not approved |
| OHLC.io Free | Free tier limited to seven fixed symbols: AAPL, NVDA, JNJ, PEP, MSFT, SPY, QQQ | Five years, EOD and 15-minute delayed | Personal use only; no commercial display rights | Reject: five of six target issuers are outside the free symbol list |
| StashGamma Free | Free API key; any US-listed symbol is described as supported; 300 requests/hour, 800/day, 4,000/week | Daily OHLCV; up to 15 years | Public API page reviewed does not clearly establish private cloud-dashboard display/storage rights | Potential candidate; rights and SPCX coverage need written/documented confirmation |
| Market Data self-service | Paid/personal plans | Depends on plan | Personal licenses prohibit embedding live or recent data in an app/dashboard; commercial plan required | Reject under free-only constraint |

## Source notes

### Alpaca

Official Market Data API documentation:
https://docs.alpaca.markets/us/v1.1/docs/about-market-data-api

The Basic plan is free, covers US stocks and ETFs, has historical data since 2016, and exposes IEX as its real-time equity feed. The documented Basic historical API limitation is the latest 15 minutes. Historical and real-time market-data endpoints require authentication. This is technically promising for a daily historical series, but coverage for SPCX must be checked by an actual symbol query and the license terms for the intended dashboard deployment must be confirmed before approval.

### OHLC.io

Official pricing:
https://ohlc.io/pricing

The free plan covers only seven predefined tickers and five years of EOD / 15-minute delayed data. It is personal-use only and has no commercial display rights. Its fixed free symbol list cannot supply the six-company universe.

### StashGamma

Official API documentation:
https://www.stashgamma.com/developer-docs

The documented free tier provides API-key access, daily OHLCV bars, up to 15 years of history, and generous request quotas. It states that it supports any US-listed symbol. However, the reviewed documentation does not clearly grant rights for automated cloud retention and dashboard display, nor does it prove SPCX is available. Do not use it until both are confirmed from its applicable terms/provider.

### Market Data

Official redistribution policy:
https://www.marketdata.app/docs/account/data-policies/data-redistribution/

Its self-service plans are personal-use licenses and prohibit embedding live or recent data in an app/dashboard. Commercial display requires a commercial plan, so this does not meet the free-only requirement.

## Implementation requirements after provider approval

1. Validate each of the six symbols individually, including SPCX, and record first available trading date.
2. Use the user-confirmed Adjusted Close field; record its dividend and split adjustment basis explicitly.
3. Persist source, retrieval timestamp, market date, OHLCV, currency, adjustment basis, and provider response metadata.
4. Handle weekends, exchange holidays, missing sessions, duplicates, corrections, and rate-limit responses.
5. Cache daily responses and avoid unnecessary repeated history downloads.
6. Keep SPCX history bounded to 2026-06-12 onward; do not fabricate pre-listing prices.
7. Add fixture-based tests for split handling, missing days, duplicate dates, stale data, and symbol-specific coverage.
8. Do not enable unattended ingestion until provider rights and all six symbol coverage are confirmed.

## Current status

- SEC financial source work remains independent from this stock-price provider decision.
- No provider credentials have been requested, stored, or committed.
- No market data has been fetched or loaded into the application.
- The user's free-public-data requirement remains controlling.

## Current implementation status

- Added a parser for the combined `date,ticker,close` format with Adjusted Close values and unit tests for parsing, sorting, partial coverage, duplicate detection, numeric validation, and the SPCX listing boundary.
- This parser is a validation layer only. Persistent storage, upload UI, import history, merge/replacement workflow, and chart integration remain future work.
- No automatic price collection or provider API is enabled.
