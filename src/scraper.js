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
  // 對於 00990A 這類主動型 ETF，PCF 頁面通常提供最完整的每日持股明細
  const url = `https://www.yuantaetfs.com/tradeInfo/pcf/${fundCode}`;
  console.log(`[Yuanta Official] Fetching PCF: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    // 步驟 1：等待 .expandBtn 出現（Headless 模式下元大使用 .expandBtn）
    try {
      await page.waitForSelector('.expandBtn', { timeout: 20000 });
      console.log(`[Yuanta Official] ${fundCode} .expandBtn 已就緒。`);
    } catch (e) {
      console.log(`[Yuanta Official] ${fundCode} 等待 .expandBtn 逾時，嘗試繼續。`);
    }

    // 步驟 2：點擊所有 .expandBtn（icon-only 按鈕，無文字，直接全部點擊）
    try {
      const clickResult = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.expandBtn'));
        let clicked = 0;
        for (const btn of btns) {
          btn.scrollIntoView();
          btn.click();
          clicked++;
        }
        return clicked;
      });
      console.log(`[Yuanta Official] ${fundCode} 點擊 .expandBtn 次數: ${clickResult}`);
    } catch (e) {
      console.log(`[Yuanta Official] ${fundCode} expandBtn 點擊異常: ${e.message}`);
    }

    // 步驟 3：等待股票資料列出現（展開後 .tr 應有 4 個以上子欄）
    try {
      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('.tr')).some(r => r.children.length >= 4),
        { timeout: 12000 }
      );
      console.log(`[Yuanta Official] ${fundCode} 股票資料列已出現。`);
    } catch (e) {
      console.log(`[Yuanta Official] ${fundCode} 等待股票資料列逾時，提取現有資料。`);
    }

    // 步驟 3.5：額外等待 3 秒，確保 SPA DOM 完整渲染
    await new Promise(r => setTimeout(r, 3000));

    // 步驟 4：提取持股資料
    const holdings = await page.evaluate(() => {
      const results = [];
      const rows = Array.from(document.querySelectorAll('.tr'));

      rows.forEach(row => {
        const cells = Array.from(row.children)
          .map(c => c.innerText.trim())
          .filter(t => t.length > 0);

        // 需要至少 4 個欄位
        if (cells.length < 4) return;

        const stockCodeRaw = cells[0];
        const stockName = cells[1];

        // 過濾標頭列
        const isHeader = ['商品代碼', '股票代號', '代號', 'Stock Code'].includes(stockCodeRaw);
        if (isHeader) return;

        // 過濾小計 / 合計列
        const isSummary = ['基金', '小計', '合計', '現金'].some(kw => stockCodeRaw.includes(kw));
        if (isSummary) return;

        // 純浮點數是分類小計列，不是代號
        if (/^\d+\.\d+$/.test(stockCodeRaw)) return;

        // 清理交易所後綴：如 "LITE US" → "LITE"，"2308 TW" → "2308"
        const stockCode = stockCodeRaw.replace(/\s+(US|TW|HK|JP|GB|KR|SG)$/i, '').trim();

        // 驗證代號格式：純英文+數字，或純 4-5 位台股代號
        const isValidCode = stockCode
          && /^[A-Z0-9.]+$/.test(stockCode)
          && stockCode.length <= 12;
        if (!isValidCode) return;

        // 動態識別 weight 欄：優先找以 '%' 結尾的 cell，fallback 到 cells[3]
        let weight = NaN;
        let sharesRaw = '';
        const percentIdx = cells.findIndex((c, i) => i >= 2 && c.endsWith('%'));
        if (percentIdx !== -1) {
          weight = parseFloat(cells[percentIdx].replace('%', ''));
          // 股數欄：取 percentIdx 之前最後一個含數字的欄位
          for (let i = percentIdx - 1; i >= 2; i--) {
            if (/[\d,]+/.test(cells[i])) { sharesRaw = cells[i]; break; }
          }
        } else {
          // fallback：cells[3] 為 weight，cells[2] 為 shares
          sharesRaw = cells[2];
          weight = parseFloat(cells[3].replace('%', '').replace(/,/g, ''));
        }

        const shares = parseInt(sharesRaw.replace(/,/g, ''), 10) || 0;

        if (!isNaN(weight) && weight > 0 && weight < 100) {
          if (!results.find(r => r.stockCode === stockCode)) {
            results.push({ stockCode, stockName, shares, weight });
          }
        }
      });

      return results;
    });

    console.log(`[Yuanta Official] ${fundCode} 提取持股數量: ${holdings ? holdings.length : 0}`);

    // 至少 3 筆才視為成功（避免僅抓到分類標頭）
    if (holdings && Array.isArray(holdings) && holdings.length >= 3) {
      console.log(`[Yuanta Official] ${fundCode} 成功抓取 ${holdings.length} 筆資料。`);
      return holdings;
    }

    throw new Error(`官網解析資料不足（僅 ${holdings?.length ?? 0} 筆），回退至 MoneyDJ`);
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
