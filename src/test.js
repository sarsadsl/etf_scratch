import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

// 統一投信
await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 5000));

const debug = await page.evaluate(() => {
  const assetEl = document.querySelector('#assetBody');
  if (!assetEl) return { error: '#assetBody not found' };
  return { 
    found: true,
    // Get the inner text as-is to see the exact structure
    text: assetEl.innerText
  };
});

console.log('FSITC assetBody found:', debug.found);
if (debug.text) {
  // Focus on the stock section
  const stockIdx = debug.text.indexOf('股票代號');
  console.log('Stock section:');
  console.log(debug.text.substring(stockIdx, stockIdx + 600));
}

await browser.close();
