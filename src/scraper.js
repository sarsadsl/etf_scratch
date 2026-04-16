import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

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

    const url = `https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${target.code}.TW`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // 等待版面或可能的動態載入
    await new Promise(resolve => setTimeout(resolve, 3000));

    const holdings = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table.table-0 tr');
      if (!rows || rows.length === 0) return null;

      for (let i = 1; i < rows.length; i++) { // 跳過表頭
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 3) {
          const nameHtml = cells[0].innerText.trim(); // e.g. "台積電(2330.TW)"
          const weightText = cells[1].innerText.trim();
          const sharesText = cells[2].innerText.trim().replace(/,/g, '');

          // 解析代碼與名稱，例如 "台積電(2330.TW)" -> 名稱: "台積電", 代碼: "2330" 或 "2330.TW"
          const codeMatch = nameHtml.match(/\((.*?)\)/);
          const stockCode = codeMatch ? codeMatch[1].split('.')[0] : nameHtml; 
          const stockName = nameHtml.split('(')[0].trim();

          const weight = parseFloat(weightText) || 0;
          const shares = parseInt(sharesText, 10) || 0;

          if (stockCode && weight > 0) {
            results.push({
              stockCode,
              stockName,
              shares,
              weight
            });
          }
        }
      }
      return results;
    });
    
    if (!holdings || holdings.length === 0) {
      console.warn(`[Scraper] 未能在 MoneyDJ 找到 ${target.code} 的持股資料`);
      return null;
    }

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
