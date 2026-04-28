import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as xlsx from 'xlsx';

puppeteer.use(StealthPlugin());

// ============================================================
// 工具：取最近的交易日日期字串 (往前推，跳過週末)
// ============================================================
function getLatestTradingDateStr() {
  const now = new Date();
  // 若是台灣時間尚未到 15:00，代表當日資料可能還未更新，取前一交易日
  const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 轉換為台灣時間 (UTC+8)
  if (twTime.getUTCHours() < 15) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  // 跳過週末
  while (twTime.getUTCDay() === 0 || twTime.getUTCDay() === 6) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  return twTime.getUTCFullYear().toString()
    + String(twTime.getUTCMonth() + 1).padStart(2, '0')
    + String(twTime.getUTCDate()).padStart(2, '0');
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
    if (stockCode && (weight > 0 || shares > 0)) {
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
    const rows = [];
    const trs = document.querySelectorAll('#assetBody tr');
    trs.forEach(tr => {
      const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
      // Check if row has exactly 4 columns and the last column looks like a percentage (e.g., '9.01%')
      // and it's not the header row.
      if (tds.length === 4 && tds[3].endsWith('%') && tds[0] !== '股票代號' && tds[0] !== '期貨(名目本金)') {
        const stockCode = tds[0];
        const stockName = tds[1].replace(/\*/g, '').trim(); // Remove asterisks if any
        const shares = parseInt(tds[2].replace(/,/g, ''), 10) || 0;
        const weight = parseFloat(tds[3].replace('%', '')) || 0;
        if (weight > 0 || shares > 0) {
          rows.push({ stockCode, stockName, shares, weight });
        }
      }
    });
    return rows.length > 0 ? rows : null;
  });
}

// ============================================================
// 策略 C：元大投信官網 (取代 MoneyDJ)
// ============================================================
async function fetchYuantaOfficial(page, fundCode) {
  // 對於 00990A 這類主動型 ETF，PCF 頁面的 DOM 只顯示前 5 名
  // 完整持股（53 筆）儲存在 window.__NUXT__.data[].pcfData.FundWeights.StockWeights
  const url = `https://www.yuantaetfs.com/tradeInfo/pcf/${fundCode}`;
  console.log(`[Yuanta Official] Fetching PCF: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // 直接從 __NUXT__ state 讀取完整持股，不依賴 DOM .tr（DOM 只顯示前 5 名）
    const holdings = await page.evaluate(() => {
      if (!window.__NUXT__) return null;

      const data = window.__NUXT__.data;
      if (!Array.isArray(data)) return null;

      // 找 pcfData
      let pcfData = null;
      for (const item of data) {
        if (item && item.pcfData) { pcfData = item.pcfData; break; }
      }
      if (!pcfData) return null;

      // 完整持股在 FundWeights.StockWeights
      const stockWeights = pcfData.FundWeights?.StockWeights;
      if (!stockWeights || !Array.isArray(stockWeights) || stockWeights.length === 0) return null;

      return stockWeights.map(s => {
        // 清理交易所後綴：如 "LITE US" → "LITE"，"285A JP" → "285A"，"005930 KP" → "005930"
        const codeRaw = String(s.code || '').trim();
        const stockCode = codeRaw.replace(/\s+(US|TW|HK|JP|KP|GR|FP|SG|KR|GB)$/i, '').trim();
        const stockName = String(s.name || s.ename || '').trim();
        const shares = parseInt(String(s.qty || '0').replace(/,/g, ''), 10) || 0;
        const weight = parseFloat(s.weights) || 0;
        return { stockCode, stockName, shares, weight };
      }).filter(s => s.stockCode && s.weight > 0);
    });

    console.log(`[Yuanta Official] ${fundCode} __NUXT__ 持股數量: ${holdings ? holdings.length : 0}`);

    if (holdings && holdings.length >= 3) {
      console.log(`[Yuanta Official] ${fundCode} 成功抓取 ${holdings.length} 筆資料。`);
      return holdings;
    }

    throw new Error(`__NUXT__ 持股不足（${holdings?.length ?? 0} 筆），回退至 MoneyDJ`);
  } catch (error) {
    console.error(`[Yuanta Official] ${fundCode} 抓取失敗: ${error.message}，回退至 MoneyDJ`);
    return await fetchMoneyDjHoldings(page, fundCode);
  }
}

// ============================================================
// 策略 C-Fallback：MoneyDJ
// ============================================================

async function fetchMoneyDjHoldings(page, etfCode) {
  const url = `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${etfCode}.TW`;
  console.log(`[MoneyDJ] Fetching fallback: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  return await page.evaluate(() => {
    const results = [];
    const rows = document.querySelectorAll('table.datalist tr');
    if (!rows || rows.length === 0) return null;

    for (let i = 1; i < rows.length; i++) { // 跳過表頭
      const cells = rows[i].querySelectorAll('td');
      if (cells.length >= 3) {
        const nameHtml = cells[0].innerText.trim();
        const weightText = cells[1].innerText.trim();
        const sharesText = cells[2].innerText.trim().replace(/,/g, '');

        const codeMatch = nameHtml.match(/\((.*?)\)/);
        const stockCode = codeMatch ? codeMatch[1].split('.')[0].trim() : nameHtml; 
        const stockName = nameHtml.split('(')[0].trim();

        const weight = parseFloat(weightText) || 0;
        const shares = parseInt(sharesText, 10) || 0;

        if (stockCode && (weight > 0 || shares > 0)) {
          results.push({ stockCode, stockName, shares, weight });
        }
      }
    }
    return results.length > 0 ? results : null;
  });
}

// ============================================================
// 策略 D：野村投信 — 直接 API (POST)
// ============================================================
async function fetchNomuraApi(fundCode) {
  // 取最近交易日，格式 YYYY/MM/DD
  const now = new Date();
  const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 轉換為台灣時間 (UTC+8)
  if (twTime.getUTCHours() < 15) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  while (twTime.getUTCDay() === 0 || twTime.getUTCDay() === 6) {
    twTime.setUTCDate(twTime.getUTCDate() - 1);
  }
  const dateStr = `${twTime.getUTCFullYear()}/${String(twTime.getUTCMonth() + 1).padStart(2, '0')}/${String(twTime.getUTCDate()).padStart(2, '0')}`;

  const url = 'https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo';
  console.log(`[Nomura] POST API: fundCode=${fundCode}, date=${dateStr}`);

  const res = await axios.post(url, { FundNo: fundCode, Date: dateStr }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Referer': 'https://www.nomurafunds.com.tw/'
    },
    timeout: 30000
  });

  // API returns top-level array of stocks or entries
  const stocks = res.data?.Entries?.Stocks ?? (Array.isArray(res.data) ? res.data : null);
  if (!stocks || stocks.length === 0) {
    console.warn(`[Nomura] Stocks empty for date ${dateStr}`);
    return null;
  }

  return stocks
    .map(s => ({
      stockCode: String(s.CStockCode ?? s.CStocNo ?? '').trim(),
      stockName: String(s.CStockName ?? s.CStocName ?? '').trim(),
      shares: parseInt(String(s.CQuantity ?? s.CShares ?? '0').replace(/,/g, ''), 10) || 0,
      weight: parseFloat(s.CWeightsPct ?? s.CProportion) || 0
    }))
    .filter(s => s.stockCode && (s.weight > 0 || s.shares > 0));
}

