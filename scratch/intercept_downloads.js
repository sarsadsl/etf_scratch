import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('--- Yuanta ---');
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('Export') || url.includes('Download') || url.includes('CSV') || url.includes('Excel')) {
      console.log('[Yuanta Response]', url);
    }
  });

  await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000);
  
  // click 匯出excel
  try {
    const btn = await page.$x("//button[contains(text(), '匯出')]");
    if (btn.length > 0) {
      await btn[0].click();
      console.log('Clicked Yuanta Export');
      await page.waitForTimeout(3000);
    } else {
      console.log('Yuanta button not found');
    }
  } catch(e) { console.error('Yuanta click error', e.message); }

  console.log('--- FSITC ---');
  page.on('request', req => {
    if (req.url().includes('Excel') || req.url().includes('xlsx') || req.url().includes('Export')) {
      console.log('[FSITC Request]', req.url());
    }
  });

  await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000);
  try {
    const tabs = await page.$x("//a[contains(text(), '投資組合')]");
    if (tabs.length > 0) await tabs[0].click();
    await page.waitForTimeout(2000);
    
    // click 匯出XLSX
    const btns = await page.$x("//a[contains(text(), '匯出')]");
    if (btns.length > 0) {
      console.log('Clicking FSITC Export');
      await btns[0].click();
      await page.waitForTimeout(3000);
    } else {
      console.log('FSITC button not found');
    }
  } catch(e) { console.error(e.message); }

  await browser.close();
})();
