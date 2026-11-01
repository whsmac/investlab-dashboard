/**
 * Converts filing-level SEC facts into standalone fiscal-quarter observations.
 *
 * The caller must supply issuer-reviewed facts. This module never selects
 * between different XBRL concepts and never combines units or tags.
 */

const DAY_MS = 86_400_000;
const QUARTER_MIN_DAYS = 70;
const QUARTER_MAX_DAYS = 110;

function daysBetween(start, end) {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / DAY_MS) + 1;
}

function validObservation(row) {
  return row && typeof row === "object" &&
    typeof row.metric === "string" && typeof row.tag === "string" &&
    typeof row.unit === "string" && Number.isFinite(row.value) &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.start ?? "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.end ?? "") &&
    Number.isInteger(Number(row.fiscalYear)) &&
    ["Q1", "Q2", "Q3", "Q4", "FY"].includes(row.fiscalPeriod) &&
    typeof row.filed === "string" && typeof row.accession === "string";
}

function latestVersion(rows) {
  return [...rows].sort((a, b) =>
    String(a.filed).localeCompare(String(b.filed)) ||
    String(a.accession).localeCompare(String(b.accession))
  ).at(-1);
}

function periodKey(row) {
  return [row.metric, row.tag, row.unit, row.fiscalYear, row.start, row.end].join("|");
}

function quarterFromFiscalPeriod(fp) {
  return fp === "FY" ? "Q4" : fp;
}

/**
 * Normalize one issuer's observations for a single reviewed XBRL concept.
 * Returns standalone quarters only. Cash CAPEX is displayed as a positive
 * spend while raw signed filing values remain in sourceObservations.
 */
export function normalizeStandaloneQuarters(observations, options = {}) {
  if (!Array.isArray(observations)) throw new TypeError("observations must be an array");
  const metric = options.metric;
  if (!["revenue", "capex"].includes(metric)) throw new TypeError("metric must be revenue or capex");
  const tag = options.tag;
  if (typeof tag !== "string" || !tag.trim()) throw new TypeError("an issuer-reviewed XBRL tag is required");
  const unit = options.unit;
  if (typeof unit !== "string" || !unit.trim()) throw new TypeError("an explicit source unit is required");

  const rows = observations.filter(row => validObservation(row) && row.metric === metric && row.tag === tag && row.unit === unit);
  const selected = new Map();
  for (const row of rows) {
    const key = periodKey(row);
    const current = selected.get(key);
    selected.set(key, current ? latestVersion([current, row]) : row);
  }

  const groups = new Map();
  for (const row of selected.values()) {
    const key = [row.tag, row.unit, row.fiscalYear, row.start].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const output = [];
  for (const group of groups.values()) {
      const sorted = [...group].sort((a, b) => a.end.localeCompare(b.end));

    for (const row of sorted) {
      const days = daysBetween(row.start, row.end);
      if (days === null) continue;
      const fp = quarterFromFiscalPeriod(row.fiscalPeriod);
      let rawQuarterValue;
      let derivation;
      let sourceRows;
      let normalizedPeriodStart;

      if (days >= QUARTER_MIN_DAYS && days <= QUARTER_MAX_DAYS && row.fiscalPeriod !== "FY") {
        rawQuarterValue = row.value;
        derivation = "reported-quarter";
        sourceRows = [row];
        normalizedPeriodStart = row.start;
      } else {
        const expectedPriorPeriod = fp === "Q2" ? "Q1" : fp === "Q3" ? "Q2" : fp === "Q4" ? "Q3" : null;
        if (!expectedPriorPeriod) continue;

        const prior = sorted.find(candidate =>
          candidate.fiscalPeriod === expectedPriorPeriod &&
          candidate.start === row.start &&
          candidate.end < row.end &&
          (candidate.fiscalPeriod === "Q1" || candidate.fiscalPeriod === "Q2" || candidate.fiscalPeriod === "Q3")
        );
        if (!prior) continue;

        const priorDays = daysBetween(prior.start, prior.end);
        const isCumulativeCurrent = days > QUARTER_MAX_DAYS;
        const priorIsExpected = priorDays !== null && priorDays >= QUARTER_MIN_DAYS;
        if (!isCumulativeCurrent || !priorIsExpected) continue;

        rawQuarterValue = row.value - prior.value;
        derivation = fp === "Q4" ? "annual-less-nine-months" : "ytd-delta";
        sourceRows = [row, prior];
        normalizedPeriodStart = new Date(Date.parse(`${prior.end}T00:00:00Z`) + DAY_MS)
          .toISOString().slice(0, 10);
      }

      if (!Number.isFinite(rawQuarterValue) || !normalizedPeriodStart) continue;
      const normalizedValue = metric === "capex" ? Math.abs(rawQuarterValue) : rawQuarterValue;
      if (normalizedValue < 0) continue;

      output.push({
        metric,
        tag: row.tag,
        unit: row.unit,
        fiscalYear: Number(row.fiscalYear),
        fiscalPeriod: fp,
        quarterLabel: `FY${row.fiscalYear} ${fp}`,
        periodStart: normalizedPeriodStart,
        periodEnd: row.end,
        rawValue: rawQuarterValue,
        value: normalizedValue,
        derivation,
        sourceObservations: sourceRows.map(source => ({
          value: source.value,
          start: source.start,
          end: source.end,
          form: source.form,
          filed: source.filed,
          accession: source.accession,
          sourceUrl: source.sourceUrl,
        })),
      });
    }
  }

  const preferred = new Map();
  for (const row of output) {
    const key = `${row.fiscalYear}|${row.fiscalPeriod}`;
    const current = preferred.get(key);
    if (!current || (row.derivation === "reported-quarter" && current.derivation !== "reported-quarter")) {
      preferred.set(key, row);
    }
  }
  return [...preferred.values()].sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd) || a.quarterLabel.localeCompare(b.quarterLabel)
  );
}
