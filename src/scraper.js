import axios from 'axios';
import * as cheerio from 'cheerio';

// 策略模式：依據發行商使用不同的爬蟲邏輯
const scrapers = {
  '統一投信': async (etfCode) => {
    // 實作統一投信的爬蟲邏輯 (此為框架範例，需替換為實際官網的 API 或網址結構)
    // const url = `https://www.ezmoney.com.tw/ETF/Portfolio/${etfCode}`;
    // const response = await axios.get(url);
    // const $ = cheerio.load(response.data);
    
    // 以下為模擬回傳資料結構
    return [
      { stockCode: '2330', stockName: '台積電', shares: 5000, weight: 35.5 },
      { stockCode: '2317', stockName: '鴻海', shares: 3200, weight: 8.2 },
      { stockCode: '2454', stockName: '聯發科', shares: 1500, weight: 6.5 },
      { stockCode: '2308', stockName: '台達電', shares: 2000, weight: 5.0 },
      { stockCode: '2382', stockName: '廣達', shares: 1800, weight: 4.8 },
      { stockCode: '2881', stockName: '富邦金', shares: 8000, weight: 4.5 },
      { stockCode: '2882', stockName: '國泰金', shares: 7500, weight: 4.0 },
      { stockCode: '3231', stockName: '緯創', shares: 4000, weight: 3.5 },
      { stockCode: '2886', stockName: '兆豐金', shares: 6000, weight: 3.0 },
      { stockCode: '1216', stockName: '統一', shares: 3000, weight: 2.8 }
    ];
  },
  '復華投信': async (etfCode) => {
    // 實作復華投信的爬蟲邏輯
    // const url = `https://www.fhtrust.com.tw/ETF/Portfolio/${etfCode}`;
    
    // 以下為模擬回傳資料結構
    return [
      { stockCode: '2330', stockName: '台積電', shares: 4000, weight: 32.1 },
      { stockCode: '2454', stockName: '聯發科', shares: 1200, weight: 5.5 },
      { stockCode: '2317', stockName: '鴻海', shares: 2500, weight: 5.0 },
      { stockCode: '2382', stockName: '廣達', shares: 2000, weight: 4.8 },
      { stockCode: '2308', stockName: '台達電', shares: 1500, weight: 4.2 },
      { stockCode: '3231', stockName: '緯創', shares: 3500, weight: 3.8 },
      { stockCode: '2881', stockName: '富邦金', shares: 6500, weight: 3.5 },
      { stockCode: '2891', stockName: '中信金', shares: 8000, weight: 3.2 },
      { stockCode: '2882', stockName: '國泰金', shares: 6000, weight: 3.0 },
      { stockCode: '3008', stockName: '大立光', shares: 200, weight: 2.9 }
    ];
  }
};

/**
 * 抓取指定 ETF 的前十大持股明細
 * @param {Object} target - 包含 code, name, issuer 的物件
 * @returns {Promise<Array>} 持股明細陣列 [{ stockCode, stockName, shares, weight }]
 */
export async function fetchHoldings(target) {
  try {
    const handler = scrapers[target.issuer];
    if (!handler) {
      throw new Error(`尚無對應 ${target.issuer} 的爬蟲邏輯`);
    }
    
    const holdings = await handler(target.code);
    
    // 確保只取前十大，並依照權重排序
    const top10 = holdings
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
      
    return top10;
  } catch (error) {
    console.error(`[Scraper] 抓取 ${target.code} 失敗:`, error.message);
    return null;
  }
}
