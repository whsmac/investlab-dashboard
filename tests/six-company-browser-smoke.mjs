import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd());
const mime = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".csv": "text/csv; charset=utf-8" };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (!(await stat(file)).isFile()) throw new Error("Not found");
    res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const address = server.address();
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));
try {
  await page.goto(`http://127.0.0.1:${address.port}/six-company-price-preview.html`);
  await page.locator("#dailyChart").waitFor();
  const priceCsv = [
    "date,ticker,close",
    ...["MSFT", "GOOGL", "AMZN", "META", "TSLA"].map((ticker, i) => `2026-10-01,${ticker},${100 + i}`),
    ...["MSFT", "GOOGL", "AMZN", "META", "TSLA"].map((ticker, i) => `2026-10-02,${ticker},${101 + i}`),
    "2026-06-12,SPCX,180",
    "2026-10-02,SPCX,190",
  ].join("\n");
  await page.locator("#priceFiles").setInputFiles({ name: "price-smoke.csv", mimeType: "text/csv", buffer: Buffer.from(priceCsv) });
  await page.locator("#loadFiles").click();
  await page.locator("#dailyChart svg").waitFor();
  await page.locator("#quarterChart svg").waitFor();
  await page.locator("#indexedChart svg").waitFor();
  assert.match(await page.locator("#status").innerText(), /관측값/);
  assert.match(await page.locator("#indexBasis").innerText(), /SPCX: 2026-06-12/);

  const financialCsv = [
    "ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url",
    "MSFT,2026-Q3,92.279,39.367,gross cash PP&E purchases,https://www.sec.gov/example",
    "GOOGL,2026-Q3,127.577,,,https://abc.xyz/example",
    "SPCX,2026-Q2,14.575,19.593,YTD cash PP&E purchases less prior YTD,https://www.sec.gov/example",
  ].join("\n");
  await page.locator("#financialFiles").setInputFiles({ name: "financial-smoke.csv", mimeType: "text/csv", buffer: Buffer.from(financialCsv) });
  await page.locator("#loadFinancial").click();
  await page.locator("#revenueChart svg").waitFor();
  await page.locator("#capexChart svg").waitFor();
  assert.match(await page.locator("#financialStatus").innerText(), /3개 분기 관측값/);
  assert.match(await page.locator("#latestFinancialTable").innerText(), /MSFT/);
  assert.match(await page.locator("#latestFinancialTable").innerText(), /gross cash PP&E purchases/);
  assert.match(await page.locator("#latestFinancialTable").innerText(), /원문/);

  await page.locator("#company").selectOption("MSFT");
  assert.equal(await page.locator("#latestFinancialTable tr").count(), 1);
  assert.match(await page.locator("#latestFinancialTable").innerText(), /MSFT/);
  await page.locator("#clearFinancial").click();
  assert.match(await page.locator("#latestFinancialTable").innerText(), /재무자료 미등록/);
  await page.locator("#clearFiles").click();
  assert.match(await page.locator("#dailyChart").innerText(), /CSV 자료를 불러오면 표시합니다/);
  assert.deepEqual(pageErrors, [], "Browser page should not emit uncaught JavaScript errors");
  console.log("Browser smoke test passed: price uploads, charts, SPCX baseline, financial upload, comparison table, filters, reset, and no page errors.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
