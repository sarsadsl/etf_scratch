import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    const url = response.url();
    const type = response.headers()['content-type'] || '';
    if (type.includes('json') || type.includes('text/plain') || type.includes('html')) {
      try {
        const text = await response.text();
        if (text.includes('華碩') || text.includes('富喬') || text.includes('世界')) {
          console.log('FOUND DATA IN:', url);
          console.log('Data snippet:', text.substring(0, 200));
        }
      } catch(e) {}
    }
  });

  await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2' });
  await browser.close();
})();
