import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('Excel') || url.includes('export') || url.includes('xlsx') || url.includes('Download') || url.includes('Data')) {
      console.log('Detected Response:', url, response.status());
    }
  });

  await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2' });
  
  // Click all buttons that have '匯出' text
  console.log('Clicking export buttons...');
  const buttons = await page.$$('a, button, div.btn');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.innerText, btn);
    if (text && text.toLowerCase().includes('匯出')) {
      console.log('Clicking:', text);
      try {
        await btn.click();
        await page.waitForTimeout(2000); // Wait for potential requests
      } catch(e) {}
    }
  }

  await browser.close();
})();
