# AI investment cycle analysis preview

Updated: 2026-10-31

## Scope

The isolated page `ai-investment-cycle-preview.html` is a development preview for the AI investment-cycle analysis module. It is intentionally not linked from `index.html` and does not modify or replace the existing portfolio dashboard.

## Displayed sections

1. Hyperscaler company-wide gross cash PP&E purchases/additions by calendar quarter for Microsoft, Alphabet, Amazon, and Meta.
2. Company-selected CAPEX year-over-year growth and a descriptive consecutive growth-deceleration observation.
3. Company-selected reported business-segment or consolidated revenue history, with same-series YoY growth and operating margin where the source provides both revenue and operating income.
4. A compact per-company latest-observation table.
5. A separate shareholder total-return panel that remains unavailable until a complete, appropriately licensed adjusted-price dataset is imported.

## Data and interpretation rules

- CAPEX is gross cash purchases/additions of PP&E for the whole company. It is not AI-only CAPEX.
- AWS, Google Cloud, and Microsoft Intelligent Cloud contain AI and non-AI business. Meta history is consolidated company revenue and operating income. These metrics have different scopes and must not be ranked as though they were comparable AI-only results.
- Direct quarterly AI revenue remains unavailable when the issuer has not separately disclosed a comparable value.
- No AI CAPEX ROI is calculated from segment revenue or stock returns.
- The market-return panel is explicitly marked unavailable. It does not use fabricated or synthetic stock-price history.
- CAPEX growth deceleration is a descriptive observation, not proof of falling CAPEX or an investment-cycle turning point.
- No buy/sell signal or predictive warning is displayed.

## Run locally

From the repository root, start a static server, for example:

```bash
python3 -m http.server 8000
```

Open:

`http://localhost:8000/ai-investment-cycle-preview.html`

The page fetches only the checked-in JSON history files and imports local calculation modules. It does not call an external price API, Supabase, or any vendor service.

## Production boundary

- `index.html` is unchanged.
- No production UI navigation or dashboard integration is added.
- No Supabase schema, Edge Function, production database, credentials, or holdings are changed.
- The preview is for layout and data-presentation review only. Production integration requires separate review and explicit approval.
