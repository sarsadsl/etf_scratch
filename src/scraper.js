import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * 通用表格解析器 (注入到瀏覽器端執行)
 * 自動尋找包含「代碼」與「權重」或「比例」關鍵字的表格，並提取前十大
 */
function extractTableData() {
  const tables = Array.from(document.querySelectorAll('table'));
  for (const table of tables) {
    const text = table.textContent || '';
    // 尋找看起來像持股明細的表格
    if (text.includes('代碼') && (text.includes('權重') || text.includes('比例') || text.includes('%'))) {
      const rows = Array.from(table.querySelectorAll('tr'));
      const results = [];
      
      // 假設第一列是 Header，從第二列開始解析
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td, th')).map(td => td.textContent.trim());
        if (cells.length >= 3) {
          // 嘗試使用正則表達式從所有欄位中猜測出代碼、名稱與權重
          const rowText = cells.join(' ');
          const codeMatch = rowText.match(/\b\d{4}\b/); // 假設台股代碼是4碼數字
          const weightMatch = rowText.match(/(\d+\.\d+)%?/); // 尋找小數點權重
          const sharesMatch = rowText.match(/(\d{1,3}(,\d{3})*|\d+)/g); // 尋找最長的整數(可能是張數或股數)

          if (codeMatch && weightMatch) {
            results.push({
              stockCode: codeMatch[0],
              stockName: cells[1] || '未知', // 通常第二欄是名稱
              shares: sharesMatch && sharesMatch.length > 2 ? parseInt(sharesMatch[2].replace(/,/g, ''), 10) : 0, 
              weight: parseFloat(weightMatch[1])
            });
          }
        }
      }
      
      if (results.length > 0) return results;
    }
  }
  return null;
}

const scrapers = {
  '統一投信': async (page, etfCode) => {
    // 預設前往統一投信 ETF 專區
    const url = `https://www.ezmoney.com.tw/ETF/Portfolio/${etfCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 可能會有 Cookie 同意視窗或是延遲載入的圖表
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 嘗試通用的表格抓取
    let data = await page.evaluate(extractTableData);
    
    // 防錯機制：若無真實資料，回傳 Fallback
    if (!data || data.length === 0) {
       console.warn(`[Scraper] 無法於統一投信找到 ${etfCode} 的標準表格，可能是網頁已改版或正在載入動態內容。`);
       return null;
    }
    return data;
  },
  
  '復華投信': async (page, etfCode) => {
    // 預設前往復華投信
    const url = `https://www.fhtrust.com.tw/ETF/Detail/${etfCode}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    let data = await page.evaluate(extractTableData);
    
    if (!data || data.length === 0) {
       console.warn(`[Scraper] 無法於復華投信找到 ${etfCode} 的標準表格。`);
       return null;
    }
    return data;
  }
};

/**
 * 抓取指定 ETF 的前十大持股明細
 */
export async function fetchHoldings(target) {
  let browser = null;
  try {
    // 啟動無頭瀏覽器，加入必要的沙盒取消參數以相容 GitHub Actions 的 Ubuntu 環境
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    // 偽裝為正常使用者的瀏覽器 User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const handler = scrapers[target.issuer];
    if (!handler) {
      throw new Error(`尚無對應 ${target.issuer} 的爬蟲邏輯`);
    }

    const holdings = await handler(page, target.code);
    
    if (!holdings) return null;

    // 確保只取前十大，並依照權重排序
    const top10 = holdings
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
      
    return top10;
  } catch (error) {
    console.error(`[Scraper] 抓取 ${target.code} 發生例外錯誤:`, error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
