export async function fetchMarketQuotes() {
  const quotes = {};

  try {
    console.log('[System] Fetching TWSE OpenAPI (上市) market quotes...');
    const twseRes = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
    const twseData = await twseRes.json();
    
    for (const row of twseData) {
      const code = row.Code;
      const open = parseFloat(row.OpeningPrice);
      const close = parseFloat(row.ClosingPrice);
      const diff = parseFloat(row.Change) || 0;
      
      if (!isNaN(close)) {
        const prevClose = close - diff;
        let changePercent = 0;
        if (prevClose !== 0 && !isNaN(prevClose)) {
          changePercent = (diff / prevClose) * 100;
        }
        quotes[code] = { 
          open: isNaN(open) ? close : open, 
          close, 
          changePercent 
        };
      }
    }
  } catch (e) {
    console.error('[System] TWSE OpenAPI 報價抓取失敗', e.message);
  }

  try {
    console.log('[System] Fetching TPEx OpenAPI (上櫃) market quotes...');
    const tpexRes = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes');
    const tpexData = await tpexRes.json();
    
    for (const row of tpexData) {
      const code = row.SecuritiesCompanyCode;
      const open = parseFloat(row.Open);
      const close = parseFloat(row.Close);
      const changeStr = row.Change || '0';
      
      // TPEx 的 Change 有時會帶有 '+' 或 '-' 符號，parseFloat 可直接解析
      const diff = parseFloat(changeStr) || 0;
      
      if (!isNaN(close)) {
        const prevClose = close - diff;
        let changePercent = 0;
        if (prevClose !== 0 && !isNaN(prevClose)) {
          changePercent = (diff / prevClose) * 100;
        }
        quotes[code] = { 
          open: isNaN(open) ? close : open, 
          close, 
          changePercent 
        };
      }
    }
  } catch (e) {
    console.error('[System] TPEx OpenAPI 報價抓取失敗', e.message);
  }

  return quotes;
}
