import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = resolve(process.cwd());
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const file = resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Forbidden");
    if (!(await stat(file)).isFile()) throw new Error("Not found");
    res.writeHead(200, { "content-type": extname(file) === ".html" ? "text/html; charset=utf-8" : "application/octet-stream" });
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
await page.route("https://cdn.jsdelivr.net/**", route => route.abort());
try {
  await page.goto(`http://127.0.0.1:${address.port}/shared-data.html`);
  await page.locator("h1").getByText("공유 기업 데이터").waitFor();
  assert.equal(await page.locator("#projectUrl").inputValue(), "https://gopofxyezhwpfbxebcrxd.supabase.co");
  assert.equal(await page.locator("#logout").isDisabled(), true);
  assert.equal(await page.locator("#reload").isDisabled(), true);
  assert.match(await page.locator("#authStatus").innerText(), /등록된 계정/);

  await page.locator("#projectUrl").fill("https://duffpsvaphccgxvkiobm.supabase.co");
  await page.locator("#publicKey").fill("not-a-real-key");
  await page.locator("#connect").click();
  assert.match(await page.locator("#connectionStatus").innerText(), /일치하지 않습니다/);
  assert.equal(await page.evaluate(() => localStorage.getItem("investlab_shared_data_connection_v1")), null);

  await page.locator("#projectUrl").fill("https://gopofxyezhwpfbxebcrxd.supabase.co");
  await page.locator("#publicKey").fill("service_role_secret");
  await page.locator("#connect").click();
  assert.match(await page.locator("#connectionStatus").innerText(), /service_role 키는 사용할 수 없습니다/);
  assert.equal(await page.evaluate(() => localStorage.getItem("investlab_shared_data_connection_v1")), null);

  await page.locator("#projectUrl").fill("https://gopofxyezhwpfbxebcrxd.supabase.co");
  await page.locator("#publicKey").fill("sb_secret_test_only");
  await page.locator("#connect").click();
  assert.match(await page.locator("#connectionStatus").innerText(), /sb_secret 키는 사용할 수 없습니다/);
  assert.equal(await page.evaluate(() => localStorage.getItem("investlab_shared_data_connection_v1")), null);

  await page.locator("#projectUrl").fill("https://gopofxyezhwpfbxebcrxd.supabase.co");
  await page.locator("#publicKey").fill("sb_publishable_test_only");
  await page.locator("#connect").click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("investlab_shared_data_connection_v1")));
  assert.equal(stored.url, "https://gopofxyezhwpfbxebcrxd.supabase.co");
  assert.equal(stored.key, "sb_publishable_test_only");
  assert.match(await page.locator("#connectionStatus").innerText(), /저장했습니다/);
  assert.deepEqual(pageErrors, [], "Shared data page should not emit uncaught JavaScript errors");
  console.log("Shared data browser smoke passed: initial state, project allowlist, service-role rejection, isolated local storage, and no page errors.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
