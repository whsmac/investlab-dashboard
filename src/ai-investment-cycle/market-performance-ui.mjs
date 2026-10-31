import { parseAdjustedPriceCsv } from "./market-data-csv.mjs";
import { validateMarketPriceBundle } from "./market-data-bundle.mjs";
import { deriveCompoundedMarketReturns, deriveCapexMarketLinkage } from "./market-cycle-analysis.mjs";

const MARKET_UNIVERSE = [
  { ticker: "MSFT", company: "Microsoft", color: "#83aaff" },
  { ticker: "GOOGL", company: "Alphabet", color: "#58c7d8" },
  { ticker: "AMZN", company: "Amazon", color: "#f1c66d" },
  { ticker: "META", company: "Meta", color: "#bd9aff" },
  { ticker: "SPY", company: "S&P 500 proxy (SPY)", color: "#d5deed" },
];

const QUARTERS = [
  "2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4",
  "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4",
  "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4",
  "2026-Q1", "2026-Q2", "2026-Q3",
];

const latest = rows => rows.length ? rows[rows.length - 1] : null;
const finite = value => Number.isFinite(value);
const pct = value => finite(value) ? (value > 0 ? "+" : "") + value.toFixed(1) + "%" : "—";

function makeLegend(element, series) {
  element.innerHTML = series.map(item =>
    '<span><i style="background:' + item.color + '"></i>' + item.label + '</span>'
  ).join("");
}

function renderResults({ $, svgLineChart, fmtPct, companySeries, bundle }) {
  const quarterly = bundle.quarterlyPerformance;
  const compounded = quarterly.map(item => ({
    ticker: item.ticker,
    results: deriveCompoundedMarketReturns(item.results),
  }));
  const marketSeries = MARKET_UNIVERSE.filter(item => item.ticker !== "SPY").map(meta => {
    const rows = quarterly.find(item => item.ticker === meta.ticker)?.results ?? [];
    return {
      label: meta.ticker,
      color: meta.color,
      values: rows.map(row => ({ quarter: row.quarter, value: row.companyReturnPercent })),
    };
  });
  const spyRows = quarterly[0]?.results ?? [];
  marketSeries.push({
    label: "SPY",
    color: "#d5deed",
    values: spyRows.map(row => ({ quarter: row.quarter, value: row.benchmarkReturnPercent })),
  });
  $("marketQuarterlyChart").innerHTML = svgLineChart(marketSeries, {
    percent: true,
    aria: "기업별 분기 주주 총수익률과 S&P 500 proxy SPY 수익률",
  });
  makeLegend($("marketQuarterlyLegend"), marketSeries);

  const trailingSeries = compounded.map(item => {
    const meta = MARKET_UNIVERSE.find(symbol => symbol.ticker === item.ticker);
    return {
      label: item.ticker,
      color: meta.color,
      values: item.results.map(row => ({
        quarter: row.quarter,
        value: row.trailingFourQuarterCompanyReturnPercent,
      })),
    };
  });
  const spyTrailing = compounded[0]?.results ?? [];
  trailingSeries.push({
    label: "SPY",
    color: "#d5deed",
    values: spyTrailing.map(row => ({
      quarter: row.quarter,
      value: row.trailingFourQuarterBenchmarkReturnPercent,
    })),
  });
  $("marketTrailingChart").innerHTML = svgLineChart(trailingSeries, {
    percent: true,
    aria: "최근 네 분기 복리 총수익률과 SPY 비교",
  });
  makeLegend($("marketTrailingLegend"), trailingSeries);

  const returnsByTicker = new Map(compounded.map(item => [item.ticker, item.results]));
  $("marketReturnsTable").innerHTML = MARKET_UNIVERSE.filter(item => item.ticker !== "SPY").map(meta => {
    const row = latest(returnsByTicker.get(meta.ticker) ?? []);
    return '<tr><td><strong>' + meta.company + '</strong> <span class="muted">' + meta.ticker + '</span></td>' +
      '<td>' + (row?.quarter ?? "—") + '</td>' +
      '<td>' + fmtPct(row?.companyReturnPercent) + '</td>' +
      '<td>' + fmtPct(row?.benchmarkReturnPercent) + '</td>' +
      '<td>' + fmtPct(row?.excessReturnPp) + '</td>' +
      '<td>' + fmtPct(row?.trailingFourQuarterCompanyReturnPercent) + '</td>' +
      '<td>' + fmtPct(row?.trailingFourQuarterBenchmarkReturnPercent) + '</td>' +
      '<td>' + fmtPct(row?.trailingFourQuarterExcessReturnPp) + '</td></tr>';
  }).join("");

  const linkage = deriveCapexMarketLinkage(companySeries, compounded);
  $("marketLinkageTable").innerHTML = linkage.map(row =>
    '<tr><td>' + row.company + '</td><td>' +
    (row.metric === "shareholder_total_return" ? "주주 총수익률" : "SPY 대비 초과수익률") +
    '</td><td>' + row.observations + '</td><td>' +
    (finite(row.correlation) ? row.correlation.toFixed(3) : "—") +
    '</td><td>' + (row.status === "descriptive-only" ? "탐색적·기술통계" : "관측 부족") +
    '</td></tr>'
  ).join("");

  const coverage = bundle.coverage.map(row =>
    row.ticker + ": " + row.observations.toLocaleString("en-US") + "개 · " +
    (row.firstDate ?? "—") + " ~ " + (row.lastDate ?? "—")
  ).join(" / ");
  $("marketCoverage").textContent =
    "공통 관측일 " + bundle.commonObservationCount.toLocaleString("en-US") +
    "개 · 기준일 공통 관측 " + bundle.baselineCommonDate + " · " + coverage;

  $("marketImportStatus").className = "info";
  $("marketImportStatus").textContent =
    "검증 완료: 5개 종목의 제공처·통화·조정방식이 일치합니다. " +
    "각 분기 수익률은 기업과 SPY의 동일한 공통 거래일을 사용합니다. " +
    "실제 데이터의 출처·이용 권리와 조정방식은 사용자가 확인한 선언값이며 프로그램이 독립 검증하지 않습니다.";

  const cards = $("summaryCards");
  const lastRows = compounded.map(item => latest(item.results)).filter(Boolean);
  const validReturns = lastRows.filter(row => row.status === "ok");
  const average = validReturns.length
    ? validReturns.reduce((sum, row) => sum + row.companyReturnPercent, 0) / validReturns.length
    : null;
  const finalCard = cards.querySelector(".metric-card:last-child");
  if (finalCard) {
    finalCard.innerHTML =
      '<div class="metric-label">최근 분기 기업 평균 수익률*</div>' +
      '<div class="metric">' + fmtPct(average) + '</div>' +
      '<div class="metric-note">4개 기업 단순 평균 · 주주 수익률</div>';
  }
}

