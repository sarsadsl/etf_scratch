/**
 * src/archiver.js
 * 每日基金持股原始檔案下載與封存程式
 *
 * 策略：
 *   復華 (00991A)  : 直接 HTTP GET → xlsx
 *   統一 (00981A/A): Puppeteer → 點擊「匯出XLSX檔」按鈕 → CDP 下載
 *   群益 (00982A)  : Puppeteer → 點擊「下載資料」按鈕 → CDP 下載
 *   元大 (00990A)  : Puppeteer → 提取持股資料 → 組裝 CSV
 *   野村 (00980A/A): POST API → 組裝 CSV
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 日期工具 ─────────────────────────────────────────────────
export function getTradingDate(now = new Date()) {
  const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 轉換為台灣時間 (UTC+8)
  if (twTime.getUTCHours() < 15) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  while (twTime.getUTCDay() === 0 || twTime.getUTCDay() === 6) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  const yyyy = twTime.getUTCFullYear();
  const mm = String(twTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(twTime.getUTCDate()).padStart(2, '0');
  return { yyyymmdd: `${yyyy}${mm}${dd}`, label: `${yyyy}/${mm}/${dd}`, yyyymmdd_pad: `${yyyy}${mm}${dd}` };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

// ─── CDP 下載工具 ─────────────────────────────────────────────
export function cdpDownloadPromise(client, clickDownload, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    let clickFinished = false;
    let clicked = false;
    let downloadCompleted = false;
    let timer;

    const cleanup = () => {
      clearTimeout(timer);
      client.off('Browser.downloadWillBegin', onBegin);
      client.off('Browser.downloadProgress', onProgress);
    };
    const finish = (callback, value) => {
      cleanup();
      callback(value);
    };
    const maybeResolve = () => {
      if (clickFinished && clicked && downloadCompleted) finish(resolve, { clicked: true });
    };
    const onBegin = ({ suggestedFilename }) => console.log(`    begin: ${suggestedFilename}`);
    const onProgress = ({ state }) => {
      if (state === 'completed') {
        downloadCompleted = true;
        maybeResolve();
      }
      if (state === 'canceled') finish(reject, new Error('Download canceled'));
    };

    client.on('Browser.downloadWillBegin', onBegin);
    client.on('Browser.downloadProgress', onProgress);
    timer = setTimeout(() => finish(reject, new Error('CDP download timeout')), timeoutMs);

    // Register listeners and start the timeout immediately before clicking. This
    // keeps page navigation out of the timeout window and prevents a rejected,
    // unobserved download promise while the page is still loading.
    Promise.resolve()
      .then(clickDownload)
      .then((result) => {
        clickFinished = true;
        clicked = Boolean(result);
        if (!clicked) finish(resolve, { clicked: false });
        else maybeResolve();
      }, (error) => finish(reject, error));
  });
}

export const EXPECTED_ETFS = ['00991A', '00981A', '00988A', '00990A', '00982A', '00980A', '00985A'];

export async function attemptEtfDownload(results, dir, code, filename, download) {
  try {
    await download();
    const filePath = path.join(dir, filename);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      throw new Error(`Expected output file was not created: ${filename}`);
    }
    results.set(code, { filename });
    console.log(`  ✅ ${filename}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.set(code, { error: message });
    console.error(`  ❌ ${code}: ${message}`);
  }
}

export function buildManifest(date, results, dir) {
  const files = EXPECTED_ETFS.flatMap((code) => {
    const result = results.get(code);
    if (!result?.filename) return [];
    const filePath = path.join(dir, result.filename);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) return [];
    return [{ name: result.filename, size: fs.statSync(filePath).size }];
  });
  const missing = EXPECTED_ETFS.filter((code) => !files.some((file) => file.name.startsWith(code)));
  const errors = missing.map((code) => ({ code, message: results.get(code)?.error ?? 'No successful download recorded' }));

  return {
    date: date.yyyymmdd,
    complete: missing.length === 0,
    missing,
    downloadedCount: files.length,
    errors,
    files,
  };
}

export function prepareReleaseAssets(dir, manifest) {
  const releaseDir = path.join(dir, 'release-assets');
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const file of manifest.files) {
    fs.copyFileSync(path.join(dir, file.name), path.join(releaseDir, file.name));
  }
  fs.writeFileSync(path.join(releaseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return releaseDir;
}

function setWorkflowDate(date) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date.yyyymmdd}\n`);
  }
}

function markEtfsFailed(results, codes, error) {
  const message = error instanceof Error ? error.message : String(error);
  for (const code of codes) {
    if (!results.has(code)) results.set(code, { error: message });
  }
}

function latestUntaggedFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => /\.(xlsx|xls|csv)$/i.test(f) && !/投信|_野村|_復華|_統一|_元大|_群益/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? files[0].f : null;
}

// ─── 1. 復華 → Direct HTTP xlsx ──────────────────────────────
async function downloadFhtrust(dir, date, results) {
  const targets = [{ code: '00991A', fc: 'ETF23' }];
  for (const t of targets) {
    const url = `https://www.fhtrust.com.tw/api/assetsExcel/${t.fc}/${date.yyyymmdd_pad}`;
    console.log(`[復華] GET ${url}`);
    const out = `${t.code}_復華投信.xlsx`;
    await attemptEtfDownload(results, dir, t.code, out, async () => {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': UA, 'Referer': 'https://www.fhtrust.com.tw/' } });
      fs.writeFileSync(path.join(dir, out), Buffer.from(r.data));
    });
  }
}

// ─── 2. 統一 → Puppeteer 點擊「匯出XLSX檔」 ─────────────────
async function downloadFsitc(dir, page, client, results) {
  const targets = [
    { code: '00981A', ezmCode: '49YTW' },
    { code: '00988A', ezmCode: '61YTW' },
  ];
  for (const t of targets) {
    const url = `https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=${t.ezmCode}`;
    console.log(`[統一] ${t.code}: 載入 ${url}`);
    const out = `${t.code}_統一投信.xlsx`;
    await attemptEtfDownload(results, dir, t.code, out, async () => {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 40000 });
      await new Promise(r => setTimeout(r, 3000));

      // 找到「匯出XLSX檔」按鈕（投資組合區域）
      const result = await cdpDownloadPromise(client, () => page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button.btn-primary, button.btn'));
        const btn = btns.find(b => /匯出XLSX/.test(b.innerText || b.textContent));
        if (btn) { btn.click(); return btn.innerText.trim(); }
        return null;
      }), 45000);
      if (!result.clicked) throw new Error('未找到匯出XLSX按鈕');

      const named = latestUntaggedFile(dir);
      if (!named) throw new Error('下載完成但找不到檔案');
      const source = path.join(dir, named);
      const target = path.join(dir, out);
      if (source !== target) fs.renameSync(source, target);
    });
  }
}

// ─── 3. 群益 → Puppeteer 點擊「下載資料」 ────────────────────
async function downloadCapital(dir, page, client, results) {
  const targets = [{ code: '00982A', fundId: 399 }];
  for (const t of targets) {
    console.log(`[群益] ${t.code}: 載入 portfolio`);
    const out = `${t.code}_群益投信.xlsx`;
    await attemptEtfDownload(results, dir, t.code, out, async () => {
      await page.goto(`https://www.capitalfund.com.tw/etf/product/detail/${t.fundId}/portfolio`, { waitUntil: 'networkidle2', timeout: 40000 });
      await new Promise(r => setTimeout(r, 3000));

      const result = await cdpDownloadPromise(client, () => page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('下載資料'));
        if (btn) { btn.click(); return true; }
        return false;
      }), 45000);
      if (!result.clicked) throw new Error('未找到下載資料按鈕');

      const standard = path.join(dir, `${t.code}.xlsx`);
      const named = fs.existsSync(standard) ? `${t.code}.xlsx` : latestUntaggedFile(dir);
      if (!named) throw new Error('下載完成但找不到檔案');
      const source = path.join(dir, named);
      const target = path.join(dir, out);
      if (source !== target) fs.renameSync(source, target);
    });
  }
}

// ─── 4. 元大 → Puppeteer 擷取持股表格 → CSV ──────────────────
async function downloadYuanta(dir, page, results) {
  const targets = [{ code: '00990A' }];
  for (const t of targets) {
    const url = `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${t.code}.TW`;
    console.log(`[元大] ${t.code}: 從 MoneyDJ 取持股資料`);
    const out = `${t.code}_元大投信.csv`;
    await attemptEtfDownload(results, dir, t.code, out, async () => {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const rows = await page.evaluate(() => {
        const results = [];
        const trs = document.querySelectorAll('table.datalist tr');
        for (let i = 1; i < trs.length; i++) {
          const cells = trs[i].querySelectorAll('td');
          if (cells.length >= 3) {
            const nameHtml = cells[0].innerText.trim();
            const weightText = cells[1].innerText.trim();
            const sharesText = cells[2].innerText.trim().replace(/,/g, '');
            const codeMatch = nameHtml.match(/\((.*?)\)/);
            const stockCode = codeMatch ? codeMatch[1].split('.')[0].trim() : nameHtml;
            const stockName = nameHtml.split('(')[0].trim();
            const weight = parseFloat(weightText) || 0;
            const shares = parseInt(sharesText, 10) || 0;
            if (stockCode && weight > 0) results.push({ stockCode, stockName, shares, weight });
          }
        }
        return results;
      });

      if (rows.length === 0) throw new Error('MoneyDJ 無持股資料');
      const header = '股票代號,股票名稱,持有股數,持股比重(%)';
      const csv = [header, ...rows.map(r => `"${r.stockCode}","${r.stockName}",${r.shares},${r.weight}`)].join('\n');
      fs.writeFileSync(path.join(dir, out), '\uFEFF' + csv, 'utf8');
      console.log(`  ${rows.length} 筆持股資料，來源: MoneyDJ`);
    });
  }
}

// ─── 5. 野村 → POST API → CSV ────────────────────────────────
async function downloadNomura(dir, date, results) {
  const targets = [
    { code: '00980A' },
    { code: '00985A' },
  ];
  const url = 'https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo';
  for (const t of targets) {
    console.log(`[野村] ${t.code}: POST API date=${date.label}`);
    const out = `${t.code}_野村投信.csv`;
    await attemptEtfDownload(results, dir, t.code, out, async () => {
      const r = await axios.post(url, { FundNo: t.code, Date: date.label }, {
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Referer': 'https://www.nomurafunds.com.tw/' },
        timeout: 30000
      });
      const stocks = r.data?.Entries?.Stocks ?? (Array.isArray(r.data) ? r.data : null);
      if (!stocks?.length) throw new Error('API 回傳空持股資料');
      const header = '股票代號,股票名稱,持有股數,持有市值,持股比重(%)';
      const rows = stocks.map(s => `"${String(s.CStockCode??s.CStocNo??'').trim()}","${String(s.CStockName??s.CStocName??'').trim()}",${String(s.CQuantity??s.CShares??'0').replace(/,/g,'')},${ String(s.CMarketValue??'').replace(/,/g,'')},${String(s.CWeightsPct??s.CProportion??'')}`);
      fs.writeFileSync(path.join(dir, out), '\uFEFF' + [header,...rows].join('\n'), 'utf8');
      console.log(`  ${out}: ${stocks.length} 筆`);
    });
  }
}

// ─── 主程式 ──────────────────────────────────────────────────
export async function main() {
  const date = getTradingDate();
  const dir  = path.join(__dirname, '..', 'archives', date.yyyymmdd);
  fs.mkdirSync(dir, { recursive: true });
  setWorkflowDate(date);
  console.log(`\n📦 開始封存 ${date.yyyymmdd} 的持股原始檔案...\n`);

  const results = new Map();

  // Step 1: no-browser downloads
  await downloadFhtrust(dir, date, results);
  await downloadNomura(dir, date, results);

  // Step 2: browser-based downloads (shared instance)
  let browser;
  let page;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 900 }
    });
  } catch (error) {
    markEtfsFailed(results, ['00982A', '00981A', '00988A', '00990A'], error);
    console.error(`[Browser] 無法啟動，略過瀏覽器下載: ${error.message}`);
  }

  if (browser) {
    try {
      page = await browser.newPage();
      await page.setUserAgent(UA);
    } catch (error) {
      markEtfsFailed(results, ['00982A', '00981A', '00988A', '00990A'], error);
      console.error(`[Browser] 無法建立頁面，略過瀏覽器下載: ${error.message}`);
    }
  }

  if (page) {
    let client;
    try {
      client = await page.createCDPSession();
      await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve(dir), eventsEnabled: true });
    } catch (error) {
      markEtfsFailed(results, ['00982A', '00981A', '00988A'], error);
      console.error(`[CDP] 無法設定下載工作階段: ${error.message}`);
      client = undefined;
    }

    if (client) {
      await downloadCapital(dir, page, client, results);
      await downloadFsitc(dir, page, client, results);
    }
    await downloadYuanta(dir, page, results);
  }

  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error(`[Browser] 關閉瀏覽器失敗: ${error.message}`);
    }
  }

  markEtfsFailed(results, EXPECTED_ETFS, new Error('No download attempt completed'));
  const manifest = buildManifest(date, results, dir);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  prepareReleaseAssets(dir, manifest);
  console.log(`\n📋 封存結果 (${date.yyyymmdd}): ${manifest.downloadedCount}/${EXPECTED_ETFS.length} 檔`);
  manifest.files.forEach((file) => console.log(`  📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`));
  if (manifest.complete) console.log('\n✅ 封存完成！');
  else console.warn(`\n⚠️ 封存不完整，缺少: ${manifest.missing.join(', ')}`);
  return manifest;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch(e => { console.error('[Archiver] 嚴重錯誤:', e); process.exit(1); });
}
