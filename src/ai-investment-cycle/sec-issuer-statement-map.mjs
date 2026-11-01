/**
 * Issuer-level source statement review for the six-company monitor.
 *
 * Statement captions and filing links were checked against 2026 Q3 Form 10-Q.
 * XBRL tag names remain candidates until verified against each filing's
 * extracted XBRL instance / Company Facts response. Do not ingest from this
 * metadata alone as an approved mapping.
 */

export const SEC_ISSUER_STATEMENT_MAP = Object.freeze({
  MSFT: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/789019/000119312526436133/msft-20260930.htm",
    revenue: {
      statementCaption: "Total revenue",
      scope: "consolidated",
      xbrlTagCandidate: "RevenueFromContractWithCustomerExcludingAssessedTax",
      status: "statement_reviewed_tag_unverified",
    },
    capex: {
      statementCaption: "Additions to property and equipment",
      statement: "Consolidated cash flows",
      xbrlTagCandidate: "PaymentsToAcquirePropertyPlantAndEquipment",
      definition: "cash additions to property and equipment",
      status: "statement_reviewed_tag_unverified",
    },
  },
  GOOGL: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1652044/000165204426000084/goog-20260930.htm",
    revenue: {
      statementCaption: "Total revenues",
      scope: "consolidated",
      xbrlTagCandidate: "RevenueFromContractWithCustomerExcludingAssessedTax",
      status: "statement_reviewed_tag_unverified",
    },
    capex: {
      statementCaption: "Purchases of property and equipment",
      statement: "Consolidated cash flows",
      xbrlTagCandidate: "PaymentsToAcquirePropertyPlantAndEquipment",
      definition: "gross cash purchases of property and equipment; finance lease additions excluded from this cash-flow line",
      status: "statement_reviewed_tag_unverified",
    },
  },
  AMZN: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1018724/000101872426000040/amzn-20260930.htm",
    revenue: {
      statementCaption: "Total net sales",
      scope: "consolidated",
      xbrlTagCandidate: "SalesRevenueNet",
      status: "statement_reviewed_tag_unverified",
    },
    capex: {
      statementCaption: "Purchases of property and equipment",
      statement: "Consolidated cash flows",
      xbrlTagCandidate: "PaymentsToAcquirePropertyPlantAndEquipment",
      definition: "gross cash purchases; proceeds from property and equipment sales and incentives are reported separately",
      status: "statement_reviewed_tag_unverified",
    },
    comparabilityNote: "Do not substitute the non-GAAP cash capital expenditures narrative or net PP&E additions including finance leases for gross cash purchases.",
  },
  META: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1326801/000162828026066773/meta-20260930.htm",
    revenue: {
      statementCaption: "Total revenue",
      scope: "consolidated",
      xbrlTagCandidate: "RevenueFromContractWithCustomerExcludingAssessedTax",
      status: "statement_reviewed_tag_unverified",
    },
    capex: {
      statementCaption: "Purchases of property and equipment",
      statement: "Condensed consolidated cash flows",
      xbrlTagCandidate: "PaymentsToAcquirePropertyPlantAndEquipment",
      definition: "gross cash purchases of property and equipment; finance lease principal payments are excluded",
      status: "statement_reviewed_tag_unverified",
    },
    comparabilityNote: "Do not substitute the earnings-release capital expenditures figure including finance lease principal payments.",
  },
  TSLA: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1318605/000162828026066775/tsla-20260930.htm",
    revenue: {
      statementCaption: "Total revenues",
      scope: "consolidated",
      xbrlTagCandidate: "RevenueFromContractWithCustomerExcludingAssessedTax",
      status: "statement_reviewed_tag_unverified",
    },
    capex: {
      statementCaption: "Purchases of property and equipment excluding finance leases, net of sales",
      statement: "Consolidated cash flows",
      xbrlTagCandidate: "PaymentsToAcquirePropertyPlantAndEquipment",
      definition: "cash purchases excluding finance leases, net of sales",
      status: "statement_reviewed_tag_unverified",
    },
    comparabilityNote: "Tesla's reported cash-flow measure is net of sales and excludes finance leases; do not rank directly against gross-purchase measures without a qualification.",
  },
  SPCX: {
    filingPeriod: "2026-Q3",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1181412/000162828026066880/spcx-20260930.htm",
    revenue: {
      statementCaption: "Revenue",
      scope: "consolidated",
      xbrlTagCandidate: null,
      status: "custom_taxonomy_or_companyfacts_tag_verification_required",
    },
    capex: {
      statementCaption: "Purchases of property, plant, and equipment",
      statement: "Consolidated cash flows",
      xbrlTagCandidate: null,
      definition: "gross cash purchases of property, plant and equipment",
      status: "custom_taxonomy_or_companyfacts_tag_verification_required",
    },
    comparabilityNote: "SpaceX's 2026 Q3 filing provides consolidated revenue and nine-month PP&E cash purchases. Confirm custom XBRL namespace/tag and retrieve Q2 cumulative cash-flow comparator before deriving standalone Q3 CAPEX.",
  },
});

export const SEC_STATEMENT_REVIEW_STATUS = "statement_reviewed_xbrl_tags_pending";
