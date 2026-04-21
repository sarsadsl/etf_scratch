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
function getTradingDate() {
  const now = new Date();
  const hourTW = (now.getUTCHours() + 8) % 24;
  const d = new Date(now);
  if (hourTW < 18) d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return { yyyymmdd: `${yyyy}${mm}${dd}`, label: `${yyyy}/${mm}/${dd}`, yyyymmdd_pad: `${yyyy}${mm}${dd}` };
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

// ─── CDP 下載工具 ─────────────────────────────────────────────
function cdpDownloadPromise(client, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('Browser.downloadWillBegin', onBegin);
      client.off('Browser.downloadProgress', onProgress);
      reject(new Error('CDP download timeout'));
    }, timeoutMs);
    const onBegin = ({ suggestedFilename }) => console.log(`    begin: ${suggestedFilename}`);
    const onProgress = ({ state }) => {
      if (state === 'completed') { clearTimeout(timer); client.off('Browser.downloadWillBegin', onBegin); client.off('Browser.downloadProgress', onProgress); resolve(); }
      if (state === 'canceled')  { clearTimeout(timer); reject(new Error('Download canceled')); }
    };
    client.on('Browser.downloadWillBegin', onBegin);
    client.on('Browser.downloadProgress', onProgress);
  });
}

function latestUntaggedFile(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => /\.(xlsx|xls|csv)$/i.test(f) && !/投信|_野村|_復華|_統一|_元大|_群益/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? files[0].f : null;
}

// ─── 1. 復華 → Direct HTTP xlsx ──────────────────────────────
async function downloadFhtrust(dir, date) {
  const targets = [{ code: '00991A', fc: 'ETF23' }];
  for (const t of targets) {
    const url = `https://www.fhtrust.com.tw/api/assetsExcel/${t.fc}/${date.yyyymmdd_pad}`;
    console.log(`[復華] GET ${url}`);
    try {
      const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': UA, 'Referer': 'https://www.fhtrust.com.tw/' } });
      const out = `${t.code}_復華投信.xlsx`;
      fs.writeFileSync(path.join(dir, out), Buffer.from(r.data));
      console.log(`  ✅ ${out} (${(r.data.byteLength/1024).toFixed(1)} KB)`);
    } catch (e) { console.error(`  ❌ 復華 ${t.code}: ${e.message}`); }
  }
}

// ─── 2. 統一 → Puppeteer 點擊「匯出XLSX檔」 ─────────────────
async function downloadFsitc(dir, page, client) {
  const targets = [
    { code: '00981A', ezmCode: '49YTW' },
    { code: '00988A', ezmCode: '61YTW' },
  ];
  for (const t of targets) {
    const url = `https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=${t.ezmCode}`;
    console.log(`[統一] ${t.code}: 載入 ${url}`);
    try {
      const dlP = cdpDownloadPromise(client, 30000);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 40000 });
      await new Promise(r => setTimeout(r, 3000));

      // 找到「匯出XLSX檔」按鈕（投資組合區域）
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button.btn-primary, button.btn'));
        const btn = btns.find(b => /匯出XLSX/.test(b.innerText || b.textContent));
        if (btn) { btn.click(); return btn.innerText.trim(); }
        return null;
      });
      console.log(`  click: ${clicked}`);

      if (clicked) {
        await dlP;
        const f = t.code + '.xlsx';
        const named = latestUntaggedFile(dir);
        const tgt = `${t.code}_統一投信.xlsx`;
        if (named) { fs.renameSync(path.join(dir, named), path.join(dir, tgt)); console.log(`  ✅ ${tgt}`); }
        else console.warn(`  ⚠️ 統一 ${t.code}: download complete but file not found`);
      } else {
        console.warn(`  ⚠️ 統一 ${t.code}: 未找到匯出XLSX按鈕`);
      }
    } catch (e) { console.error(`  ❌ 統一 ${t.code}: ${e.message}`); }
  }
}

// ─── 3. 群益 → Puppeteer 點擊「下載資料」 ────────────────────
async function downloadCapital(dir, page, client) {
  const targets = [{ code: '00982A', fundId: 399 }];
  for (const t of targets) {
    console.log(`[群益] ${t.code}: 載入 portfolio`);
    try {
      const dlP = cdpDownloadPromise(client, 30000);
      await page.goto(`https://www.capitalfund.com.tw/etf/product/detail/${t.fundId}/portfolio`, { waitUntil: 'networkidle2', timeout: 40000 });
      await new Promise(r => setTimeout(r, 3000));

      const clicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('下載資料'));
        if (btn) { btn.click(); return true; }
        return false;
      });
      console.log(`  click: ${clicked}`);

      if (clicked) {
        await dlP;
        const std = path.join(dir, `${t.code}.xlsx`);
        const tgt = `${t.code}_群益投信.xlsx`;
        if (fs.existsSync(std)) { fs.renameSync(std, path.join(dir, tgt)); console.log(`  ✅ ${tgt}`); }
        else {
          const f = latestUntaggedFile(dir);
          if (f) { fs.renameSync(path.join(dir, f), path.join(dir, tgt)); console.log(`  ✅ ${tgt} (renamed from ${f})`); }
          else console.warn(`  ⚠️ 群益 ${t.code}: file not found after download`);
        }
      }
    } catch (e) { console.error(`  ❌ 群益 ${t.code}: ${e.message}`); }
  }
}

