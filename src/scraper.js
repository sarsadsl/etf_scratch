import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as xlsx from 'xlsx';

puppeteer.use(StealthPlugin());

// ============================================================
// 工具：取最近的交易日日期字串 (往前推，跳過週末)
// ============================================================
function getLatestTradingDateStr() {
  const d = new Date();
  // 若是台灣時間尚未到 18:00，代表當日資料可能還未更新，取前一交易日
  // 取 UTC+8 小時
  const hourTW = (d.getUTCHours() + 8) % 24;
  if (hourTW < 18) d.setDate(d.getDate() - 1);
  // 跳過週末
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d.getFullYear().toString()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0');
}

// ============================================================
// 策略 A：復華投信 — 直接 GET xlsx (無需瀏覽器)
// ============================================================
async function fetchFhtrustXlsx(fundCode) {
  const dateStr = getLatestTradingDateStr();
  const url = `https://www.fhtrust.com.tw/api/assetsExcel/${fundCode}/${dateStr}`;
  console.log(`[Fhtrust] Fetching: ${url}`);

  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
  });

  const wb = xlsx.read(res.data, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // 找表頭列 (值含 "證券代號")
  const headerIdx = rows.findIndex(row => row.some(c => String(c).includes('證券代號')));
  if (headerIdx === -1) {
    console.warn(`[Fhtrust] 找不到表頭列，日期 ${dateStr} 可能無資料`);
    return null;
  }

  const results = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[1]) break;
    const stockCode = String(row[0]).trim();
    const stockName = String(row[1]).trim();
    const shares = parseInt(String(row[2] || '0').replace(/,/g, ''), 10) || 0;
    // row[3] 是金額，row[4] 是權重
    const weightRaw = String(row[4] || '0').replace('%', '').trim();
    const weight = parseFloat(weightRaw) || 0;
    if (stockCode && weight > 0) {
      results.push({ stockCode, stockName, shares, weight });
    }
  }
  return results.length > 0 ? results : null;
}

// ============================================================
// 策略 B：統一投信 ezmoney — SPA，解析 #assetBody innerText
// ============================================================
async function fetchFsitcSpa(page, fundCode) {
  const url = `https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=${fundCode}`;
  console.log(`[FSITC] Fetching: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  return await page.evaluate(() => {
    const assetEl = document.querySelector('#assetBody');
    if (!assetEl) return null;

    const text = assetEl.innerText;
    const stockIdx = text.indexOf('股票代號');
    if (stockIdx === -1) return null;
    const stockText = text.substring(stockIdx + '股票代號股票名稱股數持股權重'.length);

    // 格式：「2330台積電6,256,0009.01%...」全部連在一起
    // 用正則：(4+ 位數字)(中文/英文名稱)(數字,數字 = 股數)(數字.xx%)
    const pattern = /(\d{4}[A-Z0-9]*)([^\d]+?)([\d,]+)(\d+\.?\d*)%/g;
    const results = [];
    let m;
    while ((m = pattern.exec(stockText)) !== null) {
      const stockCode = m[1];
      const stockName = m[2].replace(/\*/g, '').trim(); // 有些名稱帶 * 號
      const shares = parseInt(m[3].replace(/,/g, ''), 10) || 0;
      const weight = parseFloat(m[4]) || 0;
      if (weight > 0) results.push({ stockCode, stockName, shares, weight });
    }
    return results.length > 0 ? results : null;
  });
}

// ============================================================
// 策略 C：元大投信 yuantaetfs — SPA，等待 table.datalist 渲染
// ============================================================
async function fetchYuantaSpa(page, etfCode) {
  const url = `https://www.yuantaetfs.com/product/detail/${etfCode}/ratio`;
  console.log(`[Yuanta] Fetching: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  return await page.evaluate(() => {
    const results = [];
    const rows = document.querySelectorAll('table.datalist tr');
    if (!rows || rows.length === 0) {
      // fallback: try table-list div
      const lists = document.querySelectorAll('div.table-list');
      if (lists.length >= 2) {
        const trs = lists[1].querySelectorAll('table tr');
        for (let i = 1; i < trs.length; i++) {
          const cells = trs[i].querySelectorAll('td');
          if (cells.length >= 3) {
            const stockCode = cells[0].innerText.trim();
            const stockName = cells[1].innerText.trim();
            const weight = parseFloat(cells[cells.length - 1].innerText.trim().replace('%', '')) || 0;
            const shares = cells.length > 3 ? parseInt(cells[2].innerText.trim().replace(/,/g, ''), 10) || 0 : 0;
            if (weight > 0) results.push({ stockCode, stockName, shares, weight });
          }
        }
      }
      return results.length > 0 ? results : null;
    }
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 3) {
        const nameHtml = cells[0].innerText.trim();
        const codeMatch = nameHtml.match(/\((.*?)\)/);
        const stockCode = codeMatch ? codeMatch[1].split('.')[0] : nameHtml;
        const stockName = nameHtml.split('(')[0].trim();
        const weight = parseFloat(cells[1].innerText.trim()) || 0;
        const shares = parseInt(cells[2].innerText.trim().replace(/,/g, ''), 10) || 0;
        if (weight > 0) results.push({ stockCode, stockName, shares, weight });
      }
    }
    return results.length > 0 ? results : null;
  });
}

// ============================================================
// 主要 fetchHoldings (export)
// ============================================================
const ISSUER_MAP = {
  '復華投信': { strategy: 'fhtrust', fundCode: null }, // fundCode 從 target 取
  '統一投信': { strategy: 'fsitc', ezmoneyCodes: { '00981A': '49YTW', '00988A': '61YTW' } },
  '元大投信': { strategy: 'yuanta' },
};

let sharedBrowser = null;
let sharedPage = null;

async function getSharedPage() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    sharedPage = await sharedBrowser.newPage();
    await sharedPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await sharedPage.setViewport({ width: 1280, height: 800 });
    await sharedPage.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }
  return sharedPage;
}

export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
}

export async function fetchHoldings(target) {
  try {
    let holdings = null;

    if (target.issuer === '復華投信' && target.fhtrustCode) {
      // 策略 A：無頭瀏覽器，直接 xlsx
      holdings = await fetchFhtrustXlsx(target.fhtrustCode);

    } else if (target.issuer === '統一投信' && target.ezmoneyCCode) {
      // 策略 B：SPA
      const page = await getSharedPage();
      holdings = await fetchFsitcSpa(page, target.ezmoneyCCode);

    } else if (target.issuer === '元大投信') {
      // 策略 C：SPA
      const page = await getSharedPage();
      holdings = await fetchYuantaSpa(page, target.code);

    } else {
      return { error: true, message: `未知發行商: ${target.issuer}` };
    }

    if (!holdings || holdings.length === 0) {
      return { error: true, message: `取回資料為空或解析失敗`, debugInfo: { title: target.issuer, bodyData: '無' } };
    }

    return holdings
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

  } catch (error) {
    console.error(`[Scraper] 抓取 ${target.code} 發生錯誤:`, error.message);
    return { error: true, message: `Exception: ${error.message}` };
  }
}