export function initMarketPerformanceImport({ $, svgLineChart, fmtPct, getCapexRows, getCompanySeries }) {
  const fileIds = MARKET_UNIVERSE.map(item => "priceFile" + item.ticker);
  const getFile = ticker => $("priceFile" + ticker).files?.[0] ?? null;
  $("marketRetrievedAt").value = new Date().toISOString();

  $("importMarketPrices").addEventListener("click", async () => {
    const button = $("importMarketPrices");
    button.disabled = true;
    $("marketImportStatus").className = "empty";
    $("marketImportStatus").textContent = "5개 CSV 파일과 출처 정보를 검증하고 있습니다.";
    try {
      const source = $("marketSource").value.trim();
      const sourceUrl = $("marketSourceUrl").value.trim();
      const retrievedAt = $("marketRetrievedAt").value.trim();
      const licenseNote = $("marketLicenseNote").value.trim();
      if (!source || !sourceUrl || !retrievedAt || !licenseNote) {
        throw new TypeError("데이터 제공처, HTTPS URL, 취득 시각, 이용 조건 메모를 모두 입력해 주세요.");
      }
      if (!$("marketRightsConfirmed").checked) {
        throw new TypeError("자료의 이용 조건과 배당·분할 조정방식을 확인한 뒤 확인란을 선택해 주세요.");
      }
      const missing = MARKET_UNIVERSE.filter(item => !getFile(item.ticker)).map(item => item.ticker);
      if (missing.length) throw new TypeError("CSV 파일이 누락되었습니다: " + missing.join(", "));

      const datasets = [];
      for (const item of MARKET_UNIVERSE) {
        const csvText = await getFile(item.ticker).text();
        datasets.push(parseAdjustedPriceCsv(csvText, {
          ticker: item.ticker,
          source,
          sourceUrl,
          retrievedAt,
          adjustmentBasis: "split_and_cash_dividends",
          currency: "USD",
          licenseNote,
        }));
      }
      const bundle = validateMarketPriceBundle(datasets, { quarters: QUARTERS });
      if (bundle.status !== "ready-for-analysis") {
        throw new TypeError(bundle.errors.join(" · "));
      }
      renderResults({
        $, svgLineChart, fmtPct,
        companySeries: getCompanySeries(),
        bundle,
      });
    } catch (error) {
      $("marketImportStatus").className = "notice";
      $("marketImportStatus").textContent = "가져오기를 완료하지 못했습니다: " + error.message;
      $("marketCoverage").textContent = "";
    } finally {
      button.disabled = false;
    }
  });

  $("clearMarketPrices").addEventListener("click", () => {
    for (const id of fileIds) $(id).value = "";
    $("marketRightsConfirmed").checked = false;
    $("marketImportStatus").className = "empty";
    $("marketImportStatus").textContent = "실제 조정주가 자료는 아직 등록되지 않았습니다.";
    $("marketCoverage").textContent = "";
    $("marketQuarterlyChart").innerHTML = '<div class="empty">조정주가 자료를 가져오면 표시합니다.</div>';
    $("marketTrailingChart").innerHTML = '<div class="empty">연속된 4개 분기 자료가 확보되면 표시합니다.</div>';
    $("marketQuarterlyLegend").innerHTML = "";
    $("marketTrailingLegend").innerHTML = "";
    $("marketReturnsTable").innerHTML = '<tr><td colspan="8" class="muted">자료 미등록</td></tr>';
    $("marketLinkageTable").innerHTML = '<tr><td colspan="5" class="muted">자료 미등록</td></tr>';
    const finalCard = $("summaryCards").querySelector(".metric-card:last-child");
    if (finalCard) finalCard.innerHTML =
      '<div class="metric-label">주가 총수익률</div><div class="metric">미확보</div><div class="metric-note">배당·분할 조정 가격 미등록</div>';
  });
}
