import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
    // Test ezmoney 00988A
    console.log("--- Testing 00988A ---");
    await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=61YTW', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    const ezTxt = await page.evaluate(() => {
      const el = document.querySelector('#assetBody');
      return el ? el.innerText : 'Not Found';
    });
    console.log(ezTxt.substring(0, 500)); // Print start of string

    // Test yuanta 00990A
    console.log("\n--- Testing 00990A ---");
    await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    // Quick extract with regex from yuanta
    const rows = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll('tr').forEach(tr => list.push(tr.innerText));
      return list;
    });
    console.log("TR elements found:", rows.length);
    console.log(rows.slice(0, 15).join('\n'));

    // Check yuanta .table-list or other classes if tr not working
    const otherDivs = await page.evaluate(() => {
      const el = document.querySelector('.table-list');
      return el ? el.innerText : 'No .table-list found';
    });
    console.log("table-list text:\n", otherDivs.substring(0, 300));
    
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