// ============================================================
// 策略 E：群益投信 — 直接 API (POST)
// ============================================================
// 群益 fundId 對照表
const CAPITAL_FUND_ID_MAP = {
  '00982A': 399,
};

async function fetchCapitalApi(fundCode) {
  const fundId = CAPITAL_FUND_ID_MAP[fundCode];
  if (!fundId) {
    console.warn(`[Capital] No fundId mapping for ${fundCode}`);
    return null;
  }

  const url = 'https://www.capitalfund.com.tw/CFWeb/api/etf/buyback';
  console.log(`[Capital] POST API: fundCode=${fundCode}, fundId=${fundId}`);

  const res = await axios.post(url, { fundId }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Referer': `https://www.capitalfund.com.tw/etf/product/detail/${fundId}/portfolio`
    },
    timeout: 30000
  });

  const stocks = res.data?.data?.stocks;
  if (!stocks || stocks.length === 0) {
    console.warn(`[Capital] stocks empty for fundId ${fundId}`);
    return null;
  }

  return stocks
    .map(s => ({
      stockCode: String(s.stocNo).trim(),
      stockName: String(s.stocName || '').trim(),
      shares: parseInt(String(s.share || '0').replace(/,/g, ''), 10) || 0,
      weight: parseFloat(s.weight) || 0
    }))
    .filter(s => s.stockCode && (s.weight > 0 || s.shares > 0));
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
      holdings = await fetchFhtrustXlsx(target.fhtrustCode);

    } else if (target.issuer === '統一投信' && target.ezmoneyCCode) {
      const page = await getSharedPage();
      holdings = await fetchFsitcSpa(page, target.ezmoneyCCode);

    } else if (target.issuer === '元大投信') {
      const page = await getSharedPage();
      holdings = await fetchYuantaOfficial(page, target.code);

    } else if (target.issuer === '野村投信') {
      holdings = await fetchNomuraApi(target.code);

    } else if (target.issuer === '群益投信') {
      holdings = await fetchCapitalApi(target.code);

    } else {
      return { error: true, message: `未知發行商: ${target.issuer}` };
    }

    if (!holdings || holdings.length === 0) {
      return { error: true, message: `取回資料為空或解析失敗`, debugInfo: { title: target.issuer, bodyData: '無' } };
    }

    return holdings
      .sort((a, b) => b.weight - a.weight);
      //.slice(0, 10);

  } catch (error) {
    console.error(`[Scraper] 抓取 ${target.code} 發生錯誤:`, error.message);
    return { error: true, message: `Exception: ${error.message}` };
  }
}
