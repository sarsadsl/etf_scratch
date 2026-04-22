import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=00990A.TW', { waitUntil: 'networkidle2' });
  
  const data = await page.evaluate(() => {
    const rows = document.querySelectorAll('table.datalist tr');
    return Array.from(rows).map(r => r.innerText.replace(/\n/g, ' | '));
  });
  console.log('Total rows:', data.length);
  console.log(data);

  await browser.close();
})();