// ─── 4. 元大 → Puppeteer 擷取持股表格 → CSV ──────────────────
async function downloadYuanta(dir, page) {
  const targets = [{ code: '00990A' }];
  for (const t of targets) {
    const url = `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${t.code}.TW`;
    console.log(`[元大] ${t.code}: 從 MoneyDJ 取持股資料`);
    try {
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

      if (rows.length === 0) { console.warn(`  ⚠️ 元大 ${t.code}: MoneyDJ 無資料`); continue; }
      const header = '股票代號,股票名稱,持有股數,持股比重(%)';
      const csv = [header, ...rows.map(r => `"${r.stockCode}","${r.stockName}",${r.shares},${r.weight}`)].join('\n');
      const out = `${t.code}_元大投信.csv`;
      fs.writeFileSync(path.join(dir, out), '\uFEFF' + csv, 'utf8');
      console.log(`  ✅ ${out} (${rows.length} 筆，來源: MoneyDJ)`);
    } catch (e) { console.error(`  ❌ 元大 ${t.code}: ${e.message}`); }
  }
}

// ─── 5. 野村 → POST API → CSV ────────────────────────────────
async function downloadNomura(dir, date) {
  const targets = [
    { code: '00980A' },
    { code: '00985A' },
  ];
  const url = 'https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo';
  for (const t of targets) {
    console.log(`[野村] ${t.code}: POST API date=${date.label}`);
    try {
      const r = await axios.post(url, { FundNo: t.code, Date: date.label }, {
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Referer': 'https://www.nomurafunds.com.tw/' },
        timeout: 30000
      });
      const stocks = r.data?.Entries?.Stocks ?? (Array.isArray(r.data) ? r.data : null);
      if (!stocks?.length) { console.warn(`  ⚠️ 野村 ${t.code}: 空資料`); continue; }
      const header = '股票代號,股票名稱,持有股數,持有市值,持股比重(%)';
      const rows = stocks.map(s => `"${String(s.CStockCode??s.CStocNo??'').trim()}","${String(s.CStockName??s.CStocName??'').trim()}",${String(s.CQuantity??s.CShares??'0').replace(/,/g,'')},${ String(s.CMarketValue??'').replace(/,/g,'')},${String(s.CWeightsPct??s.CProportion??'')}`);
      const out = `${t.code}_野村投信.csv`;
      fs.writeFileSync(path.join(dir, out), '\uFEFF' + [header,...rows].join('\n'), 'utf8');
      console.log(`  ✅ ${out} (${stocks.length} 筆)`);
    } catch (e) { console.error(`  ❌ 野村 ${t.code}: ${e.message}`); }
  }
}

// ─── 主程式 ──────────────────────────────────────────────────
async function main() {
  const date = getTradingDate();
  const dir  = path.join(__dirname, '..', 'archives', date.yyyymmdd);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n📦 開始封存 ${date.yyyymmdd} 的持股原始檔案...\n`);

  // Step 1: no-browser downloads
  await downloadFhtrust(dir, date);
  await downloadNomura(dir, date);

  // Step 2: browser-based downloads (shared instance)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 }
  });
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  const client = await page.createCDPSession();
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: path.resolve(dir), eventsEnabled: true });

  try {
    await downloadCapital(dir, page, client);
    await downloadFsitc(dir, page, client);
    await downloadYuanta(dir, page);
  } finally {
    await browser.close();
  }

  // Step 3: summary
  const files = fs.readdirSync(dir).filter(f => !f.endsWith('.json'));
  console.log(`\n📋 封存結果 (${date.yyyymmdd}):`);
  files.forEach(f => console.log(`  📄 ${f} (${(fs.statSync(path.join(dir,f)).size/1024).toFixed(1)} KB)`));

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ date: date.yyyymmdd, files: files.map(f => ({ name: f, size: fs.statSync(path.join(dir,f)).size })) }, null, 2));
  console.log(`\n✅ 封存完成！共 ${files.length} 個檔案。`);
}

main().catch(e => { console.error('[Archiver] 嚴重錯誤:', e); process.exit(1); });
