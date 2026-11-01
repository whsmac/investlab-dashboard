/**
 * SEC Company Facts adapter for server-side use only.
 *
 * This module deliberately preserves filing-level facts. It does not guess
 * fiscal-quarter values, convert YTD cash-flow facts, or normalize CAPEX signs.
 * Those transformations require issuer-specific, reviewed mapping rules.
 */

export const SEC_COMPANIES = Object.freeze({
  MSFT: { company: "Microsoft", cik: "0000789019" },
  GOOGL: { company: "Alphabet", cik: "0001652044" },
  AMZN: { company: "Amazon", cik: "0001018724" },
  META: { company: "Meta Platforms", cik: "0001326801" },
  TSLA: { company: "Tesla", cik: "0001318605" },
  SPCX: { company: "SpaceX", cik: "0001181412", listedFrom: "2026-06-12" },
});


/**
 * Per-issuer discovery map. These tags remain candidates until validated
 * against each issuer's latest SEC filing and cash-flow/income statement.
 * In particular, Amazon's productive-assets cash-flow concept is broader
 * than PP&E-only CAPEX and must carry a comparability warning.
 */
export const SEC_ISSUER_FACT_CANDIDATES = Object.freeze({
  MSFT: { revenue: "RevenueFromContractWithCustomerExcludingAssessedTax", capex: "PaymentsToAcquirePropertyPlantAndEquipment", status: "pending_filing_validation" },
  GOOGL: { revenue: "RevenueFromContractWithCustomerExcludingAssessedTax", capex: "PaymentsToAcquirePropertyPlantAndEquipment", status: "pending_filing_validation" },
  AMZN: { revenue: "SalesRevenueNet", capex: "PaymentsToAcquirePropertyPlantAndEquipment", status: "statement_reviewed_tag_unverified", capexDefinition: "gross_cash_purchases_excluding_separately_reported_proceeds" },
  META: { revenue: "RevenueFromContractWithCustomerExcludingAssessedTax", capex: "PaymentsToAcquirePropertyPlantAndEquipment", status: "statement_reviewed_tag_unverified" },
  TSLA: { revenue: "RevenueFromContractWithCustomerExcludingAssessedTax", capex: "PaymentsToAcquirePropertyPlantAndEquipment", status: "pending_filing_validation" },
  SPCX: { revenue: null, capex: null, status: "filing_mapping_required" },
});

export const SEC_FACT_CANDIDATES = Object.freeze({
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "SalesRevenueNet",
    "Revenues",
  ],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
  ],
});

const ALLOWED_FORMS = new Set(["10-Q", "10-K", "10-Q/A", "10-K/A"]);

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""));
}

function durationDays(start, end) {
  if (!validDate(start) || !validDate(end)) return null;
  const from = Date.parse(start + "T00:00:00Z");
  const to = Date.parse(end + "T00:00:00Z");
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / 86400000) + 1;
}

/**
 * Fetch one SEC Company Facts document. Call from Node/server-side only.
 * SEC's data.sec.gov API does not support browser CORS.
 */
export async function fetchSecCompanyFacts(cik, options = {}) {
  const normalizedCik = String(cik ?? "").replace(/\D/g, "").padStart(10, "0");
  if (!/^\d{10}$/.test(normalizedCik)) throw new TypeError("A valid 10-digit SEC CIK is required");
  const userAgent = String(options.userAgent ?? "").trim();
  if (!userAgent || !/\S+\s+\S+/.test(userAgent)) {
    throw new TypeError("A descriptive SEC User-Agent with contact information is required");
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required");
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${normalizedCik}.json`;
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { "User-Agent": userAgent, "Accept": "application/json" },
  });
  if (!response?.ok) throw new Error(`SEC Company Facts request failed: HTTP ${response?.status ?? "unknown"}`);
  const payload = await response.json();
  if (String(payload?.cik ?? "").padStart(10, "0") !== normalizedCik || !payload?.facts) {
    throw new Error("SEC Company Facts response does not match the requested CIK");
  }
  return payload;
}

/**
 * Extract filing-level observations for a configured set of US-GAAP tags.
 * All original units, dates, form, accession and filing dates are retained.
 * No quarterly/YTD conversion, sign inversion or restatement selection occurs.
 */
export function extractCompanyFactObservations(companyFacts, options = {}) {
  if (!companyFacts || typeof companyFacts !== "object" || !companyFacts.facts?.["us-gaap"]) {
    throw new TypeError("A valid SEC Company Facts us-gaap document is required");
  }
  const tags = options.tags ?? SEC_FACT_CANDIDATES;
  const metricNames = ["revenue", "capex"];
  const output = [];
  for (const metric of metricNames) {
    const candidates = tags[metric];
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new TypeError(`At least one XBRL tag candidate is required for ${metric}`);
    }
    for (const tag of candidates) {
      const fact = companyFacts.facts["us-gaap"][tag];
      if (!fact?.units || typeof fact.units !== "object") continue;
      for (const [unit, observations] of Object.entries(fact.units)) {
        if (!Array.isArray(observations)) continue;
        for (const item of observations) {
          if (!ALLOWED_FORMS.has(item.form) || !validDate(item.end) ||
              !Number.isFinite(Number(item.val)) || !item.accn || !validDate(item.filed)) continue;
          const days = item.start ? durationDays(item.start, item.end) : null;
          output.push({
            metric,
            tag,
            label: fact.label ?? tag,
            unit,
            value: Number(item.val),
            start: item.start ?? null,
            end: item.end,
            durationDays: days,
            form: item.form,
            fiscalYear: item.fy ?? null,
            fiscalPeriod: item.fp ?? null,
            filed: item.filed,
            accession: item.accn,
            frame: item.frame ?? null,
            sourceUrl: `https://www.sec.gov/Archives/edgar/data/${Number(companyFacts.cik)}/${item.accn.replace(/-/g, "")}/`,
          });
        }
      }
    }
  }
  return output.sort((a, b) =>
    a.end.localeCompare(b.end) ||
    a.metric.localeCompare(b.metric) ||
    a.tag.localeCompare(b.tag) ||
    a.filed.localeCompare(b.filed)
  );
}

/**
 * Return all filings for a period, preserving amendments/restatements.
 * The caller must explicitly choose the latest valid accession for current
 * display while retaining the earlier records for audit history.
 */
export function groupFactVersions(observations) {
  if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
  const groups = new Map();
  for (const row of observations) {
    const key = [row.metric, row.tag, row.unit, row.start ?? "instant", row.end].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([periodKey, versions]) => ({
    periodKey,
    versions: [...versions].sort((a, b) =>
      a.filed.localeCompare(b.filed) || a.accession.localeCompare(b.accession)
    ),
  }));
}
