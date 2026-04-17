import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  try {
    // ezmoney 00988A HTML test
    console.log("--- Testing 00988A (HTML) ---");
    await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=61YTW', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    const ezTableHtml = await page.evaluate(() => {
      const el = document.querySelector('#assetBody');
      return el ? el.innerHTML : 'Not Found';
    });
    console.log(ezTableHtml.substring(0, 1000));

    // yuanta 00990A HTML test
    console.log("\n--- Testing 00990A (DOM) ---");
    await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const yuantaHtml = await page.evaluate(() => {
      // Find anything that looks like a table or contains LITE/SNDK
      const els = document.querySelectorAll('div, table, ul, li');
      let found = '';
      for (const el of els) {
        if (el.innerText && typeof el.innerText === 'string' && el.innerText.includes('Lumentum')) {
          found = el.outerHTML;
          // want the outermost table or something reasonable
          if (el.tagName === 'TABLE' || el.classList.contains('table-list')) {
            break;
          }
        }
      }
      return found || document.body.innerHTML.substring(0, 500);
    });
    console.log(yuantaHtml.substring(0, 1500));
    
    // Also try checking any rows in .box4 .table-list
    const tableListHtml = await page.evaluate(() => {
      // Look for the specific tabs or div that Yuanta uses
      const ts = document.querySelectorAll('.table-list, table');
      const ret = [];
      ts.forEach(t => ret.push(t.tagName + ' / ' + t.className + ' / ' + t.innerText.substring(0, 100)));
      return ret.join('\n');
    });
    console.log("Found tables:\n" + tableListHtml);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
