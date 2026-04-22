import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('Excel') || url.includes('export') || url.includes('xlsx')) {
      console.log('Detected Response:', url, response.status());
    }
  });

  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('Excel') || url.includes('export') || url.includes('xlsx')) {
      console.log('Detected Request:', url, request.method());
    }
  });

  console.log('Navigating...');
  await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Dumping links/buttons related to xlsx/excel:');
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a, button')).filter(el => 
      el.innerText.toLowerCase().includes('xls') || 
      el.innerText.toLowerCase().includes('匯出') ||
      (el.href && el.href.toLowerCase().includes('xls'))
    ).map(el => ({ text: el.innerText, href: el.href, onclick: el.getAttribute('onclick') }));
  });
  console.log(links);

  await browser.close();
})();
