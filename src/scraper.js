import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// 投信網站特定代碼映射表
const fundCodeMapping = {
  '00981A': '49YTW',
  '00988A': '61YTW',
  '00991A': 'ETF23'
};

const scrapers = {
  '統一投信': async (page, etfCode) => {
    const internalCode = fundCodeMapping[etfCode];
    // 進入統一投信真實的基金資訊頁面
    const url = `https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=${internalCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 等待版面載入並切換到持股區塊 (可能需要等待動態載入)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 針對統一個官方結構擷取
    let data = await page.evaluate(() => {
      const results = [];
      // 根據子代理勘查，統一投信的表格位於 div#asset 下的 table.table_list
      const rows = document.querySelectorAll('div#asset table.table_list tr');
      if (!rows || rows.length === 0) return null;

      // 跳過表頭，從資料列開始處理
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 4) {
          const stockCode = cells[0].textContent.trim();
          const stockName = cells[1].textContent.trim();
          const sharesText = cells[2].textContent.trim().replace(/,/g, '');
          const weightText = cells[3].textContent.trim().replace('%', '');
          
          if (stockCode && stockCode.length >= 4) {
            results.push({
              stockCode: stockCode,
              stockName: stockName,
              shares: parseInt(sharesText, 10) || 0,
              weight: parseFloat(weightText) || 0
            });
          }
        }
      }
      return results;
    });
    
    return data;
  },
  
  '復華投信': async (page, etfCode) => {
    const internalCode = fundCodeMapping[etfCode];
    // 進入復華投信真實的基金資訊頁面
    const url = `https://www.fhtrust.com.tw/ETF/etf_detail/${internalCode}#stockhold`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let data = await page.evaluate(() => {
      const results = [];
      // 根據子代理勘查，復華投信並非傳統 table，而是 div 組成的 .table-hold
      const container = document.querySelector('div#stockhold .table-hold');
      if (!container) return null;

      // 假設它底下有特定 .row_list，或者透過純文字正則暴力解譯
      const textContent = container.innerText;
      const lines = textContent.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // 尋找符合「四碼數字 名稱 數字 權重」格式，復華的結構可能因排版被切分在此
        const parts = line.split(/\s+/);
        
        // 由於 div table 經常把不同欄位斷在不同行，我們嘗試用正則抓取所有符合的股號與權重對應關係
        const codeMatch = line.match(/^(\d{4})$/);
        const codeInlineMatch = line.match(/\b(\d{4})\b.*\b(\d+\.\d+)%?/);
        
        if (codeInlineMatch) {
            // 在同一行內找到代碼與權重
             results.push({
              stockCode: codeInlineMatch[1],
              stockName: '依代碼',
              shares: 0, // 復華可能不公佈股數或難以擷取
              weight: parseFloat(codeInlineMatch[2]) || 0
            });
        }
      }
      return results;
    });
    
    // 如果復華解析失敗，啟動備用：全域搜尋
    if (!data || data.length === 0) {
        data = await page.evaluate(() => {
            const tableText = document.querySelector('div#stockhold') ? document.querySelector('div#stockhold').innerText : '';
            const matches = [...tableText.matchAll(/(\d{4})\s+([^\s]+)\s+([\d,]+)?\s*(\d+\.\d+)/g)];
            return matches.map(m => ({
                stockCode: m[1],
                stockName: m[2],
                shares: m[3] ? parseInt(m[3].replace(/,/g, ''), 10) : 0,
                weight: parseFloat(m[4])
            }));
        });
    }

    return data;
  },
  
  '元大投信': async (page, etfCode) => {
    const url = `https://www.yuantaetfs.com/product/detail/${etfCode}/ratio`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 預留渲染時間
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const data = await page.evaluate(() => {
      const results = [];
      // 根據子代理解析，表格位於第二個 .table-list 內的 table
      // querySelectorAll 無法直接使用 nth-of-type 抓取父層特定類別，改用索引
      const lists = document.querySelectorAll('div.table-list');
      if (lists.length < 2) return null;
      
      const rows = lists[1].querySelectorAll('table tr');
      if (!rows || rows.length === 0) return null;

      // 略過表頭 (th)
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        // 元大表格通常有三或四欄（代碼、名稱、可能無張數、權重）
        if (cells.length >= 3) {
          const stockCode = cells[0].textContent.trim();
          const stockName = cells[1].textContent.trim();
          
          // 若缺乏張數欄位，取最後一欄為權重
          const weightText = cells[cells.length - 1].textContent.trim().replace('%', '');
          const sharesText = cells.length > 3 ? cells[2].textContent.trim().replace(/,/g, '') : '0';

          // 放寬過濾條件：海外股票代碼包含字母與空格，長度可能逾 4 碼
          if (stockCode && stockCode.length >= 2) {
            results.push({
              stockCode: stockCode,
              stockName: stockName,
              shares: parseInt(sharesText, 10) || 0,
              weight: parseFloat(weightText) || 0
            });
          }
        }
      }
      return results;
    });
    
    return data;
  }
};

export async function fetchHoldings(target) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const handler = scrapers[target.issuer];
    if (!handler) {
      throw new Error(`尚無 ${target.issuer} 的對應邏輯`);
    }

    const holdings = await handler(page, target.code);
    
    if (!holdings || holdings.length === 0) return null;

    const top10 = holdings
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
      
    return top10;
  } catch (error) {
    console.error(`[Scraper] 抓取 ${target.code} 發生錯誤:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
