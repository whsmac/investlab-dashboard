# Ledger dividend accounting

## Decision

Represent dividends as a distinct `DIVIDEND` ledger transaction. Do not record them as a generic cash deposit: that would make dividend income impossible to distinguish from newly contributed capital.

## Fields

- `transaction_type`: `DIVIDEND`
- `transaction_date`: date the cash was credited to the brokerage account
- `sequence_no`: unique ordering number within that date
- `symbol`: uppercase ticker that paid the dividend
- `currency`: currency actually credited (USD or KRW)
- `gross_amount`: dividend before withholding tax
- `withholding_tax`: withholding tax deducted from the dividend
- `fees`: separately identified dividend-related fees, if any
- `note`: optional broker statement / distribution details

Net cash received is:

`gross_amount - withholding_tax - fees`

The database and calculation engine reject negative amounts, withholding tax greater than gross dividend, or tax plus fees greater than gross dividend. For ordinary dividends with no separate fee, fees is zero.

## Accounting behavior

1. Increase cash in the transaction currency by the net dividend amount.
2. Add gross dividend to dividend income.
3. Track withholding tax separately from fees.
4. Do not change share quantity, average cost, cost basis, or realized capital gain.
5. Reinvesting a dividend is two separate entries: `DIVIDEND` followed by `BUY`.
6. Recalculate all derived balances by replaying the ledger after any edit or deletion.

## Example

For a USD 100 gross dividend, USD 15 withholding tax, and USD 0 fees:
- Gross dividend income: USD 100
- Withholding tax: USD 15
- Net dividend cash: USD 85

The schema migration is staged on `feature/unified-ledger-schema`; it has not been applied to Supabase, and the dashboard does not yet write dividend transactions.
