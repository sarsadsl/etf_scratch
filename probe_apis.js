import axios from 'axios';

async function findNomuraDateFormat() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Referer': 'https://www.nomurafunds.com.tw/'
  };
  
  // Try different date formats and parameter names
  const dateTests = [
    { FundNo: '00980A', CDate: '2026/04/17' },
    { FundNo: '00980A', CDate: '2026-04-17' },
    { FundNo: '00980A', CDate: '20260417' },
    { FundNo: '00980A', Date: '2026/04/17' },
    { FundNo: '00980A', date: '2026/04/17' },
    { FundNo: '00980A' },  // no date - might use server default
  ];
  
  for (const body of dateTests) {
    try {
      const res = await axios.post('https://www.nomurafunds.com.tw/API/ETFAPI/api/Fund/GetFundTradeInfo',
        body, { headers, timeout: 15000 }
      );
      const stocks = res.data?.Entries?.Stocks;
      const msg = res.data?.Message || '';
      console.log(`Body: ${JSON.stringify(body)} -> TotalItems: ${res.data.TotalItems}, stocks: ${stocks?.length ?? 'null'}, msg: ${msg.substring(0,50)}`);
      if (stocks && stocks.length > 0) {
        console.log('[HIT!] First stock:', JSON.stringify(stocks[0]));
        break;
      }
    } catch(e) {
      console.error(`Error for ${JSON.stringify(body)}:`, e.response?.status, e.message);
    }
  }
}

findNomuraDateFormat();
